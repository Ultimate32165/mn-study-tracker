// Isometric study forest. Every tree stores the total study seconds at the moment it was planted (t),
// so each one grows on its own clock: growth = studied now - t. Saved in users/{uid}.forest = [{ s, c, t }].
// js/card.js draws the same trees on photocards, using treeParts() / cellPos() below.
const N = 6, OY = 100, STAGES = ["sprout", "sapling", "young tree", "grown tree", "ancient tree"];
export const GRID = N;

// ---- shapes: every stage is a list of soft blocks. P(width, height, kind, lift, dx, texture, dy)
// kind: "wood" (trunk) | "crown" (main colour) | "d" (second colour). dx / dy shift a block sideways / forward on screen.
const P = (w, h, k, z, x = 0, t = "", y = 0) => ({ w, h, k, z, x, y, t });
const SPR = () => [P(9, 8, "crown", 0)];
const TR = [null, [8, 10], [10, 14], [10, 18], [12, 22]], LAY = [[], [[22, 12]], [[28, 14], [18, 10]], [[36, 16], [26, 14], [14, 10]], [[42, 18], [32, 16], [22, 14], [12, 10]]];
const stk = (ls, z, wm, hm) => ls.map(([w, h]) => { const hh = Math.round(h * hm), o = P(Math.round(w * wm), hh, "crown", z); z += hh; return o; });
const classic = (wm, hm) => st => st ? [P(TR[st][0], TR[st][1], "wood", 0), ...stk(LAY[st], TR[st][1], wm, hm)] : SPR();
const broad = (trunk, crowns, lobe, c2top) => st => { // wide round crown with side lobes
  if (!st) return SPR(); const [tw, th] = trunk[st], p = [P(tw, th, "wood", 0)], L = lobe[st];
  if (L) p.push(P(L[1], L[2], "crown", th + 2, -L[0], "", 2), P(L[1], L[2], "crown", th + 2, L[0], "", 2));
  let z = th; crowns[st].forEach(([w, h], i, a) => { p.push(P(w, h, c2top && i === a.length - 1 ? "d" : "crown", z)); z += h; }); return p;
};

