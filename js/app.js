import * as DB from "./db.js";
import { SIGNUP_CODE } from "./firebase-config.js";

const $ = s => document.querySelector(s), app = $("#app"), modal = $("#modal");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMOJI = ["🐰", "🐻", "🐱", "🦊", "🐼", "🐨", "🦄", "🐥", "🍓", "🌸", "🍒", "⭐"];
const DAY = 864e5;
const THEMES = { strawberry: ["🍓", "#ffd6e7"], matcha: ["🍵", "#e0f4d6"], sky: ["☁️", "#d6ecff"], lilac: ["🔮", "#e9dcff"], sunny: ["🍑", "#ffe7bf"], sakura: ["🌸", "#ffeaf1"], mochi: ["🍡", "#f6ecdf"], ocean: ["🐬", "#d4f3f2"], night: ["🌙", "#1e1830"], cocoa: ["🍫", "#2a1f1c"],
  "glass-aurora": ["✨", "#d8c6ff"], "glass-sunset": ["🌅", "#ffc0b0"], "glass-lagoon": ["🫧", "#bfe6f2"], "glass-galaxy": ["🌌", "#1b1245"] };
const GLASS = Object.keys(THEMES).filter(k => k.startsWith("glass-")), CUTE = Object.keys(THEMES).filter(k => !k.startsWith("glass-"));
const themeBtns = l => l.map(t => `<button class="av ${t === theme ? "sel" : ""}" data-t="${t}" title="${t.replace("glass-", "glass ")}">${t === "auto" ? "🌓" : THEMES[t][0]}</button>`).join("");
let theme = "strawberry"; try { theme = localStorage.getItem("theme") || theme; } catch {}
function applyTheme(t) {
  try { localStorage.setItem("theme", t); } catch {}
  const real = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "strawberry") : (THEMES[t] ? t : "strawberry");
  document.documentElement.dataset.theme = real;
  document.querySelector('meta[name="theme-color"]').content = THEMES[real][1];
}
applyTheme(theme);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => theme === "auto" && applyTheme("auto"));
let me = null, users = [], sessions = [], tab = "home", unsubs = [], installEvt = null;

// ---------- helpers ----------
const key = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmt = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const clock = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":"); };
function split(start, sec) { // split a session across midnight into per-day seconds
  const days = {}; let t = start; const end = start + sec * 1000;
  while (t < end) { const n = new Date(t); n.setHours(24, 0, 0, 0); const e = Math.min(n.getTime(), end), k = key(t); days[k] = (days[k] || 0) + Math.round((e - t) / 1000); t = e; }
  return days;
}
function stats(u) {
  const d = u.daily || {}, now = Date.now(); let total = 0, week = 0, streak = 0;
  for (const k in d) total += d[k];
  for (let i = 0; i < 7; i++) week += d[key(now - i * DAY)] || 0;
  let i = d[key(now)] > 0 ? 0 : 1; while (d[key(now - i * DAY)] > 0) { streak++; i++; }
  return { today: d[key(now)] || 0, week, total, streak };
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.className = "show"; clearTimeout(toast.t); toast.t = setTimeout(() => t.className = "", 2600); }
const errMsg = e => ({ "auth/email-already-in-use": "That username is taken.", "auth/invalid-credential": "Wrong username or password.", "auth/weak-password": "Password needs at least 6 characters.", "auth/network-request-failed": "No internet connection." }[e.code] || e.message);

// ---------- views ----------
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
const runStart = u => u.runStart ?? (u.startedAt ? u.startedAt.toMillis() : Date.now());
const elapsed = u => (u.accum || 0) + (u.status === "studying" ? Date.now() - runStart(u) : 0); // ms studied so far, excluding breaks
const live = u => `data-base="${u.accum || 0}" data-run="${u.status === "studying" ? runStart(u) : ""}"`;
const goalOf = u => u.goal ?? 14400, limitOf = u => u.limit ?? 10800,
  focusOf = u => (u.pomoFocus ?? 25) * 60000, restOf = u => (u.pomoRest ?? 5) * 60000;
