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
  garden-state.js  garden.js  garden-fx.js  decor.js     the garden tab
  carddata.js  photocard.js  card.js                     photocards
  board.js            shared to-do board tab
  forest.js           study forest tab
```

---

## 1. Every file, in detail

### Page, PWA and Firebase setup

| File | What's in it |
|---|---|
| **index.html** | The page shell: empty `#app`, `#modal` and `#toast` boxes. A tiny inline script applies your saved theme, "reduce motion" and theme customizations (`look` / `lookCss`) **before** the page paints (no colour flash). Loads the Google Fonts (Fredoka, Baloo 2, Nunito, Rye, Special Elite), `css/style.css`, `js/app.js`, the manifest and the iOS home-screen tags. |
| **sw.js** | Service worker (offline support). `C` = cache version, `A` = list of files cached at install. Network-first: it tries the internet and falls back to the cache. **Add every new file to `A` and bump `C`**, or phones keep serving the old code. |
| **manifest.webmanifest**, **icons/** | PWA name, colours and icons. Not part of this change. |
| **firebase-config.js** | Your Firebase project keys, and `SIGNUP_CODE` (a secret word required to create an account; `""` = anyone can sign up). |
| **firestore.rules** | Security rules: who may read/write what. Users: any signed-in user can read, only the owner writes. `sessions`: owner only. `cheers`: anyone signed in can create, only the owner reads/deletes (emoji ≤ 40 chars). `gifts`: anyone can send a card (size/field checks, image < 700 000 chars), only the owner reads, marks seen or deletes. `board`: any signed-in user can read/add/move/edit/delete (text ≤ 200, lane 0-2). **A new collection/subcollection or a new size limit needs an edit here, then re-publish in the Firebase console.** |
| **db.js** | The **only** file that talks to Firebase (the UI never does). Sections: auth (`logIn`, `signUp`, `logOut`, `watchAuth`) · live listeners (`watchUsers`, `watchSessions`, `watchBoard`, `watchCheers`, `watchGifts`) · timer (`startStudy`, `pauseStudy`, `resumeStudy`, `cancelStudy`, `pomoBreak`, `checkIn`) · sessions (`addSession`, `editSession`, `deleteSession`, which also update the per-day totals) · profile and extras (`updateProfile`, `saveGarden`, `giveTreat`, `addBonus`, `saveForest`, `saveDecor`, `unlockBadge`) · social (`cheer`, `sendGift`, `markGift`, `deleteGift`) · board (`addNote`, `moveNote`, `editNote`, `deleteNote`, `clearNotes`) · `getSessionsSince` for the recap card. |

### Styling

| File | What's in it |
|---|---|
| **css/style.css** (≈660 lines) | Everything visual. Roughly: **lines 1-85** colour variables, all themes (`[data-theme=name]` rules, plus glass themes) and the **extra look** rules (`html[data-bg=…]` background patterns, `html[data-round=…]` corner radius, `html[data-shadow=…]` shadows) · 72-133 avatars, progress ring, cards, study button, buttons, nav pill · 134-224 stats, sheets, time wheel, confetti, calendar, badges, couple level, pet row, cheer pop-up · 225-296 garden scene and pets · 297-421 garden extras (evolution accessories, seeds/shop, CSS-drawn decorations, weather, bigger world) · 422-470 photocard sheet (incl. style chips, accent dots, "more options") and inbox · 452-505 collapsible sections, compact home, reduce-motion · 506-528 forest · 529-end to-do board (styles, stickers, palette). Colours always come from theme variables, so everything follows the theme. (Line ranges after the first block are approximate, about 15 lines later than listed.) |

### Core (shared by everything)

| File | What's in it |
|---|---|
| **js/app.js** | **Entry point, almost no logic.** `render()` draws header, the current tab and the bottom nav; `addBoardNote` + `initBoard` glue; the big `app.onclick` handler (every `data-act="..."` button: login, tab, study/pause/resume/stop, cheer, sound, garden buttons, card, calendar, add/edit/delete session…); boot (`DB.watchAuth` → start the live listeners). **To change what a button does or add a button's action, edit here.** |
| **js/state.js** | The shared store: `me`, `users`, `sessions`, `gifts`, `board`, `tab` (read them anywhere; change them only via `setUsers()`, `setTab()`, …) and `ui.render()`. Also the study-time maths for one user: `elapsed`, `runStart`, `goalOf` (default 4 h), `limitOf` (3 h), `focusOf`/`restOf` (pomodoro 25/5), `liveToday`, `totalOf`; and the couple level: `LV_H` (hours per level), `LV_T` (level names), `couple()`, `coupleCard()`. |
| **js/util.js** | Helpers with no dependencies: `$`, `app`, `modal`, `esc` (HTML-escape), `EMOJI` (avatar choices), `DAY`, `ls` (safe localStorage), `key` (date → `YYYY-MM-DD`), `fmt` (`1h 5m`), `clock` (`00:05:00`), `split` (cuts a session at midnight), `stats` (today / week / total / streak), `toast`, `errMsg` (friendly error texts), `foldSet` + `sec` (collapsible sections), `burst` (confetti), `notify` (browser notification). |
| **js/watch.js** | The loop that runs every second while the app is open (plus a full redraw every 30 s): updates the running clocks; pomodoro auto-break and "break's over"; "still studying?" prompt; daily-goal confetti; streak records; badge check; stops sound when the timer stops; checks new garden friends, pet evolution, new seeds, forest growth, couple level-up; keeps the garden in sync. **Anything that should happen on its own, without a click, lives here.** |
| **js/theme.js** | `THEMES` (name → icon + colour), the lists shown in the profile sheet (`CUTE`, `DARK`, `SEASON`, `GLASS`), `applyTheme`, `setTheme`, and the reduce-motion switch (`calm`, `toggleCalm`). Also the **extra look** (profile sheet → customize theme): `LOOK` (background / corners / shadows choices), `HUES` (background tints), `ACCENTS` (accent colours), `look` (the saved choice), `setLook` (also handles `"random"` and `"reset"`), `applyLook` (sets `data-bg` / `data-round` / `data-shadow` and colour variables on `<html>`, called by `applyTheme`), and the button builders `lookBtns`, `dotBtns`, `isLook`. |
| **js/sound.js** | Background sounds (rain / cafe / ocean) generated with the Web Audio API (no audio files): `playSound`, `stopSound`, `cycleSound`, `soundLabel`. |

### Tabs and screens

| File | What's in it |
|---|---|
| **js/home.js** | Login/sign-up screen (`authView`), the "install app" button, and the **together tab**: your timer hero (study / pause / stop, pomodoro chip, sound chip), your card + friend cards (`card`), and the compact "short" square tiles. Owns the `compact` and `pomo` switches. |
| **js/stats-view.js** | The **my stats tab**: 7-day bars, tiles, calendar heat-map (`calView`), **badges** (`BADGES` list with unlock rules, `badgeCtx`, `badgeView`, `checkBadges`), and the session list with add / edit / delete buttons. |
| **js/board.js** | The **board tab** (shared to-do): three lanes of sticky notes, drag & drop (mouse, or press-and-hold on touch), the colour/sticker palette, the edit sheet, the 6 board looks (`STYLES`: cutie, western, cork, chalk, notebook, own), `COLORS` (16), `STICKERS`, and `boardSnap` for the photocard. Notes live in Firestore `board/{id}`. |
| **js/forest.js** | The **forest tab**: 6×6 isometric grid where you plant trees with seeds. `SPECIES` (price, colours, hours of study needed per growth stage, drawing shapes), the isometric drawing, `forestMain` (screen), `forestAct` (plant / remove), `forestGrow` (toasts when a tree grows), `forestOf`/`forestCost`/`forestSnap`, and `treeParts`/`cellPos` (also used by `card.js`). Saved in `users/{uid}.forest`. |

### Pets and garden

| File | What's in it |
|---|---|
| **js/pets.js** | `PETS` (12 starter pets with emoji per stage + accessory), `EXTRA` (14 unlockable pets, each with its unlock rule `ok(user)`), `ALLP`, `MAX_FRIENDS`, growth thresholds `STAGE` (30 min / 5 h / 20 h), `stageOf`, `stageNames`, `petRow` (the pet line on cards). |
| **js/garden-state.js** | Garden constants and the shared `G` object: world size `WW`×`WH`, pond `POND`, walking `BASE` speed, `BOUNDS`, `MOVE` (speed + hop per pet), `FACE_RIGHT`, speech bubbles, weather table (`WXL`, `WX_POOL`), `TREAT` cost, `VIS_DAY` visitor cap, helpers `rnd`, `seeded`, `isEvening`, `moodOf`, `inPond`. |
| **js/garden.js** | The living scene: build the garden, camera (drag to look around, 📍 find my pets), who is in the garden (`gardenList`, max 12), creating/updating pet elements, `stepPet` (all pet animation), the animation loop, flowers/trees/butterflies by couple level (`buildDeco`), treats, the pet info card (`gardenTap`), the "garden friends" picker, `gardenMain` (tab layout). |
| **js/garden-fx.js** | Garden extras: weather (`buildWx`, `cycleWx`), floating hearts, cheer visits (a friend's pet runs over to yours), study-buddy and nap pairs, and visitors you tap for seeds (`collectVisitor`). |
| **js/decor.js** | Seeds and decorations: `ITEMS` (shop items + prices), `ART` (CSS-drawn look of each item), `SEED_SEC` (1 seed per 5 min), `MAX_DECOR`, `seedsEarned`/`seedsLeft`, the garden side panel (`gardenPanel`), decorate mode (`enterEdit`, `exitEdit`, `delSel`), the shop sheet, dragging items. |

### Pop-ups and social

| File | What's in it |
|---|---|
| **js/sheets.js** | Pop-up sheets: the hours:minutes **time wheel** (`sheet`, used for goal, limits, add/shorten session, pomodoro), `askStill` ("still studying?"), and `profileSheet` (name, emoji, daily goal, still-studying limit, pet, pomodoro lengths, notifications, reduce motion, theme pickers, a collapsible "customize theme" section with background, tint, accent, corners, shadows, 🎲 surprise me and reset, log out). |
| **js/social.js** | Cheers: `STICKERS` (the text stickers), `cheerCard` (pop-up when you receive one), `stickerSheet`. Cards from friends: `onGifts`, `giftsView` (inbox on the together tab), `giftSheet`, `safeImg` (only accepts plain JPEGs). |
| **js/milestones.js** | Celebrations: pet evolved pop-up, streak-record and level-up pop-ups, "new garden friend unlocked", and the "make a card" button inside them. |

### Photocards

| File | What's in it |
|---|---|
| **js/carddata.js** | Builds the **data** each card shows: reads the current theme colours (`cardPal`), snapshots the garden (`gardenSnap`), and `cardData` (me), `cardDataTogether`, `cardDataRecap` (7/30 days: best day, busiest time…), `cardDataMilestone`, `cardDataBoard`. |
| **js/photocard.js** | The photocard **sheet**: mode / period / shape / garden-or-forest options, the **look controls**: style chips, accent-colour dots, 🎲 shuffle, and a "more ways to customize" section (font, corners, background pattern, corner stickers, photo filter, dark tone, footer message, reset). All buttons are built automatically from the tables in `card.js` and handled by one `data-look` click handler; `loadLook` / `saveLook` keep the whole look as one JSON string on this device, `renderCard` (draws the preview and passes the chosen look to `drawCard` as `data.look`, and loads the fonts the look needs), save, share, send to a friend (`giftImg` makes the small JPEG), remembers your latest milestone. |
| **js/card.js** | Pure canvas drawing (no DOM, no Firebase): `drawCard` and one drawer per card (me, together, recap, milestone, board), plus the garden/forest scene it draws at the bottom. Sizes: square / 4:5 / story. **Card styles** (section "card styles" near the bottom): `STYLES` (10 looks: classic, sticker, glass, midnight, scrapbook, gilded, polaroid, film, ticket, stamp), `ACCENTS` (colour override), `skin` (palette used: forced dark for midnight + accent), `paintBg` (background patterns), `tile` (look of the cards/tiles, reads the current style), `paintDeco` (stars / tape / double border), `paintPat` (chosen background pattern: dots / hearts / stars / stripes / checks / waves), `paintFilter` (colour grade over the finished card: warm / cool / vintage / mono / vivid / dreamy), `paintStick` (3 emoji in the margins; `STK` = the sticker packs), `FONTS`, `CORNERS` (tile corner radius via `rad`), `PATTERNS`, `STICKERS`, `FILTERS`, and `d.look` (read once per card into `LK`: `{ style, accent, font, round, pat, stick, filt, dark, msg }`), `paintFrame` (polaroid / film / ticket / stamp: draws the frame and calls back to draw the normal card into a smaller box, so the content re-flows instead of being squashed), `paintCard` (one card without the style wrapper). |

---

## 2. "I want to change X" → which files

Attach this guide + the files in the **Change** column. "Maybe" files are only needed for some versions of the change.

### Look and feel
| I want to… | Change | Maybe |
|---|---|---|
| Add a background style / corner or shadow choice / accent colour / tint | `theme.js` (`LOOK`, `HUES` or `ACCENTS`), `css/style.css` (the "extra look" block: one `html[data-bg=name]` rule per background) | `sheets.js` only for a new *kind* of option (add a row in the "customize theme" section) |
| Add or edit a colour theme | `theme.js` (`THEMES` + a list), `css/style.css` (a `[data-theme=name]` block, copy an existing one and define **all** the same variables) | `index.html` only if the default theme changes |
| Change fonts | `index.html` (font link), `css/style.css` (`--hf` etc.) | |
| Restyle cards, buttons, nav, sheets | `css/style.css` | the view file that makes the HTML (`home.js`, `stats-view.js`, `sheets.js`…) |
| Change the app title / logo on the login screen | `home.js` (`authView`) | `index.html` (`<title>`), `manifest.webmanifest` |
| Change the tab bar (rename, reorder, add a tab) | `app.js` (`render` nav + tab switch) | the new tab's view file, `css/style.css` |

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
| Change the garden's size, pond, or where pets may stand | `garden-state.js` (`WW`, `WH`, `POND`, `BOUNDS`) | **`card.js` has copies of `WW/WH/POND`**, plus `css/style.css` (`#garden{--ww;--wh}` and `.gpond`) |
| Change flowers / trees / rainbow by level | `garden.js` (`buildDeco`) | `state.js` (`LV_H`), `css/style.css` |
| Change the couple level names / hours | `state.js` (`LV_H`, `LV_T`) | |
| Add a shop item | `decor.js` (`ITEMS`, `ART`), `css/style.css` (draw it) | `card.js` (`drawItem`, so it also shows on photocards) |
| Change prices, seeds per minute, max decorations | `decor.js` (`ITEMS`, `SEED_SEC`, `MAX_DECOR`) | `garden-state.js` (`TREAT`), `forest.js` (tree prices) |
| Change visitors (butterfly/bird, daily cap, seeds given) | `garden-fx.js` (visitors, `collectVisitor`), `garden-state.js` (`VIS_DAY`) | |
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
| Change photocard sizes | `card.js` (`SIZES`) | `photocard.js` (shape buttons) |
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
| | `garden` (picked friends), `decor` (placed items, positions are fractions of the garden), `treats`, `bonus` (visitor seeds) | `saveGarden`, `saveDecor`, `giveTreat`, `addBonus` | `garden*.js`, `decor.js` |
| | `forest` = `[{ s, c, t }]` | `saveForest` | `forest.js` |
| `users/{uid}/sessions/{id}` | `start`, `seconds`, `days`, `manual` | `addSession`, `editSession` | `stats-view.js`, `carddata.js` |
| `users/{uid}/cheers/{id}` | `from`, `name`, `emoji`, `at` (deleted after being shown) | `cheer` | `social.js` |
| `users/{uid}/gifts/{id}` | `from`, `name`, `emoji`, `kind`, `img`, `seen`, `at` | `sendGift`, `markGift`, `deleteGift` | `social.js` |
| `board/{id}` | `text`, `lane`, `o` (order), `color`, `icon`, `by`, `name`, `emoji`, `at` | `addNote`, `moveNote`, `editNote`, `deleteNote`, `clearNotes` | `board.js` |

On this device only (localStorage): theme, photocard look (`cardLook`: style, accent, font, corners, pattern, stickers, filter, tone, footer message), motion, extra theme look (`look`, plus `lookCss` that `index.html` applies before the first paint), compact tab, pomodoro on/off, sound, fold state, weather choice, board look, card shape/scene, last milestone, "already celebrated" markers.

---

## 4. Things that must stay in sync (common sources of bugs)

1. **Garden size** (`WW`, `WH`, `POND`) exists in `garden-state.js` **and** `card.js` (and in `css/style.css`: `#garden{--ww;--wh}` and `.gpond`). Change all of them together.
2. **Themes**: a name in `theme.js` `THEMES` needs a matching `[data-theme=…]` block in `style.css`. Photocards read the theme's CSS variables, so a new theme must define every variable the others do. The extra look (tint, accent) overrides `--bg1 --bg2 --glow1 --glow2 --b1 --b2 --main --main-l --main-d` as inline styles on `<html>`, so it works on every theme; the tint is generated light or dark to match the theme (`isDark` in `theme.js`: keep it in sync when you add a dark theme).
3. **New files** go into `sw.js` list `A`, and `C` must be bumped, otherwise installed phones keep the old version.
4. **Firestore rules vs app limits**: board text (app 140, rule 200), cheer emoji (rule 40), gift image (app ≈ 380 000, rule < 700 000). If you raise an app limit, raise the rule and re-publish.
5. **Shared data** (`me`, `users`, `sessions`, `gifts`, `board`, `tab`) is changed only inside `state.js` (setters). The same goes for `compact`/`pomo` (`home.js`), `theme`/`calm` (`theme.js`), `sound` (`sound.js`).
6. **Redraw from another file**: call `ui.render()` (from `state.js`); never import `app.js`.
7. **New function used by another file**: add it to the `export { … }` line at the bottom of its file and import it where it's used.
8. **New pet or tree**: also give it an entry in the movement table (`MOVE` in `garden-state.js`) / price+hours (`forest.js` `SPECIES`); missing entries fall back to defaults but won't feel tuned.
9. **Photocard styles**: a new `STYLES` entry needs nothing else for the chip to show up. If a style draws text in a special font (e.g. `MONO` = Special Elite), load it in `photocard.js` `renderCard` before drawing, or the canvas silently falls back to a plain font. A **font** other than Fredoka / Nunito must be loaded with `document.fonts.load` before drawing too (already done for the ones in `FONTS`). A style that forces its own colours (like `midnight`'s `dark: true`, or the "dark" tone switch) must set every colour the cards read (`bg1 bg2 card ink sub tint edge glow1 glow2` in `skin`). `tile()` is the only place tiles are drawn; don't draw card backgrounds anywhere else, or the style won't apply to them.

---

## 5. Message template for the AI

> I'm working on MN Study Tracker (plain-JS PWA + Firebase). I've attached `GUIDE.md` and these files: **[list]**.
> **Task:** [what you want].
> Please change only what's needed, keep the style of the existing code, tell me if you need another file, and list exactly which files you changed.
