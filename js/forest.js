// Isometric study forest. Every tree stores the total study seconds at the moment it was planted (t),
// so each one grows on its own clock: growth = studied now - t. Saved in users/{uid}.forest = [{ s, c, t }].
// js/card.js draws the same trees on photocards, using treeParts() / cellPos() below.
const N = 6, OY = 100, STAGES = ["sprout", "sapling", "young tree", "grown tree", "ancient tree"];
export const GRID = N;
export const SPECIES = { // c = theme colour variable; hrs = study hours (after planting) needed for each stage
  pine:  { n: "pine",       e: "🌲", price: 10, c: "--live", hrs: [0, .5, 2, 5, 10],   w: .85, h: 1.1 },
  bloom: { n: "blossom",    e: "🌸", price: 20, c: "--main", hrs: [0, 1, 3, 7, 14],    w: 1.1, h: .85 },
  dream: { n: "dream tree", e: "✨", price: 35, c: "--alt",  hrs: [0, 1.5, 4, 9, 18],  w: 1,   h: 1 }
};
const LAYERS = [[], [[22, 12]], [[28, 14], [18, 10]], [[36, 16], [26, 14], [14, 10]], [[42, 18], [32, 16], [22, 14], [12, 10]]];
const TRUNK = [null, [8, 10], [10, 14], [10, 18], [12, 22]];
const WOOD = "color-mix(in srgb,var(--soft) 70%,var(--main-d))";
const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
let pop = { c: -1, at: 0 }; // the tile that was just planted (gets a little pop animation)

export const forestOf = u => {
  const seen = new Set();
  return (Array.isArray(u.forest) ? u.forest : []).filter(t => t && SPECIES[t.s] && Number.isInteger(t.c) && t.c >= 0 && t.c < N * N && Number.isFinite(t.t) && !seen.has(t.c) && seen.add(t.c));
};
export const forestCost = u => forestOf(u).reduce((a, t) => a + SPECIES[t.s].price, 0); // spent seeds = price of every planted tree
const grown = (t, total) => Math.max(0, total - t.t);
const stageOf = (t, total) => { let s = 0; SPECIES[t.s].hrs.forEach((h, i) => { if (grown(t, total) >= h * 3600) s = i; }); return s; };
export const forestSnap = (u, total) => forestOf(u).map(t => ({ s: t.s, c: t.c, st: stageOf(t, total) })); // plain data for the photocard

export const cellPos = i => { const r = i / N | 0, c = i % N; return [192 + (c - r) * 32, OY + (c + r) * 16]; }; // [centre x, y of the tile's top face]
export function treeParts(sp, st) { // blocks from the ground up: [width, height, "wood" | "crown"]
  const S = SPECIES[sp]; if (st === 0) return [[9, 8, "crown"]];
  const [tw, th] = TRUNK[st];
  return [[tw, th, "wood"], ...LAYERS[st].map(([w, h]) => [Math.round(w * S.w), Math.round(h * S.h), "crown"])];
}

// one soft isometric block: base diamond centred on (cx,by), w wide, h tall, colour from css var --c
const box = (cx, by, w, h, c) => { const a = w / 2, d = w / 4, t = by - h;
  return `<g style="--c:${c}"><path class="fl" d="M${cx - a} ${by}L${cx} ${by + d}L${cx} ${t + d}L${cx - a} ${t}Z"/><path class="fr" d="M${cx + a} ${by}L${cx} ${by + d}L${cx} ${t + d}L${cx + a} ${t}Z"/><path class="ft" d="M${cx} ${t - d}L${cx + a} ${t}L${cx} ${t + d}L${cx - a} ${t}Z"/></g>`; };

function tree(sp, st, cx, by, swayDelay) { // swayDelay: seconds (undefined = no animation, e.g. thumbnails)
  let y = by, wood = "", crown = "";
  for (const [w, h, k] of treeParts(sp, st)) { const b = box(cx, y, w, h, k === "wood" ? WOOD : `var(${SPECIES[sp].c})`); if (k === "wood") wood += b; else crown += b; y -= h; }
  return `${wood}<g${swayDelay === undefined ? "" : ` class="sway" style="animation-delay:-${swayDelay.toFixed(2)}s"`}>${crown}</g>`;
}
const ground = i => `color-mix(in srgb,var(--live) ${((i % N) + (i / N | 0)) % 2 ? 30 : 38}%,var(--bg2))`;
const thumb = (id, st = 3) => `<svg viewBox="0 0 80 100">${tree(id, st, 40, 94)}</svg>`;

// drifting leaves / petals (in the colours of your trees) and, at night, fireflies. Start phases come from the clock,
// so the animation carries on smoothly when the page re-renders. CSS hides all of it when "motion off" is set.
function fx(ts, night) {
  const now = Date.now() / 1000, R = rng(5), cols = [...new Set(ts.map(t => SPECIES[t.s].c))]; let out = "";
  if (ts.length) for (let i = 0, n = Math.min(10, 3 + ts.length); i < n; i++) {
    const dur = 9 + (i % 5) * 1.5, ph = (now + i * 1.7) % dur;
    out += `<g transform="translate(${24 + R() * 336 | 0} ${8 + R() * 110 | 0})"><path class="lf" d="M0 -3L2.6 0L0 3L-2.6 0Z" style="--c:var(${cols[i % cols.length]});--dx:${40 + R() * 50 | 0}px;--dy:${110 + R() * 70 | 0}px;animation-duration:${dur}s;animation-delay:-${ph.toFixed(2)}s"/></g>`;
  }
  if (night) for (let i = 0; i < 10; i++) {
    const dur = 5 + (i % 4), ph = (now + i * 2.3) % dur;
    out += `<g transform="translate(${30 + R() * 324 | 0} ${70 + R() * 190 | 0})"><circle class="ff" r="2.2" style="animation-duration:${dur}s;animation-delay:-${ph.toFixed(2)}s"/></g>`;
  }
  return `<g class="fx">${out}</g>`;
}

