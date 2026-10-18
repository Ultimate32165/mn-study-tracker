// Tiny helpers with no dependencies: DOM refs, escaping, time formatting, localStorage, toast, confetti, notifications, collapsible sections.

const $ = s => document.querySelector(s), app = $("#app"), modal = $("#modal");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMOJI = ["🐰", "🐻", "🐱", "🦊", "🐼", "🐨", "🦄", "🐥", "🍓", "🌸", "🍒", "⭐"];
const DAY = 864e5;
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch {} };
// ---------- helpers ----------
const key = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmt = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const clock = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":"); };
function split(start, sec) { // split a session across midnight into per-day seconds
  const days = {}; let t = start; const end = start + sec * 1000;
  while (t < end) { const n = new Date(t); n.setHours(24, 0, 0, 0); const e = Math.min(n.getTime(), end), k = key(t); days[k] = (days[k] || 0) + Math.round((e - t) / 1000); t = e; }
  return days;
}
const NO_DAYS = {}, statsMemo = new WeakMap(); // stats() is called many times a second: remember the answer per daily-totals object and day
function stats(u) {
  const d = u.daily || NO_DAYS, now = Date.now(), today = key(now), c = statsMemo.get(d); if (c && c.k === today) return c.v;
  let total = 0, week = 0, streak = 0;
  for (const k in d) total += d[k];
  for (let i = 0; i < 7; i++) week += d[key(now - i * DAY)] || 0;
  let i = d[today] > 0 ? 0 : 1; while (d[key(now - i * DAY)] > 0) { streak++; i++; }
  const v = { today: d[today] || 0, week, total, streak }; statsMemo.set(d, { k: today, v }); return v;
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.className = "show"; clearTimeout(toast.t); toast.t = setTimeout(() => t.className = "", 2600); }
const errMsg = e => ({ "auth/email-already-in-use": "That username is taken.", "auth/invalid-credential": "Wrong username or password.", "auth/weak-password": "Password needs at least 6 characters.", "auth/network-request-failed": "No internet connection.", "permission-denied": "Not allowed. Did you publish the new firestore.rules?" }[e.code] || e.message);
const foldSet = (() => { try { return new Set(JSON.parse(ls("fold") || "[]")); } catch { return new Set(); } })();
const sec = (id, title, extra, body) => { const shut = foldSet.has(id); return `<h2 class="fold${shut ? " shut" : ""}"><button class="fbtn" data-act="fold" data-id="${id}" aria-expanded="${!shut}"><i>▾</i>${title}</button>${extra || ""}</h2>${shut ? "" : body}`; };
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

export { $, DAY, EMOJI, app, burst, clock, errMsg, esc, fmt, foldSet, key, ls, modal, notify, sec, split, stats, toast };
