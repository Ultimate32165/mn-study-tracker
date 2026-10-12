import { treeParts, cellPos, SPECIES, GRID } from "./forest.js";
import { COLORS } from "./board.js";
// Photocard: draws a shareable "cozy dashboard" image on a canvas.
// Pure drawing code: numbers and colours in, pixels out. No DOM, no Firebase (carddata.js collects the data and the theme colours).
// STYLES (see the "card styles" section near the bottom) change the whole look: background, tiles, frame, decorations, accent colour.
// The garden is redrawn from the same data as the live scene, shrunk to fit. This file draws an OLD-SIZE (980x680) picture of the whole garden: the live garden is 3x bigger, but carddata.js (gardenSnap) converts every y back to the old frame, so WW/WH/POND/PATH_PTS below do NOT follow js/garden-state.js any more. Leave them alone.
export const SIZES = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] };
export const GSIZES = { ...SIZES, wide: [1470, 1020] }; // the garden card: same layout sizes (+ a wide one), but the canvas is drawn GQ times bigger (see drawCard)
const GQ = 2;
const WW = 980, WH = 680, POND = { x: 300, y: 500, rx: 80, ry: 44 }; // the card's own old-size garden frame (see the note at the top)
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
const FLAT = new Set(["bed", "blanket", "lily", "rug", "bridge", "pbed", "toys", "bowl"]); // items that lie on the ground (keep in sync with ITEMS in decor.js)
const DEF_L = { g: "meadow", f: "cute", b: "none", p: "none" }; // garden style: ground / fence / border / path (see js/land.js + LAND in garden-state.js)
const PATH_PTS = [[20, 664], [170, 628], [330, 630], [480, 604], [620, 566], [760, 546], [880, 500], [975, 468]]; // old-size copy of the path (the live garden's PATH_PTS is this x3, see garden-state.js)
function drawGround(ctx, k, X, Y, s, x, w, bottom) { // specks on the grass: flowers / sand grains / snow sparkles
  if (k === "meadow") return;
  const Q = seeded(41), n = k === "flowers" ? 110 : 150;
  for (let i = 0; i < n; i++) {
    const px = x + Q() * w, py = Y(268) + Q() * (bottom - Y(268)), r = Math.max(1.4, (k === "flowers" ? 2.8 : 2) * s * 1.5);
    ctx.fillStyle = k === "flowers" ? ["#ff9ccb", "#ffffff", "#ffd36f"][i % 3] : k === "sand" ? "rgba(150,110,50,.28)" : i % 2 ? "rgba(255,255,255,.95)" : "rgba(150,180,230,.35)";
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}
function drawFence(ctx, k, X, Y, s, pal) { // the back fence: world x 520-980, y 204-238 (same spot as .gfence in the CSS)
  if (k === "none") return;
  const x0 = X(520), w = 460 * s;
  if (k === "stone") {
    rr(ctx, x0, Y(210), w, 28 * s, 6 * s); ctx.fillStyle = pal.stone; ctx.fill(); ctx.fillStyle = "rgba(60,70,90,.22)";
    for (let fx = 22; fx < 460; fx += 24) ctx.fillRect(x0 + fx * s, Y(210), 2 * s, 28 * s);
    ctx.fillRect(x0, Y(223), w, 2 * s); return;
  }
  if (k === "hedge") {
    rr(ctx, x0, Y(200), w, 38 * s, 16 * s); ctx.fillStyle = pal.hedge; ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.16)";
    for (let fx = 8; fx < 460; fx += 22) for (let fy = 6; fy < 36; fy += 16) { ctx.beginPath(); ctx.arc(x0 + fx * s, Y(200 + fy), 4 * s, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  const col = k === "wood" ? pal.wood : k === "bamboo" ? pal.bamboo : pal.fc, pw = k === "bamboo" ? 9 : 8, gap = k === "bamboo" ? 14 : 16;
  ctx.fillStyle = col;
  for (let fx = 0; fx < 460; fx += gap) { rr(ctx, x0 + fx * s, Y(204), pw * s, 34 * s, 2 * s); ctx.fill(); }
  ctx.fillRect(x0, Y(212), w, 5 * s); ctx.fillRect(x0, Y(224), w, 5 * s);
}
function drawPath(ctx, k, X, Y, s, pal) { // a smooth trail across the front of the garden (same curve as the live SVG path)
  if (k === "none") return; const p = PATH_PTS;
  ctx.save(); ctx.beginPath(); ctx.moveTo(X(p[0][0]), Y(p[0][1]));
  for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(X(p[i][0]), Y(p[i][1]), X((p[i][0] + p[i + 1][0]) / 2), Y((p[i][1] + p[i + 1][1]) / 2));
  ctx.lineTo(X(p[p.length - 1][0]), Y(p[p.length - 1][1])); ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (k === "dirt") { ctx.strokeStyle = pal.dirt; ctx.lineWidth = 20 * s; }
  else if (k === "stones") { ctx.strokeStyle = pal.stone; ctx.lineWidth = 16 * s; ctx.setLineDash([0, 34 * s]); }
  else if (k === "cobble") { ctx.strokeStyle = pal.stone; ctx.lineWidth = 24 * s; ctx.lineCap = "butt"; ctx.setLineDash([10 * s, 3 * s]); }
  else { ctx.strokeStyle = "#ffb3d1"; ctx.lineWidth = 10 * s; ctx.setLineDash([0, 22 * s]); }
  ctx.stroke(); ctx.restore();
}
function drawBorder(ctx, k, X, Y, s, x, w, bottom, ox, pal) { // a row along the front edge (same spacing as js/land.js borderHtml)
  if (k === "none") return;
  if (k === "hedge") { rr(ctx, x, Y(656), w, bottom - Y(656) + 8, 12 * s); ctx.fillStyle = pal.hedge; ctx.fill(); return; }
  const E = k === "mushrooms" ? ["🍄"] : ["🌷", "🌼", "🌸", "🌻"], SW = [16, 12, 20, 14], i0 = -Math.ceil(Math.max(0, ox - x) / (32 * s));
  for (let fx = 14 + i0 * 32, i = i0; X(fx) < x + w; fx += 32, i++) {
    if (k === "stones") ell(ctx, X(fx), Y(673), SW[((i % 4) + 4) % 4] / 2 * s, 4.5 * s, pal.stone);
    else emoji(ctx, E[((i % E.length) + E.length) % E.length], X(fx), Y(670), (k === "mushrooms" ? 20 : 18) * s);
  }
}
function drawItem(ctx, id, px, py, s, pal, night) {
  ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
  const flat = FLAT.has(id);
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
  } else if (id === "campfire") {
    if (night) glow(ctx, 0, -22, 50, "255,170,80", .7);
    ctx.save(); ctx.rotate(.25); rr(ctx, -17, -9, 34, 8, 4); ctx.fillStyle = pal.woodD; ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(-.25); rr(ctx, -17, -9, 34, 8, 4); ctx.fillStyle = pal.wood; ctx.fill(); ctx.restore();
    emoji(ctx, "🔥", 0, -22, 28);
  } else if (id === "tent") {
    emoji(ctx, "⛺", 0, -27, 54);
  } else if (id === "rug") {
    ctx.globalAlpha = .6; ell(ctx, 0, -16, 39, 17, pal.main); ctx.globalAlpha = 1; ell(ctx, 0, -16, 31, 12, pal.cloth);
    ctx.setLineDash([2, 5]); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -16, 29, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else if (id === "ctable") {
    ctx.fillStyle = pal.woodD; ctx.fillRect(-3, -24, 6, 24); rr(ctx, -14, -5, 28, 5, 2.5); ctx.fill();
    ell(ctx, 0, -24, 27, 9, pal.woodD); ell(ctx, 0, -27, 27, 9, pal.woodL); emoji(ctx, "☕", -9, -36, 17); emoji(ctx, "🍰", 9, -36, 17);
  } else if (id === "cherry") {
    rr(ctx, -5, -38, 10, 38, 4); ctx.fillStyle = pal.wood; ctx.fill();
    [[-17, -50, 19, "#ffb3d1"], [17, -56, 20, "#ffc2da"], [0, -64, 21, "#ffb3d1"], [-2, -48, 19, "#ff9ccb"]].forEach(([bx, by, br, c]) => ell(ctx, bx, by, br, br * .92, c));
    emoji(ctx, "🌸", -14, -52, 11); emoji(ctx, "🌸", 12, -60, 11);
  } else if (id === "windmill") {
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.lineTo(10, -46); ctx.lineTo(-10, -46); ctx.closePath(); ctx.fillStyle = pal.cloth; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -44, 13, Math.PI, 0); ctx.fillStyle = pal.main; ctx.fill();
    ctx.save(); ctx.translate(0, -44); ctx.rotate(.5); ctx.fillStyle = pal.woodL; rr(ctx, -2, -24, 4, 48, 2); ctx.fill(); ctx.rotate(Math.PI / 2); rr(ctx, -2, -24, 4, 48, 2); ctx.fill(); ctx.restore();
    ell(ctx, 0, -44, 4, 4, pal.woodD);
  } else if (id === "bridge") {
    rr(ctx, -40, -22, 80, 18, 8); ctx.fillStyle = pal.woodL; ctx.fill(); ctx.fillStyle = pal.wood; for (let i = 8; i < 80; i += 10) ctx.fillRect(-40 + i, -22, 2, 18);
    rr(ctx, -38, -28, 76, 5, 2.5); ctx.fillStyle = pal.woodD; ctx.fill();
  } else if (id === "mush") {
    emoji(ctx, "🍄", -9, -13, 28); emoji(ctx, "🍄", 11, -12, 24);
  } else if (id === "arch") {
    ctx.lineWidth = 3.7; ["#ff8fa3", "#ffd36f", "#9be37f", "#7fd0ff", "#b79cf5"].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(0, 0, 24.7 + i * 3.52, Math.PI, 0); ctx.stroke(); });
  } else if (id === "crystal") {
    const gem = (gx, gw, gh, c) => { ctx.beginPath(); ctx.moveTo(gx, -gh); ctx.lineTo(gx + gw / 2, -gh * .65); ctx.lineTo(gx + gw * .4, 0); ctx.lineTo(gx - gw * .4, 0); ctx.lineTo(gx - gw / 2, -gh * .65); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
    if (night) glow(ctx, 0, -22, 44, "183,156,245", .6);
    gem(-14, 22, 34, "#9a7be0"); gem(2, 26, 46, "#b79cf5"); gem(20, 16, 26, "#d3bfff");
  } else if (id === "flant") {
    [[-20, -16], [0, -36], [20, -22]].forEach(([lx, ly]) => { if (night) glow(ctx, lx, ly, 26, "255,200,110", .7); emoji(ctx, "🏮", lx, ly, 22); });
  } else if (id === "statue") {
    rr(ctx, -16, -14, 32, 14, 5); ctx.fillStyle = pal.stone; ctx.fill(); emoji(ctx, "🧚", 0, -32, 34);
  } else if (id === "pbed") {
    ctx.globalAlpha = .7; ell(ctx, 0, -15, 31, 15, pal.main); ctx.globalAlpha = 1; ell(ctx, 0, -15, 23, 10, pal.cloth); emoji(ctx, "🐾", 0, -15, 13);
  } else if (id === "toys") {
    emoji(ctx, "🎾", -19, -10, 18); emoji(ctx, "🧸", 0, -12, 22); emoji(ctx, "🦴", 20, -9, 18);
  } else if (id === "bowl") {
    rr(ctx, -19, -13, 38, 13, 6); ctx.fillStyle = pal.main; ctx.fill(); emoji(ctx, "🍖", 0, -17, 15);
  } else if (id === "phouse") {
    ctx.fillStyle = pal.cloth; rr(ctx, -23, -30, 46, 30, 3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-29, -28); ctx.lineTo(29, -28); ctx.lineTo(0, -54); ctx.closePath(); ctx.fillStyle = pal.main; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -11, 8, Math.PI, 0); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fillStyle = pal.woodD; ctx.fill();
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
  if (g.none) return; // the normal photocards can have no picture at the bottom (the garden has its own card)
  if (g.forest) return drawForest(ctx, x, y, w, h, g, pal);
  ctx.save(); rr(ctx, x, y, w, h, 36); ctx.clip();
  const s = Math.min(w / WW, h / WH), ox = x + (w - WW * s) / 2, oy = y + h - WH * s, X = v => ox + v * s, Y = v => oy + v * s, night = !!g.night, R = seeded(7), L = g.land || DEF_L;
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
  drawGround(ctx, L.g, X, Y, s, x, w, y + h);
  // fence
  drawFence(ctx, L.f, X, Y, s, pal);
  drawPath(ctx, L.p, X, Y, s, pal);
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
  drawBorder(ctx, L.b, X, Y, s, x, w, y + h, ox, pal);
  // things standing on the ground: flat items first, then everything else sorted by depth
  const flat = (g.items || []).filter(d => FLAT.has(d.i));
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

// ---------------------------------------------------------------- the garden card: only the garden (drawScene of the whole garden), on a canvas GQ times bigger than the others
function drawGardenCard(ctx, d, pal, W, H) {
  const g = d.garden, wide = d.shape === "wide", pad = wide ? 40 : 54, gap = wide ? 18 : 22, stamp = 54, cw = W - pad * 2, top = pad, bottom = H - pad - stamp, hf = pal.hf, bf = pal.bf;
  if (wide) { // the garden fills the card; the title and the date float on the sky
    drawScene(ctx, pad, top, cw, bottom - top, g, pal);
    const pill = (label, right, av) => {
      const h = 64, y = top + 22, mx = cw * .42; ctx.font = `700 34px ${hf}`; const w = Math.min(ctx.measureText(label).width, mx) + (av ? 96 : 44), x = right ? pad + cw - 22 - w : pad + 22;
      rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = "rgba(20,16,40,.45)"; ctx.fill();
      if (av) emoji(ctx, av, x + 38, y + h / 2 + 2, 36);
      text(ctx, label, x + (av ? 72 : 22), y + h / 2, { size: 34, font: hf, weight: 700, color: "rgba(255,255,255,1)", base: "middle", max: mx });
    };
    pill(d.title, false, d.avatar); pill(d.date, true);
  } else {
    const hh = 104, ch = d.shape === "story" ? 150 : 120, ph = d.shape === "story" ? 300 : 0, n = ph ? 4 : 3, avail = bottom - top;
    const heroH = Math.max(300, Math.min(Math.round(cw * .95), avail - hh - ch - ph - gap * (n - 1))), used = hh + heroH + ch + ph + gap * (n - 1); // a taller box would only be empty sky, so the block is centred instead
    let y = top + Math.max(0, (avail - used) / 2);
    drawHead(ctx, { head: { y, h: hh }, pad }, pal, W, d.avatar, d.title, d.date); y += hh + gap;
    drawScene(ctx, pad, y, cw, heroH, g, pal); y += heroH + gap;
    const tw = (cw - gap * 2) / 3; d.facts.forEach((t, i) => drawStat(ctx, pad + i * (tw + gap), y, tw, ch, pal, t)); y += ch + gap;
    if (ph) { // story: a row with the garden's pets
      tile(ctx, pad, y, cw, ph, pal); text(ctx, "THE GARDEN GANG", pad + 34, y + 46, { size: 26, font: bf, weight: 800, color: pal.sub, base: "middle" });
      const ps = g.pets.slice(0, 8), slot = (cw - 60) / Math.max(1, ps.length), sc = Math.min(2.4, slot / 70);
      ps.forEach((p, i) => drawPet(ctx, { ...p, flip: false, sleep: false }, pad + 30 + slot * (i + .5), y + ph - 52, sc, g.wx));
    }
  }
  text(ctx, stampTxt(), W / 2, H - pad - stamp / 2 + 8, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9, max: 900 });
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
  const t = ST.tile;
  if (t === "pop") { // sticker: hard coloured shadow + bold ink outline
    rr(ctx, x + 9, y + 11, w, h, rad(28)); ctx.fillStyle = pal.main; ctx.fill();
    rr(ctx, x, y, w, h, rad(28)); ctx.fillStyle = lum(pal.bg1) < .4 ? "rgba(38,28,82,1)" : pal.card; ctx.fill(); ctx.lineWidth = 5; // (solid on dark, so the hard shadow can not shine through) ctx.strokeStyle = pal.ink; ctx.stroke(); return;
  }
  if (t === "glass") { // frosted glass
    const dk = lum(pal.bg1) < .4;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.14)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; rr(ctx, x, y, w, h, rad(34)); ctx.fillStyle = dk ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.58)"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.shadowColor = "transparent"; // (a glow set by the caller, e.g. the "studying" tile, must not shine through the glass)
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, dk ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.55)"); g.addColorStop(.55, "rgba(255,255,255,0)"); rr(ctx, x, y, w, h, rad(34)); ctx.fillStyle = g; ctx.fill();
    rr(ctx, x, y, w, h, rad(34)); ctx.lineWidth = 3; ctx.strokeStyle = dk ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.95)"; ctx.stroke(); ctx.restore(); return;
  }
  if (t === "neon") { // glowing outline on a dark card
    ctx.save(); ctx.shadowColor = pal.main; ctx.shadowBlur = 22; rr(ctx, x, y, w, h, rad(34)); ctx.fillStyle = "rgba(34,26,78,.86)"; ctx.fill(); ctx.restore();
    rr(ctx, x, y, w, h, rad(34)); ctx.lineWidth = 3.5; ctx.strokeStyle = pal.main; ctx.stroke(); return;
  }
  if (t === "paper") { // scrapbook: a paper scrap with a piece of tape
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.16)"; ctx.shadowBlur = 14; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 7; rr(ctx, x, y, w, h, rad(10)); ctx.fillStyle = pal.card; ctx.fill(); ctx.restore();
    rr(ctx, x, y, w, h, rad(10)); ctx.lineWidth = 2.5; ctx.strokeStyle = pal.edge; ctx.stroke();
    if (w > 240) { ctx.save(); ctx.translate(x + w / 2, y + 2); ctx.rotate(((Math.round(x * 7 + y * 3) % 9) - 4) * Math.PI / 180); ctx.globalAlpha = .8; ctx.fillStyle = mixc(pal.alt, Wt, .45); ctx.fillRect(-46, -14, 92, 28); ctx.restore(); }
    return;
  }
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.10)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; rr(ctx, x, y, w, h, rad(34)); ctx.fillStyle = pal.card; ctx.fill(); ctx.restore();
  rr(ctx, x, y, w, h, rad(34)); ctx.strokeStyle = pal.edge; ctx.lineWidth = 3; ctx.stroke();
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
  const none = !!d.garden.none, gh = none ? 0 : Math.round(H * (d.shape === "story" ? .34 : d.shape === "portrait" ? .38 : .32)), gy = H - pad - stamp - gh;
  const avail = gy - gap - pad - 2 * gap, wt = [1, 4.8, 1.1], cap = none ? [150, 800, 170] : [120, 620, 130], sum = 6.9;
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
  text(ctx, stampTxt(), W / 2, H - pad - stamp / 2 + 8, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9, max: 900 });
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
  const L = layout(d.shape, W, H, [.9, 2.2, 3.1, 2.8], d.garden.none ? [150, 380, 380, 360] : [120, 300, 300, 290], ["head", "ses", "chips", "chart"], d.garden.none ? 0 : d.shape === "story" ? .28 : d.shape === "portrait" ? .26 : .19), pad = L.pad, cw = W - pad * 2, hf = pal.hf, bf = pal.bf;
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
  text(ctx, stampTxt(), W / 2, L.stampY, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9, max: 900 });
}

