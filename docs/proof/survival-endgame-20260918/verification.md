# Survival ending — 2026-09-18

Mother death starts a quest to earn another 100,000 biomass. All collection sources count, spending does not reduce progress. An 18-second in-world ending grows and spins the hero over 11 seconds, releasing canonical biomass capsules continuously, then hides the hero and releases the final shower. The ending has no caption or dimming overlay. Victory grants the existing three dice. The result offers unlimited record play.

Record play applies ×3 HP and damage, resets events with their original locations, resurrects defeated bosses immediately and again 60 survival seconds after subsequent deaths. Highest total collected biomass persists in the profile.

Checks: 37 focused tests passed (endgame, cadence, bosses, objective). Vite build passed. Real game review route `/?review=survival-ending&sound=0&lang=ru` exercised Mother death, quest and timed victory; `stage=victory` starts at the last instant for repeatable UI inspection. It is a deterministic fixture, not a complete earned survival playthrough.

Measured dialogs: 360×640 -> x=8 width=344 height=624; 390×844 -> x=8 width=374 height=828; 1280×720 -> x=445.5 width=389 height=704, world width=1280. No horizontal overflow. Footer buttons remained fully visible at 48px high. Scrolling and record continuation inspected in IAB, sound disabled.

Existing final-boss duel test fails for the needle build: speed=0, dead after 77 seconds, Mother HP=19061. Reproduced with the previous immediate-victory behavior restored in an isolated temporary coordinator; independent of this ending change.

Visual follow-up: frozen growth and burst frames use `stage=growth` and `stage=burst` on the same real game route for inspection only.

Camera-shake follow-up: charge tremor grows into a strong blast kick with a decaying horizontal/depth displacement and camera roll. Reduced motion disables shake. The delivered IAB route is `/?review=survival-ending&loop=1&sound=0&lang=ru`, with readiness delay before the first cycle and a two-second victory pause between replays. The frozen `stage=burst` route is for still inspection only.

Live mobile inspection after explicit reload observed elapsed=4.0842 with hold=false, camera x=0.04073/z=-0.00891/roll=-0.00077, then victory and a subsequent replay at elapsed=7.15 with a wider, fading particle shower. This confirms time advancement and repeat playback. Build passed.

Longer animation follow-up: live route at 390×844 observed elapsed=8.3582, scale=3.2221, spin=11.4395 radians, 95 biomass orbs and nonzero camera shake simultaneously. At 360×640 observed elapsed=4.1332, scale=1.8254, spin=4.2599 and 95 orbs; game and canvas measured 360×640. Glows shimmer with star-shaped glints; an energy light illuminates the hero and surrounding terrain. Timing checks passed (3/3); build passed.

Approved for game integration. Coordinator integration test now exercises the ordinary `step` path without any review parameters: Mother's death -> 100,000 newly earned biomass -> 11-second growth/charge -> explosion -> victory at 18 seconds. No preview hold is set in ordinary gameplay. Survival time freezes during the cinematic and the victory reward settles once. Endgame tests passed 4/4.

Guaranteed quest tool: the first survival Mother kill now drops a legendary rank-five reverse stomach on her ground position, independently of the three-choice boss reward, and unlocks it in the profile. Repeat Mother kills in the same run do not duplicate this dedicated drop; mission rewards are unchanged. Endgame and reverse-stomach checks passed 13/13, covering multiple seeds, position, quality/rank, once-per-run delivery, mission isolation and the existing composting requirements.
