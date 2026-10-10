import * as DB from "./db.js";
import { drawCard } from "./card.js";
import { SIGNUP_CODE } from "./firebase-config.js";

const $ = s => document.querySelector(s), app = $("#app"), modal = $("#modal");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMOJI = ["🐰", "🐻", "🐱", "🦊", "🐼", "🐨", "🦄", "🐥", "🍓", "🌸", "🍒", "⭐"];
const DAY = 864e5;
const THEMES = { strawberry: ["🍓", "#ffd6e7"], matcha: ["🍵", "#e0f4d6"], sky: ["☁️", "#d6ecff"], lilac: ["🔮", "#e9dcff"], sunny: ["🍑", "#ffe7bf"], sakura: ["🌸", "#ffeaf1"], mochi: ["🍡", "#f6ecdf"], ocean: ["🐬", "#d4f3f2"], night: ["🌙", "#1e1830"], cocoa: ["🍫", "#2a1f1c"],
  lemonade: ["🍋", "#fffbe6"], cottoncandy: ["🍭", "#fff0fb"], blueberry: ["🫐", "#eef0ff"],
  berry: ["🍇", "#221030"], forest: ["🌲", "#12201a"], deepsea: ["🌊", "#0f1c2b"], ink: ["🖤", "#000000"],
  spring: ["🌷", "#f3fcea"], summer: ["🌻", "#e8f9ff"], autumn: ["🍁", "#fff3e6"], winter: ["❄️", "#f2f7ff"],
  "spring-night": ["🌿", "#1a2218"], "summer-night": ["🎆", "#101a38"], "autumn-night": ["🎃", "#231510"], "winter-night": ["⛄", "#0f1626"],
  "glass-aurora": ["✨", "#d8c6ff"], "glass-sunset": ["🌅", "#ffc0b0"], "glass-lagoon": ["🫧", "#bfe6f2"], "glass-galaxy": ["🌌", "#1b1245"] };
const GLASS = Object.keys(THEMES).filter(k => k.startsWith("glass-"));
const CUTE = ["strawberry", "matcha", "sky", "lilac", "sunny", "sakura", "mochi", "ocean", "lemonade", "cottoncandy", "blueberry"];
const DARK = ["night", "cocoa", "berry", "forest", "deepsea", "ink"];
const SEASON = ["spring", "summer", "autumn", "winter", "spring-night", "summer-night", "autumn-night", "winter-night"];
const themeBtns = l => l.map(t => `<button class="av ${t === theme ? "sel" : ""}" data-t="${t}" title="${t.replace(/-/g, " ")}">${t === "auto" ? "🌓" : THEMES[t][0]}</button>`).join("");
let theme = "strawberry"; try { theme = localStorage.getItem("theme") || theme; } catch {}
function applyTheme(t) {
  try { localStorage.setItem("theme", t); } catch {}
  const real = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "strawberry") : (THEMES[t] ? t : "strawberry");
  document.documentElement.dataset.theme = real;
  document.querySelector('meta[name="theme-color"]').content = THEMES[real][1];
}
applyTheme(theme);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => theme === "auto" && applyTheme("auto"));
let me = null, users = [], sessions = [], gifts = [], tab = "home", unsubs = [], installEvt = null;

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
const errMsg = e => ({ "auth/email-already-in-use": "That username is taken.", "auth/invalid-credential": "Wrong username or password.", "auth/weak-password": "Password needs at least 6 characters.", "auth/network-request-failed": "No internet connection.", "permission-denied": "Not allowed. Did you publish the new firestore.rules?" }[e.code] || e.message);

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
// collapsible sections on the stats tab (remembered on this device) + shorter/normal home tab
const foldSet = (() => { try { return new Set(JSON.parse(ls("fold") || "[]")); } catch { return new Set(); } })();
const sec = (id, title, extra, body) => { const shut = foldSet.has(id); return `<h2 class="fold${shut ? " shut" : ""}"><button class="fb" data-act="fold" data-id="${id}" aria-expanded="${!shut}"><i>▾</i>${title}</button>${extra || ""}</h2>${shut ? "" : body}`; };
let compact = ls("compact") === "1";
let calm = ls("motion") === "off"; // "reduce motion": turns off the endless bobbing / drifting / twinkling
const applyMotion = () => { document.documentElement.dataset.motion = calm ? "off" : "on"; };
applyMotion();
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
// ---- cozy sounds (generated with the Web Audio API, no files needed) ----
const SOUNDS = { rain: "🌧️ rain", cafe: "☕ cafe", ocean: "🌊 ocean" };
let sound = ls("sound") || "off", actx = null, sNodes = null, sTimer = 0;
const soundLabel = () => sNodes ? "🎧 " + SOUNDS[sound] : sound !== "off" ? "🎧 " + SOUNDS[sound] + " ▶" : "🎧 sounds: off";
function noiseBuf(ctx, brown) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return b;
}
function stopSound() { (sNodes || []).forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch {} }); sNodes = null; clearTimeout(sTimer); }
function playSound(mode) {
  stopSound(); if (mode === "off" || !SOUNDS[mode]) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume();
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), nodes = [src, f, g];
    src.buffer = noiseBuf(actx, mode !== "rain"); src.loop = true;
    if (mode === "rain") { f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = .35; g.gain.value = .22; }
    else {
      f.type = "lowpass"; f.frequency.value = mode === "cafe" ? 1000 : 600; g.gain.value = mode === "cafe" ? .5 : .55;
      const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = mode === "cafe" ? .35 : .09; lg.gain.value = mode === "cafe" ? .12 : .3;
      lfo.connect(lg); lg.connect(g.gain); lfo.start(); nodes.push(lfo, lg);
    }
    src.connect(f); f.connect(g); g.connect(actx.destination); src.start(); sNodes = nodes;
    if (mode === "cafe") { // little cup clinks now and then
      const clink = () => {
        if (!sNodes) return; const o = actx.createOscillator(), cg = actx.createGain(), t = actx.currentTime;
        o.frequency.value = 1800 + Math.random() * 1400; cg.gain.setValueAtTime(.05, t); cg.gain.exponentialRampToValueAtTime(.0001, t + .35);
        o.connect(cg); cg.connect(actx.destination); o.start(); o.stop(t + .4); sTimer = setTimeout(clink, 3000 + Math.random() * 7000);
      };
      sTimer = setTimeout(clink, 4000);
    }
  } catch {}
}

// ---- study pet / garden: grows with total hours, sleepy if no study today ----
// e = the form at each stage [egg, baby, kid, grown-up]; acc = a little accessory that appears on top at that stage (evolutions!)
const PETS = {
  bunny: { e: ["🥚", "🐰", "🐇", "🐇"], acc: ["", "", "🎀", "👑"] },
  cat: { e: ["🥚", "🐱", "🐈", "🦁"], acc: ["", "", "🎀", "👑"] },
  chick: { e: ["🥚", "🐣", "🐥", "🐔"], acc: ["", "", "", "👑"] },
  plant: { e: ["🌰", "🌱", "🪴", "🌳"], acc: ["", "", "", "🌸"] }
};
const accOf = (t, st) => ((ALLP[t] || {}).acc || [])[st] || "";
const petFace = (t, st) => ALLP[t].e[st] + (accOf(t, st) ? `<i class="acc">${accOf(t, st)}</i>` : "");
const petOf = u => PETS[u.pet] ? u.pet : "bunny";
const STAGE = [1800, 18000, 72000]; // seconds studied to reach baby / kid / grown-up
const totalOf = u => stats(u).total + (u.status === "studying" || u.status === "paused" ? elapsed(u) / 1000 : 0); // seconds studied incl. the running session
const stageOf = tot => tot >= STAGE[2] ? 3 : tot >= STAGE[1] ? 2 : tot >= STAGE[0] ? 1 : 0;
const stageNames = t => t === "plant" ? ["seed", "sprout", "sapling", "tree"] : ["egg", "baby", "kid", "grown-up"];
function petRow(u) {
  const t = petOf(u), paused = u.status === "paused", on = u.status === "studying", tot = totalOf(u);
  const st = stageOf(tot), fed = liveToday(u) > 0;
  const say = on ? "nom nom 🍓" : paused ? "break time ☕" : fed ? "happy & full 💗" : "sleepy… study to feed me";
  const names = stageNames(t);
  return `<div class="petrow ${on ? "feed" : fed || paused ? "" : "sleepy"}"><span class="pet s${st}">${petFace(t, st)}</span><div><b>${say}</b><small>${names[st]}${st < 3 ? ` · ${fmt(STAGE[st] - tot)} to grow` : " · fully grown 👑"}</small></div></div>`;
}

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

// ---- garden: a shared meadow where everyone's pets wander ----
// Extra pets you can collect. e = [egg, baby, kid, grown-up]; ok(u) = is it unlocked for user u?
const EXTRA = {
  dog: { n: "puppy", e: ["🥚", "🐶", "🐕", "🦮"], acc: ["", "", "🎀", "👑"], req: "study 5 hours in total", ok: u => totalOf(u) >= 18000 },
  panda: { n: "panda", e: ["🥚", "🐼", "🐼", "🐼"], acc: ["", "", "🎋", "👑"], req: "earn the 3-day streak badge 🔥", ok: u => !!(u.badges && u.badges.s3) },
  fox: { n: "fox", e: ["🥚", "🦊", "🦊", "🦊"], acc: ["", "", "🍂", "👑"], req: "study 25 hours in total", ok: u => totalOf(u) >= 90000 },
  frog: { n: "frog", e: ["🥚", "🐸", "🐸", "🐸"], acc: ["", "", "🍃", "👑"], req: "reach couple level 4 💞", ok: () => couple().lv >= 3 },
  turtle: { n: "turtle", e: ["🥚", "🐢", "🐢", "🐢"], acc: ["", "", "🌿", "👑"], req: "earn the 7-day streak badge ✨", ok: u => !!(u.badges && u.badges.s7) },
  unicorn: { n: "unicorn", e: ["🥚", "🦄", "🦄", "🦄"], acc: ["", "", "🌈", "👑"], req: "earn the 100 hours badge 👑", ok: u => !!(u.badges && u.badges.h100) }
};
const ALLP = { ...PETS, ...EXTRA };
const petName = t => EXTRA[t] ? EXTRA[t].n : t;
const MOVE = { bunny: [1.3, 9], cat: [1.1, 5], chick: [1.2, 6], plant: [.3, 3], dog: [1.25, 7], panda: [.65, 4], fox: [1.2, 6], frog: [.9, 11], turtle: [.4, 2], unicorn: [1.1, 6] }; // [speed, hop height px]
const FACE_RIGHT = new Set(["🐢"]); // emoji that look RIGHT by default (all the others look left). If one walks backwards on your phone, add/remove its emoji here (e.g. "🐈", "🐕", "🦮").
// The garden is a big WORLD (WW x WH px) seen through a small window (the same 5:6 box as before) that you pan around by dragging.
// Pet / item positions are fractions of the world. The window size only decides how much you see at once.
const WW = 980, WH = 680, POND = { x: 300, y: 500, rx: 80, ry: 44 }; // pond centre + radii in world px (keep in sync with .gpond in the CSS)
const BASE = 29; // walking speed in px per second (before the per-pet multiplier)
const BOUNDS = { x0: .05, x1: .95, y0: .4, y1: .95 }; // where pets may stand (fractions of the world)
const BUB = { study: "🍓 nom nom", break: "☕", calm: "💗", sleep: "💤" };
const SAY = { study: "nom nom 🍓", break: "break time ☕", calm: "happy & full 💗", sleep: "sleepy… study to feed me" };
const RM = matchMedia("(prefers-reduced-motion: reduce)");
// weather is random (no network): sunny / spring petals / rain / snow with scarves / autumn leaves. Re-rolled every 12 min, or pick one with the chip in the garden.
const WXL = { clear: ["☀️", "sunny"], petals: ["🌸", "spring"], rain: ["🌧️", "rainy"], snow: ["❄️", "snowy"], leaves: ["🍂", "autumn"] };
const WX_POOL = ["clear", "clear", "petals", "rain", "snow", "leaves"];
const pickWx = avoid => { const l = WX_POOL.filter(w => w !== avoid); return l[Math.floor(Math.random() * l.length)]; };
const WX0 = ls("wx");
const G = { pets: new Map(), el: null, layer: null, deco: null, fly: null, fx: null, card: null, raf: 0, last: 0, W: WW, H: WH, vw: 340, vh: 408, cardT: 0, decoLv: -1, night: null, ro: null,
  world: null, cam: { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, glide: false }, camInit: false, camT: "", pan: null, drag: null, noClick: -1e9, findI: -1, vis: null, visAt: 0,
  items: new Map(), edit: false, work: null, sel: null, wx: "", wxMode: WX0 === "auto" || WXL[WX0] ? WX0 : "auto", wxAuto: pickWx(), wxAt: Date.now(), wxEl: null, buddyFx: 0 };
const rnd = (a, b) => a + Math.random() * (b - a);
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const isEvening = () => { const h = new Date().getHours(); return h >= 18 || h < 6; };
const moodOf = u => u.status === "studying" ? "study" : u.status === "paused" ? "break" : liveToday(u) > 0 ? "calm" : "sleep";
const inPond = (x, y) => ((x * WW - POND.x) / POND.rx) ** 2 + ((y * WH - POND.y) / POND.ry) ** 2 < 1;
const nowS = () => performance.now() / 1000;

