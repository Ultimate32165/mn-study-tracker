// Seeds + decorations: ITEMS / ART, seed maths (seedsLeft), the garden side panel, decorate mode, shop, dragging items.
import * as DB from "./db.js";
import { forestCost } from "./forest.js";
import { camTo } from "./garden.js";
import { G, GY, POND, WH, WXL, fromClassicY, inPond, rnd } from "./garden-state.js";
import { coupleCard, me, totalOf, users } from "./state.js";
import { $, errMsg, modal, toast } from "./util.js";

// ---- seeds + decoration shop: study time earns seeds, seeds buy things you drag into the garden (saved in users/{uid}.decor) ----
// flat = lies on the ground (pets walk over it), water = only goes on the pond. Order here = order in the shop.
// c = shop section (CATS). New item = an entry here + an ART drawing + CSS in style.css + a drawItem branch in card.js (+ the FLAT list there if it lies flat).
const CATS = [["cozy", "🛋️ cozy corner"], ["nature", "🌿 nature"], ["magic", "✨ magical"], ["pets", "🐾 pet corner"]];
const ITEMS = { lily: { n: "lily pads", price: 20, flat: true, water: true, c: "nature" }, bench: { n: "bench", price: 25, c: "cozy" }, bed: { n: "flower bed", price: 30, flat: true, c: "nature" }, lantern: { n: "lantern", price: 40, c: "magic" },
  blanket: { n: "picnic blanket", price: 45, flat: true, c: "cozy" }, fairy: { n: "fairy lights", price: 60, c: "magic" }, swing: { n: "swing", price: 80, c: "cozy" }, fountain: { n: "fountain", price: 120, c: "nature" }, house: { n: "tiny house", price: 150, c: "cozy" },
  campfire: { n: "campfire", price: 50, c: "cozy" }, tent: { n: "tent", price: 70, c: "cozy" }, rug: { n: "cosy rug", price: 35, flat: true, c: "cozy" }, ctable: { n: "cafe table", price: 55, c: "cozy" },
  cherry: { n: "cherry tree", price: 90, c: "nature" }, windmill: { n: "windmill", price: 110, c: "nature" }, bridge: { n: "little bridge", price: 60, flat: true, water: true, c: "nature" }, mush: { n: "mushrooms", price: 25, c: "nature" },
  arch: { n: "rainbow arch", price: 100, c: "magic" }, crystal: { n: "crystals", price: 90, c: "magic" }, flant: { n: "floating lanterns", price: 70, c: "magic" }, statue: { n: "fairy statue", price: 110, c: "magic" },
  pbed: { n: "pet bed", price: 30, flat: true, c: "pets" }, toys: { n: "pet toys", price: 20, flat: true, c: "pets" }, bowl: { n: "food bowl", price: 15, flat: true, c: "pets" }, phouse: { n: "pet house", price: 60, c: "pets" } };
