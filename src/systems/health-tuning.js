// Shared by simulation, equipment descriptions and review fixtures.
export const SHIELD_RECHARGE_SECONDS=15;
export const REGEN_INTERVAL_SECONDS=15;
export const ARMOR_REPAIR_SECONDS=15;
export const REGEN_MIN_SECONDS=.5;
export const REGEN_UPGRADE_SECONDS=1;
/** Item 2: Rootwalker legs and armour parts regenerate continuously instead of
 * only shortening the shared cell timer. Each part contributes 1% per second,
 * plus 0.3 percentage points per rank above I and per installed upgrade, and
 * every installed part adds its own share. */
export const CONTINUOUS_REGEN_BASE=.01,CONTINUOUS_REGEN_STEP=.003;
