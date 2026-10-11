// Shared garden state: the G object, world size, pond, movement tables, weather table and tiny helpers (rnd, inPond, moodOf...).
import { liveToday } from "./state.js";
import { ls } from "./util.js";

const MOVE = { bunny: [1.3, 9], cat: [1.1, 5], chick: [1.2, 6], plant: [.3, 3], dog: [1.25, 7], panda: [.65, 4], fox: [1.2, 6], frog: [.9, 11], turtle: [.4, 2], unicorn: [1.1, 6], hamster: [1.3, 8], mouse: [1.4, 8], pig: [.9, 5], penguin: [.8, 6], koala: [.5, 3], bear: [.8, 4], duck: [1, 6], hedgehog: [.7, 4],
  lamb: [1, 7], otter: [1.1, 7], owl: [.7, 5], raccoon: [1, 5], deer: [1.3, 8], flamingo: [.8, 5], giraffe: [.7, 3], dragon: [1, 6] }; // [speed, hop height px]
const FACE_RIGHT = new Set(["🐢"]); // emoji that look RIGHT by default (all the others look left). If one walks backwards on your phone, add/remove its emoji here (e.g. "🐈", "🐕", "🦮").
// The garden is a big WORLD (WW x WH px) seen through a small window (the same 5:6 box as before) that you pan around by dragging.
// Pet / item positions are fractions of the world. The window size only decides how much you see at once.
const WW = 980, WH = 680, POND = { x: 300, y: 500, rx: 80, ry: 44 }; // pond centre + radii in world px (keep in sync with .gpond in the CSS)
const BASE = 29; // walking speed in px per second (before the per-pet multiplier)
const BOUNDS = { x0: .05, x1: .95, y0: .4, y1: .95 }; // where pets may stand (fractions of the world)
const BUB = { study: "🍓 nom nom", break: "☕", calm: "💗", sleep: "💤" };
const SAY = { study: "nom nom 🍓", break: "break time ☕", calm: "happy & full 💗", sleep: "sleepy… study to feed me" };
const RM = matchMedia("(prefers-reduced-motion: reduce)");
// weather is random (no network): sunny / spring petals / rain / snow with scarves / autumn leaves. Re-rolled every 12 min, or pick one with the chip in the garden.
const WXL = { clear: ["☀️", "sunny"], petals: ["🌸", "spring"], rain: ["🌧️", "rainy"], snow: ["❄️", "snowy"], leaves: ["🍂", "autumn"] };
const WX_POOL = ["clear", "clear", "petals", "rain", "snow", "leaves"];
const pickWx = avoid => { const l = WX_POOL.filter(w => w !== avoid); return l[Math.floor(Math.random() * l.length)]; };
const WX0 = ls("wx");
const G = { pets: new Map(), el: null, layer: null, deco: null, fly: null, fx: null, card: null, raf: 0, last: 0, W: WW, H: WH, vw: 340, vh: 408, cardT: 0, decoLv: -1, night: null, ro: null,
  world: null, cam: { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, glide: false }, camInit: false, camT: "", pan: null, drag: null, noClick: -1e9, findI: -1, vis: null, visAt: 0,
  items: new Map(), edit: false, work: null, sel: null, wx: "", wxMode: WX0 === "auto" || WXL[WX0] ? WX0 : "auto", wxAuto: pickWx(), wxAt: Date.now(), wxEl: null, buddyFx: 0 };
const rnd = (a, b) => a + Math.random() * (b - a);
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const isEvening = () => { const h = new Date().getHours(); return h >= 18 || h < 6; };
const moodOf = u => u.status === "studying" ? "study" : u.status === "paused" ? "break" : liveToday(u) > 0 ? "calm" : "sleep";
const inPond = (x, y) => ((x * WW - POND.x) / POND.rx) ** 2 + ((y * WH - POND.y) / POND.ry) ** 2 < 1;
const nowS = () => performance.now() / 1000;

const TREAT = 1, VIS_DAY = 6; // a treat costs 1 seed; at most 6 visitor seeds a day on this device

export { BASE, BOUNDS, BUB, FACE_RIGHT, G, MOVE, POND, RM, SAY, TREAT, VIS_DAY, WH, WW, WXL, inPond, isEvening, moodOf, nowS, pickWx, rnd, seeded };
