// GAMES HUB + PEBBLE PASS (two players, live on two phones). Each player has 9 pebbles on their side; on your turn roll the dice and pass that many to your partner. First to empty their own side wins.
// A match is one Firestore doc matches/{id} (see db.js). Both phones draw the same state; a new move plays as dice tumble -> pebbles fly across -> pebbles land.
// Animations use the Web Animations API and are started AFTER the redraw (never part of the markup), so a normal redraw can't replay them (UI rules 16-18).
import * as DB from "./db.js";
import { gamesMain } from "./games.js";
import { me, tab, ui, users } from "./state.js";
import { burst, errMsg, esc, ls, toast } from "./util.js";

const COLS = ["#ff6b8b", "#ff9f43", "#ffd93d", "#5fd68a", "#3cc4e8", "#6c8cff", "#b57cff", "#ff8fd6"], N = 9, FACE = "⚀⚁⚂⚃⚄⚅";
let view = "menu", list = [], shown = null, later = null, busy = false, sending = false, draw = () => ui.render(); // shown = the match as drawn right now; later = a newer one that arrived mid-animation
let col = Math.max(0, Math.min(7, +ls("dcol") || 0)); // my pebble colour (remembered on this phone)
const wait = ms => new Promise(r => setTimeout(r, ms)), calm = () => document.documentElement.dataset.motion === "off";
const mine = () => list.filter(m => m.p0 === me.uid || m.p1 === me.uid).sort((a, b) => b.at - a.at)[0] || null;
const waiting = () => list.find(m => m.p1 === "" && m.p0 !== me.uid) || null; // a match my partner opened and nobody has joined
const idx = m => m.p0 === me.uid ? 0 : 1;
const q = s => [...document.querySelectorAll(s)];

export const duelInit = f => { draw = f; }; // app.js passes its render() so a move is drawn instantly
export const resetDuel = () => { list = []; shown = null; later = null; busy = sending = false; view = "menu"; };