export const SPECIES = { // c / c2 = theme colour variable or a hex colour, wc = trunk colour, hrs = study hours (after planting) for each stage
  cactus: { n: "cactus", e: "🌵", price: 8, c: "#6fcf97", c2: "#ff8fb8", hrs: [0, .2, .6, 1.2, 2.5], tx: "spine", sway: false,
    parts: st => { if (!st) return [P(8, 8, "crown", 0, 0, "spine")]; const h = [0, 16, 22, 28, 34][st], a = h * .4 | 0, b = h * .55 | 0, p = [P(12, h, "crown", 0)];
      if (st >= 2) p.push(P(10, 6, "crown", a, 9, "", 2), P(6, 10, "crown", a + 4, 13, "", 2));
      if (st >= 3) p.push(P(10, 6, "crown", b, -9, "", 2), P(6, 10, "crown", b + 4, -13, "", 2));
      if (st >= 4) p.push(P(9, 6, "d", h, 0, "", 0)); return p; } },
  pine: { n: "pine", e: "🌲", price: 10, c: "--live", hrs: [0, .25, .75, 1.5, 3], tx: "needle", wx: "bark", parts: classic(.85, 1.1) },
  bamboo: { n: "bamboo", e: "🎋", price: 14, c: "#7fd36b", c2: "#b9e07a", hrs: [0, .25, .75, 1.5, 3.5], tx: "leaf",
    parts: st => { if (!st) return [P(5, 8, "crown", 0, 0, "seg")];
      const S = [null, [[0, 14, 0]], [[-5, 22, -2], [6, 16, 2]], [[0, 34, -3], [-10, 24, 1], [10, 28, 2]], [[0, 44, -4], [-14, 30, 0], [-6, 38, 2], [9, 34, 3]]][st], p = S.map(([x, h, y]) => P(6, h, "crown", 0, x, "seg", y));
      if (st >= 3) p.push(P(14, 6, "d", S[0][1], 0, "leaf", -4)); if (st >= 4) p.push(P(10, 5, "d", S[2][1], -6, "leaf", 2)); return p; } },
  birch: { n: "birch", e: "🍃", price: 15, c: "#b9e07a", wc: "#f1ece0", hrs: [0, .3, 1, 2, 4], tx: "leaf", wx: "birch",
    parts: st => { if (!st) return SPR(); const th = [0, 14, 22, 28, 32][st], cr = [null, [[16, 12]], [[20, 12], [14, 10]], [[24, 12], [18, 12], [12, 10]], [[26, 12], [20, 12], [14, 10], [8, 8]]][st];
      return [P([0, 6, 6, 7, 8][st], th, "wood", 0), ...stk(cr, th, 1, 1)]; } },
  oak: { n: "oak", e: "🌳", price: 18, c: "#52b36b", hrs: [0, .4, 1.2, 2.5, 5], tx: "leaf", wx: "bark",
    parts: broad([null, [8, 10], [12, 12], [14, 14], [16, 16]], [null, [[24, 12]], [[34, 14], [24, 10]], [[44, 16], [30, 12]], [[52, 18], [38, 14], [24, 10]]], [null, 0, 0, [16, 24, 12], [20, 30, 14]]) },
  palm: { n: "palm", e: "🌴", price: 20, c: "#5fd0a0", c2: "#8b5a2b", hrs: [0, .4, 1.2, 2.5, 4.5], tx: "leaf", wx: "ring",
    parts: st => { if (!st) return SPR(); const th = [0, 14, 24, 34, 44][st], p = [P([0, 6, 6, 7, 8][st], th, "wood", 0)];
      if (st >= 3) p.push(P(24, 5, "crown", th - 2, -22, "", 3), P(24, 5, "crown", th - 2, 22, "", 3));
      p.push(P([0, 26, 34, 42, 50][st], 5, "crown", th)); if (st >= 4) p.push(P(22, 5, "crown", th + 5));
      if (st >= 2) p.push(P(7, 7, "d", th - 6, -3, "", 4), P(7, 7, "d", th - 6, 4, "", 4)); return p; } },
  bloom: { n: "blossom", e: "🌸", price: 20, c: "--main", hrs: [0, .5, 1.5, 3, 5], tx: "petal", wx: "bark", parts: classic(1.1, .85) },
  maple: { n: "maple", e: "🍁", price: 25, c: "#ff9a5c", c2: "#ff6b6b", hrs: [0, .5, 1.5, 3, 5.5], tx: "leaf", wx: "bark",
    parts: broad([null, [8, 10], [10, 12], [12, 14], [14, 16]], [null, [[26, 12]], [[34, 14], [22, 12]], [[42, 16], [30, 14], [18, 10]], [[48, 18], [36, 14], [24, 12]]], [null, 0, [14, 20, 12], [18, 24, 14], [22, 28, 14]], true) },
  mushroom: { n: "mushroom", e: "🍄", price: 30, c: "#ff7b7b", wc: "#f6efe3", hrs: [0, .5, 1.5, 3, 6], tx: "dots",
    parts: st => { if (!st) return [P(8, 6, "wood", 0), P(12, 5, "crown", 6, 0, "dots")]; const sh = [0, 8, 12, 16, 20][st], p = [P([0, 6, 8, 9, 10][st], sh, "wood", 0)];
      if (st >= 4) p.unshift(P(6, 10, "wood", 0, -18, "", 4), P(20, 8, "crown", 10, -18, "dots", 4));
      p.push(P([0, 22, 30, 38, 44][st], [0, 8, 10, 12, 14][st], "crown", sh)); return p; } },
  dream: { n: "dream tree", e: "✨", price: 35, c: "--alt", hrs: [0, .75, 2, 4, 7], tx: "spark", wx: "bark", parts: classic(1, 1) }
};
const WOOD = "color-mix(in srgb,var(--soft) 70%,var(--main-d))";
const cv = v => v[0] === "-" ? `var(${v})` : v; // theme colour variable or hex
const colv = (S, k) => k === "wood" ? (S.wc ? cv(S.wc) : WOOD) : cv(k === "d" ? S.c2 || S.c : S.c);
const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
let pop = { c: -1, at: 0 }; // the tile that was just planted (gets a little pop animation)

// blocks of one tree, from the ground up: { w, h, x, y, z, k, t } (t = texture name)
export const treeParts = (sp, st) => { const S = SPECIES[sp]; return S.parts(st).map(p => ({ ...p, t: p.t || (p.k === "wood" ? S.wx || "" : S.tx || "") })); };
const texMemo = {};
const texKeys = sp => texMemo[sp] || (texMemo[sp] = new Set([0, 4].flatMap(st => treeParts(sp, st).map(p => p.t).filter(Boolean))));

