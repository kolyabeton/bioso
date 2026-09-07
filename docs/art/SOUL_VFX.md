# Soul VFX coverage

19 activation cues use the shared procedural renderer. The review page is `/proof/soul-catalog.html`; it explicitly injects presentation events for inspection, rather than claiming they were earned in a run. Production emission occurs in the gameplay handlers and never consumes additional gameplay RNG.

| Branch / nodes | Presentation |
| --- | --- |
| Might 0, 3 | Continuous damage modifiers; no independent activation |
| Might 1, 2 | Critical impact sparks on an actual critical hit |
| Tempo 0, 1, 2 | Existing attack/projectile timing and reach; continuous modifiers |
| Tempo 3 | Echo: snapshot of the actual hero geometry and directed repeat streak |
| Projectiles 0, 3 | Separate muzzle streaks for extra real projectiles |
| Projectiles 1 | Pierce streak at a collision that still has penetration remaining |
| Projectiles 2 | Three outgoing splinter streaks on a qualifying kill |
| Fire 0, 1, 2 | Flames/smoke/embers follow current burn state and expire with it |
| Fire 3 | Transfer of fire between source corpse and newly burning neighbour |
| Cold 0, 1 | Chilling mist follows active status |
| Cold 2 | Continuous damage modifier against chilled enemies |
| Cold 3 | Ice membrane and fragmentation at actual freeze |
| Electric 0, 1, 2, 3 | Branched arc follows actual proc cadence and actual chain endpoints |
| Vitality 0 | Maximum health modifier; no activation |
| Vitality 1 | Ready membrane persists with armorReady, impact sparks on block |
| Vitality 2 | Inward healing filaments only when regeneration restores HP |
| Vitality 3 | Strong restorative pulse and protective membrane on revival |
| Motion 0, 1 | Existing movement and XP attraction; continuous modifiers |
| Motion 2 | Armor cue when accumulated moving-hit charges make armor ready |
| Motion 3 | Activation dust and ongoing foot wake only while running bonus is active |
| Summons 0, 1 | Materialization, body glow and trails on actual summon shots |
| Summons 2 | Existing increased firing cadence |
| Summons 3 | Existing stronger hits and actual elemental status cues |
| Thermal | Flash, steam expansion and ice dust at actual thermal proc |
| Plasma | Hot arc with ignition at the target, not at the caster |
| Swarm | Two directed impulses on every qualifying third summon attack |
| Minor upgrades | Continuous modifiers, no invented activation |

The transient particle pool is bounded by quality. Two particle draw calls; at most two short-lived hero snapshots for echo. Pause stops particle age, shader time, snapshots and persistent emissions. Death/expired statuses stop further emissions. Reset drops snapshots without disposing shared hero geometry.
