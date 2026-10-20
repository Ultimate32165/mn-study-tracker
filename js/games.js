// GAMES TAB. Wordscapes: swipe across a wheel of 4-7 letters to spell words. A word from the crossword grid fills in, any other valid word is a bonus word (coins).
// Level n is built from its number (same level for everybody) and the finished grid is saved inside the save file, so a later word-list change can't break a level in progress.
// The game is saved on this device only (localStorage "games"); nothing goes to Firebase.
import { COMMON, ROOTS, VALID } from "./words.js";
import { tab, ui } from "./state.js";
import { $, burst, ls, toast } from "./util.js";

const COIN = { bonus: 2, level: 10 }, COST = 15, START = 30; // coins per bonus word / per finished level, price of a hint, coins at the start
const SIZE = 9; // the grid never gets wider or taller than this
const load = () => { try { const s = JSON.parse(ls("games") || "null"); return s && s.v === 2 ? s : null; } catch { return null; } }; // an older (quordle) save has no v: 2, so it is ignored
const store = load() || { v: 2, lvl: 1, lv: null, coins: START, st: { done: 0, bonus: 0 } }; // lv = the level being played: { root, order, grid, found, bonus, hint, done }
const save = () => ls("games", JSON.stringify(store));
const cur = () => store.lv || (store.lv = buildLevel(store.lvl));
let sel = [], drag = false; // sel = wheel positions picked so far (kept here, so a redraw in the middle of a word doesn't lose it)

