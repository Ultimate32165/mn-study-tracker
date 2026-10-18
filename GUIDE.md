# MN Study Tracker: project walkthrough

**How to use this file:** when you want a change, send the AI **this guide + the files it lists for that change**. Look up your task in section 2; it tells you which files to attach. If the AI needs another file it should say so.

The app is plain JavaScript (ES modules, no bundler) + Firebase (Auth + Firestore), installable as a PWA.

```
index.html            page shell
manifest.webmanifest  PWA info (not in this zip; unchanged)
icons/                app icons (not in this zip; unchanged)
sw.js                 offline cache
firestore.rules       Firebase security rules (pasted in the Firebase console)
css/style.css         ALL styling + themes
js/
  app.js              entry point: draws the page, handles every button, boots Firebase
  db.js               ALL Firebase reads/writes
  firebase-config.js  Firebase keys + optional sign-up code
  state.js            shared data store + study-time maths
  util.js             small helpers
  theme.js  sound.js  themes / background sounds
  home.js             login + "together" tab
  stats-view.js       "my stats" tab (+ badges)
  watch.js            the once-a-second background loop
  sheets.js           pop-up sheets (time wheel, profile/settings, "still studying?")
  social.js           cheers + cards-from-friends inbox
  milestones.js       celebration pop-ups
  pets.js             pets, growth stages
  garden-state.js  garden.js  garden-fx.js  decor.js  land.js    the garden tab
  carddata.js  photocard.js  card.js                     photocards
  board.js            shared to-do board tab
  forest.js           study forest tab
```

---

## 1. Every file, in detail

### Page, PWA and Firebase setup

