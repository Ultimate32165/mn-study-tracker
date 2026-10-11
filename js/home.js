// Login screen, install button and the 'together' (home) tab: your timer hero, friend cards / tiles.
import { SIGNUP_CODE } from "./firebase-config.js";
import { petRow } from "./pets.js";
import { giftsView } from "./social.js";
import { soundLabel } from "./sound.js";
import { coupleCard, goalOf, live, liveToday, me, restOf, users } from "./state.js";
import { app, esc, fmt, ls, stats } from "./util.js";

function authView() {
  app.innerHTML = `<div class="auth"><div class="logo">📚</div><h1>MN study tracker</h1><p class="sub">study together, even when you're apart 🎀</p>
  <input id="u" placeholder="username" autocapitalize="off" autocomplete="username">
  <input id="p" type="password" placeholder="password" autocomplete="current-password">
  ${SIGNUP_CODE ? `<input id="c" placeholder="secret code (for new accounts)" autocapitalize="off">` : ""}
  <button class="btn" data-act="login">log in</button><button class="btn ghost" data-act="signup">create account</button>${installCard()}</div>`;
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
const card = (u, isMe) => {
  const s = stats(u), on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), p = g ? Math.min(100, lt / g * 100) : 0;
  return `<div class="card ${on ? "on" : ""} ${br ? "brk" : ""}"><div class="who"><span class="ring ${!g ? "off" : p >= 100 ? "done" : ""}" style="--p:${p}"><span class="av">${esc(u.emoji)}</span></span><div class="nm"><b>${esc(u.name)}${isMe ? " (you)" : ""}</b>
  <span class="pill ${on ? "live" : ""}">${on ? "studying ✏️" : br ? "on a break ☕" : "resting 💤"}</span></div>${on || br ? `<div class="clock" ${live(u)}>00:00:00</div>` : ""}</div>
  ${petRow(u)}<div class="mini"><div><b>${fmt(lt)}${g ? `<small> / ${fmt(g)}</small>` : ""}</b>today</div><div><b>${fmt(s.week)}</b>7 days</div><div><b>${s.streak}🔥</b>streak</div><div><b>${fmt(s.total)}</b>total</div></div>
  ${!isMe && on ? `<div class="cheer"><span>send a cheer</span><button data-act="cheer" data-id="${u.id}" data-e="💖">💖</button><button data-act="cheer" data-id="${u.id}" data-e="🔥">🔥</button><button data-act="cheer" data-id="${u.id}" data-e="🧋">🧋</button><button data-act="cheer" data-id="${u.id}" data-e="🫶">🫶</button><button class="t" data-act="stickers" data-id="${u.id}">💌</button></div>` : ""}</div>`;
};
function homeView(mine) {
  const on = mine.status === "studying", br = mine.status === "paused";
  const hint = br ? (mine.breakAt ? `<p class="hint" data-brk="${mine.breakAt}" data-len="${restOf(mine)}"></p>` : `<p class="hint">timer paused ☕ take your time</p>`) : `<p class="hint">you're doing great ✨${mine.pomo ? " 🍅" : ""}</p>`;
  const hero = on || br
    ? `<div class="hero ${br ? "brk" : "on"}"><div class="clock big" ${live(mine)}>00:00:00</div>${hint}
       <div class="duo"><button class="study ${br ? "go" : "pause"}" data-act="${br ? "resume" : "pause"}">${br ? "resume" : "pause"}<span>${br ? "▶️" : "⏸️"}</span></button>
       <button class="study stop" data-act="stop">stop<span>⏹️</span></button></div><div class="chips"><button class="chip" data-act="sound">${soundLabel()}</button></div><button class="link" data-act="discard">cancel without saving</button></div>`
    : `<div class="hero"><button class="study" data-act="study">study<span>📖</span></button><p class="hint">tap when you start ✨</p><div class="chips"><button class="chip" data-act="pomo">🍅 pomodoro: ${pomo ? `on (${mine.pomoFocus ?? 25} / ${mine.pomoRest ?? 5})` : "off"}</button><button class="chip" data-act="sound">${soundLabel()}</button></div></div>`;
  const others = users.filter(u => u.id !== me.uid).sort((a, b) => (b.status === "studying") - (a.status === "studying"));
  const tile = (u, isMe) => {
    const s = stats(u), on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), p = g ? Math.min(100, lt / g * 100) : 0;
    return `<div class="tile ${on ? "on" : ""} ${br ? "brk" : ""}"><span class="ring ${!g ? "off" : p >= 100 ? "done" : ""}" style="--p:${p};--sz:52px"><span class="av">${esc(u.emoji)}</span></span>
    <b class="tn">${esc(u.name)}${isMe ? " (you)" : ""}</b><span class="pill ${on ? "live" : ""}">${on ? "studying ✏️" : br ? "on a break ☕" : "resting 💤"}</span>
    ${on || br ? `<div class="clock" ${live(u)}>00:00:00</div>` : `<div class="clock idle">${fmt(lt)}</div>`}
    <small>${on || br ? `today ${fmt(lt)}` : "today"}${g ? ` / ${fmt(g)}` : ""}</small><small>${s.streak}🔥 · ${fmt(s.week)} this week</small>
    ${!isMe && on ? `<div class="tcheer"><button data-act="cheer" data-id="${u.id}" data-e="💖">💖</button><button data-act="cheer" data-id="${u.id}" data-e="🔥">🔥</button><button data-act="stickers" data-id="${u.id}">💌</button></div>` : ""}</div>`;
  };
  if (compact) return `${hero}${installCard()}${coupleCard()}<h2>${others.length ? `together <button class="chip" data-act="card" data-id="together">📸 photocard</button>` : "you"}</h2>
  <div class="sq">${[tile(mine, true), ...others.map(u => tile(u, false))].join("")}</div>${others.length ? "" : `<p class="hint">Ask your friend to create an account — they'll show up here!</p>`}${giftsView()}`;
  return `${hero}${installCard()}${coupleCard()}<h2>you</h2>${card(mine, true)}<h2>${others.length ? `friends <button class="chip" data-act="card" data-id="together">📸 photocard</button>` : "no friends yet"}</h2>
  ${others.map(u => card(u, false)).join("") || `<p class="hint">Ask your friend to create an account — they'll show up here!</p>`}${giftsView()}`;
}

export { authView, compact, homeView, pomo, runInstall, setCompact, setInstallEvt, togglePomo };