// ---------- live updates (called by app.js for every change of the matches collection) ----------
export function onMatches(l) {
  list = l; const m = mine();
  if (busy) { later = true; return; }
  if (m && shown && m.id === shown.id && m.mv === shown.mv + 1 && tab === "games" && view === "duel" && !calm()) return play(m);
  shown = m; ui.render();
}
async function play(b) { // a move happened: dice -> pebbles fly -> pebbles land
  busy = true; const a = shown, t = a.t, k = a["s" + t] - b["s" + t], mv = t === idx(a) ? ".dtray.me" : ".dtray.op", to = t === idx(a) ? ".dtray.op" : ".dtray.me";
  try {
    const d = q(".ddice")[0];
    if (d) { d.animate([{ transform: "rotate(0) scale(1)" }, { transform: "rotate(300deg) scale(1.4)" }, { transform: "rotate(720deg) scale(1)" }], { duration: 900, easing: "ease-in-out" }); for (let i = 0; i < 8; i++) { d.textContent = FACE[Math.floor(Math.random() * 6)]; await wait(100); } d.textContent = FACE[b.roll - 1]; await wait(300); }
    const src = q(mv + " .dp").slice(-k), dst = q(to)[0];
    if (src.length && dst) {
      const t2 = dst.getBoundingClientRect();
      src.forEach((p, i) => { const r = p.getBoundingClientRect(), x = t2.left + t2.width / 2 - r.left - r.width / 2, y = t2.top + t2.height / 2 - r.top - r.height / 2;
        p.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${x / 2}px,${y / 2 - 40}px) scale(1.2)`, opacity: 1, offset: .5 }, { transform: `translate(${x}px,${y}px) scale(.5)`, opacity: .2 }], { duration: 650, delay: i * 90, easing: "ease-in", fill: "forwards" }); });
      await wait(650 + src.length * 90);
    }
    shown = b; draw(); await wait(60);
    q(to + " .dp").slice(-k).forEach((p, i) => p.animate([{ transform: "scale(0) rotate(-140deg)", opacity: 0 }, { transform: "scale(1.3)", opacity: 1, offset: .7 }, { transform: "scale(1)", opacity: 1 }], { duration: 520, delay: i * 100, easing: "ease-out", fill: "backwards" }));
    await wait(520 + k * 100);
    if (b.win === idx(b)) burst(["🎉", "✨", "⚪"], 60);
  } finally { busy = false; if (later) { later = false; onMatches(list); } }
}

// ---------- buttons (data-act="dl", data-id = what to do) ----------
export async function duelAct(id, b) {
  if (id === "menu" || id === "wc" || id === "duel") { view = id; return; }
  const mi = users.find(u => u.id === me.uid) || { name: "me", emoji: "🙂" }, m = shown, o = waiting();
  try {
    if (id === "col") { col = +b.dataset.v; ls("dcol", String(col)); if (m) await DB.updateMatch(m.id, { ["c" + idx(m)]: col }); }
    else if (id === "create" && !m) await DB.createMatch({ p0: me.uid, p1: "", n0: mi.name, n1: "", e0: mi.emoji, e1: "", c0: col, c1: -1, s0: N, s1: N, t: Math.random() < .5 ? 0 : 1, mv: 0, roll: 0, win: -1, at: Date.now() });
    else if (id === "join" && o && !m) { if (col === o.c0) col = COLS.findIndex((_, i) => i !== o.c0); await DB.updateMatch(o.id, { p1: me.uid, n1: mi.name, e1: mi.emoji, c1: col }); }
    else if (id === "leave" && m) { shown = null; await DB.deleteMatch(m.id); }
    else if (id === "again" && m && m.win >= 0) await DB.updateMatch(m.id, { s0: N, s1: N, t: Math.random() < .5 ? 0 : 1, mv: 0, roll: 0, win: -1 });
    else if (id === "roll" && m && !busy && !sending && m.win < 0 && m.p1 && m.t === idx(m)) {
      sending = true; const r = 1 + Math.floor(Math.random() * 6), t = m.t, s = [m.s0, m.s1], k = Math.min(r, s[t]); s[t] -= k; s[1 - t] += k; // pass up to r pebbles (all you have left if fewer)
      try { await DB.updateMatch(m.id, { s0: s[0], s1: s[1], roll: r, mv: m.mv + 1, win: s[t] === 0 ? t : -1, t: s[t] === 0 ? t : 1 - t }); } finally { sending = false; }
    }
  } catch (e) { toast(errMsg(e)); }
}

// ---------- drawing ----------
const swatches = (m, taken) => `<div class="dsws">${COLS.map((c, i) => `<button class="dsw${i === col ? " on" : ""}" style="--pc:${c}" data-act="dl" data-id="col" data-v="${i}" aria-label="colour ${i + 1}"${i === taken ? " disabled" : ""}></button>`).join("")}</div>`;
function boardHtml(m) {
  const i = idx(m), j = 1 - i, nm = k => esc(m["n" + k]), go = m.p1 !== "" && m.win < 0, my = go && m.t === i;
  const side = (k, cls) => `<div class="dside ${cls}${go && m.t === k ? " turn" : ""}" style="--pc:${COLS[m["c" + k]] || "#bbb"}"><div class="dwho"><span>${esc(m["e" + k] || "⏳")} ${m["n" + k] ? nm(k) : "waiting…"}${k === i ? " (you)" : ""}</span><span>${m["s" + k]} left</span></div><div class="dtray ${cls}">${'<i class="dp"></i>'.repeat(m["s" + k])}</div></div>`;
  const last = m.mv ? `${(m.win >= 0 ? m.win : 1 - m.t) === i ? "You" : nm(j)} rolled ${m.roll}` : "";
  const say = m.p1 === "" ? "Waiting for your partner to join… open games → Pebble Pass on their phone" : m.win >= 0 ? (m.win === i ? "🎉 Your side is empty — you win!" : `${nm(j)} emptied their side first 💪`) : my ? "Your turn: roll the dice!" : `${nm(j)} is rolling…`;
  return `<div class="gm"><div class="dg">${side(j, "op")}<div class="dmid"><div class="ddice">${m.roll ? FACE[m.roll - 1] : "🎲"}</div><div class="dsay"><b>${say}</b><span>${last}</span></div></div>${side(i, "me")}</div>
  ${my ? `<button class="btn" data-act="dl" data-id="roll">🎲 roll the dice</button>` : ""}
  ${m.win >= 0 ? `<button class="btn" data-act="dl" data-id="again">play again</button>` : ""}
  <div class="dsws-t">your colour</div>${swatches(m, m["c" + j])}<button class="chip" data-act="dl" data-id="leave">${m.p1 === "" || m.win >= 0 ? "close match" : "leave match"}</button></div>`;
}
export function duelMain() {
  if (shown) return boardHtml(shown);
  const o = waiting();
  return `<div class="gm"><div class="wbar"><b>⚪ Pebble Pass</b></div><p class="hint">Each of you has 9 pebbles. Roll the dice and pass that many to your partner. First to empty their own side wins!</p>
  <div class="dsws-t">pick your colour</div>${swatches(null, o ? o.c0 : -1)}
  ${o ? `<button class="btn" data-act="dl" data-id="join">${esc(o.e0)} join ${esc(o.n0)}'s match</button>` : `<button class="btn" data-act="dl" data-id="create">create a match</button><p class="hint">your partner then opens games → Pebble Pass and joins</p>`}</div>`;
}
export function gamesHub() { // what the games tab shows: a menu, or one of the two games with a back button
  const back = `<div class="dback"><button class="chip" data-act="dl" data-id="menu">‹ games</button></div>`;
  if (view === "wc") return back + gamesMain();
  if (view === "duel") return back + duelMain();
  const o = waiting(), m = mine();
  return `<div class="dmenu"><button class="dcard wc" data-act="dl" data-id="wc"><i>🔤</i><b>Wordscapes</b><span>solo word puzzle</span></button>
  <button class="dcard pp" data-act="dl" data-id="duel"><i>⚪</i><b>Pebble Pass</b><span>${o ? `${esc(o.e0)} ${esc(o.n0)} is waiting, join!` : m && m.win < 0 ? "match in progress" : "2 players · live"}</span></button></div>`;
}
