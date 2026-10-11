// The living garden scene: building it, the camera (drag to look around), pets walking/animating, garden loop, treats, tap card, 'garden friends' sheet.
import * as DB from "./db.js";
import { dragApply, gardenPanel, seedsLeft, syncItems } from "./decor.js";
import { mainPet, runVisits, spawnHeart, syncBuddies, syncVisitor, syncWeather, visStep } from "./garden-fx.js";
import { BASE, BOUNDS, BUB, FACE_RIGHT, G, MOVE, RM, SAY, TREAT, inPond, isEvening, moodOf, nowS, rnd, seeded } from "./garden-state.js";
import { syncLand } from "./land.js";
import { ALLP, EXTRA, MAX_FRIENDS, STAGE, accOf, nickOf, petName, petOf, stageNames, stageOf } from "./pets.js";
import { couple, me, totalOf, users } from "./state.js";
import { $, errMsg, esc, fmt, modal, toast } from "./util.js";

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
  <div class="ghill h1"></div><div class="gfence f-cute"></div><div class="ghill h2"></div><svg class="gpath" viewBox="0 0 980 680" aria-hidden="true"></svg><div class="gpond"></div><div class="gborder"></div><div class="gdeco"></div><div class="gpets"></div><div class="gfly"></div>
  <div class="gff">${[...Array(28)].map(() => `<i style="left:${rnd(4, 96).toFixed(1)}%;top:${rnd(36, 96).toFixed(1)}%;animation-delay:${(-rnd(0, 6)).toFixed(1)}s;animation-duration:${rnd(4, 8).toFixed(1)}s"></i>`).join("")}</div>
  <div class="gwx"></div><div class="gfx"></div></div><div class="gcard" hidden></div><button class="gfind" data-act="gfind" aria-label="find my pets">📍</button>`;
  G.el = el; G.world = el.querySelector(".gworld"); G.deco = el.querySelector(".gdeco"); G.layer = el.querySelector(".gpets"); G.fly = el.querySelector(".gfly"); G.fx = el.querySelector(".gfx");
  G.card = el.querySelector(".gcard"); G.wxEl = el.querySelector(".gwx");
  G.card.onclick = () => { G.card.hidden = true; };
  G.ro = new ResizeObserver(() => { G.vw = el.clientWidth || G.vw; G.vh = el.clientHeight || G.vh; el.style.setProperty("--gh", G.vh + "px"); }); G.ro.observe(el);
  el.addEventListener("pointerdown", panDown); el.addEventListener("pointermove", panMove); el.addEventListener("pointerup", panUp); el.addEventListener("pointercancel", panUp);
  G.decoLv = -1; G.night = null; G.wx = ""; G.landSig = ""; G.items.clear();
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
function gardenList() { // everyone's main pet, then the extra friends they picked (max 5 each), capped at 12 in total
  const base = [], extra = [];
  users.slice().sort((a, b) => a.id < b.id ? -1 : 1).forEach(u => {
    base.push({ key: `${u.id}:${petOf(u)}`, u, type: petOf(u) });
    [...new Set(Array.isArray(u.garden) ? u.garden : [])].filter(id => EXTRA[id] && EXTRA[id].ok(u)).slice(0, MAX_FRIENDS).forEach(id => extra.push({ key: `${u.id}:${id}`, u, type: id }));
  });
  return [...base, ...extra].slice(0, 12);
}
function mkPet(key, u, type) {
  const el = document.createElement("div"); el.className = "gp"; el.dataset.act = "gpet"; el.dataset.id = key;
  el.innerHTML = `<i class="gsh"></i><span class="gpe"></span><i class="gbub"></i><b class="gpn"></b>`;
  const p = { key, uid: u.id, type, el, sh: el.children[0], e: el.children[1], bub: el.children[2], nm: el.children[3], x: 0, y: 0, tx: 0, ty: 0, mode: "rest", until: nowS() + rnd(.4, 2.5),
    fs: 1, face: 1, ph: Math.random() * 6, hp: 0, jump: -9, heartAt: 0, ht: 0, sig: "", mood: "", st: 0, ta: "", tb: "", ov: null, emo: "", hx: rnd(.2, .65), hy: rnd(.6, .9), spin: -9, yawn: -9, wave: -9, sit: 0, nb: false, nt: 0 };
  const s = pickSpot(p); p.x = p.tx = s[0]; p.y = p.ty = s[1];
  el.style.transform = `translate(${(p.x * G.W).toFixed(1)}px,${(p.y * G.H).toFixed(1)}px)`; el.style.zIndex = 10 + Math.round(p.y * G.H);
  G.pets.set(key, p); G.layer.appendChild(el); return p;
}
function removePet(p) { clearTimeout(p.ht); p.el.remove(); }
function clearGarden() { if (G.vis) { G.vis.el.remove(); G.vis = null; } G.camInit = false; G.pets.forEach(removePet); G.pets.clear(); G.items.forEach(o => o.el.remove()); G.items.clear(); G.edit = false; G.work = null; G.sel = null; if (G.el) G.el.classList.remove("editing"); }
function setPet(p, u, type) { // refresh look + mood from the owner's live data (only touches the DOM when something changed)
  const st = stageOf(totalOf(u)), mood = moodOf(u), nk = nickOf(u, type), sig = `${type}|${st}|${mood}|${u.name}|${nk}`;
  if (sig === p.sig) return; const evolved = !!p.sig && p.st !== st; p.sig = sig; p.type = type; p.st = st;
  p.emo = ALLP[type].e[st]; const acc = accOf(type, st);
  p.e.innerHTML = `${p.emo}${acc ? `<i class="gacc">${acc}</i>` : ""}<i class="gscf">🧣</i>`; p.e.className = "gpe s" + st; p.el.dataset.st = st; p.nm.textContent = nk || u.name || ""; // the name tag shows the pet's nickname if it has one
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
  syncLand(); syncItems(); syncBuddies(); syncWeather(); runVisits(); syncVisitor();
}
function restoreBub(p) { p.bub.className = "gbub " + p.mood + (p.mood === "calm" ? "" : " on"); p.bub.textContent = p.mood === "calm" ? "" : BUB[p.mood]; }
function endVisit(p, t) { // a cheer visit is over: guest wanders off again, host is free to move
  const o = p.ov, h = o && G.pets.get(o.host);
  if (h && h.ov && h.ov.kind === "host") { h.ov = null; h.mode = "rest"; h.until = t + rnd(.8, 2); }
  p.ov = null; p.mode = "rest"; p.until = t + rnd(1, 2.5);
}
function stepPet(p, t, dt, still) { // one animation frame for one pet
  const mv = MOVE[p.type] || [1, 5], o = p.ov, mood = o && o.kind === "visit" ? "calm" : p.mood, moving = !still && !o && !(p.sit > t) && p.st > 0 && mood !== "break" && mood !== "sleep";
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
    else if (mood === "break" || p.sit > t) { sy = .9 + br * .015; sx = 1.05; }         // sitting (break time, or the "sit" trick)
    else if (!walking && !lift) { sy = 1 + br * .03; sx = 1 - br * .02; }
    const jt = t - p.jump; if (jt >= 0 && jt < .55) { const k = Math.sin(Math.PI * jt / .55); lift += k * 30; sy *= 1 + k * .08; } // tap jump
    const sp = (t - p.spin) / .9; if (sp >= 0 && sp < 1) { rot += 360 * (1 - (1 - sp) ** 2); lift += Math.sin(Math.PI * sp) * 30; }  // treat: happy spin
    const wv = (t - p.wave) / 1.8; if (wv >= 0 && wv < 1) rot += Math.sin(wv * Math.PI * 8) * 15 * (1 - wv * .6); // trick: wave (happy wiggle)
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
// ---- treats (feed your pet: costs a seed, happy spin) ----
async function treat(key, m) {
  const p = G.pets.get(key); if (!p || p.uid !== m.id) return;
  if (seedsLeft(m) < TREAT) return toast(`A treat costs ${TREAT} 🌱 — keep studying!`);
  try { await DB.giveTreat(m.id); } catch (e) { return toast(errMsg(e)); }
  p.spin = nowS(); p.bub.textContent = "😋"; p.bub.classList.add("on"); clearTimeout(p.ht); p.ht = setTimeout(() => restoreBub(p), 3000);
  spawnHeart(p.x * G.W, p.y * G.H - 62, "🍪"); setTimeout(() => spawnHeart(p.x * G.W + 14, p.y * G.H - 52, "💗"), 250);
  G.card.hidden = true;
}

const gardenMain = () => `<h2>our garden</h2><div id="gslot"></div><div id="gpanel">${gardenPanel()}</div>`;
function gardenTap(key) {
  const p = G.pets.get(key), u = p && users.find(x => x.id === p.uid); if (!u) return;
  if (performance.now() - G.noClick < 300) return; // that was the end of a drag, not a tap
  const tot = totalOf(u), st = stageOf(tot), mood = moodOf(u), own = u.id === me?.uid;
  p.jump = nowS();
  spawnHeart(p.x * G.W, p.y * G.H - 62);
  const nk = nickOf(u, p.type), kind = esc(petName(p.type)), k = esc(key), tb = (n, e, l) => `<button data-act="gtrick" data-id="${k}" data-k="${n}">${e} ${l}</button>`;
  G.card.innerHTML = `<b>${ALLP[p.type].e[st]}${accOf(p.type, st)} ${nk ? esc(nk) : `${esc(u.name)}'s ${kind}`}</b><small>${nk ? `${esc(u.name)}'s ${kind} · ` : ""}${stageNames(p.type)[st]} · ${st < 3 ? `${fmt(STAGE[st] - tot)} to grow` : "fully grown 👑"}</small><em>${SAY[mood]}</em>
  <div class="gtricks">${tb("sit", "🪑", "sit")}${tb("spin", "🌀", "spin")}${tb("wave", "👋", "wave")}${own ? `<button data-act="gname" data-id="${k}">✏️ name</button>` : ""}</div>${own ? `<button class="gtreat" data-act="gtreat" data-id="${k}">🍪 give a treat · ${TREAT} 🌱</button>` : ""}`;
  G.card.hidden = true; void G.card.offsetWidth; G.card.hidden = false;
  clearTimeout(G.cardT); G.cardT = setTimeout(() => { G.card.hidden = true; }, own ? 8000 : 6000);
}
function trick(key, kind) { // tap-a-pet tricks (a little show only you see): sit, spin, wave
  const p = G.pets.get(key); if (!p) return; G.card.hidden = true;
  if (p.st < 1) return toast("Eggs can't do tricks yet 🥚");
  if (p.ov) return toast("Busy with a friend right now 💞");
  const t = nowS();
  if (kind === "spin") p.spin = t;
  else if (kind === "wave") { p.wave = t; setTimeout(() => spawnHeart(p.x * G.W + 16, p.y * G.H - 70, "👋"), 700); }
  else p.sit = t + 5;
  spawnHeart(p.x * G.W, p.y * G.H - 62, kind === "sit" ? "🪑" : kind === "spin" ? "🌀" : "👋");
}
function nameSheet(key, m) { // give your pet a nickname (saved per pet type in users/{uid}.nicks)
  const p = G.pets.get(key); if (!p || p.uid !== m.id) return;
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>name your ${esc(petName(p.type))} ✏️</h3><p class="hint">Give it a nickname everybody will see. Leave it empty to remove the name.</p>
  <input id="nk" maxlength="14" placeholder="e.g. Mochi" value="${esc(nickOf(m, p.type))}" autocomplete="off"><div class="row"><button class="btn ghost" id="sx">cancel</button><button class="btn" id="ns">save 💖</button></div></div></div>`;
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#ns").onclick = async () => {
    const v = $("#nk").value.trim().slice(0, 14);
    try { await DB.saveNick(m.id, p.type, v); modal.innerHTML = ""; toast(v ? `Say hi to ${v}! 💖` : "Nickname removed"); } catch (e) { toast(errMsg(e)); }
  };
  setTimeout(() => { const i = $("#nk"); if (i) i.focus(); }, 60);
}
function gardenSheet(mine) { // "choose my garden pets" modal: locked pets are greyed out with their unlock requirement
  const sel = new Set((Array.isArray(mine.garden) ? mine.garden : []).filter(id => EXTRA[id] && EXTRA[id].ok(mine)).slice(0, MAX_FRIENDS));
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>garden friends 🌳</h3><p class="hint">${ALLP[petOf(mine)].e[2]} always lives in the garden. Pick up to ${MAX_FRIENDS} friends to join it!<br><b id="gn"></b></p>
  <div class="gch">${Object.keys(EXTRA).map(id => { const x = EXTRA[id], ok = x.ok(mine); return `<button class="${ok ? "" : "lock"}" data-g="${id}"><span>${x.e[2]}</span><b>${x.n}</b><small>${ok ? "unlocked ✓" : "🔒 " + x.req}</small></button>`; }).join("")}</div>
  <div class="row"><button class="btn ghost" id="sx">cancel</button><button class="btn" id="gs">save 💖</button></div></div></div>`;
  const paint = () => { $("#gn").textContent = `${sel.size} / ${MAX_FRIENDS} chosen`; modal.querySelectorAll("[data-g]").forEach(b => b.classList.toggle("sel", sel.has(b.dataset.g))); };
  modal.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
    const id = b.dataset.g, x = EXTRA[id];
    if (!x.ok(mine)) return toast("🔒 " + x.req);
    if (sel.has(id)) sel.delete(id); else if (sel.size >= MAX_FRIENDS) return toast(`Max ${MAX_FRIENDS} friends 🐾`); else sel.add(id);
    paint();
  });
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#gs").onclick = async () => { try { await DB.saveGarden(me.uid, [...sel]); modal.innerHTML = ""; toast("Garden updated 🌳"); } catch (e) { toast(errMsg(e)); } };
  paint();
}

export { camTo, clearGarden, findPet, gardenList, gardenMain, gardenSheet, gardenTap, mountGarden, nameSheet, restoreBub, syncGarden, treat, trick };
