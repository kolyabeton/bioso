import {createBackgroundMusic} from './background-music.js';
import {bossEngaged} from './systems/territories.js';

const menuScreens = new Set(['home', 'missions', 'mission-detail', 'loadout', 'profile', 'meta-achievement', 'catalog', 'journal', 'journal-entry', 'development']);
const sharedScreens = new Set(['settings', 'credits', 'components']);

export function createGameMusic(baseUrl, options) {
  const background = [`${baseUrl}assets/audio/technology-sub-clair.mp3`];
  const boss = [`${baseUrl}assets/audio/touch-zavorin.mp3`];
  const music = createBackgroundMusic(background, options);
  let inMenu = true, bossActive = false, ducked = false, bossId = null, bossStartedAt = 0;
  const sync = () => {
    const fightingBoss = !inMenu && bossActive;
    music.setGainMultiplier((fightingBoss ? 1.15 : 1) * (ducked ? .48 : 1));
    music.setPlaylist(fightingBoss ? boss : background);
  };
  return {...music, setScreen(name) {
    // Settings and credits inherit the music of the screen that opened them.
    if (!sharedScreens.has(name)) { inMenu = menuScreens.has(name); sync(); }
  }, updateRun(run) {
    const now=Number.isFinite(run.time)?run.time:0;
    const target = !run.dead && !(run.won && !run.continued) ? run.enemies.find(bossEngaged) : null;
    const targetId=target?.id??(target?target:null);
    if (targetId !== bossId) { bossId = targetId; bossStartedAt = now; }
    const engaged = !!target && now - bossStartedAt < 45;
    if (engaged !== bossActive) { bossActive = engaged; sync(); }
  }, setDucked(value) {
    const next=!!value;if(next!==ducked){ducked=next;sync();}
  }};
}
