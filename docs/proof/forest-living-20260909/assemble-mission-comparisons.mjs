import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const missions = [
  ['core', 'Корневой лес'], ['garden', 'Верхние сады'],
  ['quarantine', 'Тихая свалка'], ['nursery', 'Заросший город'],
  ['mother', 'Роевой питомник'],
];
for (const [id, title] of missions) {
  const target = id === 'core' ? 'docs/concepts/world/forest-living-target-v2.png' : 'docs/references/biomecha-style-master.png';
  const label = id === 'core' ? 'Утверждённый целевой кадр' : 'Общий стилевой референс';
  const header = Buffer.from(`<svg width="816" height="100"><rect width="816" height="100" fill="#14191c"/><g fill="#edf0e9" font-family="Arial, sans-serif"><text x="18" y="32" font-size="25">${title}</text><text x="18" y="78" font-size="18">${label}</text><text x="420" y="78" font-size="18">Сейчас в игре · 390 × 844</text></g></svg>`);
  const ref = await sharp(root + target).resize(390, 844, { fit: 'contain', background: '#202628' }).png().toBuffer();
  const actual = await sharp(base + `identities-${id}-390.png`).resize(390, 844, { fit: 'contain', background: '#202628' }).png().toBuffer();
  await sharp({ create: { width: 816, height: 960, channels: 4, background: '#14191c' } }).composite([
    { input: header, left: 0, top: 0 }, { input: ref, left: 12, top: 100 }, { input: actual, left: 414, top: 100 },
  ]).png().toFile(base + `comparison-${id}.png`);
  const proof = JSON.parse(await readFile(base + `identities-${id}-390.json`, 'utf8'));
  console.log(JSON.stringify({ id, route: proof.route, assetErrors: proof.assetErrors, failedModels: proof.failedModels, loadingTiles: proof.loadingTiles, missionGateErrors: proof.missionGateErrors }));
}