function pickSpot(p, near) { // random spot on the grass (not in the pond). `near` = small hop (in px) around the current spot; otherwise roam around the pet's own corner of the world
  for (let i = 0; i < 14; i++) {
    let x, y;
    if (near) { x = p.x + rnd(-near, near) / G.W; y = p.y + rnd(-near * .6, near * .6) / G.H; }
    else if (Math.random() < .12) { x = rnd(BOUNDS.x0, BOUNDS.x1); y = rnd(BOUNDS.y0, BOUNDS.y1); } // now and then wander far
    else { x = p.hx + rnd(-230, 230) / G.W; y = p.hy + rnd(-110, 110) / G.H; }
    x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, x)); y = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, y));
    if (!inPond(x, y)) return [x, y];
  }
  return [p.x, p.y];
}
function buildGarden() { // built ONCE; render() never touches it, so pets never reset
  const el = document.createElement("div"); el.id = "garden";
  el.innerHTML = `<div class="gworld"><div class="gstars"></div><i class="gsun"></i><div class="grain"></div><i class="gcl c1"></i><i class="gcl c2"></i><i class="gcl c3"></i><i class="gcl c4"></i><i class="gcl c5"></i>
  <div class="ghill h1"></div><div class="gfence"></div><div class="ghill h2"></div><div class="gpond"></div><div class="gdeco"></div><div class="gpets"></div><div class="gfly"></div>
  <div class="gff">${[...Array(28)].map(() => `<i style="left:${rnd(4, 96).toFixed(1)}%;top:${rnd(36, 96).toFixed(1)}%;animation-delay:${(-rnd(0, 6)).toFixed(1)}s;animation-duration:${rnd(4, 8).toFixed(1)}s"></i>`).join("")}</div>
  <div class="gfx"></div></div><div class="gwx"></div><div class="gcard" hidden></div><button class="gfind" data-act="gfind" aria-label="find my pets">📍</button>`;
  G.el = el; G.world = el.querySelector(".gworld"); G.deco = el.querySelector(".gdeco"); G.layer = el.querySelector(".gpets"); G.fly = el.querySelector(".gfly"); G.fx = el.querySelector(".gfx");
  G.card = el.querySelector(".gcard"); G.wxEl = el.querySelector(".gwx");
  G.card.onclick = () => { G.card.hidden = true; };
  G.ro = new ResizeObserver(() => { G.vw = el.clientWidth || G.vw; G.vh = el.clientHeight || G.vh; el.style.setProperty("--gh", G.vh + "px"); }); G.ro.observe(el);
  el.addEventListener("pointerdown", panDown); el.addEventListener("pointermove", panMove); el.addEventListener("pointerup", panUp); el.addEventListener("pointercancel", panUp);
  G.decoLv = -1; G.night = null; G.wx = ""; G.items.clear();
}
// ---- camera: drag to look around (with a little inertia), or glide to a spot ----
const clampCam = () => { const c = G.cam; c.x = Math.min(Math.max(0, G.W - G.vw), Math.max(0, c.x)); c.y = Math.min(Math.max(0, G.H - G.vh), Math.max(0, c.y)); };
function camTo(px, py, instant) { // centre the window on a world position
  const c = G.cam; c.tx = px - G.vw / 2; c.ty = py - G.vh * .55; c.vx = c.vy = 0;
  c.tx = Math.min(Math.max(0, G.W - G.vw), Math.max(0, c.tx)); c.ty = Math.min(Math.max(0, G.H - G.vh), Math.max(0, c.ty));
  if (instant || RM.matches) { c.x = c.tx; c.y = c.ty; c.glide = false; } else c.glide = true;
}
function panDown(e) {
  if (e.button > 0 || G.drag || !G.el) return;
  const c = G.cam; c.vx = c.vy = 0; c.glide = false;
  G.pan = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: c.x, cy: c.y, moved: false, lt: performance.now(), lx: c.x, ly: c.y, vx: 0, vy: 0 };
}
function panMove(e) {
  const p = G.pan; if (!p || e.pointerId !== p.id || G.drag) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (!p.moved) { if (Math.hypot(dx, dy) < 7) return; p.moved = true; try { G.el.setPointerCapture(e.pointerId); } catch {} G.el.classList.add("panning"); }
  const c = G.cam, now = performance.now(), dt = Math.max(.001, (now - p.lt) / 1000), nx = p.cx - dx, ny = p.cy - dy;
  p.vx = p.vx * .55 + (nx - p.lx) / dt * .45; p.vy = p.vy * .55 + (ny - p.ly) / dt * .45; p.lt = now; p.lx = nx; p.ly = ny;
  c.x = nx; c.y = ny; clampCam();
}
function panUp(e) {
  const p = G.pan; if (!p || e.pointerId !== p.id) return; G.pan = null;
  if (!p.moved) return;
  try { G.el.releasePointerCapture(e.pointerId); } catch {}
  G.el.classList.remove("panning"); G.noClick = performance.now();
  const c = G.cam, fast = Math.hypot(p.vx, p.vy) > 60 && performance.now() - p.lt < 90; c.vx = fast && !RM.matches ? p.vx : 0; c.vy = fast && !RM.matches ? p.vy : 0;
}
function camStep(dt) {
  const c = G.cam;
  if (G.drag) { // dragging a decoration near the edge scrolls the window
    const g = G.drag, r = G.el.getBoundingClientRect(), ex = g.px - r.left < 36 ? -1 : g.px - r.left > r.width - 36 ? 1 : 0, ey = g.py - r.top < 36 ? -1 : g.py - r.top > r.height - 36 ? 1 : 0;
    if (ex || ey) { c.x += ex * 240 * dt; c.y += ey * 240 * dt; c.glide = false; clampCam(); }
    dragApply();
  } else if (G.pan && G.pan.moved) { /* the finger is steering */ }
  else if (c.glide) { const k = Math.min(1, dt * 5); c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; if (Math.abs(c.tx - c.x) < .5 && Math.abs(c.ty - c.y) < .5) c.glide = false; }
  else if (c.vx || c.vy) { c.x += c.vx * dt; c.y += c.vy * dt; const k = Math.pow(.02, dt); c.vx *= k; c.vy *= k; if (Math.abs(c.vx) < 8 && Math.abs(c.vy) < 8) c.vx = c.vy = 0; }
  clampCam();
  const t = `translate(${(-c.x).toFixed(1)}px,${(-c.y).toFixed(1)}px)`; if (t !== G.camT) { G.camT = t; G.world.style.transform = t; }
}
function findPet() { // the 📍 button: glide to the next pet (yours first)
  const list = [...G.pets.values()].sort((a, b) => (b.uid === me?.uid) - (a.uid === me?.uid) || (a.key < b.key ? -1 : 1)); if (!list.length) return;
  G.findI = (G.findI + 1) % list.length; const p = list[G.findI]; camTo(p.x * G.W, p.y * G.H);
}
function buildDeco(lv) { // more flowers, butterflies, trees and a rainbow as the couple level grows
  G.decoLv = lv;
  const r = seeded(11), FL = ["🌸", "🌼", "🌷", "🌻", "🌺", "🌹"], n = Math.min(60, 10 + lv * 5); let h = "";
  for (let i = 0; i < 60; i++) { // always draw the same 60 random spots so flowers never move around when new ones appear
    const x = .03 + r() * .94, y = .4 + r() * .56, f = FL[Math.floor(r() * FL.length)], s = 13 + Math.floor(r() * 9);
    if (i < n && !inPond(x, y + .02)) h += `<i style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%;font-size:${s}px">${f}</i>`;
  }
  [[880, 275, "🌳", 3], [80, 275, "🌲", 5], [520, 282, "🌳", 7], [940, 440, "🌲", 8], [40, 540, "🌳", 9], [660, 300, "🌲", 10]].forEach(([x, y, e, need]) => { if (lv >= need) h += `<i class="tree" style="left:${x}px;top:${y}px">${e}</i>`; });
  G.deco.innerHTML = h;
  let fl = ""; const nb = lv >= 1 ? Math.min(9, 1 + Math.floor(lv / 2) * 2) : 0;
  for (let i = 0; i < nb; i++) fl += `<i style="left:${(6 + r() * 84).toFixed(1)}%;top:${(38 + r() * 42).toFixed(1)}%;animation-delay:${(-r() * 8).toFixed(1)}s;animation-duration:${(7 + r() * 5).toFixed(1)}s">🦋</i>`;
  G.fly.innerHTML = fl;
  G.el.classList.toggle("rainbow", lv >= 6);
}
function gardenList() { // everyone's main pet, then the extra friends they picked (max 3 each), capped at 12 in total
  const base = [], extra = [];
  users.slice().sort((a, b) => a.id < b.id ? -1 : 1).forEach(u => {
    base.push({ key: `${u.id}:${petOf(u)}`, u, type: petOf(u) });
    [...new Set(Array.isArray(u.garden) ? u.garden : [])].filter(id => EXTRA[id] && EXTRA[id].ok(u)).slice(0, 3).forEach(id => extra.push({ key: `${u.id}:${id}`, u, type: id }));
  });
  return [...base, ...extra].slice(0, 12);
}
function mkPet(key, u, type) {
  const el = document.createElement("div"); el.className = "gp"; el.dataset.act = "gpet"; el.dataset.id = key;
  el.innerHTML = `<i class="gsh"></i><span class="gpe"></span><i class="gbub"></i><b class="gpn"></b>`;
  const p = { key, uid: u.id, type, el, sh: el.children[0], e: el.children[1], bub: el.children[2], nm: el.children[3], x: 0, y: 0, tx: 0, ty: 0, mode: "rest", until: nowS() + rnd(.4, 2.5),
    fs: 1, face: 1, ph: Math.random() * 6, hp: 0, jump: -9, heartAt: 0, ht: 0, sig: "", mood: "", st: 0, ta: "", tb: "", ov: null, emo: "", hx: rnd(.2, .65), hy: rnd(.6, .9), spin: -9, yawn: -9, nb: false, nt: 0 };
  const s = pickSpot(p); p.x = p.tx = s[0]; p.y = p.ty = s[1];
  el.style.transform = `translate(${(p.x * G.W).toFixed(1)}px,${(p.y * G.H).toFixed(1)}px)`; el.style.zIndex = 10 + Math.round(p.y * G.H);
  G.pets.set(key, p); G.layer.appendChild(el); return p;
}
function removePet(p) { clearTimeout(p.ht); p.el.remove(); }
function clearGarden() { if (G.vis) { G.vis.el.remove(); G.vis = null; } G.camInit = false; G.pets.forEach(removePet); G.pets.clear(); G.items.forEach(o => o.el.remove()); G.items.clear(); G.edit = false; G.work = null; G.sel = null; if (G.el) G.el.classList.remove("editing"); }
function setPet(p, u, type) { // refresh look + mood from the owner's live data (only touches the DOM when something changed)
  const st = stageOf(totalOf(u)), mood = moodOf(u), sig = `${type}|${st}|${mood}|${u.name}`;
  if (sig === p.sig) return; const evolved = !!p.sig && p.st !== st; p.sig = sig; p.type = type; p.st = st;
  p.emo = ALLP[type].e[st]; const acc = accOf(type, st);
  p.e.innerHTML = `${p.emo}${acc ? `<i class="gacc">${acc}</i>` : ""}<i class="gscf">🧣</i>`; p.e.className = "gpe s" + st; p.el.dataset.st = st; p.nm.textContent = u.name || "";
  if (evolved) p.jump = nowS();
  if (p.mood !== mood) {
    p.mood = mood; p.el.dataset.mood = mood; clearTimeout(p.ht);
    p.bub.className = "gbub " + mood + (mood === "calm" ? "" : " on"); p.bub.textContent = mood === "calm" ? "" : BUB[mood];
    p.mode = "rest"; p.until = nowS() + rnd(.2, 1.5); p.heartAt = nowS() + rnd(2, 6);
  }
}
function syncGarden() {
  if (!G.el) return;
  const list = gardenList(), keep = new Set(list.map(x => x.key));
  G.pets.forEach((p, k) => { if (!keep.has(k)) { removePet(p); G.pets.delete(k); } });
  list.forEach(x => setPet(G.pets.get(x.key) || mkPet(x.key, x.u, x.type), x.u, x.type));
  const lv = couple().lv; if (lv !== G.decoLv) buildDeco(lv);
  const night = isEvening(); if (night !== G.night) { G.night = night; G.el.classList.toggle("night", night); }
  syncItems(); syncBuddies(); syncWeather(); runVisits(); syncVisitor();
}
function restoreBub(p) { p.bub.className = "gbub " + p.mood + (p.mood === "calm" ? "" : " on"); p.bub.textContent = p.mood === "calm" ? "" : BUB[p.mood]; }
function endVisit(p, t) { // a cheer visit is over: guest wanders off again, host is free to move
  const o = p.ov, h = o && G.pets.get(o.host);
  if (h && h.ov && h.ov.kind === "host") { h.ov = null; h.mode = "rest"; h.until = t + rnd(.8, 2); }
  p.ov = null; p.mode = "rest"; p.until = t + rnd(1, 2.5);
}
function stepPet(p, t, dt, still) { // one animation frame for one pet
  const mv = MOVE[p.type] || [1, 5], o = p.ov, mood = o && o.kind === "visit" ? "calm" : p.mood, moving = !still && !o && p.st > 0 && mood !== "break" && mood !== "sleep";
  let walking = false, lift = 0, rot = 0, sx = 1, sy = 1, hop = 0;
  if (o && !still) { // errands: "visit" = run to a friend's pet and shower it with hearts, "host" = wait for the guest, "buddy" = meet by the pond and hop together
    if (o.kind === "host") { if (t > o.until) { p.ov = null; p.mode = "rest"; p.until = t + rnd(.5, 1.5); } }
    else {
      const h = o.kind === "visit" ? G.pets.get(o.host) : null;
      if (o.kind === "visit" && (!h || t > o.limit)) endVisit(p, t);
      else {
        const tx = h ? h.x + o.side * 62 / G.W : o.x, ty = h ? h.y + 3 / G.H : o.y, dx = (tx - p.x) * G.W, dy = (ty - p.y) * G.H, d = Math.hypot(dx, dy),
          step = BASE * Math.max(mv[0], .9) * dt * (h ? 2.6 : 1.7);
        if (d <= Math.max(step, 1.5)) { p.x = tx; p.y = ty; if (!o.arrived) o.arrived = t; p.face = h ? (o.side < 0 ? -1 : 1) : o.face; }
        else { p.x += dx / d * step / G.W; p.y += dy / d * step / G.H; walking = true; if (Math.abs(dx) > 1) p.face = dx > 0 ? -1 : 1; }
        if (o.arrived) {
          if (h) { // hop around and float hearts up from the pet that got the cheer
            hop = Math.abs(Math.sin((t - o.arrived) * 7)) * (mv[1] + 5);
            if (t >= o.nextHeart) { o.nextHeart = t + .42; spawnHeart(h.x * G.W + rnd(-16, 16), h.y * G.H - 54 - rnd(0, 12), ["💗", "💕", "💖"][Math.floor(rnd(0, 3))]); }
            if (t > o.arrived + 3.2) endVisit(p, t);
          } else if (o.kind === "nap") { // both on a break: curl up side by side
            if (!p.nb) { p.nb = true; p.bub.className = "gbub sleep on"; p.bub.textContent = "💤"; }
          } else { // buddies: once BOTH have arrived they hop in sync
            const m2 = G.pets.get(o.mate);
            if (m2 && m2.ov && m2.ov.arrived) {
              hop = Math.abs(Math.sin(t * 6)) * (mv[1] + 6);
              if (p.key < m2.key && t >= G.buddyFx) { G.buddyFx = t + 1.8; spawnHeart((p.x + m2.x) / 2 * G.W, (p.y + m2.y) / 2 * G.H - 64, "💞"); }
            }
          }
        }
      }
    }
  }
  if (moving) {
    if (p.mode === "rest" && t >= p.until) { const s = pickSpot(p, mood === "study" ? 46 : 0); p.tx = s[0]; p.ty = s[1]; p.mode = "walk"; }
    if (p.mode === "walk") {
      const dx = (p.tx - p.x) * G.W, dy = (p.ty - p.y) * G.H, d = Math.hypot(dx, dy), step = BASE * mv[0] * dt * (mood === "study" ? 1.25 : 1) * (G.night ? .75 : 1);
      if (d <= step) { p.x = p.tx; p.y = p.ty; p.mode = "rest"; p.until = t + (mood === "study" ? rnd(1, 2.5) : rnd(1.5, 5)); }
      else { p.x += dx / d * step / G.W; p.y += dy / d * step / G.H; walking = true; if (Math.abs(dx) > 1) p.face = dx > 0 ? -1 : 1; }
    }
  }
  const br = Math.sin(t * 2.2 + p.ph);
  if (still) lift = (Math.sin(t * 1.4 + p.ph) + 1) * 1.6; // reduced motion: stand still, gentle bobbing only
  else {
    if (walking || (moving && mood === "study")) { p.hp += dt * (walking ? 10 : 11); lift = Math.abs(Math.sin(p.hp)) * mv[1] * (mood === "study" ? 1.7 : 1); }
    if (hop) lift = hop;
    const napping = o && o.kind === "nap" && o.arrived;
    if (p.st === 0 && mood !== "sleep") rot = Math.sin(t * 3 + p.ph) * 7;           // eggs rock in place
    else if (mood === "sleep" || napping) { if (p.type !== "plant") rot = napping ? o.rot : -78; sy = 1 + br * .025; } // lying down, breathing slowly
    else if (mood === "break") { sy = .9 + br * .015; sx = 1.05; }                      // sitting
    else if (!walking && !lift) { sy = 1 + br * .03; sx = 1 - br * .02; }
    const jt = t - p.jump; if (jt >= 0 && jt < .55) { const k = Math.sin(Math.PI * jt / .55); lift += k * 30; sy *= 1 + k * .08; } // tap jump
    const sp = (t - p.spin) / .9; if (sp >= 0 && sp < 1) { rot += 360 * (1 - (1 - sp) ** 2); lift += Math.sin(Math.PI * sp) * 30; }  // treat: happy spin
    const yt = (t - p.yawn) / 1.6; if (yt >= 0 && yt < 1) { const k = Math.sin(Math.PI * yt); sy *= 1 + k * .13; sx *= 1 - k * .05; }  // night: stretch + yawn
  }
  p.fs += (p.face * (FACE_RIGHT.has(p.emo) ? -1 : 1) - p.fs) * Math.min(1, dt * 14); // smooth turn-around
  if (!o && t >= p.heartAt && (p.mood === "calm" || (G.night && p.mood === "break"))) { // a little heart now and then (at night: sleepy yawns 🥱)
    p.heartAt = t + rnd(8, 14); const yawn = G.night && Math.random() < .6; if (yawn) p.yawn = t;
    p.bub.textContent = yawn ? "🥱" : "💗"; p.bub.classList.add("on"); clearTimeout(p.ht); p.ht = setTimeout(() => p.mood === "calm" ? p.bub.classList.remove("on") : restoreBub(p), 2200);
  }
  const a = `translateY(${(-lift).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(p.fs * sx).toFixed(3)},${sy.toFixed(3)})`;
  if (a !== p.ta) { p.ta = a; p.e.style.transform = a; p.sh.style.transform = `scale(${(1 - Math.min(lift, 40) / 70).toFixed(2)})`; }
  const b = `translate(${(p.x * G.W).toFixed(1)}px,${(p.y * G.H).toFixed(1)}px)`;
  if (b !== p.tb) { p.tb = b; p.el.style.transform = b; p.el.style.zIndex = 10 + Math.round(p.y * G.H); }
}
function gardenLoop(now) {
  if (!G.el || !G.el.isConnected || document.hidden) { G.raf = 0; return; } // paused when you leave the tab or hide the app
  const t = now / 1000, dt = Math.min(.05, t - G.last || .016); G.last = t;
  G.pets.forEach(p => stepPet(p, t, dt, RM.matches));
  visStep(t, dt); camStep(dt);
  G.raf = requestAnimationFrame(gardenLoop);
}
function gardenStart() { if (!G.raf && G.el && G.el.isConnected && !document.hidden) { G.last = 0; G.raf = requestAnimationFrame(gardenLoop); } }
document.addEventListener("visibilitychange", gardenStart);
function mountGarden() { // put the one living scene into the freshly rendered page
  if (!G.el) buildGarden();
  const slot = $("#gslot"); if (slot) slot.replaceWith(G.el);
  G.vw = G.el.clientWidth || G.vw; G.vh = G.el.clientHeight || G.vh; G.el.style.setProperty("--gh", G.vh + "px");
  syncGarden();
  if (!G.camInit) { const p = me && mainPet(me.uid); camTo(p ? p.x * G.W : G.W * .4, p ? p.y * G.H : G.H * .75, true); G.camInit = true; } // first look: centred on your pet
  gardenStart();
}
// ---- seeds + decoration shop: study time earns seeds, seeds buy things you drag into the garden (saved in users/{uid}.decor) ----
// flat = lies on the ground (pets walk over it), water = only goes on the pond. Order here = order in the shop.
const ITEMS = { lily: { n: "lily pads", price: 20, flat: true, water: true }, bench: { n: "bench", price: 25 }, bed: { n: "flower bed", price: 30, flat: true }, lantern: { n: "lantern", price: 40 },
  blanket: { n: "picnic blanket", price: 45, flat: true }, fairy: { n: "fairy lights", price: 60 }, swing: { n: "swing", price: 80 }, fountain: { n: "fountain", price: 120 }, house: { n: "tiny house", price: 150 } };