// ---- textures: small repeating patterns laid over the faces of the blocks (skewed to match each face)
const TX = {
  leaf:   [9,  '<circle cx="2.2" cy="2.4" r="1.5" fill="#fff" fill-opacity=".34"/><circle cx="6.6" cy="6.3" r="1.3" fill="#000" fill-opacity=".14"/><circle cx="6.8" cy="1.8" r=".8" fill="#fff" fill-opacity=".2"/>'],
  needle: [8,  '<path d="M1 6.5L3.6 1.3M5 7L7.2 3" stroke="#fff" stroke-opacity=".32" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M3 7.6L4.6 5" stroke="#000" stroke-opacity=".14" stroke-width="1" fill="none"/>'],
  petal:  [10, '<circle cx="3" cy="3" r="2" fill="#fff" fill-opacity=".42"/><circle cx="8" cy="7.2" r="1.5" fill="#fff" fill-opacity=".32"/><circle cx="7.6" cy="2" r="1" fill="#000" fill-opacity=".1"/>'],
  spark:  [12, '<path d="M3 .8L3.9 3 6 3.9 3.9 4.8 3 7 2.1 4.8 0 3.9 2.1 3z" fill="#fff" fill-opacity=".55"/><circle cx="9" cy="9" r="1" fill="#fff" fill-opacity=".4"/><circle cx="9.5" cy="2.5" r=".7" fill="#000" fill-opacity=".1"/>'],
  bark:   [6,  '<rect x="1" y="0" width="1.2" height="5" rx=".6" fill="#000" fill-opacity=".22"/><rect x="4" y="3" width="1" height="3" rx=".5" fill="#fff" fill-opacity=".15"/>'],
  birch:  [8,  '<rect width="8" height="8" fill="#fff" fill-opacity=".12"/><rect x="1" y="2" width="4.5" height="1.3" rx=".6" fill="#2b2b2b" fill-opacity=".55"/><rect x="3.5" y="6" width="3.5" height="1" rx=".5" fill="#2b2b2b" fill-opacity=".4"/>'],
  ring:   [6,  '<rect width="6" height="1.4" fill="#000" fill-opacity=".25"/><rect y="3" width="6" height="1" fill="#fff" fill-opacity=".15"/>'],
  seg:    [14, '<rect y="12" width="14" height="2" fill="#000" fill-opacity=".22"/><rect width="14" height="1" fill="#fff" fill-opacity=".25"/>'],
  spine:  [8,  '<path d="M2 3L2 1.4M6 6.5L6 5" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/><circle cx="6" cy="2" r=".6" fill="#000" fill-opacity=".15"/>'],
  dots:   [14, '<circle cx="4" cy="4" r="2.6" fill="#fff" fill-opacity=".7"/><circle cx="10.5" cy="10" r="2" fill="#fff" fill-opacity=".6"/>'],
  grass:  [10, '<path d="M2 6.5L2.5 3.6 3.2 6.5M7 9L7.4 6 8 9" stroke="#000" stroke-opacity=".13" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="6" cy="3" r=".7" fill="#fff" fill-opacity=".22"/>']
};
const FACE = { L: "skewY(26.57)", R: "skewY(-26.57)", T: "matrix(.707 .354 -.707 .354 0 0)" };
let svgN = 0, CUR = ""; // every <svg> gets its own pattern ids, so several can live on the page together
const svgId = () => CUR = "x" + (++svgN);
const defs = (id, keys) => `<defs>${[...keys].map(k => ["L", "R", "T"].map(f => `<pattern id="${id}-${k}-${f}" width="${TX[k][0]}" height="${TX[k][0]}" patternUnits="userSpaceOnUse" patternTransform="${FACE[f]}">${TX[k][1]}</pattern>`).join("")).join("")}</defs>`;

export const forestOf = u => {
  const seen = new Set();
  return (Array.isArray(u.forest) ? u.forest : []).filter(t => t && SPECIES[t.s] && Number.isInteger(t.c) && t.c >= 0 && t.c < N * N && Number.isFinite(t.t) && !seen.has(t.c) && seen.add(t.c));
};
export const forestCost = u => forestOf(u).reduce((a, t) => a + SPECIES[t.s].price, 0); // spent seeds = price of every planted tree
const grown = (t, total) => Math.max(0, total - t.t);
const stageOf = (t, total) => { let s = 0; SPECIES[t.s].hrs.forEach((h, i) => { if (grown(t, total) >= h * 3600) s = i; }); return s; };
export const forestSnap = (u, total) => forestOf(u).map(t => ({ s: t.s, c: t.c, st: stageOf(t, total) })); // plain data for the photocard

export const cellPos = i => { const r = i / N | 0, c = i % N; return [192 + (c - r) * 32, OY + (c + r) * 16]; }; // [centre x, y of the tile's top face]

