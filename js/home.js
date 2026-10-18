// Login screen, install button and the 'together' (home) tab: your timer hero (study button inside a goal ring), people cards / tiles.
import { SIGNUP_CODE } from "./firebase-config.js";
import { petRow } from "./pets.js";
import { giftsView } from "./social.js";
import { soundLabel } from "./sound.js";
import { coupleCard, goalOf, live, liveToday, me, restOf, users } from "./state.js";
import { app, esc, fmt, ls, stats } from "./util.js";

function authView() {
  app.innerHTML = `<div class="auth"><div class="logo">📚</div><h1>MN study tracker</h1><p class="sub">study together, even when you're apart 🎀</p>
  <div class="authcard"><input id="u" placeholder="username" aria-label="username" autocapitalize="off" autocomplete="username" enterkeyhint="next">
  <input id="p" type="password" placeholder="password" aria-label="password" autocomplete="current-password" enterkeyhint="go">
  ${SIGNUP_CODE ? `<input id="c" placeholder="secret code (new accounts only)" aria-label="secret code" autocapitalize="off">` : ""}
  <button class="btn" data-act="login">log in</button><button class="btn ghost" data-act="signup">create account</button></div>${installCard()}</div>`;
}
function installCard() {
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "";
  if (installEvt) return `<button class="btn mint" data-act="install">📲 install app</button>`;
  if (/iphone|ipad/i.test(navigator.userAgent)) return `<p class="hint">📲 To install: tap Share ⬆️ then “Add to Home Screen”</p>`;
  return "";
}
let installEvt = null;
const setInstallEvt = e => { installEvt = e; };
const runInstall = () => { installEvt.prompt(); installEvt = null; };
let compact = ls("compact") === "1";
const setCompact = v => { compact = v; ls("compact", compact ? "1" : "0"); };
let pomo = ls("pomo") === "1";
const togglePomo = () => { pomo = !pomo; ls("pomo", pomo ? "1" : "0"); };

const SVG = `width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"`;
const ICON = {
  list: `<svg ${SVG} fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>`,
  grid: `<svg ${SVG} fill="currentColor"><rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/></svg>`
};
const stateText = u => u.status === "studying" ? "studying ✏️" : u.status === "paused" ? "on a break ☕" : "resting 💤";

const card = (u, isMe) => {
  const s = stats(u), on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), p = g ? Math.min(100, lt / g * 100) : 0;
  return `<div class="card ${on ? "on" : ""} ${br ? "brk" : ""}"><div class="who"><span class="ring ${!g ? "off" : p >= 100 ? "done" : ""}" style="--p:${p}"><span class="av">${esc(u.emoji)}</span></span><div class="nm"><b>${esc(u.name)}${isMe ? " (you)" : ""}</b>
  <span class="pill ${on ? "live" : ""}">${stateText(u)}</span></div>${on || br ? `<div class="clock" ${live(u)}>00:00:00</div>` : ""}</div>
  ${petRow(u)}<div class="mini"><div><b>${fmt(lt)}${g ? `<small> / ${fmt(g)}</small>` : ""}</b>today</div><div><b>${fmt(s.week)}</b>7 days</div><div><b>${s.streak}🔥</b>streak</div><div><b>${fmt(s.total)}</b>total</div></div>
  ${!isMe && on ? `<div class="cheer"><span>send a cheer</span><button data-act="cheer" data-id="${u.id}" data-e="💖">💖</button><button data-act="cheer" data-id="${u.id}" data-e="🔥">🔥</button><button data-act="cheer" data-id="${u.id}" data-e="🧋">🧋</button><button data-act="cheer" data-id="${u.id}" data-e="🫶">🫶</button><button class="t" data-act="stickers" data-id="${u.id}">💌</button></div>` : ""}</div>`;
};
const tile = (u, isMe) => {
  const s = stats(u), on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), p = g ? Math.min(100, lt / g * 100) : 0;
  return `<div class="tile ${on ? "on" : ""} ${br ? "brk" : ""}"><span class="ring ${!g ? "off" : p >= 100 ? "done" : ""}" style="--p:${p};--sz:52px"><span class="av">${esc(u.emoji)}</span></span>
  <b class="tn">${esc(u.name)}${isMe ? " (you)" : ""}</b><span class="pill ${on ? "live" : ""}">${stateText(u)}</span>
  ${on || br ? `<div class="clock" ${live(u)}>00:00:00</div>` : `<div class="clock idle">${fmt(lt)}</div>`}
  <small>${on || br ? `today ${fmt(lt)}` : "today"}${g ? ` / ${fmt(g)}` : ""}</small><small>${s.streak}🔥 · ${fmt(s.week)} this week</small>
  ${!isMe && on ? `<div class="tcheer"><button data-act="cheer" data-id="${u.id}" data-e="💖">💖</button><button data-act="cheer" data-id="${u.id}" data-e="🔥">🔥</button><button data-act="stickers" data-id="${u.id}">💌</button></div>` : ""}</div>`;
};