function scene(u, total, night) {
  const ts = forestOf(u), m = new Map(ts.map(t => [t.c, t])), now = Date.now() / 1000; let out = "";
  for (let s = 0; s < 2 * N - 1; s++) for (let r = 0; r < N; r++) { // back to front, so nearer trees cover farther ones
    const c = s - r; if (c < 0 || c >= N) continue;
    const i = r * N + c, [cx, ys] = cellPos(i), t = m.get(i), popping = t && pop.c === i && Date.now() - pop.at < 800;
    out += `<g class="fcell${t ? "" : " e"}" data-act="fcell" data-id="${i}">${box(cx, ys + 10, 64, 10, ground(i))}${t ? `<g class="ftree${popping ? " pop" : ""}">${tree(t.s, stageOf(t, total), cx, ys, (now + i * .9) % 5)}</g>` : ""}</g>`;
  }
  return out + fx(ts, night);
}

export function forestMain(u, left, total, night) {
  const n = forestOf(u).length;
  return `<h2>my forest</h2><div class="forest${night ? " night" : ""}"><svg viewBox="0 0 384 292" role="img" aria-label="isometric forest">${scene(u, total, night)}</svg></div>
  <div class="fpanel"><div class="seedbar">🌱 <b>${left}</b> seeds</div>
  <p class="hint">${n ? `${n} / ${N * N} tiles planted · ` : ""}tap a free tile to plant 🌱 · tap a tree to see how it grows</p></div>`;
}

// x = { u, total, left, modal, toast, err, fmt, save, burst }
export function forestAct(i, x) {
  const ts = forestOf(x.u), t = ts.find(q => q.c === i), q = s => x.modal.querySelector(s), close = () => x.modal.innerHTML = "";
  const keep = ts.map(({ s, c, t }) => ({ s, c, t }));
  const commit = async (list, msg, planted) => {
    try { if (planted) pop = { c: i, at: Date.now() }; await x.save(list); close(); x.toast(msg); if (planted && x.burst) x.burst(["🌱", "✨"], 18); }
    catch (e) { pop = { c: -1, at: 0 }; x.toast(x.err(e)); }
  };
  if (!t) {
    x.modal.innerHTML = `<div class="back"><div class="sheet"><h3>plant a tree 🌱</h3><p class="hint">Each tree grows only while <b>you</b> study, on its own clock, starting now.<br><b>🌱 ${x.left} seeds</b> to spend</p>
    <div class="shopg">${Object.entries(SPECIES).map(([id, s]) => `<button class="${x.left >= s.price ? "" : "lock"}" data-sp="${id}"><div class="fsp">${thumb(id)}</div><b>${s.n}</b><small>🌱 ${s.price} · full in ${s.hrs[4]}h</small></button>`).join("")}</div>
    <button class="link" id="fx">close</button></div></div>`;
    q("#fx").onclick = close;
    x.modal.querySelectorAll("[data-sp]").forEach(b => b.onclick = () => {
      const s = SPECIES[b.dataset.sp];
      if (x.left < s.price) return x.toast(`${s.price - x.left} more 🌱 needed — keep studying!`);
      commit([...keep, { s: b.dataset.sp, c: i, t: Math.floor(x.total) }], `${s.e} ${s.n} planted — go study!`, true);
    });
    return;
  }
  const S = SPECIES[t.s], st = stageOf(t, x.total), g = grown(t, x.total), nx = S.hrs[st + 1], full = S.hrs[4] * 3600;
  x.modal.innerHTML = `<div class="back"><div class="sheet"><h3>${S.e} ${S.n}</h3><div class="fprev">${thumb(t.s, st)}</div>
  <p class="hint"><b>${STAGES[st]}</b> · grown ${x.fmt(g)} of study<br>${nx == null ? "fully grown 🌳" : `next: ${STAGES[st + 1]} in ${x.fmt(nx * 3600 - g)}`}</p>
  <div class="fbar"><i style="width:${Math.min(100, g / full * 100).toFixed(1)}%"></i></div>
  <button class="btn ghost" id="fdig">dig up (+${S.price} 🌱 back)</button><button class="link" id="fx">close</button></div></div>`;
  q("#fx").onclick = close;
  q("#fdig").onclick = () => { if (confirm(`Dig up this ${S.n}? Its growth is lost and you get ${S.price} 🌱 back.`)) commit(keep.filter(k => k.c !== i), "Tree dug up 🌱"); };
}

// a little toast when one of your trees reaches its next stage (remembered on this device)
export function forestGrow(u, total, toast) {
  try { forestOf(u).forEach(t => {
    const k = `tree:${t.c}:${t.t}`, st = stageOf(t, total), old = localStorage.getItem(k);
    if (old === null || st > +old) { localStorage.setItem(k, st); if (old !== null) toast(`${SPECIES[t.s].e} Your ${SPECIES[t.s].n} grew into a ${STAGES[st]}!`); }
  }); } catch {}
}
