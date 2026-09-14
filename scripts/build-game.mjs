import {build} from 'vite';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareAssets, sizeReport, assertBudget} from './asset-build/assets.mjs';
import {assetUrlPlugin,assetCssPlugin} from './asset-build/urls.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = join(root, 'temp', 'asset-build');
await mkdir(temporaryRoot, {recursive: true});
const staging = await mkdtemp(join(temporaryRoot, 'run-'));
try {
  const manifest = await prepareAssets(join(root, 'public'), staging);
  const modes = process.argv.includes('--acceptance') ? ['acceptance'] : process.argv.includes('--with-acceptance') ? ['production','acceptance'] : ['production'];
  for (const mode of modes) {
    const acceptance = mode === 'acceptance';
    const outDir = acceptance ? join(root, 'temp', 'optimized-acceptance') : join(root, 'dist');
    await build({root, configFile: false, publicDir: staging, mode, plugins: [assetUrlPlugin(root, manifest.urls)], css:{postcss:{plugins:[assetCssPlugin(manifest.urls)]}}, build: {outDir, emptyOutDir: true}});
    const report = await sizeReport(outDir);
    await writeFile(join(root, 'temp', acceptance ? 'acceptance-size-report.json' : 'build-size-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({mode,...report}, null, 2));
    assertBudget(report.bytes);
  }
} finally {
  // This directory belongs only to this invocation; never clean shared outputs.
  await rm(staging, {recursive: true, force: true});
}
