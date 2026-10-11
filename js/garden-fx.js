// Garden extras: weather, floating hearts, cheer visits, study-buddy / nap pairs, garden visitors you tap for seeds.
import * as DB from "./db.js";
import { refreshPanel } from "./decor.js";
import { camTo, restoreBub } from "./garden.js";
import { BOUNDS, G, RM, VIS_DAY, WXL, nowS, pickWx, rnd } from "./garden-state.js";
import { petOf } from "./pets.js";
import { me, users } from "./state.js";
import { burst, errMsg, ls, toast } from "./util.js";

let visits = [];
const resetVisits = () => { visits = []; };
// ---- weather: pure CSS + a few particles, picked at random ----
function buildWx(w) {
  const f = (n, fn) => [...Array(n)].map((_, i) => fn(i)).join(""), L = (a = 0, b = 100) => rnd(a, b).toFixed(1), D = () => (-rnd(0, 10)).toFixed(2);
  let h = "";
  if (w === "snow") h = f(90, () => { const z = rnd(3, 7).toFixed(1); return `<i style="left:${L()}%;width:${z}px;height:${z}px;--dx:${rnd(-30, 30).toFixed(0)}px;animation-delay:${(-rnd(0, 16)).toFixed(2)}s;animation-duration:${rnd(10, 18).toFixed(1)}s"></i>`; });
  else if (w === "rain") h = f(130, () => `<i style="left:${L(-18)}%;height:${rnd(12, 20).toFixed(0)}px;animation-delay:${D()}s;animation-duration:${rnd(.9, 1.5).toFixed(2)}s"></i>`);
  else if (w === "petals" || w === "leaves") { const E = w === "petals" ? ["🌸", "🌸", "💮", "🌷"] : ["🍂", "🍁", "🍂"]; h = f(50, i => `<i style="left:${L()}%;font-size:${rnd(11, 18).toFixed(0)}px;--dx:${rnd(-70, 70).toFixed(0)}px;--r:${rnd(-540, 540).toFixed(0)}deg;animation-delay:${(-rnd(0, 22)).toFixed(2)}s;animation-duration:${rnd(12, 22).toFixed(1)}s">${E[i % E.length]}</i>`); }
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

// ---- garden visitors: a butterfly, bird, hedgehog, frog, bunny, duck or (rare) deer drops by now and then; tap it for a seed ----
const VIS = [["🦋", "butterfly", 60, 5], ["🐦", "bird", 42, 4], ["🦔", "hedgehog", 16, 2], ["🐸", "frog", 34, 3], ["🐰", "bunny", 46, 3], ["🦆", "duck", 30, 3], ["🦌", "deer", 38, 1]]; // [emoji, name, speed px/s, how often]
const pickVis = () => { let r = Math.random() * VIS.reduce((a, k) => a + k[3], 0); for (const k of VIS) { r -= k[3]; if (r <= 0) return k; } return VIS[0]; };
const visKey = () => "vis-" + new Date().toDateString().replace(/ /g, "-");
function syncVisitor() {
  const v = G.vis, t = nowS();
  if (v && (t > v.until || !G.el.isConnected)) { v.el.remove(); G.vis = null; }
  if (G.vis || document.hidden || G.edit || !G.el.isConnected || !G.layer) return;
  if (!G.visAt) G.visAt = t + rnd(25, 50);
  if (t < G.visAt || (+ls(visKey()) || 0) >= VIS_DAY) return;
  G.visAt = t + rnd(50, 110);
  const k = pickVis(), el = document.createElement("div"); el.className = "gvis"; el.dataset.act = "gvis"; el.innerHTML = `<span>${k[0]}</span>`;
  const x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, (G.cam.x + rnd(.2, .8) * G.vw) / G.W)), y = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0 + .05, (G.cam.y + rnd(.45, .85) * G.vh) / G.H));
  G.vis = { el, x, y, tx: x, ty: y, sp: k[2], kind: k[1], until: t + 28, nt: 0, ph: rnd(0, 6), fs: 1, face: 1 }; G.layer.appendChild(el);
}
function visStep(t, dt) {
  const v = G.vis; if (!v) return;
  if (t >= v.nt) { const far = v.kind === "butterfly" ? 130 : v.kind === "bird" ? 70 : v.kind === "hedgehog" ? 60 : 90; v.tx = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, v.x + rnd(-far, far) / G.W)); v.ty = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, v.y + rnd(-far * .5, far * .5) / G.H)); v.nt = t + rnd(1.4, 3.2); }
  const dx = (v.tx - v.x) * G.W, dy = (v.ty - v.y) * G.H, d = Math.hypot(dx, dy), step = v.sp * dt, moving = d > 2 && !RM.matches;
  if (moving) { const k = Math.min(1, step / d); v.x += (v.tx - v.x) * k; v.y += (v.ty - v.y) * k; if (Math.abs(dx) > 1) v.face = dx > 0 ? -1 : 1; }
  v.fs += (v.face - v.fs) * Math.min(1, dt * 12);
  const bob = RM.matches ? 0 : v.kind === "butterfly" ? Math.sin(t * 6 + v.ph) * 9 + 14 : v.kind === "bird" ? (moving ? Math.abs(Math.sin(t * 10)) * 7 : 0) : v.kind === "frog" || v.kind === "bunny" ? (moving ? Math.abs(Math.sin(t * 8)) * 11 : 0) : v.kind === "deer" ? (moving ? Math.abs(Math.sin(t * 6)) * 4 : 0) : (moving ? Math.sin(t * 9) * 2 : 0); // hedgehog + duck: little waddle
  v.el.style.transform = `translate(${(v.x * G.W).toFixed(1)}px,${(v.y * G.H).toFixed(1)}px)`; v.el.style.zIndex = 20 + Math.round(v.y * G.H);
  v.el.firstChild.style.transform = `translateY(${(-bob).toFixed(1)}px) scaleX(${v.fs.toFixed(2)})`;
  v.el.classList.toggle("leave", v.until - t < 2.5);
}
async function collectVisitor(m) {
  const v = G.vis; if (!v) return; G.vis = null; v.el.classList.add("got"); setTimeout(() => v.el.remove(), 450);
  const n = v.kind === "deer" || Math.random() < .2 ? 2 : 1; // a shy deer always leaves 2 seeds ls(visKey(), (+ls(visKey()) || 0) + 1);
  spawnHeart(v.x * G.W, v.y * G.H - 40, `+${n}🌱`); burst(["🌱", "✨"], 14);
  try { await DB.addBonus(m.id, n); } catch (e) { toast(errMsg(e)); }
}

export { collectVisitor, cycleWx, mainPet, queueVisit, resetVisits, runVisits, spawnHeart, syncBuddies, syncVisitor, syncWeather, visStep };
