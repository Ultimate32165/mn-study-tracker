// Shared garden state: the G object, world size, pond, movement tables, weather table and tiny helpers (rnd, inPond, moodOf...).
import { liveToday } from "./state.js";
import { ls } from "./util.js";

const MOVE = { bunny: [1.3, 9], cat: [1.1, 5], chick: [1.2, 6], plant: [.3, 3], dog: [1.25, 7], panda: [.65, 4], fox: [1.2, 6], frog: [.9, 11], turtle: [.4, 2], unicorn: [1.1, 6], hamster: [1.3, 8], mouse: [1.4, 8], pig: [.9, 5], penguin: [.8, 6], koala: [.5, 3], bear: [.8, 4], duck: [1, 6], hedgehog: [.7, 4],
  lamb: [1, 7], otter: [1.1, 7], owl: [.7, 5], raccoon: [1, 5], deer: [1.3, 8], flamingo: [.8, 5], giraffe: [.7, 3], dragon: [1, 6] }; // [speed, hop height px]
const FACE_RIGHT = new Set(["🐢"]); // emoji that look RIGHT by default (all the others look left). If one walks backwards on your phone, add/remove its emoji here (e.g. "🐈", "🐕", "🦮").
// The garden is a big WORLD (WW x WH px) seen through a small window (the same 5:6 box as before) that you pan around by dragging and zoom with a pinch / the + - buttons.
// Pet / item positions are fractions of the world. The window size only decides how much you see at once.
// K = how many times wider AND deeper the grass is than the original 980x680 garden (3 = "huge"). HZ = the horizon (sky above, grass below). To resize the garden change K here:
// the pond, path, bounds, buddy spots, trees, border and the CSS sizes (set from buildGarden) all follow. Old-garden y values go through GY(y).
const K = 3, HZ = 236, WW = 980 * K, WH = HZ + (680 - HZ) * K, ZMAX = 2.5; // ZMAX = closest zoom (the farthest zoom is "whole garden fits", worked out in garden.js)
const GY = y => HZ + (y - HZ) * K; // a y of the old small garden -> the same spot in the big one
const fromClassicY = f => GY(f * 680) / WH, toClassicY = f => (HZ + (f * WH - HZ) / K) / 680; // y as a fraction of the old 680px garden <-> of the big world (the photocard still draws the old-size picture)
const POND = { x: 300 * K, y: GY(500), rx: 80 * K, ry: 44 * K }; // pond centre + radii in world px (the .gpond element is sized from this in buildGarden)
const BASE = 29; // walking speed in px per second (before the per-pet multiplier)
const BOUNDS = { x0: .05, x1: .95, y0: GY(272) / WH, y1: GY(646) / WH }; // where pets may stand (fractions of the world)
const BUB = { study: "🍓 nom nom", break: "☕", calm: "💗", sleep: "💤" };
const SAY = { study: "nom nom 🍓", break: "break time ☕", calm: "happy & full 💗", sleep: "sleepy… study to feed me" };
const RM = matchMedia("(prefers-reduced-motion: reduce)");
// weather is random (no network): sunny / spring petals / rain / snow with scarves / autumn leaves. Re-rolled every 12 min, or pick one with the chip in the garden.
const WXL = { clear: ["☀️", "sunny"], petals: ["🌸", "spring"], rain: ["🌧️", "rainy"], snow: ["❄️", "snowy"], leaves: ["🍂", "autumn"] };
const WX_POOL = ["clear", "clear", "petals", "rain", "snow", "leaves"];
const pickWx = avoid => { const l = WX_POOL.filter(w => w !== avoid); return l[Math.floor(Math.random() * l.length)]; };
const WX0 = ls("wx");
const G = { pets: new Map(), el: null, layer: null, deco: null, fly: null, fx: null, card: null, raf: 0, last: 0, W: WW, H: WH, vw: 340, vh: 408, z: 1, zt: 1, za: null, zl: 1, zT: 0, pts: new Map(), pinch: null, cardT: 0, decoLv: -1, night: null, ro: null,
  world: null, cam: { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, glide: false }, camInit: false, camT: "", pan: null, drag: null, noClick: -1e9, findI: -1, vis: null, visAt: 0, landSig: "", landEdit: false,
  items: new Map(), edit: false, work: null, sel: null, wx: "", wxMode: WX0 === "auto" || WXL[WX0] ? WX0 : "auto", wxAuto: pickWx(), wxAt: Date.now(), wxEl: null, wxC: new Map(), wxR: "", buddyFx: 0 };