const SEED_SEC = 300, MAX_DECOR = 12; // 1 seed per 5 minutes studied, up to 12 things per person
const ART = { // little CSS-drawn items (so they follow every theme); the lantern and the house are emoji
  bench: `<div class="bench"><i class="bk"></i><i class="st"></i><i class="lg"></i><i class="lg r"></i></div>`,
  lantern: `<div class="lant"><i class="gl"></i><i class="pl"></i><em>🏮</em></div>`,
  swing: `<div class="swing"><i class="fr"></i><i class="fr r"></i><i class="tp"></i><div class="sw"><i class="rp"></i><i class="rp r"></i><i class="sd"></i></div></div>`,
  house: `<div class="tiny">🏡</div>`,
  bed: `<div class="fbed"><i class="soil"></i><em>🌷🌼🌸</em></div>`,
  blanket: `<div class="blank"><i class="bl"></i><em>🧺</em><u>🍓</u></div>`,
  fairy: `<div class="fairy"><i class="fp"></i><i class="fp r"></i><i class="fs"></i>${[0, 1, 2, 3, 4, 5, 6].map(i => `<b style="left:${8 + i * 16}px;top:${(5 + 20 * (1 - ((i - 3) / 3) ** 2)).toFixed(0)}px;--c:${["#ff9ccb", "#ffd36f", "#9be37f", "#7fd0ff", "#b79cf5"][i % 5]}"></b>`).join("")}</div>`,
  lily: `<div class="lily"><i class="lp a"></i><i class="lp b"></i><i class="lp c"></i><em>🌸</em></div>`,
  fountain: `<div class="fount"><i class="fb"></i><i class="fw"></i><i class="fc"></i><i class="d d1"></i><i class="d d2"></i><i class="d d3"></i></div>`
};
const TREAT = 1, VIS_DAY = 6; // a treat costs 1 seed; at most 6 visitor seeds a day on this device
// seeds = study time + visitor bonuses (u.bonus) - treats given (u.treats); spent decoration is subtracted in seedsLeft
const seedsEarned = u => Math.floor(totalOf(u) / SEED_SEC) + (u.bonus || 0) - (u.treats || 0);
// the first version of the garden stored x/y as fractions of the small 340x408 scene; carry those over into the big world (v:2)
const upgradeD = d => d.v === 2 ? d : { ...d, v: 2, x: (d.x * 340 + 225) / WW, y: (d.y * 408 + 198) / WH };
const decorOf = u => (Array.isArray(u.decor) ? u.decor : []).filter(d => d && ITEMS[d.i] && typeof d.k === "string" && Number.isFinite(d.x) && Number.isFinite(d.y)).slice(0, MAX_DECOR).map(upgradeD);
const decorNow = u => G.edit && G.work && u.id === me?.uid ? G.work : decorOf(u); // while decorating, your own list is the unsaved working copy
const seedsLeft = u => Math.max(0, seedsEarned(u) - decorNow(u).reduce((a, d) => a + ITEMS[d.i].price, 0)); // spent seeds are simply the price of everything placed
const clampX = x => Math.min(.96, Math.max(.04, x)), clampY = y => Math.min(.95, Math.max(.38, y));
const okSpot = (id, x, y) => ITEMS[id].water ? inPond(x, y) : !inPond(x, y - .02); // lily pads only on the pond, everything else on the grass
let seedBase = -1, visits = [];
function checkSeeds(m) { const sd = seedsEarned(m); if (seedBase >= 0 && sd > seedBase && !modal.innerHTML) toast(`+${sd - seedBase} 🌱 seed${sd - seedBase > 1 ? "s" : ""} earned!`); seedBase = sd; }