const liveToday = u => stats(u).today + (u.status === "studying" || u.status === "paused" ? elapsed(u) / 1000 : 0);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch {} };
let pomo = ls("pomo") === "1", lastCheer = 0, askedAt = 0, busy = false, brkSeen = 0, lastBest = 0;

function burst(emojis, n = 70) { // confetti (colored bits) or floating emojis
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div"); box.className = "fx";
  for (let i = 0; i < n; i++) {
    const d = document.createElement("i");
    d.style.cssText = `left:${Math.random() * 100}%;--x:${(Math.random() - .5) * 160}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * .6}s;animation-duration:${2 + Math.random() * 1.5}s`;
    if (emojis) d.textContent = emojis[i % emojis.length]; else d.style.background = ["#ff8fb8", "#b79cf5", "#6fdcb3", "#ffd36f", "#6fb3ff"][i % 5];
    box.appendChild(d);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4500);
}
const notify = (t, body) => { try { if (Notification.permission === "granted" && document.hidden) navigator.serviceWorker.ready.then(r => r.showNotification(t, { body, icon: "icons/icon-192.png", tag: "mn" })); } catch {} };

const card = (u, isMe) => {
  const s = stats(u), on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), p = g ? Math.min(100, lt / g * 100) : 0;
  return `<div class="card ${on ? "on" : ""} ${br ? "brk" : ""}"><div class="who"><span class="ring ${!g ? "off" : p >= 100 ? "done" : ""}" style="--p:${p}"><span class="av">${esc(u.emoji)}</span></span><div class="nm"><b>${esc(u.name)}${isMe ? " (you)" : ""}</b>
  <span class="pill ${on ? "live" : ""}">${on ? "studying ✏️" : br ? "on a break ☕" : "resting 💤"}</span></div>${on || br ? `<div class="clock" ${live(u)}>00:00:00</div>` : ""}</div>
  <div class="mini"><div><b>${fmt(lt)}${g ? `<small> / ${fmt(g)}</small>` : ""}</b>today</div><div><b>${fmt(s.week)}</b>7 days</div><div><b>${s.streak}🔥</b>streak</div><div><b>${fmt(s.total)}</b>total</div></div>
  ${!isMe && on ? `<div class="cheer"><span>send a cheer</span><button data-act="cheer" data-id="${u.id}" data-e="💖">💖</button><button data-act="cheer" data-id="${u.id}" data-e="🔥">🔥</button></div>` : ""}</div>`;
};
function homeView(mine) {
  const on = mine.status === "studying", br = mine.status === "paused";
  const hint = br ? (mine.breakAt ? `<p class="hint" data-brk="${mine.breakAt}" data-len="${restOf(mine)}"></p>` : `<p class="hint">timer paused ☕ take your time</p>`) : `<p class="hint">you're doing great ✨${mine.pomo ? " 🍅" : ""}</p>`;
  const hero = on || br
    ? `<div class="hero ${br ? "brk" : "on"}"><div class="clock big" ${live(mine)}>00:00:00</div>${hint}
       <div class="duo"><button class="study ${br ? "go" : "pause"}" data-act="${br ? "resume" : "pause"}">${br ? "resume" : "pause"}<span>${br ? "▶️" : "⏸️"}</span></button>
       <button class="study stop" data-act="stop">stop<span>⏹️</span></button></div><button class="link" data-act="discard">cancel without saving</button></div>`
    : `<div class="hero"><button class="study" data-act="study">study<span>📖</span></button><p class="hint">tap when you start ✨</p><button class="chip" data-act="pomo">🍅 pomodoro: ${pomo ? `on (${mine.pomoFocus ?? 25} / ${mine.pomoRest ?? 5})` : "off"}</button></div>`;
  const others = users.filter(u => u.id !== me.uid).sort((a, b) => (b.status === "studying") - (a.status === "studying"));
  return `${hero}${installCard()}<h2>${others.length ? "friends" : "no friends yet"}</h2>
  ${others.map(u => card(u, false)).join("") || `<p class="hint">Ask your friend to create an account — they'll show up here!</p>`}<h2>you</h2>${card(mine, true)}`;
}
function statsView(mine) {
  const s = stats(mine), d = mine.daily || {}, now = Date.now();
  const days = [...Array(7)].map((_, i) => { const t = now - (6 - i) * DAY; return { l: new Date(t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), v: d[key(t)] || 0 }; });
  const max = Math.max(...days.map(x => x.v), 1);
  return `<h2>last 7 days</h2><div class="bars">${days.map(x => `<div class="bar"><i style="height:${Math.max(4, x.v / max * 100)}%"></i><em>${x.v ? fmt(x.v) : ""}</em><span>${x.l}</span></div>`).join("")}</div>
  <div class="tiles"><div><b>${fmt(s.today)}</b>today</div><div><b>${fmt(s.week)}</b>this week</div><div><b>${s.streak}🔥</b>day streak</div><div><b>${fmt(s.total)}</b>all time</div></div>
  <h2>sessions <button class="chip" data-act="add">+ add time</button></h2>
  ${sessions.map(x => `<div class="sess"><div><b>${new Date(x.start.toMillis()).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</b>
  <span>${fmt(x.seconds)}</span></div><button class="ic" data-act="edit" data-id="${x.id}">✏️</button><button class="ic" data-act="del" data-id="${x.id}">🗑️</button></div>`).join("") || `<p class="hint">No sessions yet — press study to begin!</p>`}`;
}
function render() {
  if (!me) return authView();
  const mine = users.find(u => u.id === me.uid);
  if (!mine) return app.innerHTML = `<div class="auth"><div class="logo">📚</div><p class="hint">loading…</p></div>`;
  app.innerHTML = `<header><h1>MN study tracker</h1><button class="av" data-act="profile">${esc(mine.emoji)}</button></header>
  <main>${tab === "home" ? homeView(mine) : statsView(mine)}</main>
  <nav><button class="${tab === "home" ? "act" : ""}" data-act="tab" data-id="home">🏠<span>together</span></button><button class="${tab === "stats" ? "act" : ""}" data-act="tab" data-id="stats">📊<span>my stats</span></button></nav>`;
  tick();
}
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
  else if (st.streak > m.bestStreak && st.streak !== lastBest) { lastBest = st.streak; DB.updateProfile(me.uid, { bestStreak: st.streak }); if (st.streak >= 2) { burst(); toast(`New streak record: ${st.streak} days! 🔥`); } }
}
setInterval(() => { tick(); watch(); }, 1000);
setInterval(() => me && render(), 30000);
function askStill(m) {
  const el = Math.floor(elapsed(m) / 1000), start = m.startedAt ? m.startedAt.toMillis() : Date.now();
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>still studying? 🥺</h3><p class="hint">Your timer has been running for ${fmt(el)}.</p>
  <button class="btn" id="y1">yes, still going 💪</button><button class="btn ghost" id="y2">no, I forgot to stop</button></div></div>`;
  $("#y1").onclick = async () => { modal.innerHTML = ""; await DB.checkIn(me.uid); toast("Keep going! 🌟"); };
  $("#y2").onclick = () => sheet({ title: "when did you stop? ⏱️", note: "Slide down to the time you really studied.", secs: el, max: el,
    onSave: async sec => { if (sec < 60) await DB.cancelStudy(me.uid); else await DB.addSession(me.uid, start, split(start, sec), sec, true); toast("Saved! 🌟"); } });
}

// ---------- sheets ----------
function sheet({ title, note = "", secs = 0, max, date, onSave }) { // max = cap in seconds (edit mode: can only reduce)
  const mins = Math.floor(secs / 60), hMax = max === undefined ? 23 : Math.floor(max / 3600);
  const col = (id, n) => `<div class="col" id="${id}">${[...Array(n + 1)].map((_, i) => `<div>${String(i).padStart(2, "0")}</div>`).join("")}</div>`;
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>${title}</h3><p class="hint">${note}</p>
  ${date !== undefined ? `<input type="date" id="sd" value="${date}" max="${key(Date.now())}">` : ""}
  <div class="wheel"><div class="band"></div>${col("wh", hMax)}<b>:</b>${col("wm", 59)}</div><div class="wl"><span>hours</span><span>mins</span></div>
  <div class="row"><button class="btn ghost" id="sx">cancel</button><button class="btn" id="ss">save 💖</button></div></div></div>`;
  const wh = $("#wh"), wm = $("#wm"), idx = c => Math.round(c.scrollTop / 44);
  wh.scrollTop = Math.floor(mins / 60) * 44; wm.scrollTop = (mins % 60) * 44;
  let t;
  const clamp = () => { // if the wheels go above the original time, glide back to it
    if (max === undefined) return; const cap = Math.floor(max / 60);
    if (idx(wh) * 60 + idx(wm) > cap) { wh.scrollTo({ top: Math.floor(cap / 60) * 44, behavior: "smooth" }); wm.scrollTo({ top: (cap % 60) * 44, behavior: "smooth" }); }
  };
  const watch = c => { c.onscroll = () => { const i = idx(c); [...c.children].forEach((d, k) => d.classList.toggle("s", k === i)); clearTimeout(t); t = setTimeout(clamp, 150); }; c.onscroll(); };
  watch(wh); watch(wm);
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#ss").onclick = async () => {
    let sec = (idx(wh) * 60 + idx(wm)) * 60; if (max !== undefined) sec = Math.min(sec, max);
    try { await onSave(sec, $("#sd")?.value); modal.innerHTML = ""; } catch (e) { toast(errMsg(e)); }
  };
}
function profileSheet(mine) {
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>your profile</h3><input id="pn" value="${esc(mine.name)}" maxlength="20">
  <div class="emojis">${EMOJI.map(e => `<button class="av ${e === mine.emoji ? "sel" : ""}" data-e="${e}">${e}</button>`).join("")}</div>
  <button class="btn ghost" id="gl">🎯 daily goal: ${goalOf(mine) ? fmt(goalOf(mine)) : "off"}</button>
  <button class="btn ghost" id="lm">⏰ still-studying check: ${limitOf(mine) ? "after " + fmt(limitOf(mine)) : "off"}</button>
  <button class="btn ghost" id="pm">🍅 pomodoro: ${mine.pomoFocus ?? 25} min focus / ${mine.pomoRest ?? 5} min break</button>
  <button class="btn ghost" id="nt">🔔 turn on notifications</button><p class="hint">cute themes</p><div class="emojis">${themeBtns(["auto", ...CUTE])}</div><p class="hint">glass themes ✨</p><div class="emojis">${themeBtns(GLASS)}</div>
  <div class="row"><button class="btn ghost" id="lo">log out</button><button class="btn" id="ps">save 💖</button></div><button class="link" id="sx">close</button></div></div>`;
  let em = mine.emoji;
  $("#gl").onclick = () => sheet({ title: "daily goal 🎯", note: "How long do you want to study each day? 00:00 turns it off.", secs: goalOf(mine), onSave: sec => DB.updateProfile(me.uid, { goal: sec }) });
  $("#lm").onclick = () => sheet({ title: "still-studying check ⏰", note: "Ask me “still studying?” when the timer runs this long. 00:00 turns it off.", secs: limitOf(mine), onSave: sec => DB.updateProfile(me.uid, { limit: sec }) });
  $("#pm").onclick = () => sheet({ title: "focus length 🍅", note: "How long is each study block? (hours : minutes)", secs: (mine.pomoFocus ?? 25) * 60,
    onSave: async sec => {
      if (sec < 60) throw Error("Minimum is 1 minute.");
      await DB.updateProfile(me.uid, { pomoFocus: sec / 60 });
      setTimeout(() => sheet({ title: "break length ☕", note: "How long is each break?", secs: (mine.pomoRest ?? 5) * 60,
        onSave: async s2 => { if (s2 < 60) throw Error("Minimum is 1 minute."); await DB.updateProfile(me.uid, { pomoRest: s2 / 60 }); toast("Pomodoro saved! 🍅"); } }), 0);
    } });
  $("#nt").onclick = async () => { try { toast((await Notification.requestPermission()) === "granted" ? "Notifications on! 🔔" : "Notifications blocked."); } catch { toast("Install the app to your home screen first."); } };
  modal.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { theme = b.dataset.t; applyTheme(theme); modal.querySelectorAll("[data-t]").forEach(x => x.classList.toggle("sel", x === b)); });
  modal.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { em = b.dataset.e; modal.querySelectorAll("[data-e]").forEach(x => x.classList.toggle("sel", x === b)); });
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#lo").onclick = () => { modal.innerHTML = ""; DB.logOut(); };
  $("#ps").onclick = async () => { await DB.updateProfile(me.uid, { name: $("#pn").value.trim() || mine.name, emoji: em }); modal.innerHTML = ""; };
}

// ---------- actions ----------
app.onclick = async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, mine = users.find(u => u.id === me?.uid);
  try {
    if (a === "login" || a === "signup") {
      const u = $("#u").value.trim(), p = $("#p").value;
      if (!/^[a-z0-9_.]{3,20}$/i.test(u)) return toast("Username: 3–20 letters, numbers, _ or .");
      if (a === "login") await DB.logIn(u, p);
      else { if (SIGNUP_CODE && $("#c").value.trim() !== SIGNUP_CODE) return toast("Wrong secret code."); await DB.signUp(u, p, EMOJI[Math.floor(Math.random() * EMOJI.length)]); }
    } else if (a === "tab") { tab = id; render(); }
    else if (a === "install") { installEvt.prompt(); installEvt = null; render(); }
    else if (a === "study") { await DB.startStudy(me.uid, pomo, focusOf(mine)); toast("Good luck! 🍀"); }
    else if (a === "pause") await DB.pauseStudy(me.uid, elapsed(mine));
    else if (a === "resume") await DB.resumeStudy(me.uid);
    else if (a === "pomo") { pomo = !pomo; ls("pomo", pomo ? "1" : "0"); render(); }
    else if (a === "cheer") { if (Date.now() - lastCheer < 3000) return toast("Slow down, cutie 😄"); lastCheer = Date.now(); await DB.cheer(id, me.uid, mine.name, b.dataset.e); toast("Cheer sent " + b.dataset.e); }
    else if (a === "discard") { if (confirm("Cancel without saving any time?")) await DB.cancelStudy(me.uid); }
    else if (a === "profile") profileSheet(mine);
    else if (a === "stop") {
      const start = mine.startedAt ? mine.startedAt.toMillis() : Date.now(), sec = Math.floor(elapsed(mine) / 1000);
      if (sec < 60) { await DB.cancelStudy(me.uid); toast("Under a minute, so nothing was saved."); }
      else { await DB.addSession(me.uid, start, split(start, sec), sec, true); toast("Saved! 🌟"); }
    } else if (a === "add") {
      sheet({ title: "add study time", note: "Studied without pressing the button? Add it here.", date: key(Date.now()),
        onSave: async (sec, d) => { if (!sec) throw Error("Enter some time first."); const [y, m, dd] = d.split("-").map(Number), st = new Date(y, m - 1, dd, 12).getTime();
          await DB.addSession(me.uid, st, split(st, sec), sec, false); toast("Added! ✨"); } });
    } else if (a === "edit") {
      const s = sessions.find(x => x.id === id), st = s.start.toMillis();
      sheet({ title: "shorten session ✏️", note: "You can only reduce this session. To add more time, use “+ add time”.", secs: s.seconds, max: s.seconds,
        onSave: async sec => { if (sec < 60) throw Error("Use the 🗑️ button to remove a session."); sec = Math.min(sec, s.seconds); await DB.editSession(me.uid, s, split(st, sec), sec); toast("Updated! ✨"); } });
    } else if (a === "del") { if (confirm("Delete this session?")) await DB.deleteSession(me.uid, sessions.find(x => x.id === id)); }
  } catch (err) { toast(errMsg(err)); }
};

// ---------- boot ----------
DB.watchAuth(u => {
  unsubs.forEach(f => f()); unsubs = []; me = u; users = []; sessions = [];
  if (u) unsubs = [DB.watchUsers(x => { users = x; render(); }), DB.watchSessions(u.uid, x => { sessions = x; render(); }),
    DB.watchCheers(u.uid, list => { toast(`${list[0].name || "Your friend"} cheered you on! ${list.map(c => c.emoji).join("")}`); burst(list.map(c => c.emoji), 24); })];
  render();
});
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; render(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
