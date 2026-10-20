// GAMES TAB. Quordle (4 boards) and Octordle (8 boards): guess 5-letter words, every guess is scored on every unsolved board at once.
// The game is saved on this device only (localStorage "games"); nothing goes to Firebase.
import { ANSWERS, VALID } from "./words.js";
import { tab, ui } from "./state.js";
import { burst, ls, toast } from "./util.js";

const MAX = { 4: 9, 8: 13 }; // guesses allowed per mode
const NAME = { 4: "quordle", 8: "octordle" };
const load = () => { try { return JSON.parse(ls("games") || "{}"); } catch { return {}; } };
const store = load(); // { mode: 4|8, 4: game, 8: game, s: { 4: [played, won], 8: [played, won] } }
const save = () => ls("games", JSON.stringify(store));
const pick = n => { const t = []; while (t.length < n) { const w = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]; if (!t.includes(w)) t.push(w); } return t; };
const fresh = n => ({ t: pick(n), g: [], c: "", done: 0 }); // t = secret words, g = guesses so far, c = word being typed, done: 0 playing / 1 won / 2 lost
const mode = () => store.mode === 8 ? 8 : 4;
function cur() { const n = mode(); if (!store[n] || store[n].t.length !== n) store[n] = fresh(n); return store[n]; }

// 0 = letter not in the word, 1 = in the word but elsewhere, 2 = right spot (handles repeated letters correctly)
function score(g, t) {
  const r = [0, 0, 0, 0, 0], left = {};
  for (let i = 0; i < 5; i++) if (g[i] === t[i]) r[i] = 2; else left[t[i]] = (left[t[i]] || 0) + 1;
  for (let i = 0; i < 5; i++) if (r[i] !== 2 && left[g[i]] > 0) { r[i] = 1; left[g[i]]--; }
  return r;
}
const rowsOf = (g, b) => { const rows = []; for (const w of g.g) { rows.push(w); if (w === g.t[b]) break; } return rows; }; // a solved board stops taking guesses
const solved = (g, b) => g.g.includes(g.t[b]);

function press(k) {
  const g = cur(); if (g.done) return;
  if (k === "enter") {
    if (g.c.length < 5) return toast("5 letters needed");
    if (!VALID.has(g.c)) return toast("Not in the word list");
    g.g.push(g.c); g.c = "";
    const n = g.t.length;
    if (g.t.every(w => g.g.includes(w))) g.done = 1; else if (g.g.length >= MAX[n]) g.done = 2;
    if (g.done) { const s = store.s || (store.s = {}), p = s[n] || (s[n] = [0, 0]); p[0]++; if (g.done === 1) { p[1]++; burst(null, 60); toast("All solved! 🎉"); } }
  } else if (k === "del") g.c = g.c.slice(0, -1);
  else if (g.c.length < 5) g.c += k;
  save();
}

// called by app.js for every data-act that starts with "g" in this tab: gk (key), gnew (new game), gmode (4 / 8 boards)
function gamesAct(a, d) {
  if (a === "gk") press(d.k);
  else if (a === "gnew") { const n = mode(); if (cur().done || !cur().g.length || confirm("Give up and start a new game?")) { store[n] = fresh(n); save(); } }
  else if (a === "gmode") { store.mode = +d.id === 8 ? 8 : 4; save(); }
}
addEventListener("keydown", e => { // a real keyboard works too
  if (tab !== "games" || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = e.key === "Enter" ? "enter" : e.key === "Backspace" ? "del" : /^[a-z]$/i.test(e.key) ? e.key.toLowerCase() : "";
  if (!k) return; e.preventDefault(); press(k); ui.render();
});

// ---------- drawing ----------
const CLS = ["m", "n", "h"]; // tile / key classes for score 0 / 1 / 2
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
function boardHtml(g, b, max) {
  const rows = rowsOf(g, b), won = solved(g, b), live = !won && !g.done;
  let h = "";
  for (let r = 0; r < max; r++) {
    let cells = "";
    if (r < rows.length) { const sc = score(rows[r], g.t[b]); cells = [...rows[r]].map((ch, i) => `<i class="gt ${CLS[sc[i]]}">${ch}</i>`).join(""); }
    else if (r === rows.length && live) for (let i = 0; i < 5; i++) cells += g.c[i] ? `<i class="gt t">${g.c[i]}</i>` : `<i class="gt e"></i>`;
    else for (let i = 0; i < 5; i++) cells += `<i class="gt e"></i>`;
    h += `<div class="gr">${cells}</div>`;
  }
  return `<div class="gbd${won ? " won" : ""}">${h}${g.done === 2 && !won ? `<div class="gans">${g.t[b]}</div>` : ""}</div>`;
}
function keyHtml(g, st, k, wide) { // one key; each board gets its own coloured corner (4 boards: quarters, 8 boards: eighths)
  const q = g.t.map((_, b) => `<s class="${st[k] ? CLS[st[k][b] - 1] || "" : ""}"></s>`).join("");
  return `<button class="gk${wide ? " w" : ""}" data-act="gk" data-k="${k}" aria-label="${k}"><span class="q q${g.t.length}">${wide ? "" : q}</span><b>${k === "enter" ? "enter" : k === "del" ? "⌫" : k}</b></button>`;
}
function gamesMain() {
  const g = cur(), n = g.t.length, max = MAX[n], st = {};
  g.t.forEach((_, b) => rowsOf(g, b).forEach(w => { const sc = score(w, g.t[b]); [...w].forEach((ch, i) => { const a = st[ch] || (st[ch] = Array(n).fill(0)); a[b] = Math.max(a[b], sc[i] + 1); }); }));
  const s = (store.s || {})[n] || [0, 0], left = max - g.g.length, open = g.t.filter((_, b) => !solved(g, b)).length;
  const msg = g.done === 1 ? `Solved in ${g.g.length} of ${max}! 🎉` : g.done === 2 ? `Out of guesses. ${open} word${open > 1 ? "s" : ""} missed, shown under the boards.` : `${left} guess${left > 1 ? "es" : ""} left · ${open} word${open > 1 ? "s" : ""} to find`;
  return `<h2>${NAME[n]}<button class="chip${n === 4 ? " pri" : ""}" data-act="gmode" data-id="4">4 boards</button><button class="chip${n === 8 ? " pri" : ""}" data-act="gmode" data-id="8">8 boards</button></h2>
  <div class="gm"><div class="gboards${n === 8 ? " o" : ""}">${g.t.map((_, b) => boardHtml(g, b, max)).join("")}</div>
  <p class="hint">${msg} · won ${s[1]} of ${s[0]}</p>
  <div class="gkb">${ROWS.map((r, i) => `<div class="gkr">${i === 2 ? keyHtml(g, st, "enter", 1) : ""}${[...r].map(k => keyHtml(g, st, k)).join("")}${i === 2 ? keyHtml(g, st, "del", 1) : ""}</div>`).join("")}</div>
  <button class="btn${g.done ? "" : " ghost"}" data-act="gnew">${g.done ? "play again" : "new game"}</button></div>`;
}

export { gamesAct, gamesMain };
