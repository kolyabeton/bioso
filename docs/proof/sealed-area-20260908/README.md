# Sealed Nursery area

Survival radius 7 -> 8.5 m (+47.4% area); mission rooms 7 -> 8 m within existing corridor bounds. Legacy non-flat maps retain 7 m. Updated at user request: enemies spawn in the central 3.2 m area, including the exact centre when clear, with 3 m player clearance. The initial pack checks clearance against the player destination at the centre. Larger arenas use a bounded 20,000 placement candidate budget.

Validation: 48/48 tests passed (sealed-pressure, sealed-timer, isaac, event-stages, mission-room-reward). Seeds 22 and 71 additionally retained 20 events and all three enlarged arenas. Production build passed with the existing large-bundle warning.

Screenshots: actual development route http://127.0.0.1:5173/?review=isaac&screen=sealed with isolated prepared level-5 fixture, normal Start action. Sizes 360x640, 390x844, 1280x720. These show arena startup, not a full manual victory. Temporary browser tab closed after verification.

`sealed-center-390.png` shows the updated central spawn on the same real review route, 390x844, eight initial enemies. 48 focused tests passed again.