// ---------- building a level ----------
// letters on the wheel and grid words per level: 1-5 / 6-15 / 16-35 / 36+
const levelSpec = n => n <= 5 ? { len: 4, min: 3, max: 4 } : n <= 15 ? { len: 5, min: 5, max: 6 } : n <= 35 ? { len: 6, min: 6, max: 8 } : { len: 7, min: 8, max: 10 };
const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // seeded random numbers
const shuf = (a, R = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fits = (w, root) => { const c = {}; for (const ch of root) c[ch] = (c[ch] || 0) + 1; for (const ch of w) if (!c[ch]--) return false; return true; }; // can w be spelled from the wheel letters (each letter once)?
const K = (r, c) => r + "," + c; // cell key
let ALL = null; // COMMON as an array (made once)

// the crossword while it is being built: cells (letter + which directions pass through: bit 0 across, bit 1 down) and the placed words
const fresh = () => ({ cells: new Map(), words: [], r0: 1e9, r1: -1e9, c0: 1e9, c1: -1e9 });
function put(g, w, r, c, d) {
  for (let i = 0; i < w.length; i++) { const y = r + (d ? i : 0), x = c + (d ? 0 : i), k = K(y, x), e = g.cells.get(k) || { ch: w[i], m: 0, r: y, c: x }; e.m |= 1 << d; g.cells.set(k, e); }
  g.words.push({ w, r, c, d }); g.r0 = Math.min(g.r0, r); g.c0 = Math.min(g.c0, c); g.r1 = Math.max(g.r1, r + (d ? w.length - 1 : 0)); g.c1 = Math.max(g.c1, c + (d ? 0 : w.length - 1));
}
// How many letters w would share with the grid if put at (r, c) going d (0 across, 1 down), or -1 if that is not allowed. Words may only touch where they CROSS:
// the cells before and after the word are empty, every new letter has empty cells on both sides, and a shared cell must hold the same letter and belong to a word going the other way.
function cross(g, w, r, c, d) {
  const dr = d ? 1 : 0, dc = d ? 0 : 1, at = (y, x) => g.cells.get(K(y, x));
  if (at(r - dr, c - dc) || at(r + dr * w.length, c + dc * w.length)) return -1;
  let n = 0;
  for (let i = 0; i < w.length; i++) {
    const y = r + dr * i, x = c + dc * i, e = at(y, x);
    if (e) { if (e.ch !== w[i] || (e.m & (1 << d))) return -1; n++; }
    else if (at(y + dc, x + dr) || at(y - dc, x - dr)) return -1;
  }
  return n;
}
function spot(g, w, R) { // a random place for w that crosses the grid and keeps it smallest (and within SIZE)
  const opts = []; let best = 1e9;
  for (const e of g.cells.values()) for (let d = 0; d < 2; d++) for (let j = 0; j < w.length; j++) {
    if (w[j] !== e.ch || (e.m & (1 << d))) continue;
    const r = d ? e.r - j : e.r, c = d ? e.c : e.c - j;
    if (cross(g, w, r, c, d) < 1) continue;
    const h = Math.max(g.r1, r + (d ? w.length - 1 : 0)) - Math.min(g.r0, r) + 1, wd = Math.max(g.c1, c + (d ? 0 : w.length - 1)) - Math.min(g.c0, c) + 1;
    if (h > SIZE || wd > SIZE) continue;
    const a = h * wd; if (a < best) { best = a; opts.length = 0; } if (a === best) opts.push({ r, c, d });
  }
  return opts.length ? opts[Math.floor(R() * opts.length)] : null;
}
function buildLevel(n) {
  ALL = ALL || [...COMMON];
  const sp = levelSpec(n), pool = ROOTS.filter(w => w.length === sp.len); let best = null;
  for (let a = 0; a < 80; a++) { // a few tries (different seeds) until the grid has enough words
    const R = rng(n * 7919 + a * 104729 + 1), root = pool[Math.floor(R() * pool.length)], g = fresh();
    const left = ALL.filter(w => w !== root && fits(w, root)), want = sp.min + Math.floor(R() * (sp.max - sp.min + 1));
    put(g, root, 0, 0, 0); // the wheel word goes in first
    while (g.words.length < want && left.length) {
      let tot = 0, i = 0; for (const w of left) tot += w.length - 1; let x = R() * tot; // longer words are more likely to be picked
      for (; i < left.length - 1; i++) { x -= left[i].length - 1; if (x < 0) break; }
      const w = left.splice(i, 1)[0], p = spot(g, w, R); if (p) put(g, w, p.r, p.c, p.d); // a word that doesn't fit is just left out (it becomes a bonus word)
    }
    if (!best || g.words.length > best.g.words.length) best = { g, root };
    if (g.words.length >= sp.min) break;
  }
  const { g, root } = best, R = rng(n), order = shuf(root, R);
  if (order.join("") === root) order.reverse();
  return { root, order, grid: g.words.map(x => ({ w: x.w, r: x.r - g.r0, c: x.c - g.c0, d: x.d })), found: [], bonus: [], hint: [], done: 0 };
}

// ---------- playing ----------
const cellsOf = g => [...g.w].map((_, i) => K(g.r + (g.d ? i : 0), g.c + (g.d ? 0 : i))); // the cell keys of a grid word
const foundCells = lv => new Set(lv.grid.filter(g => lv.found.includes(g.w)).flatMap(cellsOf));
const spelled = () => sel.map(i => cur().order[i]).join("");
function check(lv) { // a word whose cells are all showing (hints, crossings) counts as found; every word found = level done
  for (let again = true; again;) { again = false; const s = new Set([...foundCells(lv), ...lv.hint]); for (const g of lv.grid) if (!lv.found.includes(g.w) && cellsOf(g).every(k => s.has(k))) { lv.found.push(g.w); again = true; } }
  if (!lv.done && lv.grid.every(g => lv.found.includes(g.w))) { lv.done = 1; store.coins += COIN.level; store.st.done++; burst(null, 60); toast("Level complete! 🎉"); }
}
function submit(w) {
  const lv = cur(), g = lv.grid.find(x => x.w === w);
  if (w.length < 3) return toast("3 letters needed");
  if (g) { if (lv.found.includes(w)) return toast("Already found"); lv.found.push(w); }
  else if (!VALID.has(w)) return toast("Not in the word list");
  else if (lv.bonus.includes(w)) return toast("Already found");
  else { lv.bonus.push(w); store.coins += COIN.bonus; store.st.bonus++; toast(`Bonus word! +${COIN.bonus} 🪙`); }
  check(lv); save();
}
function shuffle() { const lv = cur(); lv.order = shuf(lv.order); sel = []; save(); }

// called by app.js for every data-act of this tab: gshuf (shuffle the wheel), ghint (reveal a letter), gnext (next level)
function gamesAct(a) {
  const lv = cur();
  if (a === "gshuf") { if (!lv.done) shuffle(); }
  else if (a === "ghint") {
    if (lv.done) return;
    if (store.coins < COST) return toast(`A hint costs ${COST} coins 🪙`);
    const s = new Set([...foundCells(lv), ...lv.hint]), hid = [...new Set(lv.grid.flatMap(cellsOf))].filter(k => !s.has(k)); if (!hid.length) return;
    lv.hint.push(hid[Math.floor(Math.random() * hid.length)]); store.coins -= COST; check(lv); save();
  } else if (a === "gnext") { if (!lv.done) return; store.lvl++; store.lv = null; sel = []; save(); }
}

// ---------- swiping the wheel ----------
// Letters sit on a circle in a 100x100 box (the same numbers are used for the line). While a finger is down the DOM is updated directly (no redraw), so a redraw in the middle can't cut a word.
const pos = (i, n) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [+(50 + 34 * Math.cos(a)).toFixed(1), +(50 + 34 * Math.sin(a)).toFixed(1)]; };
function paint(f) { // show the picked letters, the line (ending at the finger f) and the word being spelled
  const w = $(".wwheel"); if (!w) return; const n = cur().order.length;
  w.querySelectorAll(".wlet").forEach((el, i) => el.classList.toggle("on", sel.includes(i)));
  w.querySelector("polyline").setAttribute("points", [...sel.map(i => pos(i, n)), ...(f ? [f] : [])].join(" "));
  const p = $(".wpre"); if (p) { p.textContent = spelled(); p.classList.toggle("has", sel.length > 0); }
}
function move(e) {
  const w = $(".wwheel"); if (!w) return; const b = w.getBoundingClientRect(), n = cur().order.length, x = (e.clientX - b.left) / b.width * 100, y = (e.clientY - b.top) / b.height * 100;
  let hit = -1, bd = 10; for (let i = 0; i < n; i++) { const p = pos(i, n), d = Math.hypot(x - p[0], y - p[1]); if (d < bd) { bd = d; hit = i; } } // nearest letter within 10 units
  if (hit >= 0) { if (sel.length > 1 && hit === sel[sel.length - 2]) sel.pop(); else if (!sel.includes(hit)) sel.push(hit); } // going back onto the previous letter un-selects the last one
  paint([x, y]);
}
addEventListener("pointerdown", e => {
  if (tab !== "games" || e.button > 0 || !e.target.closest || !e.target.closest(".wwheel")) return;
  drag = true; sel = []; move(e);
});
addEventListener("pointermove", e => { if (drag) move(e); });
addEventListener("pointerup", () => { if (!drag) return; drag = false; const w = spelled(); sel = []; paint(); if (w.length > 1) { submit(w); ui.render(); } });
addEventListener("pointercancel", () => { if (!drag) return; drag = false; sel = []; paint(); });
addEventListener("keydown", e => { // a real keyboard works too: letters, Backspace, Enter, Space = shuffle
  if (tab !== "games" || drag || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const lv = cur(), k = e.key; if (!(k === "Enter" || k === "Backspace" || k === " " || /^[a-z]$/i.test(k))) return; e.preventDefault();
  if (lv.done) { if (k === "Enter") gamesAct("gnext"); }
  else if (k === " ") shuffle();
  else if (k === "Enter") { const w = spelled(); sel = []; if (w) submit(w); }
  else if (k === "Backspace") sel.pop();
  else { const i = lv.order.findIndex((ch, j) => ch === k.toLowerCase() && !sel.includes(j)); if (i >= 0) sel.push(i); }
  paint(); ui.render();
});

// ---------- drawing ----------
function gridHtml(lv) {
  const R = Math.max(...lv.grid.map(g => g.r + (g.d ? g.w.length : 1))), C = Math.max(...lv.grid.map(g => g.c + (g.d ? 1 : g.w.length))), L = {}, fc = foundCells(lv); let h = "";
  for (const g of lv.grid) cellsOf(g).forEach((k, i) => { L[k] = g.w[i]; });
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const k = K(r, c), on = fc.has(k), hn = lv.hint.includes(k); h += `<i class="wcell${L[k] ? on ? " on" : hn ? " hnt" : "" : " x"}">${on || hn ? L[k] : ""}</i>`; }
  return `<div class="wgrid" style="--c:${C}">${h}</div>`;
}
function wheelHtml(lv) {
  const n = lv.order.length;
  return `<div class="wwheel"><svg class="wline" viewBox="0 0 100 100"><polyline points="${sel.map(i => pos(i, n)).join(" ")}"/></svg>${lv.order.map((ch, i) => { const p = pos(i, n); return `<i class="wlet${sel.includes(i) ? " on" : ""}" style="left:${p[0]}%;top:${p[1]}%">${ch}</i>`; }).join("")}</div>`;
}
function gamesMain() {
  const lv = cur(), nb = lv.bonus.length;
  return `<div class="gm"><div class="wbar"><b>Level ${store.lvl}</b><span>🪙 ${store.coins}</span></div>${gridHtml(lv)}
  ${lv.done ? `<div class="wdone"><b>Level ${store.lvl} complete! 🎉</b><span>+${COIN.level} 🪙 · ${nb} bonus word${nb === 1 ? "" : "s"}</span><button class="btn" data-act="gnext">next level</button></div>`
    : `<div class="wpre${sel.length ? " has" : ""}">${spelled()}</div>${wheelHtml(lv)}<div class="wtools"><button class="chip" data-act="gshuf">🔀 shuffle</button><button class="chip pri${store.coins < COST ? " dim" : ""}" data-act="ghint">💡 hint · ${COST} 🪙</button></div>`}
  <p class="hint">${lv.found.length} of ${lv.grid.length} words · ${nb} bonus</p></div>`;
}

export { gamesAct, gamesMain };
