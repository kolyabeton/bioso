import { build } from 'vite';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageGameZip } from './asset-build/archive.mjs';
import { createHash } from 'node:crypto';
import { prepareAssets, sizeReport, assertBudget } from './asset-build/assets.mjs';
import { assetUrlPlugin, assetCssPlugin } from './asset-build/urls.mjs';
import { compressBuild } from './compress-build.mjs';

// An isolated export preserves the normal development build and frozen releases.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const destination = resolve(root, 'outputs', 'itch', `bioso-${stamp}`);
const outDir = join(destination, 'game');
const playtest = process.argv.includes('--unlocked') || process.argv.includes('--playtest');
const temporaryRoot = join(root, 'temp', 'asset-build');
await mkdir(temporaryRoot, { recursive: true });
const staging = await mkdtemp(join(temporaryRoot, 'itch-'));
try {
  const manifest = await prepareAssets(join(root, 'public'), staging);
  await build({
    root,
    configFile: false,
    mode: playtest ? 'playtest' : 'production',
    publicDir: staging,
    base: './',
    plugins: [assetUrlPlugin(root, manifest.urls, { relativeRuntime: true })],
    css: { postcss: { plugins: [assetCssPlugin(manifest.urls)] } },
    build: { outDir, emptyOutDir: true },
  });
  // Apply the approved delivery profile to every texture before packaging.
  await compressBuild(outDir);
  const report = await sizeReport(outDir);
  assertBudget(report.bytes);
  // Same processed resources and relative URLs, with load-test routes enabled.
  // Kept outside game/ and never included in the upload ZIP.
  if (process.argv.includes('--with-acceptance')) await build({
    root, configFile: false, publicDir: staging, base: './', mode: 'acceptance',
    plugins: [assetUrlPlugin(root, manifest.urls, { relativeRuntime: true })],
    css: { postcss: { plugins: [assetCssPlugin(manifest.urls)] } },
    build: { outDir: join(destination, 'acceptance'), emptyOutDir: true },
  });
  if (process.argv.includes('--with-acceptance')) await compressBuild(join(destination, 'acceptance'));
  for (const directory of [outDir, ...(process.argv.includes('--with-acceptance') ? [join(destination, 'acceptance')] : [])]) {
  for (const path of await listFiles(directory)) {
    if (!/\.(html|css|js)$/.test(path)) continue;
    const name = relative(directory, path);
    let code = await readFile(path, 'utf8');
    if (name.endsWith('.css')) {
      code = code.replace(/url\((["']?)\/(assets|icons|licenses)\//g, (_match, quote, top) => {
        let prefix = relative(dirname(name), top).replaceAll('\\', '/');
        if (!prefix.startsWith('.')) prefix = './' + prefix;
        return `url(${quote}${prefix}/`;
      });
    }
    await writeFile(path, code);
  }
  }

} finally {
  await rm(staging, { recursive: true, force: true });
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}
const paths = await listFiles(outDir);
const files = [];
for (const path of paths) {
  const name = relative(outDir, path);
  const { size } = await stat(path);
  if (name.length > 240 || size > 200_000_000) throw new Error(`itch.io file limit: ${name}`);
  if (/\.(html|css)$/.test(name)) {
    const code = await readFile(path, 'utf8');
    if (/["'`(]\/(assets|icons|licenses)\//.test(code)) throw new Error(`Absolute asset URL: ${name}`);
  } else if (name.endsWith('.js')) {
    const code = await readFile(path, 'utf8');
    // Canonical absolute keys and helper inputs are intentional in JS. Values
    // returned by the runtime lookup table must point at the relative package.
    if (/:["']\/(assets|icons|licenses)\//.test(code)) throw new Error(`Absolute runtime asset value: ${name}`);
  }
  files.push({ name, bytes: size });
}
const extractedBytes = files.reduce((sum, file) => sum + file.bytes, 0);
if (!files.some(file => file.name === 'index.html')) throw new Error('Missing root index.html');
if (files.length > 1000 || extractedBytes > 500_000_000) throw new Error('itch.io archive limits exceeded');
const archive = join(destination, `bioso-${playtest ? 'unlocked' : 'html5'}-${stamp}.zip`);
const archiveEntryCount = packageGameZip(outDir, archive, files.map(file => file.name));
const archiveBytes = (await stat(archive)).size;
const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex');
const report = { archive, outDir, fileCount: files.length, archiveEntryCount, extractedBytes, archiveBytes, sha256, files };
await writeFile(join(destination, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(join(destination, 'UPLOAD.txt'),
  `BIOSO / itch.io HTML5\n\nUpload: ${archive}\n` +
  'Kind of project: HTML\nMark the ZIP: This file will be played in the browser\n' +
  'Embed in page: 390 x 844\nEnable: Mobile friendly, Fullscreen button, Click to play\n' +
  'The ZIP contains index.html at its root and document-relative runtime asset URLs.\n');
console.log(JSON.stringify({ archive, outDir, fileCount: files.length, archiveEntryCount, extractedBytes, archiveBytes, sha256 }, null, 2));
