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

function drawScene(ctx, x, y, w, h, g, pal) {
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