function refreshPanel() { const gp = $("#gpanel"); if (gp) gp.innerHTML = gardenPanel(); }
function gardenPanel() {
  const m = users.find(u => u.id === me?.uid); if (!m) return "";
  const w = G.wxMode === "auto" ? G.wxAuto : G.wxMode, wl = G.wxMode === "auto" ? `random ${WXL[w][0]}` : `${WXL[w][0]} ${WXL[w][1]}`;
  if (G.edit) {
    const sel = (G.work || []).find(d => d.k === G.sel);
    return `<div class="gtop"><div class="seedbar">🌱 <b>${seedsLeft(m)}</b> seeds left</div></div><p class="hint">${sel ? "drag it where you like ✋ · tap it again to unselect" : "drag your things to move them · drag the ground to look around"}</p>
    <div class="gbtns ${sel ? "" : "one"}"><button class="btn ghost" data-act="gshop">🛍️ shop</button>${sel ? `<button class="btn ghost" data-act="gdel">🗑️ remove ${ITEMS[sel.i].n} (+${ITEMS[sel.i].price} 🌱)</button>` : ""}</div>
    <div class="gbtns"><button class="btn ghost" data-act="gcancel">cancel</button><button class="btn" data-act="gdone">done 💖</button></div>`;
  }
  return `<div class="gtop"><div class="seedbar">🌱 <b>${seedsLeft(m)}</b> seeds</div><button class="chip" data-act="gwx">🌦️ ${wl}</button></div>
  <div class="gbtns"><button class="btn" data-act="gshop">🛍️ shop</button><button class="btn ghost" data-act="gedit">🪴 decorate</button><button class="btn ghost" data-act="gchoose">🐾 garden pets</button><button class="btn ghost" data-act="card">📸 photocard</button></div>
  <p class="hint">drag the garden to look around ✋ · tap a pet to say hi 💗 · tap visitors for seeds 🦋</p>${coupleCard()}`;
}
function enterEdit(m) {
  G.edit = true; G.work = decorOf(m).map(d => ({ ...d })); G.sel = null;
  if (G.el) G.el.classList.add("editing"); if (G.card) G.card.hidden = true;
  syncItems(); refreshPanel();
}
async function exitEdit(save) {
  if (save) {
    try { await DB.saveDecor(me.uid, G.work.map(d => ({ i: d.i, k: d.k, v: 2, x: +d.x.toFixed(3), y: +d.y.toFixed(3) }))); toast("Garden decorated 🏡"); }
    catch (e) { return toast(errMsg(e)); }
  }
  G.edit = false; G.work = null; G.sel = null; if (G.el) G.el.classList.remove("editing");
  syncItems(); refreshPanel();
}
function delSel() {
  const i = (G.work || []).findIndex(d => d.k === G.sel); if (i < 0) return;
  const d = G.work.splice(i, 1)[0]; G.sel = null; syncItems(); refreshPanel(); toast(`Removed ${ITEMS[d.i].n} · +${ITEMS[d.i].price} 🌱 back`);
}
function shopSheet(mine) {
  const left = seedsLeft(mine);
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>decoration shop 🛍️</h3><p class="hint">You earn 🌱 1 seed for every 5 minutes you study (and from garden visitors).<br><b>🌱 ${left} seeds</b> to spend</p>
  <div class="shopg">${Object.keys(ITEMS).map(id => { const x = ITEMS[id]; return `<button class="${left >= x.price ? "" : "lock"}" data-buy="${id}"><div class="shopthumb">${ART[id]}</div><b>${x.n}</b><small>🌱 ${x.price}</small></button>`; }).join("")}</div>
  <button class="link" id="sx">close</button></div></div>`;
  $("#sx").onclick = () => modal.innerHTML = "";
  modal.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const id = b.dataset.buy, x = ITEMS[id], have = seedsLeft(mine);
    if (decorNow(mine).length >= MAX_DECOR) return toast(`Your garden is full (${MAX_DECOR} things) 🌳`);
    if (have < x.price) return toast(`${x.price - have} more 🌱 needed — keep studying!`);
    if (!G.edit) enterEdit(mine);
    let sx = (G.cam.x + G.vw / 2 + rnd(-30, 30)) / G.W, sy = (G.cam.y + G.vh * .62 + rnd(-20, 20)) / G.H;
    if (x.water) { sx = (POND.x + rnd(-30, 30)) / G.W; sy = (POND.y + rnd(-12, 12)) / G.H; camTo(POND.x, POND.y); }
    else { sx = clampX(sx); sy = clampY(sy); for (let i = 0; i < 12 && !okSpot(id, sx, sy); i++) sy = clampY(sy + .03); }
    const d = { i: id, k: Math.random().toString(36).slice(2, 8), v: 2, x: +sx.toFixed(3), y: +sy.toFixed(3) };
    G.work.push(d); G.sel = d.k; modal.innerHTML = ""; syncItems(); refreshPanel();
    const o = G.items.get(`${me.uid}:${d.k}`); if (o) { o.el.classList.add("pop"); setTimeout(() => o.el.classList.remove("pop"), 700); }
    toast(`New ${x.n}! Drag it where you like ✋`);
  });
}
function mkItem(key, d, uid) {
  const el = document.createElement("div"); el.className = "gi t-" + d.i + (ITEMS[d.i].flat ? " flat" : "");
  el.innerHTML = `<i class="gsh"></i><div class="gart">${ART[d.i]}</div>`;
  const o = { key, el, it: d, uid, tb: "" };
  el.addEventListener("pointerdown", e => itemDown(e, o));
  G.items.set(key, o); G.layer.appendChild(el); return o;
}
function syncItems() { // draw everybody's decorations (yours = the working copy while you decorate)
  if (!G.el || !G.layer) return;
  const want = []; users.forEach(u => decorNow(u).forEach(d => want.push({ key: `${u.id}:${d.k}`, d, uid: u.id })));
  const keep = new Set(want.map(w => w.key));
  G.items.forEach((o, k) => { if (!keep.has(k)) { o.el.remove(); G.items.delete(k); } });
  want.forEach(w => {
    const o = G.items.get(w.key) || mkItem(w.key, w.d, w.uid), mine = w.uid === me?.uid; o.it = w.d;
    o.el.classList.toggle("mine", mine); o.el.classList.toggle("sel", G.edit && mine && G.sel === w.d.k);
    const t = `translate(${(w.d.x * G.W).toFixed(1)}px,${(w.d.y * G.H).toFixed(1)}px)`;
    if (t !== o.tb) { o.tb = t; o.el.style.transform = t; o.el.style.zIndex = ITEMS[w.d.i].flat ? 1 : 10 + Math.round(w.d.y * G.H); }
  });
}
function dragApply() { // the item follows the finger, in world coordinates (so it keeps up while the window scrolls)
  const g = G.drag; if (!g || !G.el) return;
  const r = G.el.getBoundingClientRect(), d = g.o.it, nx = clampX((g.px - r.left + G.cam.x) / G.W - g.gx), ny = clampY((g.py - r.top + G.cam.y) / G.H - g.gy);
  if (Math.hypot(nx - d.x, ny - d.y) > .003) g.moved = true;
  if (!okSpot(d.i, nx, ny)) return; // keep things on the grass (lily pads: on the pond)
  if (nx !== d.x || ny !== d.y) { d.x = nx; d.y = ny; syncItems(); }
}
function itemDown(e, o) { // drag-to-place
  if (!G.edit || o.uid !== me?.uid || !G.el) return;
  e.preventDefault(); e.stopPropagation();
  const r = G.el.getBoundingClientRect(), d = o.it, wasSel = G.sel === d.k;
  G.drag = { o, wasSel, moved: false, px: e.clientX, py: e.clientY, gx: (e.clientX - r.left + G.cam.x) / G.W - d.x, gy: (e.clientY - r.top + G.cam.y) / G.H - d.y };
  G.sel = d.k; G.cam.vx = G.cam.vy = 0; G.cam.glide = false; syncItems(); refreshPanel();
  const mv = ev => { if (G.drag) { G.drag.px = ev.clientX; G.drag.py = ev.clientY; dragApply(); } };
  const up = () => {
    o.el.removeEventListener("pointermove", mv); o.el.removeEventListener("pointerup", up); o.el.removeEventListener("pointercancel", up);
    try { o.el.releasePointerCapture(e.pointerId); } catch {}
    const g = G.drag; G.drag = null; if (g && !g.moved && g.wasSel) { G.sel = null; syncItems(); refreshPanel(); }
  };
  try { o.el.setPointerCapture(e.pointerId); } catch {}
  o.el.addEventListener("pointermove", mv); o.el.addEventListener("pointerup", up); o.el.addEventListener("pointercancel", up);
}

// ---- weather: pure CSS + a few particles, picked at random ----
function buildWx(w) {
  const f = (n, fn) => [...Array(n)].map((_, i) => fn(i)).join(""), L = (a = 0, b = 100) => rnd(a, b).toFixed(1), D = () => (-rnd(0, 10)).toFixed(2);
  let h = "";
  if (w === "snow") h = f(30, () => { const z = rnd(3, 7).toFixed(1); return `<i style="left:${L()}%;width:${z}px;height:${z}px;--dx:${rnd(-30, 30).toFixed(0)}px;animation-delay:${D()}s;animation-duration:${rnd(6, 11).toFixed(1)}s"></i>`; });
  else if (w === "rain") h = f(44, () => `<i style="left:${L(-25)}%;height:${rnd(12, 20).toFixed(0)}px;animation-delay:${D()}s;animation-duration:${rnd(.55, .95).toFixed(2)}s"></i>`);
  else if (w === "petals" || w === "leaves") { const E = w === "petals" ? ["🌸", "🌸", "💮", "🌷"] : ["🍂", "🍁", "🍂"]; h = f(18, i => `<i style="left:${L()}%;font-size:${rnd(11, 18).toFixed(0)}px;--dx:${rnd(-70, 70).toFixed(0)}px;--r:${rnd(-540, 540).toFixed(0)}deg;animation-delay:${D()}s;animation-duration:${rnd(7, 13).toFixed(1)}s">${E[i % E.length]}</i>`); }
  G.wxEl.className = "gwx " + w; G.wxEl.innerHTML = h;
}
function syncWeather() {
  if (!G.wxEl) return;
  if (G.wxMode === "auto" && Date.now() - G.wxAt > 12 * 60000) { G.wxAuto = pickWx(G.wxAuto); G.wxAt = Date.now(); }
  const w = G.wxMode === "auto" ? G.wxAuto : G.wxMode; if (w === G.wx) return;
  G.wx = w; Object.keys(WXL).forEach(k => G.el.classList.toggle("wx-" + k, k === w)); buildWx(w);
}
function cycleWx() {
  const order = ["auto", ...Object.keys(WXL)]; G.wxMode = order[(order.indexOf(G.wxMode) + 1) % order.length]; ls("wx", G.wxMode);
  syncWeather(); refreshPanel(); toast(G.wxMode === "auto" ? "Random weather 🎲" : `${WXL[G.wxMode][0]} ${WXL[G.wxMode][1]}`);
}

// ---- floating hearts, cheer visits, study buddies ----
function spawnHeart(px, py, e = "💗") {
  if (!G.fx) return;
  const h = document.createElement("i"); h.className = "gheart"; h.textContent = e; h.style.left = px.toFixed(0) + "px"; h.style.top = py.toFixed(0) + "px";
  G.fx.appendChild(h); setTimeout(() => h.remove(), 1200);
}
const mainPet = uid => { const u = users.find(x => x.id === uid); return u ? G.pets.get(`${u.id}:${petOf(u)}`) : null; };
function queueVisit(from) { if (!from || from === me?.uid) return; visits.push({ from, at: Date.now() }); runVisits(); }
function runVisits() { // a cheer arrived: the sender's pet runs over to yours (waits up to a minute if the garden isn't open yet)
  visits = visits.filter(v => Date.now() - v.at < 60000);
  if (!visits.length || !G.el || !G.el.isConnected || !me) return;
  for (const p of G.pets.values()) if (p.ov && p.ov.kind === "visit") return; // one visit at a time
  const v = visits.shift(), guest = mainPet(v.from), host = mainPet(me.uid); if (!guest || !host || guest === host) return;
  const t = nowS();
  if (RM.matches) return spawnHeart(host.x * G.W, host.y * G.H - 58);
  host.ov = { kind: "host", until: t + 14 }; camTo(host.x * G.W, host.y * G.H);
  guest.ov = { kind: "visit", host: host.key, side: guest.x < host.x ? -1 : 1, limit: t + 14, nextHeart: 0, arrived: 0 };
}
const BUDDY = [[395, 548, 470, 548], [140, 548, 70, 548]]; // study-buddy meeting places on the banks of the pond: [x1, y1, x2, y2] in world px
const NAP = [[800, 350, 872, 350], [560, 350, 632, 350]];    // cosy nap places under the trees
function syncBuddies() { // two studying → their pets meet by the pond and hop. Two on a break → they curl up for a nap together.
  const want = new Map();
  if (!RM.matches) {
    const pair = (status, kind, spots) => {
      const l = users.filter(u => u.status === status).sort((a, b) => a.id < b.id ? -1 : 1);
      for (let i = 0; i + 1 < l.length && i / 2 < spots.length; i += 2) {
        const pa = mainPet(l[i].id), pb = mainPet(l[i + 1].id), S = spots[i / 2]; if (!pa || !pb || pa.st < 1 || pb.st < 1) continue;
        want.set(pa.key, { kind, x: S[0] / G.W, y: S[1] / G.H, mate: pb.key, face: -1, rot: -78 }); want.set(pb.key, { kind, x: S[2] / G.W, y: S[3] / G.H, mate: pa.key, face: 1, rot: 78 });
      }
    };
    pair("studying", "buddy", BUDDY); pair("paused", "nap", NAP);
  }
  G.pets.forEach(p => {
    const w = want.get(p.key), o = p.ov, mine = o && (o.kind === "buddy" || o.kind === "nap");
    if (w && (!o || (mine && o.kind !== w.kind))) { if (p.nb) { p.nb = false; restoreBub(p); } p.ov = { arrived: 0, ...w }; }
    else if (w && mine) Object.assign(o, w);
    else if (!w && mine) { p.ov = null; p.mode = "rest"; p.until = nowS() + rnd(.5, 2); if (p.nb) { p.nb = false; restoreBub(p); } }
  });
}

// ---- treats (feed your pet: costs a seed, happy spin) ----
async function treat(key, m) {
  const p = G.pets.get(key); if (!p || p.uid !== m.id) return;
  if (seedsLeft(m) < TREAT) return toast(`A treat costs ${TREAT} 🌱 — keep studying!`);
  try { await DB.giveTreat(m.id); } catch (e) { return toast(errMsg(e)); }
  p.spin = nowS(); p.bub.textContent = "😋"; p.bub.classList.add("on"); clearTimeout(p.ht); p.ht = setTimeout(() => restoreBub(p), 3000);
  spawnHeart(p.x * G.W, p.y * G.H - 62, "🍪"); setTimeout(() => spawnHeart(p.x * G.W + 14, p.y * G.H - 52, "💗"), 250);
  G.card.hidden = true;
}

// ---- garden visitors: a butterfly, bird or hedgehog drops by now and then; tap it for a seed ----
const VIS = [["🦋", "butterfly", 60], ["🐦", "bird", 42], ["🦔", "hedgehog", 16]]; // [emoji, name, speed px/s]
const visKey = () => "vis-" + new Date().toDateString().replace(/ /g, "-");
function syncVisitor() {
  const v = G.vis, t = nowS();
  if (v && (t > v.until || !G.el.isConnected)) { v.el.remove(); G.vis = null; }
  if (G.vis || document.hidden || G.edit || !G.el.isConnected || !G.layer) return;
  if (!G.visAt) G.visAt = t + rnd(25, 50);
  if (t < G.visAt || (+ls(visKey()) || 0) >= VIS_DAY) return;
  G.visAt = t + rnd(50, 110);
  const k = VIS[Math.floor(Math.random() * VIS.length)], el = document.createElement("div"); el.className = "gvis"; el.dataset.act = "gvis"; el.innerHTML = `<span>${k[0]}</span>`;
  const x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, (G.cam.x + rnd(.2, .8) * G.vw) / G.W)), y = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0 + .05, (G.cam.y + rnd(.45, .85) * G.vh) / G.H));
  G.vis = { el, x, y, tx: x, ty: y, sp: k[2], kind: k[1], until: t + 28, nt: 0, ph: rnd(0, 6), fs: 1, face: 1 }; G.layer.appendChild(el);
}
function visStep(t, dt) {
  const v = G.vis; if (!v) return;
  if (t >= v.nt) { const far = v.kind === "butterfly" ? 130 : v.kind === "bird" ? 70 : 60; v.tx = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, v.x + rnd(-far, far) / G.W)); v.ty = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, v.y + rnd(-far * .5, far * .5) / G.H)); v.nt = t + rnd(1.4, 3.2); }
  const dx = (v.tx - v.x) * G.W, dy = (v.ty - v.y) * G.H, d = Math.hypot(dx, dy), step = v.sp * dt, moving = d > 2 && !RM.matches;
  if (moving) { const k = Math.min(1, step / d); v.x += (v.tx - v.x) * k; v.y += (v.ty - v.y) * k; if (Math.abs(dx) > 1) v.face = dx > 0 ? -1 : 1; }
  v.fs += (v.face - v.fs) * Math.min(1, dt * 12);
  const bob = RM.matches ? 0 : v.kind === "butterfly" ? Math.sin(t * 6 + v.ph) * 9 + 14 : v.kind === "bird" ? (moving ? Math.abs(Math.sin(t * 10)) * 7 : 0) : (moving ? Math.sin(t * 9) * 2 : 0);
  v.el.style.transform = `translate(${(v.x * G.W).toFixed(1)}px,${(v.y * G.H).toFixed(1)}px)`; v.el.style.zIndex = 20 + Math.round(v.y * G.H);
  v.el.firstChild.style.transform = `translateY(${(-bob).toFixed(1)}px) scaleX(${v.fs.toFixed(2)})`;
  v.el.classList.toggle("leave", v.until - t < 2.5);
}
async function collectVisitor(m) {
  const v = G.vis; if (!v) return; G.vis = null; v.el.classList.add("got"); setTimeout(() => v.el.remove(), 450);
  const n = Math.random() < .2 ? 2 : 1; ls(visKey(), (+ls(visKey()) || 0) + 1);
  spawnHeart(v.x * G.W, v.y * G.H - 40, `+${n}🌱`); burst(["🌱", "✨"], 14);
  try { await DB.addBonus(m.id, n); } catch (e) { toast(errMsg(e)); }
}
const gardenMain = () => `<h2>our garden</h2><div id="gslot"></div><div id="gpanel">${gardenPanel()}</div>`;
function gardenTap(key) {
  const p = G.pets.get(key), u = p && users.find(x => x.id === p.uid); if (!u) return;
  if (performance.now() - G.noClick < 300) return; // that was the end of a drag, not a tap
  const tot = totalOf(u), st = stageOf(tot), mood = moodOf(u), own = u.id === me?.uid;
  p.jump = nowS();
  spawnHeart(p.x * G.W, p.y * G.H - 62);
  G.card.innerHTML = `<b>${ALLP[p.type].e[st]}${accOf(p.type, st)} ${esc(u.name)}'s ${esc(petName(p.type))}</b><small>${stageNames(p.type)[st]} · ${st < 3 ? `${fmt(STAGE[st] - tot)} to grow` : "fully grown 👑"}</small><em>${SAY[mood]}</em>${own ? `<button class="gtreat" data-act="gtreat" data-id="${esc(key)}">🍪 give a treat · ${TREAT} 🌱</button>` : ""}`;
  G.card.hidden = true; void G.card.offsetWidth; G.card.hidden = false;
  clearTimeout(G.cardT); G.cardT = setTimeout(() => { G.card.hidden = true; }, own ? 6500 : 4200);
}
function gardenSheet(mine) { // "choose my garden pets" modal: locked pets are greyed out with their unlock requirement
  const sel = new Set((Array.isArray(mine.garden) ? mine.garden : []).filter(id => EXTRA[id] && EXTRA[id].ok(mine)).slice(0, 3));
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>garden friends 🌳</h3><p class="hint">${ALLP[petOf(mine)].e[2]} always lives in the garden. Pick up to 3 friends to join it!<br><b id="gn"></b></p>
  <div class="gch">${Object.keys(EXTRA).map(id => { const x = EXTRA[id], ok = x.ok(mine); return `<button class="${ok ? "" : "lock"}" data-g="${id}"><span>${x.e[2]}</span><b>${x.n}</b><small>${ok ? "unlocked ✓" : "🔒 " + x.req}</small></button>`; }).join("")}</div>
  <div class="row"><button class="btn ghost" id="sx">cancel</button><button class="btn" id="gs">save 💖</button></div></div></div>`;
  const paint = () => { $("#gn").textContent = `${sel.size} / 3 chosen`; modal.querySelectorAll("[data-g]").forEach(b => b.classList.toggle("sel", sel.has(b.dataset.g))); };
  modal.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
    const id = b.dataset.g, x = EXTRA[id];
    if (!x.ok(mine)) return toast("🔒 " + x.req);
    if (sel.has(id)) sel.delete(id); else if (sel.size >= 3) return toast("Max 3 friends 🐾"); else sel.add(id);
    paint();
  });
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#gs").onclick = async () => { try { await DB.saveGarden(me.uid, [...sel]); modal.innerHTML = ""; toast("Garden updated 🌳"); } catch (e) { toast(errMsg(e)); } };
  paint();
}
// ---- pet evolutions: when the pet reaches a new stage, show the old → new form with confetti (remembered on this device) ----
function checkEvolve(m) {
  const st = stageOf(totalOf(m)), k = "stg-" + m.id, seen = ls(k);
  if (seen == null) { ls(k, st); return; } // first run on this device: remember quietly
  if (st > +seen) { ls(k, st); evoMoment(m, +seen, st); }
}
function evoMoment(m, a, b) {
  const t = petOf(m), el = document.createElement("div"); el.className = "pop";
  el.innerHTML = `<div class="popc"><div class="evo"><span>${ALLP[t].e[a]}</span><em class="ar">➜</em><span class="new">${petFace(t, b)}</span></div><b>${esc(m.name)}'s ${esc(petName(t))} evolved!</b><p>${stageNames(t)[b]} ✨</p></div>`;
  const ms = { type: "evolve", pet: t, a, b, at: Date.now() }; saveMs(ms);
  el.onclick = () => el.remove(); document.body.appendChild(el); addCardBtn(el, ms); setTimeout(() => el.remove(), 9000);
  burst(); setTimeout(() => burst(["✨", "⭐", "🌟", "💖"], 30), 500);
}
function addCardBtn(el, ms) { // "make a card" button inside a milestone pop-up
  const b = document.createElement("button"); b.className = "chip"; b.textContent = "📸 make a card";
  b.onclick = e => { e.stopPropagation(); el.remove(); cardOpt.ms = ms; cardSheet("milestone"); };
  el.querySelector(".popc").appendChild(b);
}
function milestonePop(ms) { // streak record / couple level up
  const [e, t, sub] = ms.type === "streak" ? ["🔥", `${ms.n}-day streak!`, "a new personal record"] : ["💞", `Level ${ms.lv + 1}!`, LV_T[ms.lv]], el = document.createElement("div"); el.className = "pop";
  el.innerHTML = `<div class="popc"><div class="pe">${e}</div><b>${esc(t)}</b><p>${esc(sub)}</p></div>`;
  el.onclick = () => el.remove(); document.body.appendChild(el); addCardBtn(el, ms); setTimeout(() => el.remove(), 9000);
}
let gSeen = null, gSeenFor = "";
function checkUnlocks(m) { // new garden pet unlocked → confetti once (remembered on this device)
  if (gSeenFor !== m.id) { gSeenFor = m.id; try { gSeen = new Set(JSON.parse(ls("gunl-" + m.id) || "[]")); } catch { gSeen = new Set(); } }
  const fresh = Object.keys(EXTRA).filter(id => EXTRA[id].ok(m) && !gSeen.has(id)); if (!fresh.length) return;
  fresh.forEach(id => gSeen.add(id)); ls("gunl-" + m.id, JSON.stringify([...gSeen])); burst();
  setTimeout(() => toast(fresh.length > 1 ? `${fresh.length} new garden friends! 🌳` : `New garden friend: ${EXTRA[fresh[0]].e[2]} ${EXTRA[fresh[0]].n}!`), 1800);
}

