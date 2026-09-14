# Item popup fit — 2026-09-08

Verified in the Codex in-app browser on the actual game assembly route:
`http://127.0.0.1:5173/?review=assembly&variant=sets`.
The existing DEV fixture uses isolated in-memory storage. Russian was selected through the game settings UI.

- 360×640: popup (12,8), 340×624. Root client/scroll height 622/622. Details client/scroll height 319/394; scrolled to 75/75. Footer stayed at y=419–618. All action buttons inside the frame; drop bottom y=608.
- 390×844: popup (42,137), 340×699. No horizontal overflow. All three action labels occupied one 20px line within their buttons; drop bottom y=812, popup bottom y=836.
- 1280×720: portrait stage x=437.5–842.5 (405px wide); popup x=445.5–785.5 (340px wide). No horizontal overflow; drop bottom y=688, popup bottom y=712.
- Upgrade: biomass 128→116, damage 6→6.7, upgrades 0→1; refreshed popup remained usable.
- Drop: equipped seed weapon removed, weight 184→174, popup closed.
- Inventory drill: install/recycle/drop all fit at 360×640, including the upgrade notice. Recycle removed the drill, biomass 116→123, popup closed.
- 8/8 item-inspector tests passed. Production build passed.
- Separate existing CTA contract test failed on the event footer regex in `src/ui/isaac-ui.js`, outside the two files edited for this fix.

Screenshots show the current popup at each required viewport and at the end of the mobile detail scroll.