// ---------------------------------------------------------------- milestone card: pet evolved / streak record / couple level
function drawMilestone(ctx, d, pal, W, H) {
  const L = layout(d.shape, W, H, [1, 6, 1.1], d.garden.none ? [150, 760, 170] : [120, 520, 130], ["head", "hero", "chips"], d.garden.none ? 0 : undefined), pad = L.pad, cw = W - pad * 2, hf = pal.hf, bf = pal.bf;
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
  text(ctx, stampTxt(), W / 2, L.stampY, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9, max: 900 });
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
  text(ctx, stampTxt(), W / 2, H - pad - 27 + 8, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9, max: 900 });
}

// ---------------------------------------------------------------- card styles (the look of the WHOLE card, on top of the theme colours)
// bg = background pattern, tile = look of the white tiles, deco = overlay decorations, frame = the card is placed inside a frame (the content is re-laid-out to fit), dark = forces a dark palette.
export const STYLES = {
  classic: { label: "🍓 classic" },
  sticker: { label: "🎨 sticker", bg: "pop", tile: "pop", deco: "stars" },
  glass: { label: "🫧 glass", bg: "aurora", tile: "glass" },
  midnight: { label: "🌌 midnight", bg: "night", tile: "neon", dark: true, deco: "stars" },
  scrapbook: { label: "📎 scrapbook", bg: "grid", tile: "paper", deco: "tape" },
  gilded: { label: "👑 gilded", bg: "linen", deco: "double" },
  polaroid: { label: "📷 polaroid", frame: "polaroid" },
  film: { label: "🎞️ film", frame: "film" },
  ticket: { label: "🎫 ticket", frame: "ticket" },
  stamp: { label: "✉️ stamp", frame: "stamp" }
};
export const ACCENTS = { theme: null, pink: ["#ff6fa5", "#ffb0cf"], lilac: ["#8f6bf2", "#c7b5ff"], sky: ["#2f9cf0", "#9bd3ff"], mint: ["#22b98a", "#98ecc9"], sun: ["#ff9638", "#ffd18a"] }; // [main, light]; "theme" keeps the app theme's own colours
let ST = STYLES.classic; // the style being drawn right now (tile() reads it)
const MONO = '"Special Elite","Courier New",monospace';
const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return (.299 * r + .587 * g + .114 * b) / 255; };
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// more things the person can change (photocard.js builds the buttons from these tables; d.look = { style, accent, font, round, pat, stick, filt, dark, msg })
export const FONTS = { theme: { label: "🎀 theme", fam: null }, round: { label: "Fredoka", fam: "Fredoka" }, bubbly: { label: "Baloo", fam: '"Baloo 2"' }, clean: { label: "Nunito", fam: "Nunito" }, western: { label: "🤠 Rye", fam: "Rye" }, type: { label: "⌨️ typewriter", fam: '"Special Elite"' } }; // big text / numbers (fonts come from index.html)
export const CORNERS = { soft: "🔵 soft", sharp: "◻️ sharp", round: "⚪ extra round" };
export const PATTERNS = { auto: "✨ style's own", none: "none", dots: "dots", hearts: "hearts", stars: "stars", stripes: "stripes", checks: "checks", waves: "waves" };
const STK = { sparkle: ["✨", "⭐", "✨"], hearts: ["💖", "🌸", "💖"], space: ["🚀", "🪐", "⭐"], treats: ["🍓", "🧋", "🍰"], paws: ["🐾", "🦴", "🐾"] }; // emoji for the 3 corners
export const STICKERS = { auto: "✨ style's own", none: "none", sparkle: "✨ sparkle", hearts: "💖 hearts", space: "🚀 space", treats: "🍓 treats", paws: "🐾 paws" };
export const FILTERS = { none: "none", warm: "🌅 warm", cool: "❄️ cool", vintage: "📼 vintage", mono: "⚫ mono", vivid: "🌈 vivid", dreamy: "☁️ dreamy" };
let LK = {}; // the look being drawn right now (d.look)
const rad = r0 => ({ sharp: 10, round: 54 })[LK.round] || r0; // tile corner radius
const stampTxt = () => LK.msg || "🍓 MN Study Tracker";