// ---- cheers: pop-up card + sticker picker ----
const short = t => [...String(t)].length <= 2; // an emoji vs a text sticker
const STICKERS = ["you got this! 💪", "proud of you! 🥹", "sending hugs 🤗", "sip some water 💧", "I believe in you ✨", "almost there! 🌟", "you're so smart 🧠", "break soon, I promise 🧃"];
function cheerCard(list) {
  const c = list[list.length - 1], el = document.createElement("div"); el.className = "pop";
  el.innerHTML = `<div class="popc"><div class="pe">${short(c.emoji) ? esc(c.emoji) : "💌"}</div><b>${esc(c.name || "Your friend")}</b><p>${short(c.emoji) ? "sent you a cheer!" : esc(c.emoji)}</p>${list.length > 1 ? `<small>+${list.length - 1} more</small>` : ""}</div>`;
  el.onclick = () => el.remove(); document.body.appendChild(el); setTimeout(() => el.remove(), 5500);
}
function stickerSheet(to, mine) {
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>send a sticker 💌</h3><div class="stk">${STICKERS.map(t => `<button class="btn ghost" data-s="${esc(t)}">${esc(t)}</button>`).join("")}</div><button class="link" id="sx">close</button></div></div>`;
  $("#sx").onclick = () => modal.innerHTML = "";
  modal.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => { modal.innerHTML = ""; try { await DB.cheer(to, me.uid, mine.name, b.dataset.s); toast("Sticker sent 💌"); } catch (e) { toast(errMsg(e)); } });
}

const BADGES = [ // [id, emoji, name, description, test(ctx)]
  ["first", "🌱", "First step", "Study for the first time", c => c.total > 0],
  ["h10", "🌟", "10 hours", "10 hours studied in total", c => c.total >= 36000],
  ["h50", "🌈", "50 hours", "50 hours in total", c => c.total >= 180000],
  ["h100", "👑", "100 hours", "100 hours in total", c => c.total >= 360000],
  ["h250", "💎", "250 hours", "250 hours in total", c => c.total >= 900000],
  ["s3", "🔥", "3-day streak", "Study 3 days in a row", c => c.streak >= 3],
  ["s7", "✨", "7-day streak", "Study 7 days in a row", c => c.streak >= 7],
  ["s14", "💫", "14-day streak", "Study 14 days in a row", c => c.streak >= 14],
  ["s30", "🏆", "30-day streak", "Study 30 days in a row", c => c.streak >= 30],
  ["d4", "💪", "4h in a day", "Study 4 hours in one day", c => c.bestDay >= 14400],
  ["d8", "🚀", "8h in a day", "Study 8 hours in one day", c => c.bestDay >= 28800],
  ["n10", "📅", "10 study days", "Study on 10 different days", c => c.days >= 10],
  ["n30", "🗓️", "30 study days", "Study on 30 different days", c => c.days >= 30],
  ["goal", "🎯", "Goal getter", "Reach your daily goal", c => c.goalHit]
];
const badgeBusy = new Set();
const badgeCtx = m => { const v = Object.values(m.daily || {}), st = stats(m); return { total: st.total, streak: Math.max(st.streak, m.bestStreak || 0), bestDay: Math.max(0, ...v), days: v.filter(x => x > 0).length, goalHit: goalOf(m) > 0 && liveToday(m) >= goalOf(m) }; };
function badgeView(mine) {
  const got = mine.badges || {}, n = BADGES.filter(b => got[b[0]]).length;
  return sec("badges", "badges", `<span class="hint" style="margin-left:auto">${n} / ${BADGES.length}</span>`, `<div class="badges">${BADGES.map(b => `<div class="badge ${got[b[0]] ? "" : "lock"}"><span>${b[1]}</span><b>${b[2]}</b><small>${b[3]}</small></div>`).join("")}</div>`);
}
let calMonth = 0; // 0 = this month, -1 = last month, ...
function calView(mine) {
  const d = mine.daily || {}, now = new Date(), first = new Date(now.getFullYear(), now.getMonth() + calMonth, 1), y = first.getFullYear(), mo = first.getMonth();
  const n = new Date(y, mo + 1, 0).getDate(), g = goalOf(mine) || 14400, tk = key(now);
  let tot = 0, days = 0, cells = "";
  for (let i = 0; i < first.getDay(); i++) cells += "<span></span>";
  for (let i = 1; i <= n; i++) {
    const k = key(new Date(y, mo, i)), v = k === tk ? liveToday(mine) : d[k] || 0, r = v / g, lv = !v ? 0 : r < .25 ? 1 : r < .5 ? 2 : r < 1 ? 3 : 4;
    tot += v; if (v > 0) days++;
    cells += `<button class="dy l${lv}${k === tk ? " today" : ""}${k > tk ? " fut" : ""}" data-act="day" data-id="${k}" data-v="${v}">${i}</button>`;
  }
  return sec("cal", "calendar", "", `<div class="cal"><div class="calh"><button data-act="calnav" data-id="-1">‹</button><span>${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span><button data-act="calnav" data-id="1" ${calMonth >= 0 ? "disabled" : ""}>›</button></div>
  <div class="cg">${["S", "M", "T", "W", "T", "F", "S"].map(x => `<em>${x}</em>`).join("")}${cells}</div>
  <p class="hint">${days} study days · ${fmt(tot)} this month</p>
  <div class="legend">less ${[0, 1, 2, 3, 4].map(l => `<i class="dy l${l}"></i>`).join("")} more</div></div>`);
}
// ---- photocard: a shareable image of your session, stats and garden (drawn by js/card.js) ----
// the latest milestone (pet evolved / streak record / couple level) is remembered on this device so you can still make its card later
const loadMs = () => { try { const m = JSON.parse(ls("lastMs") || "null"); return m && ["evolve", "streak", "level"].includes(m.type) ? m : null; } catch { return null; } };
const saveMs = ms => ls("lastMs", JSON.stringify(ms));
const cardOpt = { shape: ["square", "portrait", "story"].includes(ls("cardShape")) ? ls("cardShape") : "portrait", sid: "today", mode: "me", fid: "", period: "week", ms: loadMs() };
const gfmt = t => t % 3600 === 0 ? `${t / 3600}h` : fmt(t);
let cardUrl = "", cardBlob = null, cardCv = null, cardSeq = 0, lastGift = 0;
const dayLong = t => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const hhmm = t => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const pxc = document.createElement("canvas"); pxc.width = pxc.height = 1; const pxx = pxc.getContext("2d", { willReadFrequently: true });
function norm(c) { pxx.clearRect(0, 0, 1, 1); pxx.fillStyle = "#000"; pxx.fillStyle = c; pxx.fillRect(0, 0, 1, 1); const [r, g, b, a] = pxx.getImageData(0, 0, 1, 1).data; return { s: `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`, rgb: `${r},${g},${b}` }; }
function cardPal(night, wx) { // read the CURRENT theme's colours (also the garden's sky / grass for the right time of day and weather)
  const tmp = document.createElement("div"); tmp.id = "garden"; tmp.className = [night ? "night" : "", wx && wx !== "clear" ? "wx-" + wx : ""].join(" ").trim();
  tmp.style.cssText = "position:fixed;left:-9999px;top:0;width:10px;height:10px;visibility:hidden;pointer-events:none"; document.body.appendChild(tmp);
  const c = e => { const i = document.createElement("i"); i.style.color = e; tmp.appendChild(i); return norm(getComputedStyle(i).color); }, v = n => c(`var(${n})`);
  const pal = {
    bg1: v("--bg1").s, bg2: v("--bg2").s, card: v("--card").s, ink: v("--ink").s, sub: v("--soft").s, main: v("--main").s, alt: v("--alt").s, tint: v("--tint").s, edge: v("--edge").s,
    sk1: v("--sk1").s, sk2: v("--sk2").s, cl: v("--cl").s, grB: v("--gr-b").s, grF: v("--gr-f").s, wood: v("--wood").s, woodL: v("--wood-l").s, woodD: v("--wood-d").s,
    soil: c("color-mix(in srgb,#8a5732 80%,var(--bg1))").s, cloth: c("color-mix(in srgb,#fff 88%,var(--main))").s, pad: c("color-mix(in srgb,#5fcf74 80%,var(--bg1))").s,
    stone: c("color-mix(in srgb,#cfd3dc 75%,var(--bg1))").s, water: c("color-mix(in srgb,#8fd3ff 80%,var(--bg1))").s, water2: c("color-mix(in srgb,#4fb0e8 78%,var(--bg1))").s,
    live: v("--live").s, onBg: v("--on-bg").s, onLine: v("--on-line").s, glow1: v("--glow1").rgb, glow2: v("--glow2").rgb, hf: (getComputedStyle(document.documentElement).getPropertyValue("--hf").trim() || "Fredoka, sans-serif"), bf: "Nunito, system-ui, sans-serif"
  };
  tmp.remove(); return pal;
}
function gardenSnap() { // the saved garden as plain data (live pet positions when the garden is open, tidy spots otherwise)
  const night = isEvening(), wx = G.wxMode === "auto" ? G.wxAuto : G.wxMode, R = seeded(3), items = [];
  users.forEach(u => decorOf(u).forEach(d => items.push({ i: d.i, x: d.x, y: d.y })));
  const pets = gardenList().map(e => {
    const live = G.pets.get(e.key), st = stageOf(totalOf(e.u)); let x, y;
    if (live) { x = live.x; y = live.y; } else { x = .3 + R() * .4; y = .68 + R() * .22; for (let i = 0; i < 20 && inPond(x, y); i++) { x = .3 + R() * .4; y = .68 + R() * .22; } }
    return { emo: ALLP[e.type].e[st], acc: accOf(e.type, st), st, x, y, flip: live ? live.fs < 0 : R() < .5, sleep: moodOf(e.u) === "sleep" };
  });
  return { night, wx, lv: couple().lv, items, pets };
}
function cardData(shape, sid) {
  const m = users.find(u => u.id === me.uid), s = stats(m), d = m.daily || {}, now = Date.now(), goal = goalOf(m), sx = sessions.find(x => x.id === sid);
  let ses, date = dayLong(now);
  if (sx) {
    const t0 = sx.start.toMillis(), dayTot = d[key(t0)] || sx.seconds; date = dayLong(t0);
    ses = { label: "Study session", time: fmt(sx.seconds), sub: `${hhmm(t0)} → ${hhmm(t0 + sx.seconds * 1000)}`, pct: goal ? dayTot / goal : null, goalText: `of ${gfmt(goal)} day goal` };
  } else {
    const tod = liveToday(m), cnt = sessions.filter(x => key(x.start.toMillis()) === key(now)).length;
    ses = { label: "Today's studying", time: fmt(tod), sub: cnt ? `${cnt} session${cnt > 1 ? "s" : ""} so far` : "every minute counts ✨", pct: goal ? tod / goal : null, goalText: `of ${gfmt(goal)} goal` };
  }
  const week = [...Array(7)].map((_, i) => { const t = now - (6 - i) * DAY, v = d[key(t)] || 0; return { l: new Date(t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), v, t: v ? fmt(v) : "", today: i === 6 }; });
  return { shape, name: m.name || "you", avatar: m.emoji || "📚", pet: ALLP[petOf(m)].e[stageOf(totalOf(m))], date, session: ses, todayLabel: "today", todayText: fmt(liveToday(m)),
    streakText: `${s.streak} day${s.streak === 1 ? "" : "s"} 🔥`, week, weekTotal: fmt(week.reduce((a, k) => a + k.v, 0)), garden: gardenSnap() };
}
function cardDataTogether(shape, fid) { // both of you, right now: live session time, status, today's progress, pets, garden
  const a = users.find(u => u.id === me.uid), b = users.find(u => u.id === fid) || users.find(u => u.id !== me.uid), now = Date.now();
  const person = u => {
    const on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), st = stageOf(totalOf(u)), t = petOf(u);
    return { name: u.name || "friend", avatar: u.emoji || "📚", status: on ? "studying" : br ? "break" : "rest", statusText: on ? "studying ✏️" : br ? "on a break ☕" : "resting 💤",
      label: on || br ? "this session" : "today", big: fmt(on || br ? elapsed(u) / 1000 : lt), today: fmt(lt), pct: g ? lt / g : null, goalText: g ? `goal ${gfmt(g)}` : "", streak: stats(u).streak,
      pet: { emo: ALLP[t].e[st], acc: accOf(t, st), st } };
  };
  return { kind: "together", shape, people: [person(a), person(b)], title: `${a.name} & ${b.name}`, date: `${dayLong(now)} · ${hhmm(now)}`,
    togetherToday: fmt(liveToday(a) + liveToday(b)), coupleText: `Level ${couple().lv + 1} 💞`, garden: gardenSnap() };
}
// ---- recap card: totals for the last 7 / 30 days ----
const isManual = x => { if (x.manual) return true; const t = new Date(x.start.toMillis()); return t.getHours() === 12 && !t.getMinutes() && !t.getSeconds() && !t.getMilliseconds(); }; // "+ add time" sessions are stamped 12:00 on the dot, so their start time is meaningless
const dayShort = t => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const dayNum = t => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const hourLbl = h => new Date(2000, 0, 1, h % 24).toLocaleTimeString(undefined, { hour: "numeric" });
async function cardDataRecap(shape, period) {
  const m = users.find(u => u.id === me.uid), d = m.daily || {}, now = Date.now(), n = period === "month" ? 30 : 7, tk = key(now), t0 = new Date(now - (n - 1) * DAY); t0.setHours(0, 0, 0, 0);
  const days = [...Array(n)].map((_, i) => { const t = now - (n - 1 - i) * DAY, k = key(t); return { t, v: k === tk ? liveToday(m) : d[k] || 0 }; });
  const total = days.reduce((a, x) => a + x.v, 0), studied = days.filter(x => x.v > 0).length; let prev = 0; for (let i = n; i < 2 * n; i++) prev += d[key(now - i * DAY)] || 0;
  let list; try { list = await DB.getSessionsSince(me.uid, t0.getTime()); } catch { list = sessions.filter(x => x.start.toMillis() >= t0.getTime()); } // offline: fall back to the 40 we already have
  const best = days.reduce((b, x) => x.v > b.v ? x : b, { v: 0, t: now }), long = list.reduce((b, x) => x.seconds > (b ? b.seconds : 0) ? x : b, null);
  const hrs = new Array(24).fill(0); // seconds studied in each hour of the day (tracked sessions only, spread forward from their start)
  list.forEach(x => { if (isManual(x)) return; let t = x.start.toMillis(), left = x.seconds * 1000; while (left > 0) { const nx = new Date(t); nx.setHours(nx.getHours() + 1, 0, 0, 0); const step = Math.min(left, nx.getTime() - t); hrs[new Date(t).getHours()] += step; t += step; left -= step; } });
  let bw = 0, bh = 0; for (let h = 0; h < 24; h++) { const w = hrs[h] + hrs[(h + 1) % 24]; if (w > bw) { bw = w; bh = h; } } // best 2-hour window
  const part = bh < 5 || bh >= 21 ? "night owl 🌙" : bh < 9 ? "early bird 🌅" : bh < 12 ? "morning ☀️" : bh < 17 ? "afternoon 🌤️" : "evening 🌆", name = m.name || "you";
  const sub = !total ? "no study yet. Start today ✨" : prev > 0 ? `${total >= prev ? "▲" : "▼"} ${fmt(Math.abs(total - prev))} vs the ${n} days before` : "keep it going ✨";
  return { kind: "recap", shape, name, avatar: m.emoji || "📚", title: `${name}'s ${period}`, date: `${dayNum(t0)} – ${dayNum(now)}`, label: `LAST ${n} DAYS`, total: fmt(total), sub, studied, n, weekTotal: fmt(total),
    tiles: [{ l: "best day", v: best.v ? fmt(best.v) : "–", s: best.v ? dayShort(best.t) : "" },
      { l: "longest session", v: long ? fmt(long.seconds) : "–", s: long ? dayShort(long.start.toMillis()) + (isManual(long) ? "" : " · " + hhmm(long.start.toMillis())) : "" },
      { l: "busiest time", v: bw ? `${hourLbl(bh)}–${hourLbl(bh + 2)}` : "–", s: bw ? part : "track a session ⏱️" },
      { l: "daily average", v: fmt(total / n), s: `${studied} of ${n} days studied` }],
    bars: days.map((x, i) => ({ v: x.v, today: i === n - 1, t: n <= 7 && x.v ? fmt(x.v) : "", l: n <= 7 ? new Date(x.t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2) : i % 5 === 0 || i === n - 1 ? String(new Date(x.t).getDate()) : "" })), garden: gardenSnap() };
}
// ---- milestone card: ms = { type: "evolve" | "streak" | "level", ... } saved when it happened ----
function cardDataMilestone(shape, ms) {
  const m = users.find(u => u.id === me.uid), s = stats(m), name = m.name || "you", out = { kind: "milestone", shape, name, avatar: m.emoji || "📚", date: dayLong(ms.at || Date.now()), garden: gardenSnap() };
  if (ms.type === "evolve") {
    const t = ALLP[ms.pet] ? ms.pet : petOf(m), a = Math.min(ms.a, 3), b = Math.min(ms.b, 3);
    return { ...out, from: ALLP[t].e[a], emo: ALLP[t].e[b], acc: accOf(t, b), title: `${name}'s ${petName(t)} evolved!`, sub: `${stageNames(t)[b]} ✨`, spark: ["✨", "⭐", "💖", "🌟"], chips: [["total studied", fmt(totalOf(m))], ["streak", `${s.streak} day${s.streak === 1 ? "" : "s"} 🔥`]] };
  }
  if (ms.type === "streak") return { ...out, emo: "🔥", title: `${ms.n}-day streak!`, sub: "a new personal record", spark: ["🔥", "✨", "⭐"], chips: [["total studied", fmt(totalOf(m))], ["best streak", `${Math.max(ms.n, s.streak)} days 🔥`]] };
  const lv = Math.min(ms.lv, LV_T.length - 1);
  return { ...out, emo: "💞", title: `Level ${lv + 1}!`, sub: LV_T[lv], spark: ["💞", "✨", "🌸", "⭐"], chips: [["together", fmt(couple().sec)], ["couple level", `${lv + 1} 💞`]] };
}
async function renderCard() {
  const seq = ++cardSeq, img = $("#cimg"), ld = $(".cload"); if (!img) return;
  cardBlob = null; cardCv = null; if (ld) ld.hidden = false; // until the new card is drawn, save / send say "still drawing"
  try { await Promise.race([Promise.all([document.fonts.load("700 48px Fredoka"), document.fonts.load("800 28px Nunito")]), new Promise(r => setTimeout(r, 1500))]); } catch {}
  if (seq !== cardSeq) return;
  let data; const md = cardOpt.mode;
  try { data = md === "together" ? cardDataTogether(cardOpt.shape, cardOpt.fid) : md === "recap" ? await cardDataRecap(cardOpt.shape, cardOpt.period) : md === "milestone" ? cardDataMilestone(cardOpt.shape, cardOpt.ms) : cardData(cardOpt.shape, cardOpt.sid); }
  catch { if (seq === cardSeq) { toast("Couldn't draw that card 😢"); if (ld) ld.hidden = true; } return; }
  if (seq !== cardSeq) return;
  const cv = document.createElement("canvas");
  drawCard(cv, data, cardPal(data.garden.night, data.garden.wx));
  cv.toBlob(b => {
    if (seq !== cardSeq || !b) return;
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    cardBlob = b; cardCv = cv; cardUrl = URL.createObjectURL(b); img.src = cardUrl; if (ld) ld.hidden = true;
  }, "image/png");
}
// a small jpeg (640px wide, a few hundred KB at most) of the current card, to store in the friend's inbox
function giftImg() {
  const W = 640, c = document.createElement("canvas"); c.width = W; c.height = Math.round(cardCv.height * W / cardCv.width);
  c.getContext("2d").drawImage(cardCv, 0, 0, c.width, c.height);
  let q = .8, u = c.toDataURL("image/jpeg", q); while (u.length > 380000 && q > .35) { q -= .1; u = c.toDataURL("image/jpeg", q); }
  return u;
}
function cardSheet(mode) {
  const sess = sessions.slice(0, 12), friends = users.filter(u => u.id !== me.uid), canShare = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "a.png", { type: "image/png" })] })); } catch { return false; } })();
  if (!cardOpt.ms) cardOpt.ms = loadMs();
  cardOpt.mode = mode === "together" && friends.length ? "together" : mode === "milestone" && cardOpt.ms ? "milestone" : mode === "recap" ? "recap" : "me";
  if (!sess.some(x => x.id === cardOpt.sid)) cardOpt.sid = "today";
  if (!friends.some(u => u.id === cardOpt.fid)) cardOpt.fid = (friends.find(u => u.status === "studying") || friends[0] || {}).id || "";
  const SH = { square: "▫️ square", portrait: "🖼️ 4:5", story: "📱 story" }, PD = { week: "last 7 days", month: "last 30 days" },
    MD = { me: "👤 me", ...(friends.length ? { together: "💞 together" } : {}), recap: "🗓️ recap", ...(cardOpt.ms ? { milestone: "🏅 milestone" } : {}) };
  modal.innerHTML = `<div class="back"><div class="sheet cardsheet"><h3>photocard 📸</h3>
  <div class="seg" id="cmode">${Object.keys(MD).map(k => `<button data-mode="${k}" class="${k === cardOpt.mode ? "sel" : ""}">${MD[k]}</button>`).join("")}</div>
  <div class="seg" id="cper">${Object.keys(PD).map(k => `<button data-per="${k}" class="${k === cardOpt.period ? "sel" : ""}">${PD[k]}</button>`).join("")}</div>
  <div class="seg">${Object.keys(SH).map(k => `<button data-shape="${k}" class="${k === cardOpt.shape ? "sel" : ""}">${SH[k]}</button>`).join("")}</div>
  <select id="csel" aria-label="which session"><option value="today">Today (all sessions)</option>${sess.map(x => `<option value="${esc(x.id)}" ${x.id === cardOpt.sid ? "selected" : ""}>${new Date(x.start.toMillis()).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${fmt(x.seconds)}</option>`).join("")}</select>
  <select id="cfr" aria-label="which friend">${friends.map(u => `<option value="${esc(u.id)}" ${u.id === cardOpt.fid ? "selected" : ""}>${esc(u.emoji)} ${esc(u.name)}</option>`).join("")}</select>
  <div class="cprev"><div class="cload">drawing your card…</div><img id="cimg" alt="photocard preview"></div>
  ${friends.length ? `<button class="btn" id="csend">💌 send</button>` : ""}
  <div class="row"><button class="btn ghost" id="cclose">close</button>${canShare ? `<button class="btn ghost" id="cshare">share</button>` : ""}<button class="btn ghost" id="csave">save ⬇️</button></div></div></div>`;
  const vis = () => { $("#csel").hidden = cardOpt.mode !== "me"; $("#cfr").hidden = friends.length < 2; $("#cper").hidden = cardOpt.mode !== "recap"; };
  const sendLbl = () => { const b = $("#csend"), f = friends.find(u => u.id === cardOpt.fid); if (b) { b.textContent = `💌 send to ${f ? f.name : "friend"}`; b.disabled = !f; } };
  const done = () => { cardSeq++; if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = ""; } cardBlob = null; cardCv = null; modal.innerHTML = ""; };
  $("#cclose").onclick = done;
  modal.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { cardOpt.mode = b.dataset.mode; modal.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("sel", x === b)); vis(); renderCard(); });
  modal.querySelectorAll("[data-per]").forEach(b => b.onclick = () => { cardOpt.period = b.dataset.per; modal.querySelectorAll("[data-per]").forEach(x => x.classList.toggle("sel", x === b)); renderCard(); });
  modal.querySelectorAll("[data-shape]").forEach(b => b.onclick = () => { cardOpt.shape = b.dataset.shape; ls("cardShape", cardOpt.shape); modal.querySelectorAll("[data-shape]").forEach(x => x.classList.toggle("sel", x === b)); renderCard(); });
  $("#csel").onchange = e => { cardOpt.sid = e.target.value; renderCard(); };
  $("#cfr").onchange = e => { cardOpt.fid = e.target.value; sendLbl(); if (cardOpt.mode === "together") renderCard(); };
  const file = () => new File([cardBlob], `study${cardOpt.mode === "me" ? "" : "-" + cardOpt.mode}-${key(Date.now())}.png`, { type: "image/png" });
  $("#csave").onclick = () => { if (!cardBlob) return toast("One sec, still drawing…"); const a = document.createElement("a"); a.href = cardUrl; a.download = file().name; document.body.appendChild(a); a.click(); a.remove(); toast("Saved 📸"); };
  const sh = $("#cshare"); if (sh) sh.onclick = async () => {
    if (!cardBlob) return toast("One sec, still drawing…");
    try { await navigator.share({ files: [file()], title: "MN Study Tracker" }); } catch (e) { if (e && e.name !== "AbortError") toast("Couldn't open sharing — try save instead"); }
  };
  const sd = $("#csend"); if (sd) sd.onclick = async () => { // deliver the card straight into the friend's together tab
    const f = friends.find(u => u.id === cardOpt.fid), mine = users.find(u => u.id === me.uid); if (!f || !mine) return;
    if (!cardCv) return toast("One sec, still drawing…");
    if (Date.now() - lastGift < 8000) return toast("Slow down, cutie 😄");
    lastGift = Date.now();
    try { await DB.sendGift(f.id, me.uid, mine.name, mine.emoji, cardOpt.mode, giftImg()); toast(`Sent to ${f.name} 💌`); } catch (e) { lastGift = 0; toast(errMsg(e)); }
  };
  vis(); sendLbl(); renderCard();
}