const SEED_SEC = 300, MAX_DECOR = 20; // 1 seed per 5 minutes studied, up to 20 things per person
const ART = { // little CSS-drawn items (so they follow every theme); the lantern and the house are emoji
  bench: `<div class="bench"><i class="bk"></i><i class="st"></i><i class="lg"></i><i class="lg r"></i></div>`,
  lantern: `<div class="lant"><i class="gl"></i><i class="pl"></i><em>🏮</em></div>`,
  swing: `<div class="swing"><i class="fr"></i><i class="fr r"></i><i class="tp"></i><div class="sw"><i class="rp"></i><i class="rp r"></i><i class="sd"></i></div></div>`,
  house: `<div class="tiny">🏡</div>`,
  bed: `<div class="fbed"><i class="soil"></i><em>🌷🌼🌸</em></div>`,
  blanket: `<div class="blank"><i class="bl"></i><em>🧺</em><u>🍓</u></div>`,
  fairy: `<div class="fairy"><i class="fp"></i><i class="fp r"></i><i class="fs"></i>${[0, 1, 2, 3, 4, 5, 6].map(i => `<b style="left:${8 + i * 16}px;top:${(5 + 20 * (1 - ((i - 3) / 3) ** 2)).toFixed(0)}px;--c:${["#ff9ccb", "#ffd36f", "#9be37f", "#7fd0ff", "#b79cf5"][i % 5]}"></b>`).join("")}</div>`,
  lily: `<div class="lily"><i class="lp a"></i><i class="lp b"></i><i class="lp c"></i><em>🌸</em></div>`,
  fountain: `<div class="fount"><i class="fb"></i><i class="fw"></i><i class="fc"></i><i class="d d1"></i><i class="d d2"></i><i class="d d3"></i></div>`,
  campfire: `<div class="camp"><i class="gl"></i><i class="l1"></i><i class="l2"></i><em>🔥</em></div>`,
  tent: `<div class="tiny">⛺</div>`,
  rug: `<div class="rug"><i></i></div>`,
  ctable: `<div class="ctab"><em>☕🍰</em><i class="tp"></i><i class="lg"></i><i class="ft"></i></div>`,
  cherry: `<div class="chy"><i class="tr"></i><i class="bl a"></i><i class="bl b"></i><i class="bl c"></i><em>🌸</em><em class="e2">🌸</em></div>`,
  windmill: `<div class="wmill"><i class="bd"></i><i class="rf"></i><div class="bs"><b></b><b></b></div><i class="hb"></i></div>`,
  bridge: `<div class="brg"><i class="rl"></i><i class="pl"></i></div>`,
  mush: `<div class="mush">🍄🍄</div>`,
  arch: `<div class="rbow"></div>`,
  crystal: `<div class="cry"><i class="c1"></i><i class="c2"></i><i class="c3"></i></div>`,
  flant: `<div class="flant"><em class="a">🏮</em><em class="b">🏮</em><em class="c">🏮</em></div>`,
  statue: `<div class="stat"><i class="pd"></i><em>🧚</em></div>`,
  pbed: `<div class="pbed"><i class="rim"></i><i class="cs"></i><em>🐾</em></div>`,
  toys: `<div class="toys"><u>🎾</u><u>🧸</u><u>🦴</u></div>`,
  bowl: `<div class="bowl"><em>🍖</em><i class="bw"></i></div>`,
  phouse: `<div class="phouse"><i class="rf"></i><i class="bd"></i><i class="dr"></i><em>🐾</em></div>`
};
// seeds = study time + visitor bonuses (u.bonus) - treats given (u.treats); spent decoration is subtracted in seedsLeft
const seedsEarned = u => Math.floor(totalOf(u) / SEED_SEC) + (u.bonus || 0) - (u.treats || 0);
// saved positions are fractions of the world. v:1 = the very first 340x408 scene, v:2 = the old 980x680 garden, v:3 = today's big garden (3x wider and deeper, see garden-state.js).
// Older items are carried over with the same relative spot (so they spread out with the bigger garden and water items stay on the pond).
const upgradeD = d => { if (d.v === 3) return d; const c = d.v === 2 ? d : { x: (d.x * 340 + 225) / 980, y: (d.y * 408 + 198) / 680 }; return { ...d, v: 3, x: c.x, y: fromClassicY(c.y) }; };
const decorOf = u => (Array.isArray(u.decor) ? u.decor : []).filter(d => d && ITEMS[d.i] && typeof d.k === "string" && Number.isFinite(d.x) && Number.isFinite(d.y)).slice(0, MAX_DECOR).map(upgradeD);
const decorNow = u => G.edit && G.work && u.id === me?.uid ? G.work : decorOf(u); // while decorating, your own list is the unsaved working copy
const seedsLeft = u => Math.max(0, seedsEarned(u) - decorNow(u).reduce((a, d) => a + ITEMS[d.i].price, 0) - forestCost(u)); // spent seeds (decorations + trees) are simply the price of everything placed
const CY0 = GY(258) / WH, CY1 = GY(646) / WH, clampX = x => Math.min(.96, Math.max(.04, x)), clampY = y => Math.min(CY1, Math.max(CY0, y)); // how far back / forward you may place things
const okSpot = (id, x, y) => ITEMS[id].water ? inPond(x, y) : !inPond(x, y - .02); // lily pads only on the pond, everything else on the grass
let seedBase = -1;
const resetSeedBase = () => { seedBase = -1; };
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
  <div class="gbtns"><button class="btn" data-act="gshop">🛍️ shop</button><button class="btn ghost" data-act="gedit">🪴 decorate</button></div>
  <div class="gtools"><button data-act="gland"><i>🎨</i>style</button><button data-act="gchoose"><i>🐾</i>pets</button><button data-act="card" data-id="garden"><i>📸</i>photocard</button></div>
  <p class="hint">drag to look around · pinch or ＋ － to zoom · tap pets and visitors 💗🦋</p>${coupleCard()}`;
}
function enterEdit(m) {
  G.edit = true; G.work = decorOf(m).map(d => ({ ...d })); G.sel = null;
  if (G.el) G.el.classList.add("editing"); if (G.card) G.card.hidden = true;
  syncItems(); refreshPanel();
}
async function exitEdit(save) {
  if (save) {
    try { await DB.saveDecor(me.uid, G.work.map(d => ({ i: d.i, k: d.k, v: 3, x: +d.x.toFixed(3), y: +d.y.toFixed(3) }))); toast("Garden decorated 🏡"); }
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
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>decoration shop 🛍️</h3><div class="seedbar">🌱 <b>${left}</b> seeds to spend</div><p class="hint">1 seed for every 5 minutes you study, plus garden visitors.</p>
  ${CATS.map(([c, cn]) => `<h4 class="shopcat">${cn}</h4><div class="shopg">${Object.keys(ITEMS).filter(id => ITEMS[id].c === c).map(id => { const x = ITEMS[id]; return `<button class="${left >= x.price ? "" : "lock"}" data-buy="${id}"><div class="shopthumb">${ART[id]}</div><b>${x.n}</b><small>🌱 ${x.price}</small></button>`; }).join("")}</div>`).join("")}
  <button class="link" id="sx">close</button></div></div>`;
  $("#sx").onclick = () => modal.innerHTML = "";
  modal.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const id = b.dataset.buy, x = ITEMS[id], have = seedsLeft(mine);
    if (decorNow(mine).length >= MAX_DECOR) return toast(`Your garden is full (${MAX_DECOR} things) 🌳`);
    if (have < x.price) return toast(`${x.price - have} more 🌱 needed — keep studying!`);
    if (!G.edit) enterEdit(mine);
    let sx = (G.cam.x + G.vw / 2 / G.z + rnd(-30, 30)) / G.W, sy = (G.cam.y + G.vh * .62 / G.z + rnd(-20, 20)) / G.H; // the middle of what you are looking at
    if (x.water) { sx = (POND.x + rnd(-30, 30)) / G.W; sy = (POND.y + rnd(-12, 12)) / G.H; camTo(POND.x, POND.y); }
    else { sx = clampX(sx); sy = clampY(sy); for (let i = 0; i < 12 && !okSpot(id, sx, sy); i++) sy = clampY(sy + .03); }
    const d = { i: id, k: Math.random().toString(36).slice(2, 8), v: 3, x: +sx.toFixed(3), y: +sy.toFixed(3) };
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
  const r = G.el.getBoundingClientRect(), d = g.o.it, nx = clampX(((g.px - r.left) / G.z + G.cam.x) / G.W - g.gx), ny = clampY(((g.py - r.top) / G.z + G.cam.y) / G.H - g.gy); // screen px -> world px: divide by the zoom
  if (Math.hypot(nx - d.x, ny - d.y) > .003) g.moved = true;
  if (!okSpot(d.i, nx, ny)) return; // keep things on the grass (lily pads: on the pond)
  if (nx !== d.x || ny !== d.y) { d.x = nx; d.y = ny; syncItems(); }
}
function itemDown(e, o) { // drag-to-place
  if (!G.edit || o.uid !== me?.uid || !G.el) return;
  e.preventDefault(); e.stopPropagation();
  const r = G.el.getBoundingClientRect(), d = o.it, wasSel = G.sel === d.k;
  G.drag = { o, wasSel, moved: false, px: e.clientX, py: e.clientY, gx: ((e.clientX - r.left) / G.z + G.cam.x) / G.W - d.x, gy: ((e.clientY - r.top) / G.z + G.cam.y) / G.H - d.y };
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

export { checkSeeds, decorOf, delSel, dragApply, enterEdit, exitEdit, gardenPanel, refreshPanel, resetSeedBase, seedsLeft, shopSheet, syncItems };
