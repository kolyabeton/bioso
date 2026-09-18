import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRun } from '../src/game.js';
import { createPart, weaponStats } from '../src/assembly.js';
import { handPresentation } from '../src/hud-presentation.js';

test('HUD describes real starting arms without changing the run', () => {
  const run = createRun();
  const before = JSON.stringify(run);
  assert.deepEqual(handPresentation(run).map(p => p.key), ['claws', 'empty']);
  assert.equal(JSON.stringify(run), before);
});
test('HUD preserves four slots, vacant mount, item tier and numeric upgrade rank', () => {
  const run = createRun();
  run.body = createPart(run, 'hecaton');
  run.arms = Array.from({length:4}, () => createPart(run, 'seed', 3));
  run.arms[2] = null;
  const hands = handPresentation(run);
  assert.equal(hands.length, 4);
  assert.equal(hands[0].tier, 'III');
  assert.equal(hands[0].upgradeRank, 0);
  assert.equal(hands[0].maxUpgradeRank, 20);
  assert.equal(hands[2].key, 'empty');
  assert.equal(hands[2].charge, 0);
  const beforeUpgradeIdentity=hands[0].identity;
  run.arms[0].upgrades.damage=4;
  assert.equal(handPresentation(run)[0].upgradeRank, 4);
  assert.notEqual(handPresentation(run)[0].identity, beforeUpgradeIdentity);
});
test('HUD derives independent cooldown fractions and clamps the indicators', () => {
  const run = createRun();
  run.arms[1] = createPart(run, 'seed');
  run.arms[0].cooldown = weaponStats(run, run.arms[0]).interval / 2;
  run.arms[1].cooldown = 999;
  assert.deepEqual(handPresentation(run).map(p => p.charge), [.5, 0]);
  run.arms[1].cooldown = -1;
  assert.equal(handPresentation(run)[1].charge, 1);
});
test('game loads the shared component presentation and keeps gameplay anchors', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(main, /import '\.\/ui\/game-ui\.css'/);
  assert.match(main, /renderHands\(run\)/);
  for (const id of ['health-text','shield-text','level-text','kills-text','revival-badge','xp-text','health-fill','xp-fill','hands','biomass-text','nearby','assembly-button','map-button','pause-button','preview','panel']) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1, id);
  }
  assert.match(html, /id="kills-text"[^>]*>[^<]*<\/span><output id="revival-badge"/);
  assert.doesNotMatch(html, /aria-pressed|data-part=/);
});

test('HUD and screens share canonical item art; historical preview remains independent', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const hud = await readFile(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  const screens = await readFile(new URL('../src/ui/screens.js', import.meta.url), 'utf8');
  const molecules = await readFile(new URL('../src/ui/molecules.js', import.meta.url), 'utf8');
  const preview = await readFile(new URL('../hud-review.html', import.meta.url), 'utf8');
  assert.match(main, /createScreens/);
  assert.match(hud, /from '\.\/molecules\.js'/);
  assert.match(screens, /from '\.\/molecules\.js'/);
  assert.match(molecules, /ART_KEYS/);
  assert.doesNotMatch(main, /import '\.\/(game-hud|reference-hud|hud-integration|mobile-stage)\.css'/);
  assert.match(preview, /href="\/src\/reference-hud\.css"/);
});