// ---- cards from friends: the inbox on the together tab ----
const giftKnown = new Set(); // ids already announced on this device
const safeImg = u => typeof u === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(u) ? u : ""; // a friend's document is untrusted: only ever show a plain jpeg
function onGifts(list) {
  list.slice(8).forEach(g => DB.deleteGift(me?.uid, g.id).catch(() => {})); // keep only the newest 8
  gifts = list.slice(0, 8).filter(g => safeImg(g.img));
  const fresh = gifts.filter(g => !g.seen && !giftKnown.has(g.id)); gifts.forEach(g => giftKnown.add(g.id));
  if (fresh.length) {
    const who = fresh[0].name || "Your friend"; burst(["💌", "✨"], 20); queueVisit(fresh[0].from);
    toast(fresh.length > 1 ? `${fresh.length} new cards from ${who} 💌` : `${who} sent you a card 💌`); notify(`${who} sent you a card 💌`, "Open the app to see it");
  }
  render();
}
const giftsView = () => !gifts.length ? "" : `<h2>cards for you 💌</h2><div class="gifts">${gifts.map(g => `<button class="gift ${g.seen ? "" : "new"}" data-act="gift" data-id="${esc(g.id)}"><img src="${safeImg(g.img)}" alt="card from ${esc(g.name)}" decoding="async"><span>${esc(g.emoji)} ${esc(g.name)}</span></button>`).join("")}</div>`;
function giftSheet(id) {
  const g = gifts.find(x => x.id === id); if (!g) return;
  if (!g.seen) DB.markGift(me.uid, g.id).catch(() => {});
  const when = g.at && g.at.toMillis ? dayLong(g.at.toMillis()) : "";
  modal.innerHTML = `<div class="back"><div class="sheet cardsheet"><h3>${esc(g.emoji)} from ${esc(g.name)}</h3><p class="hint">${esc(when)}</p><div class="cprev"><img src="${safeImg(g.img)}" alt="card from ${esc(g.name)}"></div>
  <div class="row"><button class="btn ghost" id="gx">close</button><button class="btn ghost" id="gd">remove 🗑️</button><button class="btn" id="gs">save ⬇️</button></div></div></div>`;
  $("#gx").onclick = () => modal.innerHTML = "";
  $("#gs").onclick = () => { const a = document.createElement("a"); a.href = safeImg(g.img); a.download = `card-from-${String(g.name || "friend").replace(/[^a-z0-9]+/gi, "-")}-${key(Date.now())}.jpg`; document.body.appendChild(a); a.click(); a.remove(); toast("Saved 📸"); };
  $("#gd").onclick = async () => { if (!confirm("Remove this card?")) return; try { await DB.deleteGift(me.uid, g.id); modal.innerHTML = ""; } catch (e) { toast(errMsg(e)); } };
}