const rnd = (a, b) => a + Math.random() * (b - a);
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const isEvening = () => { const h = new Date().getHours(); return h >= 18 || h < 6; };
const moodOf = u => u.status === "studying" ? "study" : u.status === "paused" ? "break" : liveToday(u) > 0 ? "calm" : "sleep";
const inPond = (x, y) => ((x * WW - POND.x) / POND.rx) ** 2 + ((y * WH - POND.y) / POND.ry) ** 2 < 1;
const nowS = () => performance.now() / 1000;

// ---- garden style (js/land.js): ground, fence, border, path. [emoji, label]. The garden is shared: the most recent choice of either of you wins (users/{uid}.land = { g, f, b, p, at }).
const LAND = {
  g: { meadow: ["🌿", "meadow"], flowers: ["🌸", "flower field"], sand: ["🏖️", "sandy"], snow: ["❄️", "snowy"] },
  f: { cute: ["🤍", "cute picket"], wood: ["🪵", "wooden"], stone: ["🧱", "stone wall"], hedge: ["🌳", "hedge"], bamboo: ["🎋", "bamboo"], none: ["🚫", "no fence"] },
  b: { none: ["🚫", "none"], flowers: ["🌷", "flowers"], stones: ["🪨", "pebbles"], hedge: ["🌿", "hedge"], mushrooms: ["🍄", "mushrooms"] },
  p: { none: ["🚫", "none"], dirt: ["🟫", "dirt trail"], stones: ["⚪", "stepping stones"], cobble: ["🧱", "cobbles"], flowers: ["🌼", "flower trail"] }
};
const DEF_LAND = { g: "meadow", f: "cute", b: "none", p: "none" };
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const landOf = list => { // the newest saved style among everybody (falls back to the classic look)
  let best = null; (list || []).forEach(u => { const l = u && u.land; if (l && typeof l === "object" && (+l.at || 0) > (best ? +best.at || 0 : -1)) best = l; });
  const out = { ...DEF_LAND }; if (best) Object.keys(DEF_LAND).forEach(k => { if (typeof best[k] === "string" && has(LAND[k], best[k])) out[k] = best[k]; }); return out;
};
const PATH_PTS = [[20, 664], [170, 628], [330, 630], [480, 604], [620, 566], [760, 546], [880, 500], [975, 468]].map(([x, y]) => [x * K, GY(y)]); // the garden path (world px). card.js keeps its own old-size copy.
const pathD = p => { let d = `M${p[0][0]} ${p[0][1]}`; for (let i = 1; i < p.length - 1; i++) d += ` Q${p[i][0]} ${p[i][1]} ${(p[i][0] + p[i + 1][0]) / 2} ${(p[i][1] + p[i + 1][1]) / 2}`; return d + ` L${p[p.length - 1][0]} ${p[p.length - 1][1]}`; };

const TREAT = 1, VIS_DAY = 6; // a treat costs 1 seed; at most 6 visitor seeds a day on this device

export { BASE, BOUNDS, BUB, DEF_LAND, FACE_RIGHT, G, GY, HZ, K, LAND, MOVE, PATH_PTS, POND, RM, SAY, TREAT, VIS_DAY, WH, WW, WXL, ZMAX, fromClassicY, inPond, isEvening, landOf, moodOf, nowS, pathD, pickWx, rnd, seeded, toClassicY };