// the timer: one big button inside a ring that fills as you reach today's goal
function heroView(mine) {
  const on = mine.status === "studying", br = mine.status === "paused", g = goalOf(mine), lt = liveToday(mine), p = g ? Math.min(100, lt / g * 100) : 0;
  const dial = `class="dial ${on || br ? "run" : "idle"} ${g && p >= 100 ? "done" : ""}" style="--p:${p}"`;
  if (!on && !br) return `<div class="hero"><div ${dial}><button class="study" data-act="study">study<span>📖</span></button></div>
    <p class="goal"><b>${fmt(lt)}</b>${g ? ` of ${fmt(g)} today` : " today"}</p>
    <div class="chips"><button class="chip" data-act="pomo">🍅 pomodoro ${pomo ? `${mine.pomoFocus ?? 25}/${mine.pomoRest ?? 5}` : "off"}</button><button class="chip" data-act="sound">${soundLabel()}</button></div></div>`;
  const hint = br ? (mine.breakAt ? `<p class="hint" data-brk="${mine.breakAt}" data-len="${restOf(mine)}"></p>` : `<p class="hint">timer paused ☕ take your time</p>`) : `<p class="hint">you're doing great ✨${mine.pomo ? " 🍅" : ""}</p>`;
  return `<div class="hero ${br ? "brk" : "on"}"><div ${dial}><div class="dc"><small>${br ? "on a break ☕" : "studying ✏️"}</small><div class="clock big" ${live(mine)}>00:00:00</div></div></div>${hint}
    <div class="duo"><button class="study ${br ? "go" : "pause"}" data-act="${br ? "resume" : "pause"}"><span>${br ? "▶️" : "⏸️"}</span>${br ? "resume" : "pause"}</button><button class="study stop" data-act="stop"><span>⏹️</span>stop</button></div>
    <div class="chips"><button class="chip" data-act="sound">${soundLabel()}</button></div><button class="link" data-act="discard">cancel without saving</button></div>`;
}

function homeView(mine) {
  const others = users.filter(u => u.id !== me.uid).sort((a, b) => (b.status === "studying") - (a.status === "studying"));
  const vt = `<span class="vt" role="group" aria-label="layout"><button class="${compact ? "" : "on"}" data-act="compact" data-id="0" title="cards" aria-label="cards" aria-pressed="${!compact}">${ICON.list}</button><button class="${compact ? "on" : ""}" data-act="compact" data-id="1" title="tiles" aria-label="tiles" aria-pressed="${compact}">${ICON.grid}</button></span>`;
  const head = others.length ? `<h2>together ${vt}<button class="chip" data-act="card" data-id="together">📸 photocard</button></h2>` : `<h2>you</h2>`;
  const people = compact ? `<div class="sq">${[tile(mine, true), ...others.map(u => tile(u, false))].join("")}</div>` : `${card(mine, true)}${others.map(u => card(u, false)).join("")}`;
  return `${heroView(mine)}${installCard()}${head}${people}${others.length ? "" : `<p class="hint">Ask your friend to create an account — they'll show up here!</p>`}${coupleCard()}${giftsView()}`;
}

export { authView, compact, homeView, pomo, runInstall, setCompact, setInstallEvt, togglePomo };