function statsView(mine) {
  const s = stats(mine), d = mine.daily || {}, now = Date.now();
  const days = [...Array(7)].map((_, i) => { const t = now - (6 - i) * DAY; return { l: new Date(t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), v: d[key(t)] || 0 }; });
  const max = Math.max(...days.map(x => x.v), 1);
  return `<h2>last 7 days <button class="chip" data-act="card">📸 photocard</button><button class="chip" data-act="card" data-id="recap">🗓️ recap</button></h2><div class="bars">${days.map(x => `<div class="bar"><i style="height:${Math.max(4, x.v / max * 100)}%"></i><em>${x.v ? fmt(x.v) : ""}</em><span>${x.l}</span></div>`).join("")}</div>
  <div class="tiles"><div><b>${fmt(s.today)}</b>today</div><div><b>${fmt(s.week)}</b>this week</div><div><b>${s.streak}🔥</b>day streak</div><div><b>${fmt(s.total)}</b>all time</div></div>
  ${calView(mine)}${badgeView(mine)}${sec("sess", "sessions", `<button class="chip" data-act="add">+ add time</button>`,
  sessions.map(x => `<div class="sess"><div><b>${new Date(x.start.toMillis()).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</b>
  <span>${fmt(x.seconds)}</span></div><button class="ic" data-act="edit" data-id="${x.id}">✏️</button><button class="ic" data-act="del" data-id="${x.id}">🗑️</button></div>`).join("") || `<p class="hint">No sessions yet — press study to begin!</p>`)}`;
}
function render() {
  if (!me) return authView();
  const mine = users.find(u => u.id === me.uid);
  if (!mine) return app.innerHTML = `<div class="auth"><div class="logo">📚</div><p class="hint">loading…</p></div>`;
  if (tab === "garden" && G.el && G.el.isConnected) { // garden is showing: leave the live scene alone, refresh only what sits around it
    const av = app.querySelector("header .av"); if (av && av.textContent !== mine.emoji) av.textContent = mine.emoji;
    const gp = $("#gpanel"); if (gp) gp.innerHTML = gardenPanel();
    syncGarden(); return;
  }
  app.innerHTML = `<header><h1>MN study tracker</h1><div class="hr">${tab === "home" ? `<button class="sw ${compact ? "on" : ""}" data-act="compact" data-id="${compact ? 0 : 1}" role="switch" aria-checked="${compact}" title="shorter home tab"><em>short</em><i></i></button>` : ""}<button class="av" data-act="profile">${esc(mine.emoji)}</button></div></header>
  <main>${tab === "home" ? homeView(mine) : tab === "garden" ? gardenMain() : statsView(mine)}</main>
  <nav><button class="${tab === "home" ? "act" : ""}" data-act="tab" data-id="home">🏠<span>together</span></button><button class="${tab === "stats" ? "act" : ""}" data-act="tab" data-id="stats">📊<span>my stats</span></button><button class="${tab === "garden" ? "act" : ""}" data-act="tab" data-id="garden">🌳<span>garden</span></button></nav>`;
  if (tab === "garden") mountGarden();
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
  else if (st.streak > m.bestStreak && st.streak !== lastBest) { lastBest = st.streak; DB.updateProfile(me.uid, { bestStreak: st.streak }); if (st.streak >= 2) { burst(); const ms = { type: "streak", n: st.streak, at: Date.now() }; saveMs(ms); milestonePop(ms); } }
  const got = BADGES.filter(b => b[4](badgeCtx(m))).map(b => b[0]);
  if (m.badges === undefined) { // first time: quietly record badges she already earned (no confetti spam)
    if (!badgeBusy.has("init")) { badgeBusy.add("init"); DB.updateProfile(me.uid, { badges: Object.fromEntries(got.map(id => [id, Date.now()])) }).catch(() => {}); }
  } else got.filter(id => !m.badges[id] && !badgeBusy.has(id)).forEach(id => {
    badgeBusy.add(id); DB.unlockBadge(me.uid, id).catch(() => {});
    const b = BADGES.find(x => x[0] === id); burst(); setTimeout(() => toast(`Badge unlocked: ${b[1]} ${b[2]}!`), 1800);
  });
  if (sNodes && m.status !== "studying") { stopSound(); render(); }
  checkUnlocks(m); checkEvolve(m); checkSeeds(m);
  const cl = couple().lv, seen = ls("lvl");
  if (seen == null) ls("lvl", cl); else if (cl > +seen) { ls("lvl", cl); burst(); const ms = { type: "level", lv: cl, at: Date.now() }; saveMs(ms); setTimeout(() => milestonePop(ms), 1800); }
}
setInterval(() => { tick(); watch(); if (G.el && G.el.isConnected) syncGarden(); }, 1000);
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
  modal.innerHTML = `<div class="back"><div class="sheet prof"><h3>your profile</h3><input id="pn" value="${esc(mine.name)}" maxlength="20">
  <div class="emojis">${EMOJI.map(e => `<button class="av ${e === mine.emoji ? "sel" : ""}" data-e="${e}">${e}</button>`).join("")}</div>
  <div class="opts"><button class="btn ghost" id="gl">🎯 daily goal: ${goalOf(mine) ? fmt(goalOf(mine)) : "off"}</button>
  <button class="btn ghost" id="lm">⏰ still-studying: ${limitOf(mine) ? "after " + fmt(limitOf(mine)) : "off"}</button>
  <button class="btn ghost" id="pt">${PETS[petOf(mine)].e[2]} pet: ${petOf(mine)}</button>
  <button class="btn ghost" id="pm">🍅 pomodoro: ${mine.pomoFocus ?? 25} / ${mine.pomoRest ?? 5} min</button>
  <button class="btn ghost" id="nt">🔔 notifications</button>
  <button class="btn ghost" id="rm">🍃 reduce motion: ${calm ? "on" : "off"}</button></div>
  <p class="hint">cute themes</p><div class="emojis">${themeBtns(["auto", ...CUTE])}</div><p class="hint">dark themes 🌙</p><div class="emojis">${themeBtns(DARK)}</div><p class="hint">seasons 🍃 · light, then dark</p><div class="emojis">${themeBtns(SEASON)}</div><p class="hint">glass themes ✨</p><div class="emojis">${themeBtns(GLASS)}</div>
  <div class="row"><button class="btn ghost" id="lo">log out</button><button class="btn" id="ps">save 💖</button></div><button class="link" id="sx">close</button></div></div>`;
  let em = mine.emoji;
  $("#gl").onclick = () => sheet({ title: "daily goal 🎯", note: "How long do you want to study each day? 00:00 turns it off.", secs: goalOf(mine), onSave: sec => DB.updateProfile(me.uid, { goal: sec }) });
  $("#lm").onclick = () => sheet({ title: "still-studying check ⏰", note: "Ask me “still studying?” when the timer runs this long. 00:00 turns it off.", secs: limitOf(mine), onSave: sec => DB.updateProfile(me.uid, { limit: sec }) });
  $("#pt").onclick = () => {
    modal.innerHTML = `<div class="back"><div class="sheet"><h3>pick your pet 🐾</h3><p class="hint">It grows as you study, and gets sleepy if you skip a day.</p><div class="emojis">${Object.keys(PETS).map(t => `<button class="av ${t === petOf(mine) ? "sel" : ""}" data-p="${t}" title="${t}">${PETS[t].e[2]}</button>`).join("")}</div><button class="link" id="sx">close</button></div></div>`;
    $("#sx").onclick = () => modal.innerHTML = "";
    modal.querySelectorAll("[data-p]").forEach(b => b.onclick = async () => { await DB.updateProfile(me.uid, { pet: b.dataset.p }); modal.innerHTML = ""; toast("New friend! " + PETS[b.dataset.p].e[2]); });
  };
  $("#pm").onclick = () => sheet({ title: "focus length 🍅", note: "How long is each study block? (hours : minutes)", secs: (mine.pomoFocus ?? 25) * 60,
    onSave: async sec => {
      if (sec < 60) throw Error("Minimum is 1 minute.");
      await DB.updateProfile(me.uid, { pomoFocus: sec / 60 });
      setTimeout(() => sheet({ title: "break length ☕", note: "How long is each break?", secs: (mine.pomoRest ?? 5) * 60,
        onSave: async s2 => { if (s2 < 60) throw Error("Minimum is 1 minute."); await DB.updateProfile(me.uid, { pomoRest: s2 / 60 }); toast("Pomodoro saved! 🍅"); } }), 0);
    } });
  $("#rm").onclick = () => { calm = !calm; ls("motion", calm ? "off" : "on"); applyMotion(); $("#rm").textContent = `🍃 reduce motion: ${calm ? "on" : "off"}`; toast(calm ? "Motion reduced 🍃" : "Motion back on ✨"); };
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
    else if (a === "fold") { if (foldSet.has(id)) foldSet.delete(id); else foldSet.add(id); ls("fold", JSON.stringify([...foldSet])); render(); }
    else if (a === "compact") { compact = id === "1"; ls("compact", compact ? "1" : "0"); render(); }
    else if (a === "install") { installEvt.prompt(); installEvt = null; render(); }
    else if (a === "study") { playSound(sound); await DB.startStudy(me.uid, pomo, focusOf(mine)); toast("Good luck! 🍀"); }
    else if (a === "pause") { stopSound(); await DB.pauseStudy(me.uid, elapsed(mine)); }
    else if (a === "resume") { playSound(sound); await DB.resumeStudy(me.uid); }
    else if (a === "pomo") { pomo = !pomo; ls("pomo", pomo ? "1" : "0"); render(); }
    else if (a === "cheer") { if (Date.now() - lastCheer < 3000) return toast("Slow down, cutie 😄"); lastCheer = Date.now(); await DB.cheer(id, me.uid, mine.name, b.dataset.e); toast("Cheer sent " + b.dataset.e); }
    else if (a === "sound") { const order = ["off", ...Object.keys(SOUNDS)]; if (sound !== "off" && !sNodes) playSound(sound); else { sound = order[(order.indexOf(sound) + 1) % order.length]; ls("sound", sound); playSound(sound); } render(); }
    else if (a === "stickers") stickerSheet(id, mine);
    else if (a === "gpet") gardenTap(id);
    else if (a === "gchoose") gardenSheet(mine);
    else if (a === "gshop") shopSheet(mine);
    else if (a === "gedit") enterEdit(mine);
    else if (a === "gdone") await exitEdit(true);
    else if (a === "gcancel") await exitEdit(false);
    else if (a === "gdel") delSel();
    else if (a === "gwx") cycleWx();
    else if (a === "gtreat") await treat(id, mine);
    else if (a === "gvis") await collectVisitor(mine);
    else if (a === "gfind") findPet();
    else if (a === "card") cardSheet(["together", "recap"].includes(id) ? id : "me");
    else if (a === "gift") giftSheet(id);
    else if (a === "calnav") { calMonth = Math.min(0, calMonth + +id); render(); }
    else if (a === "day") { const v = +b.dataset.v; toast(`${new Date(id + "T12:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${v ? fmt(v) : "no study 💤"}`); }
    else if (a === "discard") { if (confirm("Cancel without saving any time?")) { stopSound(); await DB.cancelStudy(me.uid); } }
    else if (a === "profile") profileSheet(mine);
    else if (a === "stop") {
      stopSound();
      const start = mine.startedAt ? mine.startedAt.toMillis() : Date.now(), sec = Math.floor(elapsed(mine) / 1000);
      if (sec < 60) { await DB.cancelStudy(me.uid); toast("Under a minute, so nothing was saved."); }
      else { await DB.addSession(me.uid, start, split(start, sec), sec, true); toast("Saved! 🌟"); }
    } else if (a === "add") {
      sheet({ title: "add study time", note: "Studied without pressing the button? Add it here.", date: key(Date.now()),
        onSave: async (sec, d) => { if (!sec) throw Error("Enter some time first."); const [y, m, dd] = d.split("-").map(Number), st = new Date(y, m - 1, dd, 12).getTime();
          await DB.addSession(me.uid, st, split(st, sec), sec, false, true); toast("Added! ✨"); } });
    } else if (a === "edit") {
      const s = sessions.find(x => x.id === id), st = s.start.toMillis();
      sheet({ title: "shorten session ✏️", note: "You can only reduce this session. To add more time, use “+ add time”.", secs: s.seconds, max: s.seconds,
        onSave: async sec => { if (sec < 60) throw Error("Use the 🗑️ button to remove a session."); sec = Math.min(sec, s.seconds); await DB.editSession(me.uid, s, split(st, sec), sec); toast("Updated! ✨"); } });
    } else if (a === "del") { if (confirm("Delete this session?")) await DB.deleteSession(me.uid, sessions.find(x => x.id === id)); }
  } catch (err) { toast(errMsg(err)); }
};

// ---------- boot ----------
DB.watchAuth(u => {
  unsubs.forEach(f => f()); unsubs = []; me = u; users = []; sessions = []; gifts = []; giftKnown.clear(); clearGarden(); seedBase = -1; visits = [];
  if (u) unsubs = [DB.watchUsers(x => { users = x; render(); }), DB.watchSessions(u.uid, x => { sessions = x; render(); }),
    DB.watchCheers(u.uid, list => {
      cheerCard(list); list.forEach(c => queueVisit(c.from)); burst(list.map(c => short(c.emoji) ? c.emoji : "💌"), 24);
      notify(`${list[0].name || "Your friend"} sent you a cheer!`, list.map(c => c.emoji).join("  "));
    }), DB.watchGifts(u.uid, onGifts)];
  render();
});
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; render(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