| File | What's in it |
|---|---|
| **index.html** | The page shell: empty `#app`, `#modal` and `#toast` boxes. A tiny inline script applies your saved theme, "reduce motion" and theme customizations (`look` / `lookCss`) **before** the page paints (no colour flash). Loads the Google Fonts (Fredoka, Baloo 2, Nunito, Rye, Special Elite), `css/style.css`, `js/app.js`, the manifest and the iOS home-screen tags. The same inline script also sets `data-dark` ("1" on dark themes; CSS uses it to turn shadows black): **its regex must list the same dark themes as `isDark` in `theme.js`.** The fonts are preconnected. |
| **sw.js** | Service worker (offline support). `C` = cache version, `A` = list of files cached at install. Network-first: it tries the internet and falls back to the cache. **Add every new file to `A` and bump `C`**, or phones keep serving the old code. |
| **manifest.webmanifest**, **icons/** | PWA name, colours and icons. Not part of this change. |
| **firebase-config.js** | Your Firebase project keys, and `SIGNUP_CODE` (a secret word required to create an account; `""` = anyone can sign up). |
| **firestore.rules** | Security rules: who may read/write what. Users: any signed-in user can read, only the owner writes. `sessions`: owner only. `cheers`: anyone signed in can create, only the owner reads/deletes (emoji ≤ 40 chars). `gifts`: anyone can send a card (size/field checks, image < 700 000 chars), only the owner reads, marks seen or deletes. `board`: any signed-in user can read/add/move/edit/delete (text ≤ 200, lane 0-2). **A new collection/subcollection or a new size limit needs an edit here, then re-publish in the Firebase console.** |
| **db.js** | The **only** file that talks to Firebase (the UI never does). Sections: auth (`logIn`, `signUp`, `logOut`, `watchAuth`) · live listeners (`watchUsers`, `watchSessions`, `watchBoard`, `watchCheers`, `watchGifts`) · timer (`startStudy`, `pauseStudy`, `resumeStudy`, `cancelStudy`, `pomoBreak`, `checkIn`) · sessions (`addSession`, `editSession`, `deleteSession`, which also update the per-day totals) · profile and extras (`updateProfile`, `saveGarden`, `giveTreat`, `addBonus`, `saveForest`, `saveDecor`, `saveNick`, `saveLand`, `unlockBadge`) · social (`cheer`, `sendGift`, `markGift`, `deleteGift`) · board (`addNote`, `moveNote`, `editNote`, `deleteNote`, `clearNotes`) · `getSessionsSince` for the recap card. |

### Styling

| File | What's in it |
|---|---|
| **css/style.css** (≈835 lines) | Everything visual (UI v2). Roughly: **lines 1-43** design tokens (`:root`: `--r` / `--r2` corners, `--sh` / `--sh-s` / `--sh-on` soft shadows built from `--shc`, `--hair`, `--edge`) and all colour themes (`[data-theme=name]` rules, plus glass themes) · 44-59 base, background blobs and the **extra look** rules (`html[data-round=…]` corner radius, `html[data-shadow=…]` shadows) · 60-71 header + page + section titles (`h2`) · 72-90 avatars, progress ring, people cards, mini stats · 91-124 **timer hero** (`.dial` goal ring, `.study` button, `.duo` pause / stop) · 125-142 buttons, chips (`.chip`, `.chip.pri`), inputs, login (`.auth`, `.authcard`, `.logo`) · 143-151 bottom tab bar · 152-175 stats week card (`.wk`, `.bars`, `.trio`), session rows (`.sess`), cheer row · 176-181 cards / tiles switch (`.vt`) · 182-192 sheets + toast · 193-203 time wheel · 204-209 confetti · 210-258 calendar, badges, couple level, pet row, cheer pop-up · 259-465 garden scene, pets and garden extras (not touched by UI v2 stages 1-2) · then photocard sheet, inbox (`.gifts`), collapsible sections (`h2.fold`), `.mtog` (small switch, kept for the settings sheets), compact tiles (`.sq` / `.tile`), compact settings sheet (`.sheet.prof`), compact garden panel, reduce-motion, forest, to-do board, garden style rules and the **16 newer shop items** (campfire … pet house). The **cute cursors** are the very last block of the file (see section 4, item 15). The grass is drawn with `--gb` / `--gf` (a ground style replaces them; by default they copy `--gr-b` / `--gr-f`). Colours always come from theme variables, so everything follows the theme. The design rules are in section 4, item 16. (Line numbers are approximate.) |

### Core (shared by everything)

| File | What's in it |
|---|---|
| **js/app.js** | **Entry point, almost no logic.** `render()` draws the header (greeting from `hello()`, big page title from `TITLES`), the current tab and the bottom tab bar (`NAV` = list of `[tab id, icon, label]`; **to rename, reorder or add a tab edit `NAV`**); `addBoardNote` + `initBoard` glue; the big `app.onclick` handler (every `data-act="..."` button: login, tab, study/pause/resume/stop, cheer, sound, garden buttons (incl. `gtrick`, `gname`, `gland`), card, calendar, add/edit/delete session…); boot (`DB.watchAuth` → start the live listeners). **To change what a button does or add a button's action, edit here.** Pressing Enter in a login field clicks "log in". |
| **js/state.js** | The shared store: `me`, `users`, `sessions`, `gifts`, `board`, `tab` (read them anywhere; change them only via `setUsers()`, `setTab()`, …) and `ui.render()`. Also the study-time maths for one user: `elapsed`, `runStart`, `goalOf` (default 4 h), `limitOf` (3 h), `focusOf`/`restOf` (pomodoro 25/5), `liveToday`, `totalOf`; and the couple level: `LV_H` (hours per level), `LV_T` (level names), `couple()`, `coupleCard()`. |
| **js/util.js** | Helpers with no dependencies: `$`, `app`, `modal`, `esc` (HTML-escape), `EMOJI` (avatar choices), `DAY`, `ls` (safe localStorage), `key` (date → `YYYY-MM-DD`), `fmt` (`1h 5m`), `clock` (`00:05:00`), `split` (cuts a session at midnight), `stats` (today / week / total / streak), `toast`, `errMsg` (friendly error texts), `foldSet` + `sec` (collapsible sections), `burst` (confetti), `notify` (browser notification). |
| **js/watch.js** | The loop that runs every second while the app is open (plus a full redraw every 30 s): updates the running clocks; pomodoro auto-break and "break's over"; "still studying?" prompt; daily-goal confetti; streak records; badge check; stops sound when the timer stops; checks new garden friends, pet evolution, new seeds, forest growth, couple level-up; keeps the garden in sync. **Anything that should happen on its own, without a click, lives here.** |
| **js/theme.js** | `THEMES` (name → icon + colour), the lists shown in the profile sheet (`CUTE`, `DARK`, `SEASON`, `GLASS`), `applyTheme`, `setTheme`, and the reduce-motion switch (`calm`, `toggleCalm`). Also the **extra look** (profile sheet → customize theme): `LOOK` (corners / shadows choices), `HUES` (background tints), `ACCENTS` (accent colours), `look` (the saved choice), `setLook` (also handles `"random"` and `"reset"`), `applyLook` (sets `data-round` / `data-shadow` and colour variables on `<html>`, called by `applyTheme`), and the button builders `lookBtns`, `dotBtns`, `isLook`. `applyTheme` also sets `<html data-dark>` (from `isDark`) so the CSS can swap shadow colours. |
| **js/sound.js** | Background sounds (rain / cafe / ocean) generated with the Web Audio API (no audio files): `playSound`, `stopSound`, `cycleSound`, `soundLabel`. |

### Tabs and screens

| File | What's in it |
|---|---|
| **js/home.js** | Login / sign-up screen (`authView`: logo tile + `.authcard` form), the "install app" button, and the **together tab**: `heroView` (the timer: the study button sits inside the daily-goal ring `.dial`; while studying the clock sits inside the ring and pause / stop are two wide buttons; pomodoro + sound chips), then the people list: your `card` and your friends' cards, or `tile` squares when the **cards / tiles switch** (`.vt`, next to the "together" heading) is on, then the couple level and the card inbox. Owns the `compact` and `pomo` switches. |
| **js/stats-view.js** | The **my stats tab**: the **week card** (this week's total, 7-day bars where today is solid and days that reached your goal are green, and a today / streak / all-time row), calendar heat-map (`calView`), **badges** (`BADGES` list with unlock rules, `badgeCtx`, `badgeView`, `checkBadges`), and the session list with add / edit / delete buttons. |
| **js/board.js** | The **board tab** (shared to-do): three lanes of sticky notes, drag & drop (mouse, or press-and-hold on touch), the colour/sticker palette, the edit sheet, the 6 board looks (`STYLES`: cutie, western, cork, chalk, notebook, own), `COLORS` (16), `STICKERS`, and `boardSnap` for the photocard. Notes live in Firestore `board/{id}`. |
| **js/forest.js** | The **forest tab**: 6×6 isometric grid where you plant trees with seeds. `SPECIES` (price, colours, hours of study needed per growth stage, drawing shapes), the isometric drawing, `forestMain` (screen), `forestAct` (plant / remove), `forestGrow` (toasts when a tree grows), `forestOf`/`forestCost`/`forestSnap`, and `treeParts`/`cellPos` (also used by `card.js`). Saved in `users/{uid}.forest`. |

### Pets and garden

| File | What's in it |
|---|---|
| **js/pets.js** | `PETS` (12 starter pets with emoji per stage + accessory), `EXTRA` (14 unlockable pets, each with its unlock rule `ok(user)`), `ALLP`, `MAX_FRIENDS`, growth thresholds `STAGE` (30 min / 5 h / 20 h), `stageOf`, `stageNames`, `nickOf` (a pet's nickname, from `users/{uid}.nicks`), `petRow` (the pet line on cards, shows the nickname). |
| **js/garden-state.js** | Garden constants and the shared `G` object: world size `WW`×`WH` (built from `K` = how many times wider and deeper than the old 980×680 garden, now **3**, and `HZ` = horizon; `GY(y)` maps an old-garden y to the big one, `fromClassicY` / `toClassicY` convert y fractions to and from the old size), `ZMAX` (closest zoom), the zoom / pinch fields on `G` (`z`, `zt`, `za`, `pts`, `pinch`), pond `POND` (3× the old pond, same relative spot), walking `BASE` speed, `BOUNDS`, `MOVE` (speed + hop per pet), `FACE_RIGHT`, speech bubbles, weather table (`WXL`, `WX_POOL`), garden style: `LAND` (the ground / fence / border / path choices), `DEF_LAND`, `landOf` (the newest saved style wins), `PATH_PTS` + `pathD` (the path curve), `TREAT` cost, `VIS_DAY` visitor cap, helpers `rnd`, `seeded`, `isEvening`, `moodOf`, `inPond`. |
| **js/garden.js** | The living scene: build the garden, camera (drag to look around, **pinch with two fingers or the ＋ － buttons to zoom**, ctrl + wheel on a computer, 📍 find my pets; `zoomBy`, `pinchStart` / `pinchMove`, `clampZ`, `camStep` does the zoom glide; the world is drawn as `scale(z) translate(-cam)`, and `buildGarden` also sets the world size variables `--ww` / `--wh` and sizes the pond), who is in the garden (`gardenList`, max 12), creating/updating pet elements, `stepPet` (all pet animation), the animation loop, flowers/trees/butterflies by couple level (`buildDeco`), treats, the pet info card (`gardenTap`: tricks, treat and ✏️ name buttons), `trick` (sit / spin / wave), `nameSheet` (nickname sheet), `setPet` (look, mood and name tag), the "garden friends" picker, `gardenMain` (tab layout). |
| **js/garden-fx.js** | Garden extras: weather (`wxHtml`, `wxView`, `cycleWx`; the weather lives **in the world** so it pans and zooms with the garden, but only in 980×680 chunks near the window: `camStep` calls `wxView` every frame to add / drop chunks), floating hearts, cheer visits (a friend's pet runs over to yours), study-buddy and nap pairs, and visitors you tap for seeds (`VIS`: butterfly, bird, hedgehog, frog, bunny, duck, rare deer; `collectVisitor`). |
| **js/decor.js** | Seeds and decorations: `CATS` (shop sections: cozy / nature / magical / pet corner), `ITEMS` (all 25 shop items: price, section `c`, `flat`, `water`), `ART` (CSS-drawn look of each item), `SEED_SEC` (1 seed per 5 min), `MAX_DECOR` (20), `upgradeD` (carries older saved positions into today's bigger garden, saved format `v:3`), `clampY`, `seedsEarned`/`seedsLeft`, the garden side panel (`gardenPanel`, incl. the 🎨 style garden and 📸 garden photocard buttons), decorate mode (`enterEdit`, `exitEdit`, `delSel`), the shop sheet, dragging items. |
| **js/land.js** | The garden **style** (🎨 style garden): `applyLand` (puts a style on the live garden: class `gr-<ground>` on `#garden`, `f-<fence>` on `.gfence`, `b-<border>` on `.gborder`, `p-<path>` on the SVG `.gpath`), `syncLand` (called from `syncGarden`; skips while the style sheet's live preview is open), `landSheet` (the sheet: live preview, cancel / save; its buttons are built from `LAND` in `garden-state.js`), `borderHtml` (the row of flowers / mushrooms / pebbles along the front edge, as wide as the world). Saved in `users/{uid}.land = { g, f, b, p, at }`; **the newest `at` among everybody wins**, so the garden is shared. |

### Pop-ups and social

| File | What's in it |
|---|---|
| **js/sheets.js** | Pop-up sheets: the hours:minutes **time wheel** (`sheet`, used for goal, limits, add/shorten session, pomodoro), `askStill` ("still studying?"), and `profileSheet` (name, emoji, daily goal, still-studying limit, pet, pomodoro lengths, notifications, reduce motion, theme pickers, a collapsible "customize theme" section with background tint, accent, corners, shadows, 🎲 surprise me and reset, log out). |
| **js/social.js** | Cheers: `STICKERS` (the text stickers), `cheerCard` (pop-up when you receive one), `stickerSheet`. Cards from friends: `onGifts`, `giftsView` (inbox on the together tab), `giftSheet`, `safeImg` (only accepts plain JPEGs). |
| **js/milestones.js** | Celebrations: pet evolved pop-up, streak-record and level-up pop-ups, "new garden friend unlocked", and the "make a card" button inside them. |

### Photocards

| File | What's in it |
|---|---|
| **js/carddata.js** | Builds the **data** each card shows: reads the current theme colours (`cardPal`), snapshots the garden (`gardenSnap`, includes the garden style `land`; **every y in it is converted back to the OLD 680px garden frame** because the card still draws the old-size picture; `cardPal` also reads the grass `--gb`/`--gf`, the fence `--fc` and the dirt / hedge / bamboo colours), and `cardData` (me), `cardDataTogether`, `cardDataRecap` (7/30 days: best day, busiest time…), `cardDataMilestone`, `cardDataBoard`, `cardDataGarden` (the garden card: the **whole big garden** from `gardenWorldSnap`, which copies the real world size / pond / path from `garden-state.js`, takes decorations at their real spots and pets from where they stand right now in `G.pets`, plus three facts: pets, garden level, decorations / weather). |
| **js/photocard.js** | The photocard **sheet**: mode (me / together / recap / board / **garden** / milestone) / period / shape, and the **bottom picture** option for the normal cards: **forest or none** (the garden is no longer a bottom picture, it has its own card; the garden card has its own remembered shape `cardOpt.gshape`, incl. a wide one, and no scene buttons and no 💌 send button), the **look controls**: style chips, accent-colour dots, 🎲 shuffle, and a "more ways to customize" section (font, corners, background pattern, corner stickers, photo filter, dark tone, footer message, reset). All buttons are built automatically from the tables in `card.js` and handled by one `data-look` click handler; `loadLook` / `saveLook` keep the whole look as one JSON string on this device, `renderCard` (draws the preview and passes the chosen look to `drawCard` as `data.look`, and loads the fonts the look needs), save, share, send to a friend (`giftImg` makes the small JPEG), remembers your latest milestone. |
| **js/card.js** | Pure canvas drawing (no DOM, no Firebase): `drawCard` and one drawer per card (me, together, recap, milestone, board), plus the garden/forest scene it draws at the bottom. Sizes: square / 4:5 / story (`SIZES`; the garden card also has a wide one: `GSIZES`). **Card styles** (section "card styles" near the bottom): `STYLES` (10 looks: classic, sticker, glass, midnight, scrapbook, gilded, polaroid, film, ticket, stamp), `ACCENTS` (colour override), `skin` (palette used: forced dark for midnight + accent), `paintBg` (background patterns), `tile` (look of the cards/tiles, reads the current style), `paintDeco` (stars / tape / double border), `paintPat` (chosen background pattern: dots / hearts / stars / stripes / checks / waves), `paintFilter` (colour grade over the finished card: warm / cool / vintage / mono / vivid / dreamy), `paintStick` (3 emoji in the margins; `STK` = the sticker packs), `FONTS`, `CORNERS` (tile corner radius via `rad`), `PATTERNS`, `STICKERS`, `FILTERS`, and `d.look` (read once per card into `LK`: `{ style, accent, font, round, pat, stick, filt, dark, msg }`), `paintFrame` (polaroid / film / ticket / stamp: draws the frame and calls back to draw the normal card into a smaller box, so the content re-flows instead of being squashed), `paintCard` (one card without the style wrapper). The garden scene at the bottom has its own helpers: `FLAT` (items that lie flat), `drawItem` (one branch per shop item) and the garden-style drawers `drawGround`, `drawFence`, `drawPath`, `drawBorder` (they read `g.land`). **Garden card** (`d.kind === "garden"`): `drawGardenCard` draws only the garden, using `drawWorld` (the full 3× world at its real size; flowers, trees and butterflies use the same seeds / rules as `buildDeco` in `garden.js`; sun, rainbow, clouds, fence, tree and pond-highlight sizes / spots are copied from `style.css`: `.gsun`, `.grain`, `.gcl`, `.gfence`, `.tree`, `.gpond::after`; the live clouds drift, so the card spreads them evenly) (wide = the garden fills the card with the title and date floating on the sky; square / 4:5 / story = header, garden, three fact tiles, and on story a row of the pets), on a canvas `GQ` (= 2) times bigger than its layout size, so the saved picture is sharp. The old-size `drawScene` picture (980×680) is now only a fallback for cards whose `garden` has no `world`; the normal cards no longer use it (forest / none only). **No picture at the bottom:** when `d.garden.none` is set, `drawScene` returns at once and each card layout uses garden share 0 with taller tile caps. |

---

## 2. "I want to change X" → which files

Attach this guide + the files in the **Change** column. "Maybe" files are only needed for some versions of the change.

### Look and feel
| I want to… | Change | Maybe |
|---|---|---|
| Add a corner or shadow choice / accent colour / tint | `theme.js` (`LOOK`, `HUES` or `ACCENTS`), `css/style.css` (the "extra look" block: one `html[data-round=name]` / `html[data-shadow=name]` rule per choice) | `sheets.js` only for a new *kind* of option (add a row in the "customize theme" section) |
| Add or edit a colour theme | `theme.js` (`THEMES` + a list), `css/style.css` (a `[data-theme=name]` block, copy an existing one and define **all** the same variables; **also add that theme's four cursor variables** in the cursor block at the end of the file) | `index.html` only if the default theme changes |
| Change the **cursors** (shape, colours, size, turn them off) | `css/style.css` (the "cute cursors" block at the very end: one four cursor variables per theme, then the few rules that use them) | `theme.js` + `app.js` only if the cursor should also follow the customize-theme accent colour (needs a small JS step, see section 4 item 15) |
| Change fonts | `index.html` (font link), `css/style.css` (`--hf` etc.) | |
| Restyle cards, buttons, nav, sheets | `css/style.css` | the view file that makes the HTML (`home.js`, `stats-view.js`, `sheets.js`…) |
| Change the app title / logo on the login screen | `home.js` (`authView`) | `index.html` (`<title>`), `manifest.webmanifest` |
| Change the tab bar (rename, reorder, add a tab) | `app.js` (`NAV` list + `TITLES`, and the tab switch in `render`) | the new tab's view file, `css/style.css` |
| Change the timer area (study button, goal ring, pause / stop buttons) | `home.js` (`heroView`), `css/style.css` ("timer hero" block) | `app.js` (study / pause / stop actions) |
| Change the page header (greeting, big title, avatar button) | `app.js` (`hello`, `TITLES`, `render`), `css/style.css` ("header + page") | |
| Change the design tokens (corner size, shadows, hairlines) | `css/style.css` (`:root` block at the top; `html[data-round]` / `html[data-shadow]`) | `theme.js` (`LOOK` choices) |

### Studying, timer, stats
| I want to… | Change | Maybe |
|---|---|---|
| Change what the study / pause / stop button does | `app.js` (actions), `db.js` (`startStudy`…) | `home.js` |
| Change pomodoro (default 25/5, auto-break) | `watch.js` (auto-break), `state.js` (`focusOf`/`restOf` defaults), `sheets.js` (settings) | `db.js` (`pomoBreak`), `home.js` (chip) |
| Change the daily goal default or the "still studying?" time | `state.js` (`goalOf`, `limitOf`) | `sheets.js`, `watch.js` |
| Change how streak / week / total are counted | `util.js` (`stats`) | `watch.js` (streak records) |
| Change how sessions are saved or split at midnight | `util.js` (`split`), `db.js` (`addSession`, `editSession`, `deleteSession`) | `app.js` (stop/add/edit actions) |
| Change the stats tab (bars, tiles, calendar) | `stats-view.js` | `css/style.css` |
| Add / change a badge | `stats-view.js` (`BADGES`) | `pets.js` (if a pet unlocks with it) |
| Change the "add time" / "shorten session" screens | `sheets.js` (`sheet`), `app.js` (`add` / `edit` actions) | |
| Change the recap card numbers (best day, busiest time…) | `carddata.js` (`cardDataRecap`) | `card.js` (`drawRecap`) |

### Pets and garden
| I want to… | Change | Maybe |
|---|---|---|
| Add a starter pet | `pets.js` (`PETS`), `garden-state.js` (`MOVE`, maybe `FACE_RIGHT`) | |
| Add an unlockable pet / change unlock rule | `pets.js` (`EXTRA`), `garden-state.js` (`MOVE`) | `stats-view.js` (if tied to a badge) |
| Change growth speed (hours to evolve) | `pets.js` (`STAGE`) | `forest.js` is separate: trees use their own hours |
| Change how pets walk, jump, sleep | `garden.js` (`stepPet`), `garden-state.js` (`MOVE`, `BASE`) | |
| Change pet speech bubbles / texts | `garden-state.js` (`BUB`, `SAY`), `pets.js` (`petRow`) | |
| Change the garden's size (e.g. 2× or 4× instead of 3×), pond, or where pets may stand | `garden-state.js` (`K`, `HZ`, `POND`, `BOUNDS`; the pond, path, bounds, buddy / nap spots, trees and border follow `K`) | `garden.js` (`buildDeco`: how many flowers / extra trees), `garden-fx.js` (`NAP` spots), `land.js`. **Nothing to copy any more:** the CSS sizes are set from `garden-state.js` in `buildGarden`, and `card.js` keeps its own old-size picture (section 4, point 1). If you change `K`, existing decorations keep their relative spot |
| Change zoom limits / zoom speed / the zoom buttons | `garden-state.js` (`ZMAX`), `garden.js` (`zMin`, `zoomBy` factors 1.5 in `buildGarden`, `camStep`), `css/style.css` (`.gzoom`) | `decor.js` (dragging maths divides by `G.z`) |
| Change flowers / trees / rainbow by level | `garden.js` (`buildDeco`) | `state.js` (`LV_H`), `css/style.css` |
| Change the couple level names / hours | `state.js` (`LV_H`, `LV_T`) | |
| Add a shop item | `decor.js` (`ITEMS`: price, section `c`, `flat`/`water`; and `ART`), `css/style.css` (draw it; add `.gi.t-name{width;margin-left}` if it is wider than 72 px), `card.js` (a `drawItem` branch so it shows on photocards; also add it to `FLAT` if it is `flat: true`) | |
| Add a shop section (e.g. "winter") | `decor.js` (`CATS`, and `c:` on the items) | |
| Change prices, seeds per minute, max decorations | `decor.js` (`ITEMS`, `SEED_SEC`, `MAX_DECOR`) | `garden-state.js` (`TREAT`), `forest.js` (tree prices) |
| Change visitors (which animals, how often, daily cap, seeds given) | `garden-fx.js` (`VIS` = emoji, name, speed, how often; `visStep` for how each animal moves; `collectVisitor`), `garden-state.js` (`VIS_DAY`) | |
| Add a ground / fence / border / path choice | `garden-state.js` (`LAND`), `css/style.css` (ground: `#garden.gr-name` sets `--gb`/`--gf`, plus a `.night` version; fence: `.gfence.f-name`; border: `.gborder.b-name`; path: `.gpath.p-name`), `card.js` (`drawGround` / `drawFence` / `drawBorder` / `drawPath`) | `land.js` (`borderHtml`, only for a border made of little things). The sheet buttons appear by themselves |
| Move the path / change the border row | `garden-state.js` (`PATH_PTS`), `card.js` (its copy of `PATH_PTS`) | `land.js` (`borderHtml`), `css/style.css` |
| Change who sees a garden style (e.g. each person their own) | `garden-state.js` (`landOf`) | `land.js`, `db.js` (`saveLand`) |
| Pet nicknames (length, where they show) | `pets.js` (`nickOf`, `petRow`), `garden.js` (`nameSheet`, `setPet`, `gardenTap`) | `db.js` (`saveNick`), `milestones.js` / `carddata.js` if you want them on pop-ups or cards |
| Pet tricks (add one, change timings) | `garden.js` (`trick`, the buttons in `gardenTap`, the pose code in `stepPet`) | `css/style.css` (`.gtricks`) |
| Change weather types / how often it changes | `garden-fx.js`, `garden-state.js` (`WXL`, `WX_POOL`), `css/style.css` (weather section) | |
| Change the garden side panel / buttons | `decor.js` (`gardenPanel`), `app.js` (actions) | |
| Change the pet info card or treats | `garden.js` (`gardenTap`, `treat`) | `db.js` (`giveTreat`) |

### Forest
| I want to… | Change | Maybe |
|---|---|---|
| Add a tree species / change tree prices or growth hours | `forest.js` (`SPECIES`) | `card.js` draws trees from the same data, so usually nothing |
| Change the forest grid size | `forest.js` (`N`) | `card.js` |
| Change the forest screen or planting flow | `forest.js` (`forestMain`, `forestAct`) | `app.js` (`fcell` action), `css/style.css` (forest section) |

### Friends, cheers, cards
| I want to… | Change | Maybe |
|---|---|---|
| Add / edit cheer stickers (the 💌 texts) | `social.js` (`STICKERS`) | `firestore.rules` (cheer length limit 40) |
| Change the quick emoji cheers (💖 🔥 🧋 🫶) | `home.js` (card + tile buttons) | |
| Change the pop-up when a friend cheers you | `social.js` (`cheerCard`) | `app.js` (boot, `watchCheers` handler) |
| Change cards-from-friends (inbox, send, size) | `social.js`, `photocard.js` (`giftImg`, send button) | `db.js` (`sendGift`), `firestore.rules` (image size < 700 000) |
| Change what a photocard shows | `carddata.js` (data) + `card.js` (drawing) | `photocard.js` (options) |
| Add a new photocard type | `carddata.js`, `card.js`, `photocard.js` (modes) | `app.js` (button that opens it) |
| Change photocard sizes | `card.js` (`SIZES`; the garden card: `GSIZES` and `GQ`, how much sharper it is drawn) | `photocard.js` (shape buttons) |
| Change the **garden card** (layout, the three facts, wide shape, sharpness, what the big garden shows) | `card.js` (`drawGardenCard`, `drawWorld`, `GSIZES`, `GQ`), `carddata.js` (`cardDataGarden`, `gardenWorldSnap`) | `photocard.js` (its shape / mode buttons), `decor.js` (`gardenPanel` button) |
| Change what the normal photocards show at the bottom (forest / none) | `photocard.js` (`cardOpt.scene`, `renderCard`, the scene buttons), `card.js` (`drawScene`, the layout caps for `d.garden.none`) | |
| Add a photocard **style** (new look) | `card.js` (`STYLES` entry + whatever it uses: `paintBg`, `tile`, `paintDeco`, or `paintFrame`) | `photocard.js` only if it needs a font loaded first (see the `document.fonts.load` line in `renderCard`); the chip appears by itself |
| Add / change a photocard **accent colour** | `card.js` (`ACCENTS`: `[main, light]`) | `css/style.css` (`.adot`) only for the dot's look |
| Add a **font / corner shape / background pattern / sticker pack / filter** to the photocard | `card.js` (`FONTS` / `CORNERS` / `PATTERNS` + `paintPat` / `STK` + `STICKERS` / `FILTERS` + `paintFilter`); the button appears by itself | `photocard.js` (font loading in `renderCard`, only for a new font), `index.html` (only if the font isn't loaded yet) |
| Add a **new kind of option** (a new key in the look) | `card.js` (read it from `LK`), `photocard.js` (`DEF`, `TBL` if it is a pick-list, and a row in the "more ways to customize" HTML) | `css/style.css` |
| Change how the style chips / colour dots look or behave | `photocard.js` (`cardSheet`), `css/style.css` ("photocard look" block; the chips wrap on purpose, so nothing needs sideways scrolling on a PC) | |
| Add a **frame** (like polaroid / film) | `card.js` (`paintFrame` + a `STYLES` entry with `frame:`) | |

### Board
| I want to… | Change | Maybe |
|---|---|---|
| Add a board look / colour / sticker | `board.js` (`STYLES`, `COLORS`, `STICKERS`), `css/style.css` (board section) | `card.js` (board card skins `BSKIN`) |
| Change lanes (names, number) | `board.js` | `firestore.rules` (lane in [0,1,2]), `db.js`, `card.js` |
| Change note length | `board.js` (`maxlength`) | `firestore.rules` (limit 200) |
| Change board behaviour on drop (e.g. "Done" confetti) | `app.js` (`initBoard` handler) | `board.js` |

### Accounts, data, PWA
| I want to… | Change | Maybe |
|---|---|---|
| Change login / sign-up rules (username format, secret code) | `app.js` (`login`/`signup` action), `firebase-config.js` (`SIGNUP_CODE`) | `home.js`, `db.js` |
| Save a **new field** on the user | `db.js` (new function or `updateProfile`), the file that uses it | `firestore.rules` only if it's a new (sub)collection |
| Add a **new collection** (e.g. notes, goals list) | `db.js`, `firestore.rules`, a new view file | `app.js` (listener in boot + tab), `state.js` (new store variable + setter) |
| Change notifications | `util.js` (`notify`), `watch.js` (when to fire), `sheets.js` (button) | |
| Change install-to-home-screen behaviour | `home.js` (`installCard`), `app.js` (`beforeinstallprompt`) | `manifest.webmanifest` |
| Fix "old version keeps showing" / offline issues | `sw.js` (bump `C`, check list `A`) | |
| Add a **new JS file** | create it, import it where needed, add to `sw.js` list `A` and bump `C` | |

---

## 3. What is saved where (Firestore)

| Path | Fields | Written by (`db.js`) | Mainly used in |
|---|---|---|---|
| `users/{uid}` | `username`, `name`, `emoji`, `pet` | `signUp`, `updateProfile` | everywhere |
| | `status` (`offline`/`studying`/`paused`), `startedAt`, `runStart`, `accum`, `breakAt`, `checkedAt`, `pomo`, `nextBreak` | `startStudy`, `pauseStudy`, `resumeStudy`, `cancelStudy`, `pomoBreak`, `checkIn` | `state.js`, `home.js`, `watch.js` |
| | `daily` = `{ "YYYY-MM-DD": seconds }` | `addSession`, `editSession`, `deleteSession` (increment) | `util.js` `stats`, `stats-view.js`, cards |
| | `goal`, `limit`, `pomoFocus`, `pomoRest`, `bestStreak` | `updateProfile` | `state.js`, `sheets.js`, `watch.js` |
| | `badges` = `{ id: time }` | `unlockBadge`, `updateProfile` | `stats-view.js`, `pets.js` |
| | `garden` (picked friends), `decor` (placed items `{ i, k, v, x, y }`; positions are fractions of the whole garden, `v:3` = today's 3× garden, older `v:1` / `v:2` items are carried over by `upgradeD` when read), `treats`, `bonus` (visitor seeds) | `saveGarden`, `saveDecor`, `giveTreat`, `addBonus` | `garden*.js`, `decor.js` |
| | `nicks` = `{ petType: "nickname" }` (max 14 characters, `""` = none) | `saveNick` | `pets.js`, `garden.js` |
| | `land` = `{ g, f, b, p, at }` (ground, fence, border, path, time saved; the newest `at` among users is the shared garden style) | `saveLand` | `land.js`, `garden-state.js` (`landOf`), `carddata.js` |
| | `forest` = `[{ s, c, t }]` | `saveForest` | `forest.js` |
| `users/{uid}/sessions/{id}` | `start`, `seconds`, `days`, `manual` | `addSession`, `editSession` | `stats-view.js`, `carddata.js` |
| `users/{uid}/cheers/{id}` | `from`, `name`, `emoji`, `at` (deleted after being shown) | `cheer` | `social.js` |
| `users/{uid}/gifts/{id}` | `from`, `name`, `emoji`, `kind`, `img`, `seen`, `at` | `sendGift`, `markGift`, `deleteGift` | `social.js` |
| `board/{id}` | `text`, `lane`, `o` (order), `color`, `icon`, `by`, `name`, `emoji`, `at` | `addNote`, `moveNote`, `editNote`, `deleteNote`, `clearNotes` | `board.js` |

On this device only (localStorage): theme, photocard look (`cardLook`: style, accent, font, corners, pattern, stickers, filter, tone, footer message), motion, extra theme look (`look`, plus `lookCss` that `index.html` applies before the first paint), compact tab, pomodoro on/off, sound, fold state, weather choice, board look, card shape, bottom picture (forest / none), garden-card shape (`cardGShape`), last milestone, "already celebrated" markers.

---

## 4. Things that must stay in sync (common sources of bugs)

1. **Garden size** now lives in ONE place: `K` / `HZ` in `garden-state.js` (`WW`, `WH`, `POND`, `BOUNDS`, `PATH_PTS` are worked out from them). `buildGarden` copies the size into the page (`--ww`, `--wh` and the pond element's size), so `css/style.css` no longer holds those numbers; the fence (starts at 53% of the width), the front border (`bottom:0`), the sun and the rainbow in the CSS are relative to the world size. **The photocard is the exception:** `card.js` keeps its OWN old-size garden (`WW=980`, `WH=680`, `POND`, `PATH_PTS`, fence, border row: leave them alone) and draws the whole big garden shrunk into it. `carddata.js` `gardenSnap` converts every y with `toClassicY` / `fromClassicY` to make that work, so do not read live garden positions straight into a card. **Zoom:** `G.z` is screen px per world px; anywhere a screen position becomes a world position (dragging a decoration, where a new item or visitor appears) divide by `G.z`.
2. **Themes**: a name in `theme.js` `THEMES` needs a matching `[data-theme=…]` block in `style.css`. Photocards read the theme's CSS variables, so a new theme must define every variable the others do. The extra look (tint, accent) overrides `--bg1 --bg2 --glow1 --glow2 --b1 --b2 --main --main-l --main-d` as inline styles on `<html>`, so it works on every theme; the tint is generated light or dark to match the theme (`isDark` in `theme.js`: keep it in sync when you add a dark theme).
3. **New files** go into `sw.js` list `A`, and `C` must be bumped, otherwise installed phones keep the old version.
4. **Firestore rules vs app limits**: board text (app 140, rule 200), cheer emoji (rule 40), gift image (app ≈ 380 000, rule < 700 000). If you raise an app limit, raise the rule and re-publish.
5. **Shared data** (`me`, `users`, `sessions`, `gifts`, `board`, `tab`) is changed only inside `state.js` (setters). The same goes for `compact`/`pomo` (`home.js`), `theme`/`calm` (`theme.js`), `sound` (`sound.js`).
6. **Redraw from another file**: call `ui.render()` (from `state.js`); never import `app.js`.
7. **New function used by another file**: add it to the `export { … }` line at the bottom of its file and import it where it's used.
8. **New pet or tree**: also give it an entry in the movement table (`MOVE` in `garden-state.js`) / price+hours (`forest.js` `SPECIES`); missing entries fall back to defaults but won't feel tuned.
9. **Photocard styles**: a new `STYLES` entry needs nothing else for the chip to show up. If a style draws text in a special font (e.g. `MONO` = Special Elite), load it in `photocard.js` `renderCard` before drawing, or the canvas silently falls back to a plain font. A **font** other than Fredoka / Nunito must be loaded with `document.fonts.load` before drawing too (already done for the ones in `FONTS`). A style that forces its own colours (like `midnight`'s `dark: true`, or the "dark" tone switch) must set every colour the cards read (`bg1 bg2 card ink sub tint edge glow1 glow2` in `skin`). `tile()` is the only place tiles are drawn; don't draw card backgrounds anywhere else, or the style won't apply to them.
10. **Shop items**: every item id must exist in `ITEMS` (decor.js), `ART` + CSS, **and** as a `drawItem` branch in `card.js`. `flat: true` in `ITEMS` must match the `FLAT` set in `card.js`, or photocards draw it in the wrong layer.
11. **Garden style**: the grass is `--gb` / `--gf`, not `--gr-b` / `--gr-f` directly, because a ground style replaces them. A new ground needs a `.night` version in the CSS and a speckle branch in `card.js` `drawGround`. `landOf` validates the saved choice, so unknown values fall back to the classic look. The border row spacing (every 32 px from x = 14) exists in both `land.js` and `card.js`.
12. **Nicknames** are saved per pet *type* (not per pet slot), so changing your main pet doesn't lose them. `nickOf` trims and cuts at 14 characters; always show it through `esc()`.

13. **Garden card and "no picture"**: the garden card is drawn on a canvas 2× bigger than its layout size: `drawCard` sets `cv.width = W * 2` and calls `ctx.scale(2, 2)`, so every style, frame and filter keeps working in the normal 1080-based units. Always lay out with `W` / `H`, never with `cv.width`. The normal cards get `data.garden.none = true` (set in `photocard.js`) when the bottom picture is "none": `drawScene` returns at once and the layouts use garden share 0 plus bigger tile caps (see `drawTogether`, `drawRecap`, `drawMilestone` and the first lines of `paintCard`). A new card kind that draws a scene must do the same. The garden mode hides the 💌 send button on purpose: inbox cards are small 640 px JPEGs, and `social.js` / `firestore.rules` do not know a `garden` card kind.

14. **Garden card = the real garden**: `drawWorld` must follow `garden.js` and the garden CSS (sun / rainbow / cloud / fence / tree sizes and spots): when `buildDeco` changes (how many flowers / trees / butterflies, their seeds or positions), copy the change into `drawWorld`, in the same order of `seeded` calls, or the card no longer matches the live garden. The world size, pond and path come from `garden-state.js` through `d.garden.world`, so changing `K` needs no edit in `card.js`.

15. **Cursors**: the last block of `css/style.css` gives every theme four custom properties, all small inline-SVG dots in the theme's colours: `--cur` (normal: 16×16 dot, `--main`, hotspot 8 8), `--cur-p` (clickable things: 22×22 dot with a shine, `--main-d`), `--cur-g` (garden / notes, ready to drag: 26×26 ring with a centre dot) and `--cur-gg` (while panning / dragging: 26×26 filled dot). They are `url("data:image/svg+xml,…")` cursors (browsers ignore anything over 32×32); the hotspot is the centre, and `#` in a colour must be written `%23`. To make them bigger or smaller, change the `width` / `height` / `viewBox` numbers and the two hotspot numbers after each `url(...)` in every theme line (find and replace works well). A cursor image **cannot read CSS variables**, so the colours are written out per theme: **a new theme needs its own four-variable set** (copy a neighbour and swap in the new theme's `--main`, `--main-l`, `--main-d`), otherwise it falls back to the default theme's pink. Rules: `html` uses `--cur`; links, buttons, `[data-act]`, garden pets / visitors, forest cells and fold headers use `--cur-p`; `#garden`, `.note` and editable decor use `--cur-g`, and `#garden.panning` / `.note.ghost` use `--cur-gg`; text inputs keep `text`; touch devices (`@media (hover:none)`) get the normal cursor. The customize-theme accent (set inline on `<html>` by `theme.js` `applyLook`) does **not** recolour the cursor, because that would need JS to rebuild the SVGs and set the four variables on `<html>` from the computed `--main` / `--main-d` (do it in `applyLook`, and re-run it on theme change).


16. **UI v2 design rules** (keep to these when you add or change UI):
    - **Tokens, not hard-coded values**: corners `--r` (big) / `--r2` (inner), shadows `--sh` / `--sh-s` / `--sh-on` (built from `--shc`, which `html[data-dark="1"]` turns black), hairlines `--hair`, borders `1px solid var(--edge)`. No hard "3D" drop shadows any more.
    - **Buttons**: one main action per area. Main = `.btn` (big) or `.chip.pri` (small); secondary = `.btn.ghost` or `.chip`.
    - **`render()` rebuilds the whole page** (on every Firestore update and every 30 s), so **never add entrance animations to re-rendered elements** (they would replay). Looping animations are limited to tiny `transform` / `opacity` effects (the `.dial.idle::after` halo) and must be added to the reduce-motion block (`[data-motion=off]`).
    - **Page title = tab name**: `TITLES` is built from `NAV` in `app.js`, so renaming a tab renames its page title too.
    - **`.study` is also a class on the garden speech bubble** (`.gbub.study`). A small rule right after `.study:active` keeps the big button look off the bubble: check both when you touch either.
    - **Dark themes** must be listed in `isDark` (`theme.js`) **and** in the regex in `index.html`; both set `data-dark`.
---

## 5. Message template for the AI

> I'm working on MN Study Tracker (plain-JS PWA + Firebase). I've attached `GUIDE.md` and these files: **[list]**.
> **Task:** [what you want].
> Please change only what's needed, keep the style of the existing code, tell me if you need another file, list exactly which files you changed, and return an updated GUIDE.md.


---

## 6. UI overhaul log (UI v2)

Goal: a calmer, simpler, still lively look: soft shadows, hairline borders, one main action per area, no clutter. Done in stages; each stage is complete and testable on its own.

| Stage | Files | Status |
|---|---|---|
| 1. Design foundation | `css/style.css`, `index.html`, `theme.js` | done |
| 2. Main flow (together tab, my stats tab, header, tab bar, login) | `app.js`, `home.js`, `stats-view.js` | done |
| 3. Pop-ups (settings, time wheel, cheers, inbox, celebrations) | `sheets.js`, `social.js`, `milestones.js` | todo (already picks up the new sheets, buttons, chips and inputs from the shared CSS) |
| 4. Other tabs (board, forest, garden, shop, garden style) | `board.js`, `forest.js`, `garden.js`, `decor.js`, `land.js` | todo (shared tokens already apply) |

**Stage 1-2 changes**
- New tokens: soft layered shadows, `--hair`, `--r2`, `data-dark`; the old hard shadows are gone. Cards, sheets, nav and inputs use 1px borders.
- Header now shows a greeting + the tab name as the big title (no more bow icon). The small "short" switch left the header: it is now a **cards / tiles switch** next to the "together" heading.
- Bottom bar is data-driven (`NAV`), with an active pill and icon lift.
- Together tab: the study button sits inside a ring that fills with today's goal; no more bobbing or sparkles (a soft halo instead). Running state shows the clock inside the ring with wide pause / stop buttons. One "together" list instead of separate "you" / "friends" headings; the couple level moved below the people.
- My stats tab: one week card (total, bars, today / streak / all time). Today's bar uses the live time. Goal-hit days are green. Session rows show date, start time and duration. `+ add time` is a primary chip.
- Login: logo tile, one form card, Enter key logs in.
- Removed: `.tiles` (replaced by `.trio`), hero sparkles, the duplicated glass-theme block, the `♡` before every heading. Kept: `.mtog` (settings sheets may use it), all `data-act` names and every theme variable, so the other tabs keep working.

**Remember after deploying**: bump `C` in `sw.js` so installed phones drop the old cache (no new files were added, so list `A` stays the same).