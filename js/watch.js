// The once-a-second loop: ticking clocks, pomodoro breaks, still-studying check, goal / streak / badge / evolve / seed checks.
import * as DB from "./db.js";
import { forestGrow } from "./forest.js";
import { checkSeeds } from "./decor.js";
import { syncGarden } from "./garden.js";
import { G } from "./garden-state.js";
import { checkEvolve, checkUnlocks, milestonePop } from "./milestones.js";
import { saveMs } from "./photocard.js";
import { askStill } from "./sheets.js";
import { soundActive, stopSound } from "./sound.js";
import { couple, elapsed, focusOf, goalOf, limitOf, liveToday, me, restOf, runStart, totalOf, ui, users } from "./state.js";
import { checkBadges } from "./stats-view.js";
import { burst, clock, key, ls, modal, notify, stats, toast } from "./util.js";

let askedAt = 0, busy = false, brkSeen = 0, lastBest = 0;
const tick = () => {
  document.querySelectorAll("[data-base]").forEach(e => e.textContent = clock((+e.dataset.base + (e.dataset.run ? Date.now() - e.dataset.run : 0)) / 1000));
  document.querySelectorAll("[data-brk]").forEach(e => { const r = +e.dataset.len - (Date.now() - e.dataset.brk); e.textContent = r > 0 ? `☕ break · ${clock(r / 1000).slice(3)} left` : "break's over, ready to resume? 💪"; });
};
function watch() { // runs every second for the logged-in user
  const m = users.find(u => u.id === me?.uid); if (!m) return;
  if (m.pomo && m.status === "studying" && m.nextBreak && elapsed(m) >= m.nextBreak && !busy) { // pomodoro: auto-pause at each 25 min block
    busy = true; DB.pomoBreak(me.uid, m.nextBreak, focusOf(m)).catch(() => {}).finally(() => setTimeout(() => busy = false, 2000));
    toast("Break time! ☕"); notify("Break time ☕", "Nice focus! Take 5 minutes.");
  }
  if (m.status === "paused" && m.breakAt && Date.now() - m.breakAt >= restOf(m) && brkSeen !== m.breakAt) { brkSeen = m.breakAt; toast("Break's over 💪"); notify("Break's over 💪", "Ready to resume?"); }
  const lim = limitOf(m);
  if (m.status === "studying" && lim > 0 && !modal.innerHTML && Date.now() - askedAt > 3e5 && Date.now() >= Math.max(m.checkedAt || 0, runStart(m)) + lim * 1000) {
    askedAt = Date.now(); askStill(m); notify("Still studying? 🥺", "Your timer has been running for a while.");
  }
  const g = goalOf(m), k = "goal-" + key(Date.now()), st = stats(m);
  if (g > 0 && liveToday(m) >= g && ls(k) !== "1") { ls(k, "1"); burst(); toast("Daily goal reached! 🎉"); }
  if (m.bestStreak === undefined) { if (st.streak !== lastBest) { lastBest = st.streak; DB.updateProfile(me.uid, { bestStreak: st.streak }); } }
  else if (st.streak > m.bestStreak && st.streak !== lastBest) { lastBest = st.streak; DB.updateProfile(me.uid, { bestStreak: st.streak }); if (st.streak >= 2) { burst(); const ms = { type: "streak", n: st.streak, at: Date.now() }; saveMs(ms); milestonePop(ms); } }
  checkBadges(m);
  if (soundActive() && m.status !== "studying") { stopSound(); ui.render(); }
  checkUnlocks(m); checkEvolve(m); checkSeeds(m); forestGrow(m, totalOf(m), toast);
  const cl = couple().lv, seen = ls("lvl");
  if (seen == null) ls("lvl", cl); else if (cl > +seen) { ls("lvl", cl); burst(); const ms = { type: "level", lv: cl, at: Date.now() }; saveMs(ms); setTimeout(() => milestonePop(ms), 1800); }
}
setInterval(() => { tick(); watch(); if (G.el && G.el.isConnected) syncGarden(); }, 1000);
setInterval(() => me && ui.render(), 30000);

export { tick };