// one soft isometric block: base diamond centred on (cx,by), w wide, h tall, colour from css var --c, optional texture on faces
const box = (cx, by, w, h, c, tx, faces = "LRT") => { const a = w / 2, d = w / 4, t = by - h,
  F = { L: `M${cx - a} ${by}L${cx} ${by + d}L${cx} ${t + d}L${cx - a} ${t}Z`, R: `M${cx + a} ${by}L${cx} ${by + d}L${cx} ${t + d}L${cx + a} ${t}Z`, T: `M${cx} ${t - d}L${cx + a} ${t}L${cx} ${t + d}L${cx - a} ${t}Z` },
  ov = f => tx && faces.includes(f) ? `<path d="${F[f]}" fill="url(#${CUR}-${tx}-${f})"/>` : "";
  return `<g style="--c:${c}"><path class="fl" d="${F.L}"/>${ov("L")}<path class="fr" d="${F.R}"/>${ov("R")}<path class="ft" d="${F.T}"/>${ov("T")}</g>`; };

function tree(sp, st, cx, by, swayDelay) { // swayDelay: seconds (undefined = no animation, e.g. thumbnails)
  const S = SPECIES[sp]; let wood = "", crown = "";
  for (const p of treeParts(sp, st)) { const b = box(cx + p.x, by - p.z + p.y, p.w, p.h, colv(S, p.k), p.t); if (p.k === "wood") wood += b; else crown += b; }
  return `${wood}<g${swayDelay === undefined || S.sway === false ? "" : ` class="sway" style="animation-delay:-${swayDelay.toFixed(2)}s"`}>${crown}</g>`;
}
const ground = i => `color-mix(in srgb,var(--live) ${((i % N) + (i / N | 0)) % 2 ? 30 : 38}%,var(--bg2))`;
const thumb = (id, st = 3) => { const i = svgId(); return `<svg viewBox="0 0 80 100">${defs(i, texKeys(id))}${tree(id, st, 40, 94)}</svg>`; };

// drifting leaves / petals (in the colours of your trees) and, at night, fireflies. Start phases come from the clock,
// so the animation carries on smoothly when the page re-renders. CSS hides all of it when "motion off" is set.
function fx(ts, night) {
  const now = Date.now() / 1000, R = rng(5), cols = [...new Set(ts.map(t => SPECIES[t.s].c))]; let out = "";
  if (ts.length) for (let i = 0, n = Math.min(10, 3 + ts.length); i < n; i++) {
    const dur = 9 + (i % 5) * 1.5, ph = (now + i * 1.7) % dur;
    out += `<g transform="translate(${24 + R() * 336 | 0} ${8 + R() * 110 | 0})"><path class="lf" d="M0 -3L2.6 0L0 3L-2.6 0Z" style="--c:${cv(cols[i % cols.length])};--dx:${40 + R() * 50 | 0}px;--dy:${110 + R() * 70 | 0}px;animation-duration:${dur}s;animation-delay:-${ph.toFixed(2)}s"/></g>`;
  }
  if (night) for (let i = 0; i < 10; i++) {
    const dur = 5 + (i % 4), ph = (now + i * 2.3) % dur;
    out += `<g transform="translate(${30 + R() * 324 | 0} ${70 + R() * 190 | 0})"><circle class="ff" r="2.2" style="animation-duration:${dur}s;animation-delay:-${ph.toFixed(2)}s"/></g>`;
  }
  return `<g class="fx">${out}</g>`;
}

function scene(u, total, night) {
  const id = svgId(), ts = forestOf(u), m = new Map(ts.map(t => [t.c, t])), now = Date.now() / 1000, keys = new Set(["grass"]); let out = "";
  ts.forEach(t => texKeys(t.s).forEach(k => keys.add(k)));
  for (let s = 0; s < 2 * N - 1; s++) for (let r = 0; r < N; r++) { // back to front, so nearer trees cover farther ones
    const c = s - r; if (c < 0 || c >= N) continue;
    const i = r * N + c, [cx, ys] = cellPos(i), t = m.get(i), popping = t && pop.c === i && Date.now() - pop.at < 800;
    out += `<g class="fcell${t ? "" : " e"}" data-act="fcell" data-id="${i}">${box(cx, ys + 10, 64, 10, ground(i), "grass", "T")}${t ? `<g class="ftree${popping ? " pop" : ""}">${tree(t.s, stageOf(t, total), cx, ys, (now + i * .9) % 5)}</g>` : ""}</g>`;
  }
  return defs(id, keys) + out + fx(ts, night);
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
    <div class="shopg">${Object.entries(SPECIES).map(([id, s]) => `<button class="${x.left >= s.price ? "" : "lock"}" data-sp="${id}"><div class="fsp">${thumb(id)}</div><b>${s.n}</b><small>🌱 ${s.price} · full in ${+s.hrs[4].toFixed(1)}h</small></button>`).join("")}</div>
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
