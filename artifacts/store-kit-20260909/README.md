# BIOSO store kit

Prepared for early page setup on Yandex Games, CrazyGames, Telegram Mini Apps,
and VK Play. The playable build is still changing, so this kit deliberately does
not contain an upload archive or claim that the release build is final.

## Current approved-for-review candidates

- `key-art/bioso-leviathan-swarm-vertical-v1.png` — 941x1672, 9:16 promotional
  key art. Suitable as a vertical master and video storyboard frame.
- `key-art/bioso-root-cathedral-swarm-wide-v1.png` — 1672x941, 16:9 promotional
  key art. Suitable as a wide master and trailer storyboard frame.
- `key-art/bioso-root-cathedral-hero-3x1-v1.png` — 2172x724, generated 3:1
  hero master. Recomposition of the approved Root Cathedral battle, not a crop.
- `key-art/bioso-leviathan-swarm-square-v1.png` — 1254x1254, generated 1:1
  cover master. Recomposition of the approved Scrap Leviathan battle.

Both images are promotional artwork, not gameplay screenshots. Never upload
them into a field explicitly requiring a screenshot of actual gameplay.

## What will be placed

| Platform | Store art | Real gameplay media | Text |
| --- | --- | --- | --- |
| Yandex Games | 512x512 icon; optional maskable icon; 800x470 cover; 1560x520 hero | At least two 9:16 mobile screenshots; at least two 16:9 desktop screenshots if desktop is selected; optional vertical and horizontal MP4, up to 28 seconds | Russian and English metadata |
| CrazyGames | 1920x1080 landscape cover; 800x1200 portrait cover; 800x800 square cover | 16:9 and 2:3 silent preview videos, 15-20 seconds | English metadata |
| Telegram | Bot icon, splash art, localized Main Mini App previews | RU and EN preview images/video; final HTTPS game URL is required before the Main Mini App can be enabled | Russian and English bot descriptions |
| VK Play | Project logo/background and page artwork, cropped to the live form requirements | At least four real screenshots; RU and EN sets for international distribution; gameplay trailer | Russian and English metadata |

Exact crops and compressed exports are in `platforms/`. The four master PNG
files remain untouched. Platform exports contain no generated text or logo;
the existing BIOSO icon and wordmark are supplied separately under `common/`.

## Ready platform package

- `platforms/yandex/` — 512x512 icon, 800x470 cover, 1560x520 hero, RU/EN page drafts.
- `platforms/crazygames/` — 1920x1080, 800x1200 and 800x800 covers, EN page draft.
- `platforms/telegram/` — 512x512 bot icon, 1080x1920 and 1920x1080 previews, RU/EN bot drafts.
- `platforms/vk/` — 512x512 logo, 1080x1920, 1920x1080 and 800x800 page art, RU/EN drafts.
- `platforms/common/` — canonical existing BIOSO icon and wordmark.

See `PLATFORM_STATUS.md` for the remaining account, URL, legal and build fields.

## Directory contract

- `key-art/` — generated promotional artwork, never represented as gameplay.
- `screenshots/ru/` — real Russian gameplay captures only.
- `screenshots/en/` — real English gameplay captures only.
- `metadata/` — copy prepared for store forms.
- `video/` — capture and edit plan; final exports arrive after the build freezes.
- `platforms/` — exact-size promotional exports and copy-and-paste page drafts.

## Release gate

Before any final store submission, capture the real production route at
360x640 and 390x844, plus a wide browser with the same portrait game stage.
Remove debug panels, browser chrome, cursor, capture overlays, and test-only
copy. Verify that every pictured feature exists in the uploaded build.
