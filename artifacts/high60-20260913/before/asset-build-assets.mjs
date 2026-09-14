import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {join, dirname, relative} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP} from '@gltf-transform/extensions';
import {MeshoptEncoder} from 'meshoptimizer';
import {reorder} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

sharp.concurrency(1);
sharp.cache({memory: 32, files: 0, items: 32});
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// itch.io HTML5 limit applies to all extracted files, not ZIP compression.
export const LIMIT_BYTES = 500_000_000;

export async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported asset entry: ${path}`);
  }
  return files.sort();
}

export function imageProfile(path) {
  // The full-width desktop menu must retain every source pixel.
  if (path === '/assets/ui/menu-art-desktop-v1.png') return {lossless: true};
  if (/wordmark|logo/.test(path) || /\/ui\/.*atlas/.test(path)) return {lossless: true};
  // World atlases and perimeter tiles must keep their authored pixel layout.
  // Only RGB is compressed; alpha is lossless, with no resizing/cropping.
  if (/atlas|perimeter/.test(path)) return {quality: 90};
  if (/\/ui\/abilities\//.test(path)) return {max: 384, quality: 85};
  if (/\/ui\/(abilities|organs|items|bosses|achievements|equipment)\//.test(path)) return {max: 512, quality: 85};
  if (/\/art\/|background|home-background/.test(path)) return {max: 1536, quality: 85};
  return {max: 1024, quality: 85};
}

export async function webpImage(input, profile) {
  let image = sharp(input);
  if (profile.max) image = image.resize({width: profile.max, height: profile.max, fit: 'inside', withoutEnlargement: true});
  return image.webp({quality: profile.quality ?? 85, lossless: !!profile.lossless, alphaQuality: 100, effort: 5}).toBuffer();
}

export async function modelIO() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
  });
}

export async function compressModel(io, input, {sharedTextures, textureCache = new Map()} = {}) {
  const document = await io.readBinary(input);
  const color = new Set();
  const protectedMaps = new Set();
  for (const material of document.getRoot().listMaterials()) {
    for (const texture of [material.getBaseColorTexture(), material.getEmissiveTexture()]) if (texture) color.add(texture);
    for (const texture of [material.getNormalTexture(), material.getMetallicRoughnessTexture(), material.getOcclusionTexture()]) if (texture) protectedMaps.add(texture);
  }
  for (const texture of document.getRoot().listTextures()) {
    const inputImage = texture.getImage();
    // Unknown/extension slots and data maps use strictly lossless WebP.
    const lossless = !color.has(texture) || protectedMaps.has(texture);
    const key = hash(inputImage) + ':' + lossless;
    if (!textureCache.has(key)) textureCache.set(key, await webpImage(inputImage, {quality: 85, lossless}));
    const output = textureCache.get(key);
    if (output.length < inputImage.length) texture.setImage(output).setMimeType('image/webp');
  }
  if (document.getRoot().listTextures().some(t => t.getMimeType() === 'image/webp')) document.createExtension(EXTTextureWebP).setRequired(true);
  // Reorder only changes storage order, without quantizing vertices or removing
  // triangles. QUANTIZE on the extension selects the NONE filter; no quantize()
  // or simplify() transform is used.
  await document.transform(reorder({encoder: MeshoptEncoder, target: 'size'}));
  document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method: EXTMeshoptCompression.EncoderMethod.QUANTIZE});
  if (sharedTextures) {
    for (const texture of document.getRoot().listTextures()) {
      const bytes = texture.getImage(), extension = {'image/webp':'webp','image/png':'png','image/jpeg':'jpg'}[texture.getMimeType()];
      if (!extension) throw new Error(`Unsupported texture: ${texture.getMimeType()}`);
      const name = `assets/model-textures/${hash(bytes)}.${extension}`;
      sharedTextures.set(name, Buffer.from(bytes));
      texture.setURI('../model-textures/' + name.split('/').at(-1));
    }
    const {json, resources} = await io.writeJSON(document);
    // A GLB can reference external images. Keep the one geometry buffer in its
    // BIN chunk, and the Meshopt fallback buffer virtual (no duplicate payload).
    const binary = resources[json.buffers[0].uri];
    if (!binary || json.buffers.slice(1).some(buffer => buffer.uri)) throw new Error('Expected one physical GLB geometry buffer');
    delete json.buffers[0].uri;
    return packGlb(json, binary);
  }
  return io.writeBinary(document);
}

function packGlb(json, binary) {
  const text = Buffer.from(JSON.stringify(json));
  const jsonSize = Math.ceil(text.length / 4) * 4, binSize = Math.ceil(binary.length / 4) * 4;
  const output = Buffer.alloc(12 + 8 + jsonSize + 8 + binSize);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonSize, 12); output.writeUInt32LE(0x4e4f534a, 16);
  output.fill(0x20, 20, 20 + jsonSize); text.copy(output, 20);
  output.writeUInt32LE(binSize, 20 + jsonSize); output.writeUInt32LE(0x004e4942, 24 + jsonSize);
  Buffer.from(binary).copy(output, 28 + jsonSize);
  return output;
}

export async function prepareAssets(source, destination) {
  const io = await modelIO();
  const entries = [], urls = {};
  const sharedTextures = new Map(), textureCache = new Map();
  const files = (await filesIn(source)).filter(path => !path.endsWith('/.DS_Store'));
  let count = 0;
  for (const path of files) {
    const name = relative(source, path), url = '/' + name;
    const input = await readFile(path);
    let output = input, outputName = name;
    if (name.startsWith('assets/') && /\.(png|jpe?g)$/i.test(name)) {
      output = await webpImage(input, imageProfile(url));
      // Keep the original suffix in the name to avoid foo.png/foo.jpg collisions.
      outputName += '.webp';
    } else if (name.endsWith('.glb')) {
      output = await compressModel(io, input, {sharedTextures, textureCache});
    }
    const target = join(destination, outputName);
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, output);
    urls[url] = '/' + outputName;
    entries.push({source: url, url: urls[url], sourceBytes: input.length, bytes: output.length, sourceHash: hash(input), hash: hash(output)});
    if (++count % 25 === 0 || count === files.length) console.log(`Assets ${count}/${files.length}`);
  }
  const generated = [];
  for (const [name, bytes] of sharedTextures) {
    await mkdir(dirname(join(destination, name)), {recursive: true});
    await writeFile(join(destination, name), bytes);
    generated.push({url:'/' + name, bytes:bytes.length, hash:hash(bytes)});
  }
  const license = await readFile(new URL('../../node_modules/meshoptimizer/LICENSE.md', import.meta.url));
  const licensePath = 'licenses/meshoptimizer-MIT.txt';
  await mkdir(dirname(join(destination, licensePath)), {recursive:true});
  await writeFile(join(destination, licensePath), license);
  generated.push({url:'/' + licensePath, bytes:license.length, hash:hash(license)});
  const manifest = {version: 1, limitBytes: LIMIT_BYTES, urls, entries, generated};
  await writeFile(join(destination, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export function assertBudget(bytes) {
  if (bytes > LIMIT_BYTES) throw new Error(`Game exceeds size limit: ${bytes} bytes (must be <= ${LIMIT_BYTES}).`);
}

export async function sizeReport(directory) {
  const categories = {ui: 0, models: 0, environment: 0, audio: 0, application: 0};
  let bytes = 0, count = 0;
  for (const path of await filesIn(directory)) {
    const name = relative(directory, path), size = (await readFile(path)).length;
    const category = name.startsWith('assets/ui/') ? 'ui' : /^assets\/(kit|models|model-textures)\//.test(name) ? 'models' : /^assets\/(biomes|encounters|art)\//.test(name) ? 'environment' : name.startsWith('assets/audio/') ? 'audio' : 'application';
    categories[category] += size; bytes += size; count++;
  }
  return {bytes, limitBytes: LIMIT_BYTES, remainingBytes: LIMIT_BYTES - bytes, files: count, categories};
}
