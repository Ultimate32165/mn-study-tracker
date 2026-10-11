// The shared store (me / users / sessions / gifts / board / tab + setters), study-time maths (elapsed, goals, today, total) and the couple level.
import { fmt, stats } from "./util.js";

// The one shared store. Other files import these names and read them directly (ES-module "live bindings"),
// but only THIS file may assign them, so use the setters below.
export let me = null, users = [], sessions = [], gifts = [], board = [], tab = "home";
export const setUsers = x => { users = x; }, setSessions = x => { sessions = x; }, setGifts = x => { gifts = x; }, setBoard = x => { board = x; }, setTab = x => { tab = x; };
export const resetData = u => { me = u; users = []; sessions = []; gifts = []; board = []; };
export const ui = { render: () => {} }; // app.js plugs the real render function in here, so other files can ask for a redraw without importing app.js

// ---- study-time maths for one user doc ----
const runStart = u => u.runStart ?? (u.startedAt ? u.startedAt.toMillis() : Date.now());
const elapsed = u => (u.accum || 0) + (u.status === "studying" ? Date.now() - runStart(u) : 0); // ms studied so far, excluding breaks
const live = u => `data-base="${u.accum || 0}" data-run="${u.status === "studying" ? runStart(u) : ""}"`;
const goalOf = u => u.goal ?? 14400, limitOf = u => u.limit ?? 10800,
  focusOf = u => (u.pomoFocus ?? 25) * 60000, restOf = u => (u.pomoRest ?? 5) * 60000;
const liveToday = u => stats(u).today + (u.status === "studying" || u.status === "paused" ? elapsed(u) / 1000 : 0);
const totalOf = u => stats(u).total + (u.status === "studying" || u.status === "paused" ? elapsed(u) / 1000 : 0); // seconds studied incl. the running session
// ---- couple level: everyone's hours added together ----
const LV_H = [0, 5, 15, 30, 60, 100, 150, 220, 300, 400];
const LV_T = ["Tiny Beginners 🐣", "Study Buddies 📚", "Cozy Duo ☕", "Focus Friends 🎧", "Brain Besties 🧠", "Power Pair ⚡", "Study Stars ⭐", "Scholar Squad 🎓", "Genius Gang 🚀", "Dream Team 👑"];
function couple() {
  const sec = users.reduce((a, u) => a + stats(u).total + (u.status === "studying" || u.status === "paused" ? elapsed(u) / 1000 : 0), 0), h = sec / 3600;
  let lv = 0; while (lv + 1 < LV_H.length && h >= LV_H[lv + 1]) lv++;
  const next = LV_H[lv + 1];
  return { sec, lv, title: LV_T[lv], next, pct: next ? (h - LV_H[lv]) / (next - LV_H[lv]) * 100 : 100 };
}
const coupleCard = () => { const c = couple(); return `<div class="lvl"><div class="lt"><b>💞 Level ${c.lv + 1}</b><span>${c.title}</span></div><div class="lbar"><i style="width:${c.pct}%"></i></div>
  <small>${c.next ? `${fmt(c.sec)} of ${c.next}h together` : `${fmt(c.sec)} together · max level!`}</small></div>`; };

export { LV_T, couple, coupleCard, elapsed, focusOf, goalOf, limitOf, live, liveToday, restOf, runStart, totalOf };
