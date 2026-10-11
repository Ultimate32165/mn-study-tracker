import { treeParts, cellPos, SPECIES, GRID } from "./forest.js";
import { COLORS } from "./board.js";
// Photocard: draws a shareable "cozy dashboard" image on a canvas.
// Pure drawing code: numbers and colours in, pixels out. No DOM, no Firebase (app.js collects the data and the theme colours).
// The garden is redrawn from the same data as the live scene, shrunk to fit. Keep WW/WH/POND in sync with js/app.js and the garden CSS.
export const SIZES = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] };
const WW = 980, WH = 680, POND = { x: 300, y: 500, rx: 80, ry: 44 };
const SIZE_BY_STAGE = [28, 32, 40, 50];

const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; // same generator as the live garden, so flowers sit in the same spots
const clamp01 = v => Math.max(0, Math.min(1, v));

function rr(ctx, x, y, w, h, r) { // rounded-rectangle path
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function text(ctx, s, x, y, o) { // text with size / weight / colour / alignment, shrunk to fit o.max if given
  let size = o.size; const fam = o.font, weight = o.weight || 600;
  ctx.font = `${weight} ${size}px ${fam}`;
  if (o.max) { const w = ctx.measureText(s).width; if (w > o.max) { size = Math.max(10, Math.floor(size * o.max / w)); ctx.font = `${weight} ${size}px ${fam}`; } }
  ctx.fillStyle = o.color; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
  const a = ctx.globalAlpha; if (o.alpha != null) ctx.globalAlpha = a * o.alpha;
  ctx.fillText(s, x, y); ctx.globalAlpha = a; return size;
}
function emoji(ctx, e, x, y, size, o = {}) { // an emoji centred on x / y (optionally flipped or rotated)
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1);
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#000";
  if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.fillText(e, 0, 0); ctx.restore();
}
function glow(ctx, x, y, r, rgb, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ell(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

// ---------------------------------------------------------------- garden pieces (origin = feet of the thing, units = world px)
const BULBS = ["#ff9ccb", "#ffd36f", "#9be37f", "#7fd0ff", "#b79cf5"];
function drawItem(ctx, id, px, py, s, pal, night) {
  ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
  const flat = id === "bed" || id === "blanket" || id === "lily";
  if (!flat) { ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(0, -1, 24, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  if (id === "bench") {
    ctx.fillStyle = pal.woodD; ctx.fillRect(-21, -9, 5, 9); ctx.fillRect(16, -9, 5, 9);
    rr(ctx, -27, -16, 54, 8, 4); ctx.fillStyle = pal.woodL; ctx.fill(); ctx.fillStyle = pal.woodD; ctx.fillRect(-25, -9, 50, 2);
    rr(ctx, -25, -31, 50, 11, 4); ctx.fillStyle = pal.wood; ctx.fill(); ctx.fillStyle = pal.woodD; ctx.fillRect(-24, -23, 48, 3);
  } else if (id === "lantern") {
    if (night) glow(ctx, 0, -32, 46, "255,214,120", .75);
    ctx.fillStyle = pal.woodD; rr(ctx, -2.5, -24, 5, 24, 2); ctx.fill(); emoji(ctx, "🏮", 0, -34, 30);
  } else if (id === "swing") {
    ctx.strokeStyle = pal.woodD; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-29, 0); ctx.lineTo(-24, -52); ctx.moveTo(29, 0); ctx.lineTo(24, -52); ctx.stroke();
    rr(ctx, -29, -57, 58, 7, 3); ctx.fillStyle = pal.wood; ctx.fill();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, -50); ctx.lineTo(-12, -17); ctx.moveTo(12, -50); ctx.lineTo(12, -17); ctx.stroke();
    rr(ctx, -16, -18, 32, 6, 3); ctx.fillStyle = pal.woodL; ctx.fill();
  } else if (id === "house") {
    emoji(ctx, "🏡", 0, -28, 54);
  } else if (id === "bed") {
    rr(ctx, -32, -16, 64, 16, 8); ctx.fillStyle = pal.soil; ctx.fill(); emoji(ctx, "🌷🌼🌸", 0, -22, 20);
  } else if (id === "blanket") {
    ctx.save(); ctx.transform(1, 0, -.18, 1, 0, 0);
    rr(ctx, -38, -34, 76, 34, 6); ctx.fillStyle = pal.cloth; ctx.fill(); ctx.clip();
    ctx.fillStyle = pal.main; ctx.globalAlpha = .38;
    for (let i = -38; i < 38; i += 14) ctx.fillRect(i, -34, 7, 34);
    for (let j = -34; j < 0; j += 14) ctx.fillRect(-38, j, 76, 7);
    ctx.restore(); emoji(ctx, "🧺", -12, -22, 22); emoji(ctx, "🍓", 20, -19, 14);
  } else if (id === "fairy") {
    ctx.fillStyle = pal.woodD; rr(ctx, -57, -52, 5, 52, 2.5); ctx.fill(); rr(ctx, 52, -52, 5, 52, 2.5); ctx.fill();
    ctx.strokeStyle = pal.woodD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-54, -48); ctx.quadraticCurveTo(0, -4, 54, -48); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const u = (i - 3) / 3, bx = -48 + i * 16, by = -56 + 5 + 20 * (1 - u * u), c = BULBS[i % 5];
      if (night) glow(ctx, bx, by, 14, "255,230,160", .55);
      ctx.globalAlpha = night ? 1 : .6; ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1;
    }
  } else if (id === "lily") {
    ell(ctx, -17, -9, 15, 7, pal.pad); ell(ctx, 11, -15, 13, 7, pal.pad); ell(ctx, 2, -4, 12, 6, pal.pad); emoji(ctx, "🌸", -14, -15, 15);
  } else if (id === "fountain") {
    ell(ctx, 0, -10, 32, 10, pal.stone); ell(ctx, 0, -12, 26, 6.5, pal.water);
    rr(ctx, -4, -40, 8, 30, 4); ctx.fillStyle = pal.stone; ctx.fill();
    ctx.fillStyle = "#bfe8ff"; [[-15, -30], [0, -44], [15, -30], [-8, -36], [8, -36]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.restore();
}

function drawPet(ctx, p, px, py, s, wx) { // p = { emo, acc, st, flip, sleep }
  const size = SIZE_BY_STAGE[p.st] * s;
  ctx.fillStyle = "rgba(0,0,0,.13)"; ctx.beginPath(); ctx.ellipse(px, py - 2 * s, size * .38, size * .1, 0, 0, Math.PI * 2); ctx.fill();
  const rot = p.sleep && p.st > 0 ? -78 * Math.PI / 180 : 0, cy = py - size * .52;
  emoji(ctx, p.emo, px, cy, size, { flip: p.flip, rot });
  if (wx === "snow" && p.st > 0) emoji(ctx, "🧣", px, cy + size * .34, size * .5);
  if (p.acc) emoji(ctx, p.acc, px, cy - size * .62, size * .42);
}

// ---------------------------------------------------------------- forest (the same isometric blocks as the forest tab, see js/forest.js)
const mixc = (a, b, t) => { const p = a.match(/[\d.]+/g).map(Number), q = b.match(/[\d.]+/g).map(Number); return `rgba(${[0, 1, 2].map(i => Math.round(p[i] * (1 - t) + q[i] * t)).join(",")},${p[3] ?? 1})`; };
function drawForest(ctx, x, y, w, h, g, pal) { // g.forest = [{ s: species, c: tile, st: stage }], g.night
  ctx.save(); rr(ctx, x, y, w, h, 36); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, pal.sk1); sky.addColorStop(1, pal.sk2); ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  const s = Math.min(w / 384, h / 292) * .98, ox = x + w / 2 - 192 * s, oy = y + h / 2 - 150 * s, R = seeded(11), night = !!g.night, BLK = "rgba(0,0,0,1)", WHT = "rgba(255,255,255,1)";
  if (night) { for (let i = 0; i < 40; i++) { ctx.globalAlpha = .35 + R() * .6; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + R() * w, y + R() * h * .55, (.8 + R() * 1.4) * Math.max(.8, s * 1.4), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  glow(ctx, x + w * .84, y + h * .17, Math.min(w, h) * .13, night ? "255,246,214" : "255,233,168", night ? .55 : .7);
  ctx.fillStyle = night ? "#fff6d6" : "#fff0b8"; ctx.beginPath(); ctx.arc(x + w * .84, y + h * .17, Math.min(w, h) * .034, 0, Math.PI * 2); ctx.fill();
  const CT = { leaf: ["dot", 9], petal: ["dot", 10], spark: ["dot", 12], spine: ["dot", 8], dots: ["big", 14], needle: ["slash", 8], bark: ["vbar", 6], birch: ["birch", 8], ring: ["hbar", 6], seg: ["hbar", 14], grass: ["tuft", 10] };
  const tex = (X, Y, k) => { // soft surface texture inside one face (same ideas as the patterns in the forest tab)
    const [kind, st] = CT[k] || [], sp = st * s; if (!kind) return;
    const x0 = Math.min(...X), x1 = Math.max(...X), y0 = Math.min(...Y), y1 = Math.max(...Y);
    ctx.save(); ctx.beginPath(); X.forEach((px, i) => ctx[i ? "lineTo" : "moveTo"](px, Y[i])); ctx.closePath(); ctx.clip();
    const W_ = a => `rgba(255,255,255,${a})`, B_ = a => `rgba(0,0,0,${a})`;
    if (kind === "birch") { ctx.fillStyle = W_(.12); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
    let row = 0;
    for (let yy = y0; yy < y1 + sp; yy += sp, row++) {
      if (kind === "hbar") { ctx.fillStyle = B_(.25); ctx.fillRect(x0, yy, x1 - x0, Math.max(1, 1.4 * s)); continue; }
      for (let xx = x0 + (row % 2) * sp / 2; xx < x1 + sp; xx += sp) {
        if (kind === "dot") { ctx.fillStyle = W_(.34); ctx.beginPath(); ctx.arc(xx, yy, sp * .17, 0, 6.3); ctx.fill(); ctx.fillStyle = B_(.12); ctx.beginPath(); ctx.arc(xx + sp * .45, yy + sp * .4, sp * .13, 0, 6.3); ctx.fill(); }
        else if (kind === "big") { ctx.fillStyle = W_(.7); ctx.beginPath(); ctx.arc(xx, yy, sp * .19, 0, 6.3); ctx.fill(); }
        else if (kind === "slash") { ctx.strokeStyle = W_(.32); ctx.lineWidth = Math.max(1, 1.2 * s); ctx.beginPath(); ctx.moveTo(xx, yy + sp * .7); ctx.lineTo(xx + sp * .3, yy); ctx.stroke(); }
        else if (kind === "vbar") { ctx.fillStyle = B_(.22); ctx.fillRect(xx, yy, Math.max(1, 1.2 * s), sp * .8); }
        else if (kind === "birch") { ctx.fillStyle = "rgba(43,43,43,.5)"; ctx.fillRect(xx, yy + sp * .25, sp * .55, Math.max(1, 1.3 * s)); }
        else if (kind === "tuft") { ctx.strokeStyle = B_(.13); ctx.lineWidth = Math.max(1, s); ctx.beginPath(); ctx.moveTo(xx, yy + sp * .5); ctx.lineTo(xx + sp * .08, yy); ctx.stroke(); }
      }
    }
    ctx.restore();
  };
  const poly = (pts, col, tx) => { const X = pts.map(p => ox + p[0] * s), Y = pts.map(p => oy + p[1] * s); ctx.beginPath(); X.forEach((px, i) => ctx[i ? "lineTo" : "moveTo"](px, Y[i])); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); if (tx) tex(X, Y, tx); }; // same-colour stroke hides seams
  const box = (cx, by, bw, bh, col, tx, faces = "LRT") => { const a = bw / 2, d = bw / 4, t = by - bh;
    poly([[cx - a, by], [cx, by + d], [cx, t + d], [cx - a, t]], col, faces.includes("L") ? tx : "");
    poly([[cx + a, by], [cx, by + d], [cx, t + d], [cx + a, t]], mixc(col, BLK, .24), faces.includes("R") ? tx : "");
    poly([[cx, t - d], [cx + a, t], [cx, t + d], [cx - a, t]], mixc(col, WHT, .34), faces.includes("T") ? tx : ""); };
  const cc = v => v[0] === "-" ? pal[v.slice(2)] : hexc(v);
  const wood = mixc(mixc(pal.sub, pal.main, .3), BLK, .1), m = new Map((g.forest || []).map(t => [t.c, t]));
  for (let d = 0; d < 2 * GRID - 1; d++) for (let r = 0; r < GRID; r++) { // back to front
    const c = d - r; if (c < 0 || c >= GRID) continue;
    const i = r * GRID + c, [cx, ys] = cellPos(i), t = m.get(i);
    box(cx, ys + 10, 64, 10, mixc(pal.bg2, pal.live, (r + c) % 2 ? .30 : .38), "grass", "T");
    if (t && SPECIES[t.s]) { const S = SPECIES[t.s]; for (const p of treeParts(t.s, t.st)) box(cx + p.x, ys - p.z + p.y, p.w, p.h, p.k === "wood" ? (S.wc ? cc(S.wc) : wood) : cc(p.k === "d" ? S.c2 || S.c : S.c), p.t); }
  }
  if (night) for (let i = 0; i < 14; i++) glow(ctx, x + R() * w, y + h * (.3 + R() * .6), (5 + R() * 5) * Math.max(1, s * 1.4), "255,235,140", .75);
  ctx.restore();
}
function drawScene(ctx, x, y, w, h, g, pal) {
  if (g.forest) return drawForest(ctx, x, y, w, h, g, pal);
  ctx.save(); rr(ctx, x, y, w, h, 36); ctx.clip();
  const s = Math.min(w / WW, h / WH), ox = x + (w - WW * s) / 2, oy = y + h - WH * s, X = v => ox + v * s, Y = v => oy + v * s, night = !!g.night, R = seeded(7);
  // sky
  ctx.fillStyle = pal.sk1; ctx.fillRect(x, y, w, h);
  const sky = ctx.createLinearGradient(0, Y(0), 0, Y(250)); sky.addColorStop(0, pal.sk1); sky.addColorStop(1, pal.sk2); ctx.fillStyle = sky; ctx.fillRect(x, Y(0), w, Y(250) - Y(0));
  if (night) { for (let i = 0; i < 46; i++) { const sx = x + R() * w, sy = y + R() * (Y(190) - y); ctx.globalAlpha = .4 + R() * .6; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, sy, (.8 + R() * 1.4) * Math.max(.8, s * 1.6), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  // sun / moon
  const sunX = X(782), sunY = Y(50);
  if (night) { glow(ctx, sunX, sunY, 70 * s, "255,240,200", .35); ctx.fillStyle = "#fff6d6"; ctx.beginPath(); ctx.arc(sunX, sunY, 22 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = pal.sk1; ctx.beginPath(); ctx.arc(sunX + 9 * s, sunY - 5 * s, 19 * s, 0, Math.PI * 2); ctx.fill(); }
  else { glow(ctx, sunX, sunY, 80 * s, "255,226,140", .55); ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.arc(sunX, sunY, 22 * s, 0, Math.PI * 2); ctx.fill(); }
  // rainbow (couple level 6+)
  if (g.lv >= 6) { ["#ff8fa3", "#ffc27a", "#fff08a", "#9be8a0", "#8fd0ff", "#c3a6ff"].forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = .5; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.arc(X(490), Y(175), (258 - i * 9) * s, Math.PI, 0); ctx.stroke(); }); ctx.globalAlpha = 1; }
  // clouds
  [[140, 34, 1], [420, 70, .75], [640, 108, .6], [880, 52, .85], [60, 126, .7]].forEach(([cx, cy, k]) => { ctx.fillStyle = pal.cl; ctx.globalAlpha = night ? .5 : .9; const bx = X(cx), by = Y(cy), u = 22 * s * k; ell(ctx, bx, by, u * 2.2, u, pal.cl); ell(ctx, bx - u * 1.1, by + u * .25, u * 1.3, u * .8, pal.cl); ell(ctx, bx + u * 1.2, by + u * .2, u * 1.4, u * .85, pal.cl); ctx.globalAlpha = 1; });
  // hills + grass
  const cxm = X(490), rx = Math.max(735 * s, w * .75);
  const hill = (top, ry, fill) => { ctx.beginPath(); ctx.ellipse(cxm, Y(top) + ry, rx, ry, 0, Math.PI, Math.PI * 2); ctx.lineTo(cxm + rx, y + h + 4); ctx.lineTo(cxm - rx, y + h + 4); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  hill(172, 90 * s, pal.grB); hill(236, 60 * s, pal.grF);
  ctx.fillStyle = pal.grF; ctx.fillRect(x, Y(262), w, y + h - Y(262));
  // fence
  for (let fx = 520; fx < 980; fx += 38) { ctx.fillStyle = pal.woodL; rr(ctx, X(fx), Y(206), 7 * s, 32 * s, 2 * s); ctx.fill(); }
  ctx.fillStyle = pal.wood; ctx.fillRect(X(516), Y(214), 468 * s, 4 * s); ctx.fillRect(X(516), Y(227), 468 * s, 4 * s);
  // pond
  const wg = ctx.createLinearGradient(0, Y(POND.y - POND.ry), 0, Y(POND.y + POND.ry)); wg.addColorStop(0, pal.water); wg.addColorStop(1, pal.water2);
  ell(ctx, X(POND.x), Y(POND.y), POND.rx * s * 1.06, POND.ry * s * 1.1, pal.grB); ell(ctx, X(POND.x), Y(POND.y), POND.rx * s, POND.ry * s, wg);
  ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.ellipse(X(POND.x - 12), Y(POND.y - 8), 28 * s, 9 * s, 0, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
  // flowers, trees, butterflies (same rules as the live garden)
  const kF = Math.max(1.1, Math.min(1.8, .8 / s)), kI = Math.max(1, Math.min(1.5, .75 / s)), kP = Math.max(1.2, Math.min(2.6, 64 / (50 * s))), lv = g.lv || 0, FL = ["🌸", "🌼", "🌷", "🌻", "🌺", "🌹"], n = Math.min(60, 10 + lv * 5), F = seeded(11);
  for (let i = 0; i < 60; i++) {
    const px = 30 + F() * 920, py = 285 + F() * 380, f = FL[Math.floor(F() * FL.length)], sz = 13 + Math.floor(F() * 9), ex = px / WW, ey = py / WH;
    if (i < n && !(((ex * WW - POND.x) / POND.rx) ** 2 + ((ey * WH + 14 - POND.y) / POND.ry) ** 2 < 1)) emoji(ctx, f, X(px), Y(py), sz * s * kF);
  }
  [[880, 275, "🌳", 3], [80, 275, "🌲", 5], [520, 282, "🌳", 7], [940, 440, "🌲", 8], [40, 540, "🌳", 9], [660, 300, "🌲", 10]].forEach(([tx, ty, e, need]) => { if (lv >= need) emoji(ctx, e, X(tx), Y(ty) - 22 * s * kF, 44 * s * kF); });
  const nb = lv >= 1 ? Math.min(9, 1 + Math.floor(lv / 2) * 2) : 0, B = seeded(23);
  for (let i = 0; i < nb; i++) emoji(ctx, "🦋", X(40 + B() * 900), Y(290 + B() * 340), 16 * s * kF);
  // things standing on the ground: flat items first, then everything else sorted by depth
  const flat = (g.items || []).filter(d => d.i === "bed" || d.i === "blanket" || d.i === "lily");
  flat.forEach(d => drawItem(ctx, d.i, X(d.x * WW), Y(d.y * WH), s * kI, pal, night));
  const list = [];
  (g.items || []).forEach(d => { if (!flat.includes(d)) list.push({ y: d.y, f: () => drawItem(ctx, d.i, X(d.x * WW), Y(d.y * WH), s * kI, pal, night) }); });
  (g.pets || []).forEach(p => list.push({ y: p.y, f: () => drawPet(ctx, p, X(p.x * WW), Y(p.y * WH), s * kP, g.wx) }));
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  // night fireflies
  if (night) { const FF = seeded(31); for (let i = 0; i < 26; i++) { const fx = x + FF() * w, fy = Y(300) + FF() * (y + h - Y(300)); glow(ctx, fx, fy, 9 * Math.max(.8, s * 1.5), "255,240,140", .9); } }
  // weather
  const W = seeded(5);
  if (g.wx === "snow") { ctx.fillStyle = "#fff"; ctx.globalAlpha = .9; for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(x + W() * w, y + W() * h, (2 + W() * 3.2) * Math.max(.9, s * 1.5), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  else if (g.wx === "rain") { ctx.strokeStyle = "rgba(205,232,255,.8)"; ctx.lineWidth = 2.2; for (let i = 0; i < 80; i++) { const rx0 = x + W() * w * 1.1, ry0 = y + W() * h; ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx0 - 7, ry0 + 20); ctx.stroke(); } }
  else if (g.wx === "petals" || g.wx === "leaves") { const E = g.wx === "petals" ? ["🌸", "🌸", "💮", "🌷"] : ["🍂", "🍁", "🍂"]; for (let i = 0; i < 22; i++) emoji(ctx, E[i % E.length], x + W() * w, y + W() * h, (13 + W() * 8) * Math.max(1, s * 1.5), { rot: W() * 6 }); }
  ctx.restore();
  ctx.strokeStyle = pal.edge; ctx.lineWidth = 5; rr(ctx, x, y, w, h, 36); ctx.stroke();
}

// ---------------------------------------------------------------- the card
function layout(shape, W, H, wt = [1, 2.8, 1.1, 3.2], cap = [120, 340, 130, 290], keys = ["head", "ses", "chips", "chart"], gs) { // gs = garden share of the height (optional)
  const pad = 54, gap = 22, stamp = 54, share = gs != null ? gs : shape === "story" ? .34 : shape === "portrait" ? .38 : .32, gh = Math.round(H * share), n = wt.length;
  const gy = H - pad - stamp - gh, avail = gy - gap - pad - (n - 1) * gap, sum = wt.reduce((a, b) => a + b, 0);
  const hs = wt.map((k, i) => Math.min(cap[i], Math.round(avail * k / sum))), used = hs.reduce((a, b) => a + b, 0) + (n - 1) * gap, gp = gap + Math.max(0, (avail + (n - 1) * gap - used) / n);
  let y = pad + (gp - gap) / 2; const out = { pad, W, H, gh, gy };
  keys.forEach((k, i) => { out[k] = { y, h: hs[i] }; y += hs[i] + gp; });
  out.garden = { y: gy, h: gh }; out.stampY = H - pad - stamp / 2 + 8; return out;
}
function tile(ctx, x, y, w, h, pal) {
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.10)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; rr(ctx, x, y, w, h, 34); ctx.fillStyle = pal.card; ctx.fill(); ctx.restore();
  rr(ctx, x, y, w, h, 34); ctx.strokeStyle = pal.edge; ctx.lineWidth = 3; ctx.stroke();
}
function ring(ctx, cx, cy, r, lw, pct, pal) {
  ctx.lineCap = "round"; ctx.lineWidth = lw; ctx.strokeStyle = pal.tint; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (pct > 0) { const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, pal.alt); g.addColorStop(1, pal.main); ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(pct)); ctx.stroke(); }
}

// ---------------------------------------------------------------- "together" card: both of you, live
function personTile(ctx, x, y, w, h, p, pal) {
  const live = p.status === "studying", inner = Math.min(30, w * .065), hf = pal.hf, bf = pal.bf;
  ctx.save(); if (live) { ctx.shadowColor = pal.live; ctx.shadowBlur = 34; } tile(ctx, x, y, w, h, pal); ctx.restore();
  if (live) { rr(ctx, x, y, w, h, 34); ctx.strokeStyle = pal.live; ctx.lineWidth = 5; ctx.stroke(); }
  const av = Math.min(h * .15, 58), petS = Math.min(h * .21, 88), cy = y + inner + av / 2;
  ctx.beginPath(); ctx.arc(x + inner + av / 2, cy, av / 2, 0, Math.PI * 2); ctx.fillStyle = pal.tint; ctx.fill(); emoji(ctx, p.avatar, x + inner + av / 2, cy + 2, av * .58);
  text(ctx, p.name, x + inner + av + 14, cy, { size: Math.min(h * .1, 42), font: hf, weight: 700, color: pal.ink, base: "middle", max: w - inner * 2 - av - 14 - petS * 1.05 });
  emoji(ctx, p.pet.emo, x + w - inner - petS / 2, y + inner + petS * .55, petS, { rot: p.status === "rest" && p.pet.st > 0 ? 0 : 0 });
  if (p.pet.acc) emoji(ctx, p.pet.acc, x + w - inner - petS / 2, y + inner + petS * .05, petS * .42);
  // status pill
  const ph = Math.min(h * .09, 40), py = y + inner + av + 16; ctx.font = `800 ${ph * .6}px ${bf}`; const pw = ctx.measureText(p.statusText).width + ph * .95;
  rr(ctx, x + inner, py, pw, ph, ph / 2); ctx.fillStyle = live ? pal.onBg : pal.tint; ctx.fill(); ctx.strokeStyle = live ? pal.onLine : pal.edge; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, p.statusText, x + inner + pw / 2, py + ph / 2 + 1, { size: ph * .6, font: bf, weight: 800, color: live ? pal.live : pal.sub, align: "center", base: "middle" });
  // the big number: this session while studying / on a break, otherwise today's total
  const bigS = Math.min(h * .2, 100), midY = y + h * .6;
  text(ctx, p.label.toUpperCase(), x + inner, midY - bigS * .72, { size: Math.min(h * .065, 24), font: bf, weight: 800, color: pal.sub });
  text(ctx, p.big, x + inner, midY + bigS * .22, { size: bigS, font: hf, weight: 700, color: pal.ink, max: w - inner * 2 });
  // goal bar + footer line
  const bh = Math.min(18, h * .05), by = y + h - inner - Math.min(h * .08, 32) - bh - 14, tw = w - inner * 2;
  if (p.pct != null) {
    rr(ctx, x + inner, by, tw, bh, bh / 2); ctx.fillStyle = pal.tint; ctx.fill();
    if (p.pct > 0) { const g = ctx.createLinearGradient(x + inner, 0, x + inner + tw, 0); g.addColorStop(0, pal.alt); g.addColorStop(1, pal.main); rr(ctx, x + inner, by, Math.max(bh, tw * clamp01(p.pct)), bh, bh / 2); ctx.fillStyle = g; ctx.fill(); }
  }
  const fy = y + h - inner - Math.min(h * .08, 32) / 2, fs = Math.min(h * .062, 26);
  text(ctx, `today ${p.today}${p.goalText ? " · " + p.goalText : ""}`, x + inner, fy, { size: fs, font: bf, weight: 800, color: pal.sub, base: "middle", max: tw * .72 });
  text(ctx, `🔥 ${p.streak}`, x + w - inner, fy, { size: fs * 1.1, font: bf, weight: 800, color: pal.sub, align: "right", base: "middle" });
}
function drawTogether(ctx, d, pal, W, H) {
  const pad = 54, gap = 22, stamp = 54, hf = pal.hf, bf = pal.bf, cw = W - pad * 2;
  const gh = Math.round(H * (d.shape === "story" ? .34 : d.shape === "portrait" ? .38 : .32)), gy = H - pad - stamp - gh;
  const avail = gy - gap - pad - 2 * gap, wt = [1, 4.8, 1.1], cap = [120, 620, 130], sum = 6.9;
  const hs = wt.map((k, i) => Math.min(cap[i], Math.round(avail * k / sum))), gp = gap + Math.max(0, (avail + 2 * gap - hs.reduce((a, b) => a + b, 0) - 2 * gap) / 3);
  let y = pad + (gp - gap) / 2; const Y = hs.map(h => { const v = y; y += h + gp; return v; });
  { const h = hs[0], cy = Y[0] + h / 2, av = Math.min(h, 84);
    d.people.forEach((p, i) => { const cx = pad + av / 2 + i * av * .62; ctx.beginPath(); ctx.arc(cx, cy, av / 2, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = pal.edge; ctx.stroke(); emoji(ctx, p.avatar, cx, cy + 2, av * .56); });
    const dateW = Math.min(cw * .36, 340), tx = pad + av * 1.62 + 20;
    text(ctx, d.date, W - pad, cy, { size: Math.min(h * .46, 28), font: bf, weight: 700, color: pal.sub, align: "right", base: "middle", max: dateW });
    text(ctx, d.title, tx, cy, { size: Math.min(h * .72, 48), font: hf, weight: 700, color: pal.ink, base: "middle", max: W - pad - tx - dateW - 20 }); }
  { const tw = (cw - gap) / 2; d.people.forEach((p, i) => personTile(ctx, pad + i * (tw + gap), Y[1], tw, hs[1], p, pal)); }
  { const h = hs[2], cwid = (cw - gap) / 2;
    [["together today", d.togetherToday], ["couple level", d.coupleText]].forEach(([lab, val], i) => {
      const x = pad + i * (cwid + gap); tile(ctx, x, Y[2], cwid, h, pal); const fs = Math.min(h * .46, 54), ls = Math.min(h * .3, 28);
      text(ctx, lab, x + 28, Y[2] + h / 2, { size: ls, font: bf, weight: 800, color: pal.sub, base: "middle" });
      ctx.font = `800 ${ls}px ${bf}`; const lw = ctx.measureText(lab).width;
      text(ctx, val, x + cwid - 28, Y[2] + h / 2, { size: fs, font: hf, weight: 700, color: pal.ink, align: "right", base: "middle", max: cwid - 56 - lw - 10 });
    }); }
  drawScene(ctx, pad, gy, cw, gh, d.garden, pal);
  text(ctx, "🍓 MN Study Tracker", W / 2, H - pad - stamp / 2 + 8, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9 });
}

// ---------------------------------------------------------------- shared pieces for the recap + milestone cards
function drawHead(ctx, L, pal, W, avatar, title, date) { // avatar circle + title (left), date (right)
  const { y, h } = L.head, pad = L.pad, cw = W - pad * 2, av = Math.min(h, 84), cy = y + h / 2, dateW = Math.min(cw * .34, 330);
  ctx.beginPath(); ctx.arc(pad + av / 2, cy, av / 2, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = pal.edge; ctx.stroke();
  emoji(ctx, avatar, pad + av / 2, cy + 2, av * .56);
  text(ctx, date, W - pad, cy, { size: Math.min(h * .5, 30), font: pal.bf, weight: 700, color: pal.sub, align: "right", base: "middle", max: dateW });
  text(ctx, title, pad + av + 20, cy, { size: Math.min(h * .72, 48), font: pal.hf, weight: 700, color: pal.ink, base: "middle", max: cw - av - 40 - dateW });
}
function drawStat(ctx, x, y, w, h, pal, t) { // a stat tile: small label, big value, small note underneath
  tile(ctx, x, y, w, h, pal); const inner = Math.min(28, w * .06), mw = w - inner * 2;
  text(ctx, t.l, x + inner, y + h * .24, { size: Math.min(h * .17, 26), font: pal.bf, weight: 800, color: pal.sub, base: "middle", max: mw });
  text(ctx, t.v, x + inner, y + h * .56, { size: Math.min(h * .38, 56), font: pal.hf, weight: 700, color: pal.ink, base: "middle", max: mw });
  if (t.s) text(ctx, t.s, x + inner, y + h * .85, { size: Math.min(h * .15, 22), font: pal.bf, weight: 700, color: pal.sub, base: "middle", max: mw });
}
function drawBars(ctx, pad, y, cw, h, pal, d) { // bar chart tile for 7 or 30 days: d.label, d.weekTotal, d.bars = [{ v, l, t, today }]
  const hf = pal.hf, bf = pal.bf; tile(ctx, pad, y, cw, h, pal);
  const inner = h < 200 ? 24 : 30, ts = Math.min(h * .13, 28);
  text(ctx, d.label, pad + inner, y + inner + ts * .6, { size: ts, font: bf, weight: 800, color: pal.sub });
  text(ctx, d.weekTotal, pad + cw - inner, y + inner + ts * .6, { size: ts * 1.15, font: hf, weight: 700, color: pal.ink, align: "right" });
  const top = y + inner + ts * 1.35 + 8, lblH = Math.min(h * .13, 30), bottom = y + h - inner * .8 - lblH, bh = Math.max(20, bottom - top), n = d.bars.length, gp = n > 10 ? 5 : 18, bw = (cw - inner * 2 - gp * (n - 1)) / n, mx = Math.max(1, ...d.bars.map(k => k.v));
  d.bars.forEach((k, i) => {
    const x = pad + inner + i * (bw + gp), v = k.v ? Math.max(.06, k.v / mx) : 0, bhh = Math.max(8, v * (bh - (bh > 90 ? 26 : 0)));
    rr(ctx, x, bottom - 8, bw, 8, Math.min(4, bw / 2)); ctx.fillStyle = pal.tint; ctx.fill();
    if (v) { rr(ctx, x, bottom - bhh, bw, bhh, Math.min(14, bw / 2)); const gr = ctx.createLinearGradient(0, bottom - bhh, 0, bottom); gr.addColorStop(0, k.today ? pal.main : pal.alt); gr.addColorStop(1, k.today ? pal.alt : pal.tint); ctx.fillStyle = gr; ctx.fill(); }
    if (bh > 90 && k.v && k.t) text(ctx, k.t, x + bw / 2, bottom - bhh - 8, { size: Math.min(lblH * .85, 22), font: bf, weight: 800, color: pal.sub, align: "center", max: bw + gp - 2 });
    if (k.l) text(ctx, k.l, x + bw / 2, bottom + lblH * .85, { size: lblH * .9, font: bf, weight: k.today ? 800 : 700, color: k.today ? pal.ink : pal.sub, align: "center", max: bw + gp * 2 });
  });
}

// ---------------------------------------------------------------- recap card: last 7 / 30 days
function drawRecap(ctx, d, pal, W, H) {
  const L = layout(d.shape, W, H, [.9, 2.2, 3.1, 2.8], [120, 300, 300, 290], ["head", "ses", "chips", "chart"], d.shape === "story" ? .28 : d.shape === "portrait" ? .26 : .19), pad = L.pad, cw = W - pad * 2, hf = pal.hf, bf = pal.bf;
  drawHead(ctx, L, pal, W, d.avatar, d.title, d.date);
  { const { y, h } = L.ses; tile(ctx, pad, y, cw, h, pal);
    const inner = h < 200 ? 26 : 34, rD = Math.min(h - inner * 2, 230), r0 = rD / 2, rcx = pad + cw - inner - r0, rcy = y + h / 2, tw = cw - inner * 2 - rD - 30;
    text(ctx, d.label, pad + inner, y + inner + h * .06, { size: Math.min(h * .115, 30), font: bf, weight: 800, color: pal.sub, max: tw });
    text(ctx, d.total, pad + inner, y + h * .63, { size: Math.min(h * .46, 150), font: hf, weight: 700, color: pal.ink, max: tw });
    text(ctx, d.sub, pad + inner, y + h - inner - h * .02, { size: Math.min(h * .115, 30), font: bf, weight: 700, color: pal.sub, max: tw });
    const lw = Math.max(14, r0 * .17); ring(ctx, rcx, rcy, r0 - lw / 2, lw, d.studied / d.n, pal);
    text(ctx, `${d.studied}/${d.n}`, rcx, rcy - r0 * .04, { size: r0 * .5, font: hf, weight: 700, color: pal.ink, align: "center", base: "middle", max: r0 * 1.2 });
    text(ctx, "days studied", rcx, rcy + r0 * .42, { size: Math.max(14, r0 * .17), font: bf, weight: 800, color: pal.sub, align: "center", base: "middle", max: r0 * 1.3 }); }
  { const { y, h } = L.chips, g2 = 22, tw = (cw - g2) / 2, th = (h - g2) / 2;
    d.tiles.forEach((t, i) => drawStat(ctx, pad + (i % 2) * (tw + g2), y + Math.floor(i / 2) * (th + g2), tw, th, pal, t)); }
  drawBars(ctx, pad, L.chart.y, cw, L.chart.h, pal, d);
  drawScene(ctx, pad, L.garden.y, cw, L.garden.h, d.garden, pal);
  text(ctx, "🍓 MN Study Tracker", W / 2, L.stampY, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9 });
}

// ---------------------------------------------------------------- milestone card: pet evolved / streak record / couple level
function drawMilestone(ctx, d, pal, W, H) {
  const L = layout(d.shape, W, H, [1, 6, 1.1], [120, 520, 130], ["head", "hero", "chips"]), pad = L.pad, cw = W - pad * 2, hf = pal.hf, bf = pal.bf;
  drawHead(ctx, L, pal, W, d.avatar, `${d.name}'s big moment`, d.date);
  { const { y, h } = L.hero, cx = pad + cw / 2, es = Math.min(h * .36, 250), cyE = y + h * .36; tile(ctx, pad, y, cw, h, pal);
    ctx.save(); rr(ctx, pad, y, cw, h, 34); ctx.clip(); glow(ctx, cx, cyE, Math.min(cw, h) * .55, pal.glow1, .8); ctx.restore();
    const R = seeded(19), sp = d.spark && d.spark.length ? d.spark : ["✨"];
    for (let i = 0; i < 18; i++) { // sparkles sprinkled around (never on top of the big emoji)
      const sx = pad + 36 + R() * (cw - 72), sy = y + 34 + R() * (h * .5), sz = 20 + R() * 22, al = .45 + R() * .5, rot = (R() - .5) * .8;
      if (Math.abs(sx - cx) < es * 1.15 && Math.abs(sy - cyE) < es * .75) continue;
      emoji(ctx, sp[i % sp.length], sx, sy, sz, { alpha: al, rot });
    }
    if (d.from) { // evolution: old form → new form (+ accessory)
      emoji(ctx, d.from, cx - es * .8, cyE + es * .12, es * .55, { alpha: .5 });
      text(ctx, "→", cx - es * .3, cyE, { size: es * .3, font: bf, weight: 800, color: pal.main, align: "center", base: "middle" });
      emoji(ctx, d.emo, cx + es * .5, cyE, es);
      if (d.acc) emoji(ctx, d.acc, cx + es * .5, cyE - es * .62, es * .42);
    } else emoji(ctx, d.emo, cx, cyE, es);
    text(ctx, d.title, cx, y + h * .75, { size: Math.min(h * .115, 58), font: hf, weight: 700, color: pal.ink, align: "center", base: "middle", max: cw - 80 });
    text(ctx, d.sub, cx, y + h * .88, { size: Math.min(h * .07, 32), font: bf, weight: 800, color: pal.sub, align: "center", base: "middle", max: cw - 80 }); }
  { const { y, h } = L.chips, cwid = (cw - 22) / 2;
    d.chips.forEach(([lab, val], i) => {
      const x = pad + i * (cwid + 22); tile(ctx, x, y, cwid, h, pal); const fs = Math.min(h * .46, 54);
      text(ctx, lab, x + 28, y + h / 2, { size: Math.min(h * .3, 28), font: bf, weight: 800, color: pal.sub, base: "middle" });
      ctx.font = `700 ${Math.min(h * .3, 28)}px ${bf}`; const lw = ctx.measureText(lab).width;
      text(ctx, val, x + cwid - 28, y + h / 2, { size: fs, font: hf, weight: 700, color: pal.ink, align: "right", base: "middle", max: cwid - 56 - lw - 10 });
    }); }
  drawScene(ctx, pad, L.garden.y, cw, L.garden.h, d.garden, pal);
  text(ctx, "🍓 MN Study Tracker", W / 2, L.stampY, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9 });
}

// ---------------------------------------------------------------- board card: the shared to-do list, drawn in the board's own style (js/board.js)
const K = "rgba(0,0,0,1)", Wt = "rgba(255,255,255,1)";
const hexc = h => { const n = parseInt(h.replace("#", "").replace(/^(.)(.)(.)$/, "$1$1$2$2$3$3"), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},1)`; };
const ncol = (c, pal) => { const v = COLORS[c] || COLORS[0]; return v[0] === "-" ? pal[v.slice(2)] : hexc(v); };
const FACES = ["• ᴗ •", "> ᴗ <", "^ ᴗ ^"], STARS = ["★", "★★", "★★★"];
const BSKIN = { western: { f: '"Special Elite","Courier New",monospace', w: 400, hd: "#fbe9b7", ink: "#4a2f14", hf: "Rye,Georgia,serif" }, cork: { hd: "#4a2f14", ink: "#3d3326" }, chalk: { hd: "#f2f2e8", ink: "#24302c" }, notebook: { hd: "#4a4458", ink: "#4a4458" } };

function flow(ctx, notes, innerW, s, faces, fnt, fw) { // lay the notes out left to right, wrapping like on the board
  const fs = 30 * s, lh = fs * 1.28, padX = 20 * s, padY = 15 * s, gx = 18 * s, gy = 24 * s, faceH = faces ? 24 * s : 0, maxT = innerW - padX * 2;
  ctx.font = `${fw} ${fs}px ${fnt}`; let x = 0, y = 0, rowH = 0; const items = [];
  for (const n of notes) {
    let lines = [], cur = "";
    for (const w of String(n.t).split(/\s+/)) { const t = cur ? cur + " " + w : w; if (!cur || ctx.measureText(t).width <= maxT) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] += "…"; }
    const tw = Math.min(maxT, Math.max(...lines.map(l => ctx.measureText(l).width))), w = tw + padX * 2, h = lines.length * lh + padY * 2 + (n.more ? 0 : faceH);
    if (x > 0 && x + w > innerW) { x = 0; y += rowH + gy; rowH = 0; }
    items.push({ n, x, y, w, h, lines, lh, padX, padY }); x += w + gx; rowH = Math.max(rowH, h);
  }
  return { items, h: items.length ? y + rowH : 0 };
}

function drawPanel(ctx, st, B, x, y, w, h, s, pal) { // the lane: wooden planks / cork / chalkboard / lined paper / cute card
  const R = st === "western" ? 16 : st === "notebook" ? 14 : st === "cork" || st === "chalk" ? 18 : 34, bg = ncol(B.bg, pal), rnd = seeded(7);
  if (st === "western" || st === "cork" || st === "chalk") { rr(ctx, x, y + 7, w, h, R); ctx.fillStyle = st === "western" ? "#3b2410" : st === "cork" ? "#5a3818" : "#6d4a26"; ctx.fill(); }
  ctx.save(); rr(ctx, x, y, w, h, R); ctx.clip();
  if (st === "western") { ctx.fillStyle = "#b07a43"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#8f5e2f"; for (let yy = y + 28 * s; yy < y + h; yy += 28 * s) ctx.fillRect(x, yy, w, 3); }
  else if (st === "cork") { ctx.fillStyle = "#c99a62"; ctx.fillRect(x, y, w, h); for (let i = 0; i < w * h / 240; i++) { ctx.fillStyle = rnd() < .5 ? "rgba(0,0,0,.16)" : "rgba(255,255,255,.2)"; ctx.fillRect(x + rnd() * w, y + rnd() * h, 2.5, 2.5); } }
  else if (st === "chalk") { ctx.fillStyle = "#2d3d38"; ctx.fillRect(x, y, w, h); }
  else if (st === "notebook") { ctx.fillStyle = "#fffdf5"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#a9cdee"; for (let yy = y + 28 * s; yy < y + h; yy += 28 * s) ctx.fillRect(x, yy, w, 2); ctx.fillStyle = "rgba(255,138,138,.65)"; ctx.fillRect(x + 46 * s, y, 3, h); ctx.fillStyle = "#d6dbe0"; for (let yy = y + 36 * s; yy < y + h; yy += 70 * s) { ctx.beginPath(); ctx.arc(x + 20 * s, yy, 9 * s, 0, Math.PI * 2); ctx.fill(); } }
  else { // cute / my own
    ctx.fillStyle = st === "own" ? mixc(pal.bg2, bg, .38) : pal.card; ctx.fillRect(x, y, w, h);
    if (st === "own" && B.pat !== "plain") { const pc = mixc(pal.bg2, bg, .6); ctx.fillStyle = pc; ctx.strokeStyle = pc; ctx.lineWidth = B.pat === "stripes" ? 10 * s : 2;
      if (B.pat === "dots") for (let yy = y + 8 * s; yy < y + h; yy += 16 * s) for (let xx = x + 8 * s; xx < x + w; xx += 16 * s) { ctx.beginPath(); ctx.arc(xx, yy, 2.2 * s, 0, Math.PI * 2); ctx.fill(); }
      else if (B.pat === "grid") for (let k = 0; k < Math.max(w, h); k += 22 * s) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k, y + h); ctx.moveTo(x, y + k); ctx.lineTo(x + w, y + k); ctx.stroke(); }
      else if (B.pat === "lines") for (let yy = y + 24 * s; yy < y + h; yy += 24 * s) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
      else for (let k = -h; k < w; k += 30 * s) { ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); ctx.stroke(); ctx.globalAlpha = 1; } }
  }
  ctx.restore();
  if (st === "western" || st === "cork" || st === "chalk") { rr(ctx, x + 5, y + 5, w - 10, h - 10, R - 4); ctx.lineWidth = 10; ctx.strokeStyle = st === "western" ? "#5a3818" : st === "cork" ? "#8a5a2b" : "#b98d5a"; ctx.stroke(); }
  else { rr(ctx, x, y, w, h, R); ctx.lineWidth = 3; ctx.strokeStyle = st === "notebook" ? "#d9d2c0" : st === "own" ? mixc(pal.card, bg, .7) : pal.edge; if (st === "cutie" || st === "own") ctx.setLineDash([14, 10]); ctx.stroke(); ctx.setLineDash([]); }
  if (st === "western") for (const [nx, ny] of [[x + 24, y + 24], [x + w - 24, y + 24], [x + 24, y + h - 24], [x + w - 24, y + h - 24]]) { ell(ctx, nx, ny, 7, 7, "#8d8d8d"); ell(ctx, nx - 2, ny - 2, 3, 3, "#ddd"); }
}

function drawNote(ctx, st, it, ox, oy, s, B, pal, skin, lane, fnt, fw) { // one sticky note: paper, tape / pin / nail / magnet, text, face, sticker, author
  const n = it.n, w = it.w, h = it.h, x = ox + it.x, y = oy + it.y;
  if (n.more) { rr(ctx, x, y, w, h, 18 * s); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fill(); text(ctx, n.t, x + w / 2, y + h / 2, { size: 28 * s, font: pal.bf, weight: 800, color: skin.hd || pal.ink, align: "center", base: "middle", max: w - 10 }); return; }
  const col = ncol(n.c, pal), ink = skin.ink || pal.ink, cute = st === "cutie" || st === "own" || st === "notebook";
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((n.r || 0) * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
  const R = st === "western" ? 4 : st === "cork" ? 6 : st === "chalk" ? 16 * s : st === "notebook" ? 12 * s : 22 * s;
  rr(ctx, 0, 5 * s, w, h, R); ctx.fillStyle = st === "chalk" ? "rgba(0,0,0,.4)" : st === "western" ? "rgba(0,0,0,.32)" : mixc(col, K, .25).replace(/,[\d.]+\)$/, ",.35)"); ctx.fill(); // shadow
  rr(ctx, 0, 0, w, h, R);
  ctx.fillStyle = st === "western" ? mixc(hexc("#f4e4bb"), col, .24) : st === "cork" ? mixc(hexc("#fffdf6"), col, .18) : st === "chalk" ? mixc(col, Wt, .2) : st === "notebook" ? mixc(Wt, col, .38) : mixc(pal.bg2, col, .3); ctx.fill();
  ctx.lineWidth = 3 * s; ctx.strokeStyle = st === "chalk" ? "rgba(255,255,255,.85)" : st === "western" ? "rgba(139,90,43,.5)" : st === "cork" ? mixc(hexc("#e8dcc4"), col, .4) : st === "notebook" ? mixc(Wt, col, .6) : mixc(pal.bg2, col, .55);
  if (st === "chalk") ctx.setLineDash([10 * s, 8 * s]); if (st === "western") { ctx.save(); ctx.beginPath(); ctx.rect(9 * s, 9 * s, w - 18 * s, h - 18 * s); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } else ctx.stroke(); ctx.setLineDash([]);
  if (st === "western") { ctx.fillStyle = col; ctx.fillRect(0, 0, 11 * s, h); }
  if (cute) { ctx.save(); ctx.translate(w / 2, 0); ctx.rotate(-4 * Math.PI / 180); ctx.fillStyle = mixc(col, Wt, .25); ctx.fillRect(-40 * s, -13 * s, 80 * s, 26 * s); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.rect(-40 * s, -13 * s, 80 * s, 26 * s); ctx.clip(); for (let k = -60; k < 60; k += 11 * s) { ctx.beginPath(); ctx.moveTo(k * 1, 14 * s); ctx.lineTo(k + 26 * s, -14 * s); ctx.stroke(); } ctx.restore(); }
  else if (st === "western") { ell(ctx, w / 2, 14 * s, 9 * s, 9 * s, "#6b6b6b"); ell(ctx, w / 2 - 2 * s, 12 * s, 4 * s, 4 * s, "#eee"); }
  else if (st === "cork") { ell(ctx, w / 2, 2 * s + 3 * s, 15 * s, 15 * s, "rgba(0,0,0,.25)"); ell(ctx, w / 2, 0, 15 * s, 15 * s, col); ell(ctx, w / 2 - 5 * s, -5 * s, 5 * s, 5 * s, "rgba(255,255,255,.6)"); }
  else { ell(ctx, w / 2, 0, 14 * s, 14 * s, "#e6e6e6"); ell(ctx, w / 2 - 4 * s, -4 * s, 4 * s, 4 * s, "#fff"); }
  const top = st === "cork" || st === "chalk" ? 2 * s : 0, x0 = st === "western" ? it.padX + 4 * s : it.padX;
  it.lines.forEach((l, i) => text(ctx, l, x0, it.padY + top + it.lh * (i + .5), { size: 30 * s, font: fnt, weight: fw, color: ink, base: "middle", max: w - x0 - it.padX + 4 * s }));
  if (B.faces) text(ctx, st === "western" ? STARS[lane] : FACES[lane], w - it.padX, h - it.padY - 4 * s, { size: 20 * s, font: pal.bf, weight: 800, color: ink, alpha: .55, align: "right", base: "middle" });
  if (n.i) { ctx.save(); ctx.translate(2 * s, h - 2 * s); ctx.rotate(-12 * Math.PI / 180); emoji(ctx, n.i, 0, 0, 46 * s); ctx.restore(); }
  if (n.e) { ell(ctx, w - 4 * s, 2 * s, 18 * s, 18 * s, "rgba(255,255,255,.95)"); emoji(ctx, n.e, w - 4 * s, 3 * s, 24 * s); }
  ctx.restore();
}

function drawBoard(ctx, d, pal, W, H) {
  const B = d.board, st = B.style, skin = BSKIN[st] || {}, pad = 54, gap = 22, cw = W - pad * 2, hf = pal.hf, bf = pal.bf, fnt = skin.f || bf, fw = skin.w || 700, sq = d.shape === "square";
  drawHead(ctx, { head: { y: pad, h: sq ? 92 : 108 }, pad }, pal, W, d.avatar, "our to-do board", d.date);
  const total = B.lanes.reduce((a, l) => a + l.notes.length, 0), done = B.lanes[2].notes.length, ph = sq ? 92 : 118; let y = pad + (sq ? 92 : 108) + gap;
  { tile(ctx, pad, y, cw, ph, pal); const inner = 32;
    text(ctx, "TASKS DONE", pad + inner, y + ph * .3, { size: Math.min(ph * .2, 26), font: bf, weight: 800, color: pal.sub, base: "middle" });
    text(ctx, `${done}/${total}`, pad + inner, y + ph * .68, { size: ph * .42, font: hf, weight: 700, color: pal.ink, base: "middle", max: cw * .36 });
    const bx = pad + cw * .42, bw = cw - cw * .42 - inner, bh = 28, by = y + ph / 2 - bh / 2;
    rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = pal.bg2; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = pal.edge; ctx.stroke();
    if (total && done) { const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, pal.main); g.addColorStop(1, pal.alt); rr(ctx, bx, by, Math.max(bh, bw * done / total), bh, bh / 2); ctx.fillStyle = g; ctx.fill(); }
    if (total && done === total) emoji(ctx, "🎉", bx + bw - 6, by - 14, 36); }
  y += ph + gap;
  const avail = H - pad - 54 - gap - y, show = B.lanes.map(l => l.notes.length); let s = 1, fl;
  const innerW = sc => st === "notebook" ? cw - 62 * sc - 28 * sc : cw - 56 * sc, laneH = (f, sc) => 28 * sc + 58 * sc + Math.max(f.h, 48 * sc) + 28 * sc;
  const build = () => { fl = B.lanes.map((l, i) => { const ns = l.notes.slice(0, show[i]); if (show[i] < l.notes.length) ns.push({ t: `+${l.notes.length - show[i]} more`, more: true }); return flow(ctx, ns, innerW(s), s, B.faces, fnt, fw); }); return fl.reduce((a, f) => a + laneH(f, s), 0) + gap * 2; };
  for (const sc of [1, .9, .8, .72, .64, .58]) { s = sc; if (build() <= avail) break; }
  for (let g = 0; g < 120 && build() > avail; g++) { let k = -1; show.forEach((n, i) => { if (n > 1 && (k < 0 || n >= show[k])) k = i; }); if (k < 0) break; show[k]--; }
  const add = Math.min(Math.max(0, avail - build()) / 3, 230 * s);
  B.lanes.forEach((l, i) => {
    const hh = laneH(fl[i], s) + add, ox = pad + (st === "notebook" ? 62 * s : 28 * s), hd = skin.hd || pal.ink;
    drawPanel(ctx, st, B, pad, y, cw, hh, s, pal);
    const title = st === "western" ? `${l.e} ${l.name}`.toUpperCase() : `${l.e} ${l.name}`, tf = skin.hf || hf;
    text(ctx, title, ox, y + 28 * s + 29 * s, { size: 34 * s, font: tf, weight: 700, color: hd, base: "middle", max: cw * .6 });
    ctx.font = `700 ${34 * s}px ${tf}`; const tw = Math.min(ctx.measureText(title).width, cw * .6), cx0 = ox + tw + 16 * s, cs = 38 * s;
    rr(ctx, cx0, y + 28 * s + 29 * s - cs / 2, cs + 10 * s, cs, cs / 2); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fill();
    text(ctx, String(l.notes.length), cx0 + (cs + 10 * s) / 2, y + 28 * s + 30 * s, { size: 24 * s, font: bf, weight: 800, color: hd, align: "center", base: "middle" });
    const oy = y + 28 * s + 58 * s;
    if (!l.notes.length) text(ctx, "nothing here yet ✨", ox, oy + 22 * s, { size: 28 * s, font: bf, weight: 700, color: hd, alpha: .7, base: "middle" });
    fl[i].items.forEach(it => drawNote(ctx, st, it, ox, oy, s, B, pal, skin, i, fnt, fw));
    y += hh + gap;
  });
  text(ctx, "🍓 MN Study Tracker", W / 2, H - pad - 27 + 8, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9 });
}

export function drawCard(cv, d, pal) {
  const [W, H] = SIZES[d.shape] || SIZES.square; cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"), L = layout(d.shape, W, H), hf = pal.hf, bf = pal.bf, pad = L.pad, cw = W - pad * 2;
  // background: theme gradient + soft blobs + polka dots
  const bg = ctx.createLinearGradient(0, 0, W * .6, H); bg.addColorStop(0, pal.bg1); bg.addColorStop(1, pal.bg2); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  glow(ctx, W * .12, H * .08, W * .55, pal.glow1, .55); glow(ctx, W * .95, H * .55, W * .6, pal.glow2, .5);
  ctx.fillStyle = pal.main; ctx.globalAlpha = .07; for (let yy = 30; yy < H; yy += 70) for (let xx = (yy / 70 % 2) * 35 + 20; xx < W; xx += 70) { ctx.beginPath(); ctx.arc(xx, yy, 5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;

  if (d.kind === "together") { drawTogether(ctx, d, pal, W, H); return; }
  if (d.kind === "recap") { drawRecap(ctx, d, pal, W, H); return; }
  if (d.kind === "milestone") { drawMilestone(ctx, d, pal, W, H); return; }
  if (d.kind === "board") { drawBoard(ctx, d, pal, W, H); return; }
  // header: avatar + title (left), date (right)
  { const { y, h } = L.head, av = Math.min(h, 84), cy = y + h / 2;
    ctx.beginPath(); ctx.arc(pad + av / 2, cy, av / 2, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = pal.edge; ctx.stroke();
    emoji(ctx, d.avatar, pad + av / 2, cy + 2, av * .56);
    ctx.font = `600 ${Math.min(h * .7, 46)}px ${bf}`;
    const dateW = Math.min(cw * .34, 330); text(ctx, d.date, W - pad, cy, { size: Math.min(h * .5, 30), font: bf, weight: 700, color: pal.sub, align: "right", base: "middle", max: dateW });
    text(ctx, `${d.name}'s study day`, pad + av + 20, cy, { size: Math.min(h * .72, 48), font: hf, weight: 700, color: pal.ink, base: "middle", max: cw - av - 40 - dateW }); }

  // session tile: label, big time, sub, goal ring (or the pet when there is no goal)
  { const { y, h } = L.ses; tile(ctx, pad, y, cw, h, pal);
    const inner = h < 200 ? 26 : 34, rD = Math.min(h - inner * 2, 230), rr0 = rD / 2, rcx = pad + cw - inner - rr0, rcy = y + h / 2, tw = cw - inner * 2 - rD - 30;
    text(ctx, d.session.label.toUpperCase(), pad + inner, y + inner + h * .06, { size: Math.min(h * .115, 30), font: bf, weight: 800, color: pal.sub, max: tw });
    text(ctx, d.session.time, pad + inner, y + h * .63, { size: Math.min(h * .46, 150), font: hf, weight: 700, color: pal.ink, max: tw });
    text(ctx, d.session.sub, pad + inner, y + h - inner - h * .02, { size: Math.min(h * .115, 30), font: bf, weight: 700, color: pal.sub, max: tw });
    if (d.session.pct == null) { ctx.beginPath(); ctx.arc(rcx, rcy, rr0 - 6, 0, Math.PI * 2); ctx.fillStyle = pal.tint; ctx.fill(); emoji(ctx, d.pet, rcx, rcy + 4, rr0 * 1.05); }
    else {
      const lw = Math.max(14, rr0 * .17); ring(ctx, rcx, rcy, rr0 - lw / 2, lw, d.session.pct, pal);
      text(ctx, `${Math.round(d.session.pct * 100)}%`, rcx, rcy - rr0 * .04, { size: rr0 * .5, font: hf, weight: 700, color: pal.ink, align: "center", base: "middle", max: rr0 * 1.2 });
      text(ctx, d.session.pct >= 1 ? "goal reached 🎉" : d.session.goalText, rcx, rcy + rr0 * .42, { size: Math.max(14, rr0 * .17), font: bf, weight: 800, color: pal.sub, align: "center", base: "middle", max: rr0 * 1.3 });
    } }

  // two chips: today + streak
  { const { y, h } = L.chips, cwid = (cw - 22) / 2;
    [[d.todayLabel, d.todayText], ["streak", d.streakText]].forEach(([lab, val], i) => {
      const x = pad + i * (cwid + 22); tile(ctx, x, y, cwid, h, pal); const fs = Math.min(h * .46, 54);
      text(ctx, lab, x + 28, y + h / 2, { size: Math.min(h * .3, 28), font: bf, weight: 800, color: pal.sub, base: "middle" });
      ctx.font = `700 ${Math.min(h * .3, 28)}px ${bf}`; const lw = ctx.measureText(lab).width;
      text(ctx, val, x + cwid - 28, y + h / 2, { size: fs, font: hf, weight: 700, color: pal.ink, align: "right", base: "middle", max: cwid - 56 - lw - 10 });
    }); }

  // 7-day chart
  { const { y, h } = L.chart; tile(ctx, pad, y, cw, h, pal); const inner = h < 200 ? 24 : 30, ts = Math.min(h * .13, 28);
    text(ctx, "LAST 7 DAYS", pad + inner, y + inner + ts * .6, { size: ts, font: bf, weight: 800, color: pal.sub });
    text(ctx, d.weekTotal, pad + cw - inner, y + inner + ts * .6, { size: ts * 1.15, font: hf, weight: 700, color: pal.ink, align: "right" });
    const top = y + inner + ts * 1.35 + 8, lblH = Math.min(h * .13, 30), bottom = y + h - inner * .8 - lblH, bh = Math.max(20, bottom - top), n = d.week.length, gp = 18, bw = (cw - inner * 2 - gp * (n - 1)) / n, mx = Math.max(1, ...d.week.map(k => k.v));
    d.week.forEach((k, i) => {
      const x = pad + inner + i * (bw + gp), v = k.v ? Math.max(.06, k.v / mx) : 0, bhh = Math.max(8, v * (bh - (bh > 90 ? 26 : 0)));
      rr(ctx, x, bottom - 8, bw, 8, 4); ctx.fillStyle = pal.tint; ctx.fill();
      if (v) { rr(ctx, x, bottom - bhh, bw, bhh, Math.min(14, bw / 2)); const gr = ctx.createLinearGradient(0, bottom - bhh, 0, bottom); gr.addColorStop(0, k.today ? pal.main : pal.alt); gr.addColorStop(1, k.today ? pal.alt : pal.tint); ctx.fillStyle = gr; ctx.fill(); }
      if (bh > 90 && k.v) text(ctx, k.t, x + bw / 2, bottom - bhh - 8, { size: Math.min(lblH * .85, 22), font: bf, weight: 800, color: pal.sub, align: "center", max: bw + gp - 2 });
      text(ctx, k.l, x + bw / 2, bottom + lblH * .85, { size: lblH * .9, font: bf, weight: k.today ? 800 : 700, color: k.today ? pal.ink : pal.sub, align: "center" });
    }); }

  // garden snapshot (whole garden shrunk to fit)
  drawScene(ctx, pad, L.garden.y, cw, L.garden.h, d.garden, pal);

  // stamp
  text(ctx, "🍓 MN Study Tracker", W / 2, L.stampY, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9 });
}