function skin(pal, sty, acc) { // the palette actually used: theme colours, forced dark for "midnight", then the accent colour on top
  const p = { ...pal };
  if (sty.dark || LK.dark) Object.assign(p, { bg1: "rgba(20,18,52,1)", bg2: "rgba(38,28,82,1)", card: "rgba(255,255,255,0.10)", ink: "rgba(255,255,255,1)", sub: "rgba(214,208,255,0.8)", tint: "rgba(255,255,255,0.14)", edge: "rgba(255,255,255,0.3)", glow1: "130,100,255", glow2: "255,110,190" });
  const f = FONTS[LK.font]; if (f && f.fam) p.hf = f.fam + ", " + pal.hf;
  const a = ACCENTS[acc];
  if (a) { const m = hexc(a[0]), l = hexc(a[1]); p.main = m; p.alt = l; p.glow1 = l.match(/[\d.]+/g).slice(0, 3).join(","); p.tint = (sty.dark || LK.dark) ? l.replace(/[\d.]+\)$/, ".28)") : mixc(p.card, l, .32); }
  return p;
}
function paintBg(ctx, pal, W, H) {
  const bg = ST.bg, g = ctx.createLinearGradient(0, 0, W * .6, H), R = seeded(41), own = !LK.pat || LK.pat === "auto"; g.addColorStop(0, pal.bg1); g.addColorStop(1, pal.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (bg === "pop") { // bold confetti
    const cols = [pal.main, pal.alt, pal.live, pal.edge]; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; own && i < 46; i++) {
      const r = 14 + R() * 30, k = i % 4; ctx.save(); ctx.translate(R() * W, R() * H); ctx.rotate(R() * 6); ctx.globalAlpha = .4; ctx.fillStyle = ctx.strokeStyle = cols[k]; ctx.lineWidth = 7;
      if (k === 0) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); }
      else if (k === 1) { rr(ctx, -r, -r, r * 2, r * 2, 8); ctx.fill(); }
      else if (k === 2) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke(); }
      else { ctx.beginPath(); for (let j = 0; j < 6; j++) ctx.lineTo(-r + j * r / 2.5, (j % 2 ? -1 : 1) * r * .35); ctx.stroke(); }
      ctx.restore();
    }
  } else if (bg === "aurora") { // soft colour blobs + soap bubbles
    [[.15, .1, .7, pal.glow1, .75], [.9, .3, .65, pal.glow2, .7], [.2, .62, .6, "120,220,255", .55], [.85, .88, .7, "255,205,140", .55], [.5, .45, .45, "255,160,215", .4]].forEach(([fx, fy, fr, rgb, a]) => glow(ctx, W * fx, H * fy, W * fr, rgb, a));
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
    for (let i = 0; own && i < 14; i++) { const px = R() * W, py = R() * H, r = 24 + R() * 70; ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.3); ctx.stroke(); ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(px, py, r * .72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (bg === "night") { // starry sky
    glow(ctx, W * .15, H * .1, W * .6, pal.glow1, .5); glow(ctx, W * .95, H * .6, W * .65, pal.glow2, .35); glow(ctx, W * .86, H * .1, 170, "255,244,214", .5);
    if (own) {
      ctx.fillStyle = "#fff"; for (let i = 0; i < 140; i++) { ctx.globalAlpha = .25 + R() * .7; ctx.beginPath(); ctx.arc(R() * W, R() * H, .8 + R() * 2, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,244,214,.9)";
      for (let i = 0; i < 10; i++) { const px = R() * W, py = R() * H, r = 8 + R() * 10; ctx.beginPath(); ctx.moveTo(px, py - r); ctx.quadraticCurveTo(px, py, px + r, py); ctx.quadraticCurveTo(px, py, px, py + r); ctx.quadraticCurveTo(px, py, px - r, py); ctx.quadraticCurveTo(px, py, px, py - r); ctx.fill(); }
    }
  } else if (bg === "grid") { // graph paper
    ctx.fillStyle = pal.bg2; ctx.fillRect(0, 0, W, H); glow(ctx, W * .12, H * .08, W * .5, pal.glow1, .4);
    if (own) { ctx.strokeStyle = pal.main; ctx.globalAlpha = .13; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k < W; k += 44) { ctx.moveTo(k, 0); ctx.lineTo(k, H); } for (let k = 0; k < H; k += 44) { ctx.moveTo(0, k); ctx.lineTo(W, k); } ctx.stroke(); ctx.globalAlpha = 1; }
  } else if (bg === "linen") { // fine woven texture
    glow(ctx, W * .12, H * .08, W * .55, pal.glow1, .55); glow(ctx, W * .95, H * .55, W * .6, pal.glow2, .5);
    if (own) { ctx.strokeStyle = pal.main; ctx.globalAlpha = .06; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = -H; k < W; k += 9) { ctx.moveTo(k, 0); ctx.lineTo(k + H, H); ctx.moveTo(k + H, 0); ctx.lineTo(k, H); } ctx.stroke(); ctx.globalAlpha = 1; }
  } else { // classic: theme gradient + soft blobs + polka dots
    glow(ctx, W * .12, H * .08, W * .55, pal.glow1, .55); glow(ctx, W * .95, H * .55, W * .6, pal.glow2, .5);
    if (own) { ctx.fillStyle = pal.main; ctx.globalAlpha = .07; for (let yy = 30; yy < H; yy += 70) for (let xx = (yy / 70 % 2) * 35 + 20; xx < W; xx += 70) { ctx.beginPath(); ctx.arc(xx, yy, 5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  if (!own) paintPat(ctx, LK.pat, W, H, pal);
}
function paintPat(ctx, kind, W, H, pal) { // a chosen background pattern (replaces the style's own)
  ctx.save(); ctx.strokeStyle = ctx.fillStyle = pal.main;
  if (kind === "dots") { ctx.globalAlpha = .1; for (let yy = 26; yy < H; yy += 54) for (let xx = (Math.round(yy / 54) % 2) * 27 + 20; xx < W; xx += 54) { ctx.beginPath(); ctx.arc(xx, yy, 8, 0, 6.3); ctx.fill(); } }
  else if (kind === "hearts" || kind === "stars") { const e = kind === "hearts" ? "💗" : "⭐"; for (let yy = 40; yy < H; yy += 96) for (let xx = (Math.round(yy / 96) % 2) * 48 + 30; xx < W; xx += 96) emoji(ctx, e, xx, yy, 34, { alpha: .13, rot: .2 }); }
  else if (kind === "stripes") { ctx.globalAlpha = .07; ctx.lineWidth = 26; ctx.beginPath(); for (let k = -H; k < W; k += 64) { ctx.moveTo(k, H); ctx.lineTo(k + H, 0); } ctx.stroke(); }
  else if (kind === "checks") { ctx.globalAlpha = .07; for (let yy = 0; yy < H; yy += 60) for (let xx = 0; xx < W; xx += 60) if ((xx / 60 + yy / 60) % 2 === 0) ctx.fillRect(xx, yy, 60, 60); }
  else if (kind === "waves") { ctx.globalAlpha = .1; ctx.lineWidth = 5; for (let yy = 30; yy < H + 30; yy += 46) { ctx.beginPath(); for (let xx = 0; xx <= W; xx += 12) { const py = yy + Math.sin(xx / 46 + yy / 40) * 9; xx ? ctx.lineTo(xx, py) : ctx.moveTo(xx, py); } ctx.stroke(); } }
  ctx.restore();
}
function paintFilter(ctx, kind, W, H) { // a colour grade over the finished card (blend modes, so it works everywhere)
  const mix = (op, col) => { ctx.globalCompositeOperation = op; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
  ctx.save();
  if (kind === "warm") mix("multiply", "rgba(255,222,180,.55)");
  else if (kind === "cool") mix("multiply", "rgba(190,222,255,.5)");
  else if (kind === "mono") mix("saturation", "#000");
  else if (kind === "vivid") { mix("saturation", "rgba(255,0,0,.4)"); mix("soft-light", "rgba(255,255,255,.25)"); }
  else if (kind === "dreamy") { mix("screen", "rgba(255,225,245,.2)"); ctx.globalCompositeOperation = "screen"; glow(ctx, W * .25, H * .12, W * .7, "255,255,255", .35); }
  else if (kind === "vintage") {
    mix("multiply", "rgba(240,214,168,.62)"); ctx.globalCompositeOperation = "source-over";
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); v.addColorStop(0, "rgba(60,30,0,0)"); v.addColorStop(1, "rgba(60,30,0,.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const R = seeded(77); for (let i = 0; i < 5000; i++) { ctx.fillStyle = R() < .5 ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"; ctx.fillRect(R() * W, R() * H, 2, 2); }
  }
  ctx.restore();
}
function paintStick(ctx, e, W, H) { emoji(ctx, e[0], W - 34, 34, 40); emoji(ctx, e[1], 32, H - 30, 34, { rot: -.3 }); emoji(ctx, e[2], W - 30, H * .52, 30, { alpha: .9 }); } // 3 emoji in the card margins
function paintDeco(ctx, kind, W, H, pal) { // small decorations in the card margins (the content never reaches them)
  if (kind === "stars") paintStick(ctx, STK.sparkle, W, H);
  else if (kind === "tape") [[24, 24, -.62], [W - 24, 24, .62], [24, H - 24, .62], [W - 24, H - 24, -.62]].forEach(([x, y, r]) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.globalAlpha = .8; ctx.fillStyle = mixc(pal.alt, Wt, .35); ctx.fillRect(-52, -16, 104, 32);
    ctx.beginPath(); ctx.rect(-52, -16, 104, 32); ctx.clip(); ctx.globalAlpha = .5; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); for (let k = -60; k < 60; k += 14) { ctx.moveTo(k, 16); ctx.lineTo(k + 20, -16); } ctx.stroke(); ctx.restore();
  });
  else if (kind === "double") {
    ctx.lineJoin = "round"; rr(ctx, 16, 16, W - 32, H - 32, 36); ctx.lineWidth = 6; ctx.strokeStyle = pal.main; ctx.stroke(); rr(ctx, 30, 30, W - 60, H - 60, 26); ctx.lineWidth = 2.5; ctx.strokeStyle = pal.alt; ctx.stroke();
    [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(([x, y]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = pal.main; ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = pal.card; ctx.fillRect(-4, -4, 8, 8); ctx.restore(); });
  }
}
const capOf = d => d.title || (d.kind === "board" ? "our to-do board" : `${d.name}'s study day`);
function paintFrame(ctx, kind, d, pal, W, H, inside) { // inside(x, y, w, h, radius) draws the normal card into that box
  const shadow = (b, dy) => { ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = b; ctx.shadowOffsetY = dy; };
  if (kind === "polaroid") {
    const m = 30, ph = 38, bot = d.shape === "square" ? 130 : 165, ix = m + ph, iw = W - ix * 2, ih = H - m - ph - m - bot;
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, mixc(pal.main, Wt, .45)); g.addColorStop(1, mixc(pal.alt, Wt, .35)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.35)"; for (let yy = 30; yy < H; yy += 70) for (let xx = (yy / 70 % 2) * 35 + 20; xx < W; xx += 70) { ctx.beginPath(); ctx.arc(xx, yy, 4, 0, 6.3); ctx.fill(); }
    ctx.save(); shadow(40, 14); rr(ctx, m, m, W - m * 2, H - m * 2, 16); ctx.fillStyle = "#fffdf8"; ctx.fill(); ctx.restore();
    inside(ix, m + ph, iw, ih, 10); rr(ctx, ix, m + ph, iw, ih, 10); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.stroke();
    const cy = H - m - bot / 2;
    text(ctx, capOf(d), W / 2, cy - 12, { size: 46, font: pal.hf, weight: 700, color: "#5b4a52", align: "center", base: "middle", max: W - 200 });
    text(ctx, d.date || "", W / 2, cy + 34, { size: 28, font: pal.bf, weight: 700, color: "#a39098", align: "center", base: "middle", max: W - 200 });
    [[W * .18, m + 6, -.35], [W * .82, m + 6, .35]].forEach(([x, y, r]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.globalAlpha = .72; ctx.fillStyle = mixc(pal.alt, Wt, .3); ctx.fillRect(-85, -23, 170, 46); ctx.restore(); });
  } else if (kind === "film") {
    ctx.fillStyle = "#161412"; ctx.fillRect(0, 0, W, H);
    for (let yy = 22; yy < H - 30; yy += 64) for (const hx of [30, W - 60]) { rr(ctx, hx, yy, 30, 40, 9); ctx.fillStyle = "#f3efe6"; ctx.fill(); }
    inside(100, 76, W - 200, H - 152, 10); rr(ctx, 100, 76, W - 200, H - 152, 10); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.stroke();
    const o = { size: 26, font: MONO, weight: 400, color: "#f2a43a", base: "middle" };
    text(ctx, "MN FILM 400", 100, 38, o); text(ctx, "► 12A", W - 100, 38, { ...o, align: "right" });
    text(ctx, d.date || "", 100, H - 38, { ...o, max: W * .6 }); text(ctx, "12A ►", W - 100, H - 38, { ...o, align: "right" });
  } else if (kind === "ticket") {
    const bd = mixc(pal.main, K, .28), x = 26, y = 26, w = W - 52, h = H - 52, top = 118, bot = 96, y1 = y + top, y2 = y + h - bot;
    ctx.fillStyle = bd; ctx.fillRect(0, 0, W, H);
    ctx.save(); shadow(30, 10); rr(ctx, x, y, w, h, 30); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.restore();
    text(ctx, "ADMIT ONE", x + 40, y + top / 2 + 2, { size: 50, font: MONO, weight: 400, color: "#4a2f14", base: "middle" });
    text(ctx, "No. " + (100000 + hash(d.date) % 900000), x + w - 40, y + top / 2 + 2, { size: 34, font: MONO, weight: 400, color: "#9a7b55", align: "right", base: "middle" });
    ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = "#cdb892"; ctx.lineWidth = 3; [y1, y2].forEach(yy => { ctx.beginPath(); ctx.moveTo(x + 44, yy); ctx.lineTo(x + w - 44, yy); ctx.stroke(); }); ctx.restore();
    [y1, y2].forEach(yy => { ell(ctx, x, yy, 26, 26, bd); ell(ctx, x + w, yy, 26, 26, bd); });
    inside(x + 34, y1 + 24, w - 68, y2 - y1 - 48, 12);
    const R = seeded(hash(d.date) + 3); let bx = x + 44; ctx.fillStyle = "#4a2f14";
    while (bx < x + w * .58) { const bw = 2 + Math.floor(R() * 7); ctx.fillRect(bx, y2 + 22, bw, bot - 44); bx += bw + 2 + Math.floor(R() * 6); }
    text(ctx, "MN STUDY TRACKER", x + w - 40, y2 + bot / 2, { size: 28, font: MONO, weight: 400, color: "#9a7b55", align: "right", base: "middle", max: w * .33 });
  } else if (kind === "stamp") {
    const bd = mixc(pal.main, Wt, .6), x = 34, y = 34, w = W - 68, h = H - 68, m = 46, bot = 110;
    ctx.fillStyle = bd; ctx.fillRect(0, 0, W, H);
    ctx.save(); shadow(26, 8); ctx.fillStyle = "#fffdf6"; ctx.fillRect(x, y, w, h); ctx.restore();
    const nx = Math.round(w / 36), ny = Math.round(h / 36); // scalloped edge: bites out of the paper
    for (let i = 0; i <= nx; i++) { ell(ctx, x + i * w / nx, y, 11, 11, bd); ell(ctx, x + i * w / nx, y + h, 11, 11, bd); }
    for (let j = 0; j <= ny; j++) { ell(ctx, x, y + j * h / ny, 11, 11, bd); ell(ctx, x + w, y + j * h / ny, 11, 11, bd); }
    inside(x + m, y + m, w - m * 2, h - m - bot, 6); rr(ctx, x + m, y + m, w - m * 2, h - m - bot, 6); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.10)"; ctx.stroke();
    const cy = y + h - bot / 2;
    text(ctx, capOf(d), x + m, cy - 12, { size: 40, font: pal.hf, weight: 700, color: "#6a4a58", base: "middle", max: w * .5 });
    text(ctx, "first class ✦ MN study", x + m, cy + 30, { size: 26, font: pal.bf, weight: 800, color: "#b09aa6", base: "middle", max: w * .5 });
    const pr = Math.min(52, bot * .46), pcx = x + w - 96, pcy = cy; // postmark
    ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = "#3a3048"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, 6.3); ctx.stroke();
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); for (let k = 0; k <= 200; k += 6) { const px = pcx - pr - 8 - k, py = pcy + i * 18 + Math.sin(k / 9) * 6; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    ctx.restore();
    text(ctx, new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" }), pcx, pcy, { size: 26, font: pal.bf, weight: 800, color: "#3a3048", align: "center", base: "middle", alpha: .6, max: pr * 1.7 });
  }
}

export function drawCard(cv, d, pal0) {
  const gk = d.kind === "garden", Q = gk ? GQ : 1, [W, H] = (gk ? GSIZES : SIZES)[d.shape] || SIZES.square; cv.width = W * Q; cv.height = H * Q; LK = d.look || {}; // W / H = the layout size; the garden card has Q times more pixels (sharper), everything is drawn in layout units through ctx.scale
  const sty = STYLES[LK.style] || STYLES.classic, ctx = cv.getContext("2d"), pal = skin(pal0, sty, LK.accent), sk = LK.stick && LK.stick !== "auto" ? LK.stick : ""; ST = sty; ctx.scale(Q, Q);
  if (!sty.frame) {
    paintCard(ctx, d, pal, W, H);
    if (sty.deco && !(sk && sty.deco === "stars")) paintDeco(ctx, sty.deco, W, H, pal); // a chosen sticker pack replaces the style's own stars
    if (STK[sk]) paintStick(ctx, STK[sk], W, H);
  } else paintFrame(ctx, sty.frame, d, pal, W, H, (x, y, w, h, r) => { ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); ctx.translate(x, y); paintCard(ctx, d, pal, w, h); ctx.restore(); }); // the card is laid out for the smaller box, so nothing is squashed
  if (FILTERS[LK.filt] && LK.filt !== "none") paintFilter(ctx, LK.filt, W, H);
}
function paintCard(ctx, d, pal, W, H) { // one card, drawn into a W×H area at the current origin
  const none = !!(d.garden && d.garden.none), L = layout(d.shape, W, H, [1, 2.8, 1.1, 3.2], none ? [150, 440, 170, 380] : [120, 340, 130, 290], undefined, none ? 0 : undefined), hf = pal.hf, bf = pal.bf, pad = L.pad, cw = W - pad * 2; // none = no picture at the bottom: the tiles use the room
  paintBg(ctx, pal, W, H);

  if (d.kind === "garden") { drawGardenCard(ctx, d, pal, W, H); return; }
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
  text(ctx, stampTxt(), W / 2, L.stampY, { size: 28, font: hf, weight: 700, color: pal.sub, align: "center", base: "middle", alpha: .9, max: 900 });
}
