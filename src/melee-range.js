import {bodySize} from './body-size.js';

export const HERO_MELEE_RANGE_MULTIPLIER=1.3;

/** Center-to-center reach starts at the outer edge of the installed body. */
export const heroMeleeAttackRange=(state,weaponReach)=>bodySize(state.body).radius+weaponReach*HERO_MELEE_RANGE_MULTIPLIER;
