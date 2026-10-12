// Photocard DATA: reads the current theme colours (cardPal), snapshots the garden, and builds the data for each card kind (me / together / recap / milestone / board).
import { boardSnap } from "./board.js";
import * as DB from "./db.js";
import { decorOf } from "./decor.js";
import { gardenList } from "./garden.js";
import { G, fromClassicY, inPond, isEvening, landOf, moodOf, seeded, toClassicY } from "./garden-state.js";
import { ALLP, accOf, petName, petOf, stageNames, stageOf } from "./pets.js";
import { LV_T, board, couple, elapsed, goalOf, liveToday, me, sessions, totalOf, users } from "./state.js";
import { DAY, fmt, key, stats } from "./util.js";

const gfmt = t => t % 3600 === 0 ? `${t / 3600}h` : fmt(t);
const dayLong = t => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const hhmm = t => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const pxc = document.createElement("canvas"); pxc.width = pxc.height = 1; const pxx = pxc.getContext("2d", { willReadFrequently: true });
function norm(c) { pxx.clearRect(0, 0, 1, 1); pxx.fillStyle = "#000"; pxx.fillStyle = c; pxx.fillRect(0, 0, 1, 1); const [r, g, b, a] = pxx.getImageData(0, 0, 1, 1).data; return { s: `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`, rgb: `${r},${g},${b}` }; }
function cardPal(night, wx) { // read the CURRENT theme's colours (also the garden's sky / grass for the right time of day and weather)
  const tmp = document.createElement("div"); tmp.id = "garden"; tmp.className = [night ? "night" : "", wx && wx !== "clear" ? "wx-" + wx : "", "gr-" + landOf(users).g].join(" ").trim();
  tmp.style.cssText = "position:fixed;left:-9999px;top:0;width:10px;height:10px;visibility:hidden;pointer-events:none"; document.body.appendChild(tmp);
  const c = e => { const i = document.createElement("i"); i.style.color = e; tmp.appendChild(i); return norm(getComputedStyle(i).color); }, v = n => c(`var(${n})`);
  const pal = {
    bg1: v("--bg1").s, bg2: v("--bg2").s, card: v("--card").s, ink: v("--ink").s, sub: v("--soft").s, main: v("--main").s, alt: v("--alt").s, tint: v("--tint").s, edge: v("--edge").s,
    sk1: v("--sk1").s, sk2: v("--sk2").s, cl: v("--cl").s, grB: v("--gb").s, grF: v("--gf").s, fc: v("--fc").s, dirt: c("color-mix(in srgb,#c8a06a 70%,var(--bg1))").s, hedge: c("color-mix(in srgb,#3f9f55 78%,var(--bg1))").s, bamboo: c("color-mix(in srgb,#b9d36c 80%,var(--bg1))").s, wood: v("--wood").s, woodL: v("--wood-l").s, woodD: v("--wood-d").s,
    soil: c("color-mix(in srgb,#8a5732 80%,var(--bg1))").s, cloth: c("color-mix(in srgb,#fff 88%,var(--main))").s, pad: c("color-mix(in srgb,#5fcf74 80%,var(--bg1))").s,
    stone: c("color-mix(in srgb,#cfd3dc 75%,var(--bg1))").s, water: c("color-mix(in srgb,#8fd3ff 80%,var(--bg1))").s, water2: c("color-mix(in srgb,#4fb0e8 78%,var(--bg1))").s,
    live: v("--live").s, onBg: v("--on-bg").s, onLine: v("--on-line").s, glow1: v("--glow1").rgb, glow2: v("--glow2").rgb, hf: (getComputedStyle(document.documentElement).getPropertyValue("--hf").trim() || "Fredoka, sans-serif"), bf: "Nunito, system-ui, sans-serif"
  };
  tmp.remove(); return pal;
}
function gardenSnap() { // the saved garden as plain data (tidy spots). The card draws an old-size (980x680) picture of the whole garden, so every y here is an OLD-garden fraction (toClassicY / fromClassicY)
  const night = isEvening(), wx = G.wxMode === "auto" ? G.wxAuto : G.wxMode, R = seeded(3), items = [];
  users.forEach(u => decorOf(u).forEach(d => items.push({ i: d.i, x: d.x, y: toClassicY(d.y) })));
  const list = gardenList(), n = list.length, placed = [];
  const pets = list.map((e, i) => { // scattered: one slot per animal across the width, random depth, away from the pond, decorations and each other
    const st = stageOf(totalOf(e.u)), slot = (i + .5) / n; let x = slot, y = .7;
    for (let t = 0; t < 40; t++) {
      x = Math.min(.93, Math.max(.07, .06 + slot * .88 + (R() - .5) * (.7 / n))); y = .64 + R() * .29;
      if (inPond(x, fromClassicY(y)) || inPond(x, fromClassicY(y - .04))) continue;
      if (items.some(d => Math.abs(d.x - x) < .055 && Math.abs(d.y - y) < .07)) continue;
      if (placed.some(q => Math.abs(q.x - x) < .08 && Math.abs(q.y - y) < .09)) continue;
      break;
    }
    placed.push({ x, y });
    return { emo: ALLP[e.type].e[st], acc: accOf(e.type, st), st, x, y, flip: x < .5, sleep: moodOf(e.u) === "sleep" }; // animals on the left look right, on the right look left: everyone faces the middle
  });
  return { night, wx, lv: couple().lv, land: landOf(users), items, pets };
}
function cardData(shape, sid) {
  const m = users.find(u => u.id === me.uid), s = stats(m), d = m.daily || {}, now = Date.now(), goal = goalOf(m), sx = sessions.find(x => x.id === sid);
  let ses, date = dayLong(now);
  if (sx) {
    const t0 = sx.start.toMillis(), dayTot = d[key(t0)] || sx.seconds; date = dayLong(t0);
    ses = { label: "Study session", time: fmt(sx.seconds), sub: `${hhmm(t0)} → ${hhmm(t0 + sx.seconds * 1000)}`, pct: goal ? dayTot / goal : null, goalText: `of ${gfmt(goal)} day goal` };
  } else {
    const tod = liveToday(m), cnt = sessions.filter(x => key(x.start.toMillis()) === key(now)).length;
    ses = { label: "Today's studying", time: fmt(tod), sub: cnt ? `${cnt} session${cnt > 1 ? "s" : ""} so far` : "every minute counts ✨", pct: goal ? tod / goal : null, goalText: `of ${gfmt(goal)} goal` };
  }
  const week = [...Array(7)].map((_, i) => { const t = now - (6 - i) * DAY, v = d[key(t)] || 0; return { l: new Date(t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), v, t: v ? fmt(v) : "", today: i === 6 }; });
  return { shape, name: m.name || "you", avatar: m.emoji || "📚", pet: ALLP[petOf(m)].e[stageOf(totalOf(m))], date, session: ses, todayLabel: "today", todayText: fmt(liveToday(m)),
    streakText: `${s.streak} day${s.streak === 1 ? "" : "s"} 🔥`, week, weekTotal: fmt(week.reduce((a, k) => a + k.v, 0)), garden: gardenSnap() };
}
function cardDataTogether(shape, fid) { // both of you, right now: live session time, status, today's progress, pets, garden
  const a = users.find(u => u.id === me.uid), b = users.find(u => u.id === fid) || users.find(u => u.id !== me.uid), now = Date.now();
  const person = u => {
    const on = u.status === "studying", br = u.status === "paused", g = goalOf(u), lt = liveToday(u), st = stageOf(totalOf(u)), t = petOf(u);
    return { name: u.name || "friend", avatar: u.emoji || "📚", status: on ? "studying" : br ? "break" : "rest", statusText: on ? "studying ✏️" : br ? "on a break ☕" : "resting 💤",
      label: on || br ? "this session" : "today", big: fmt(on || br ? elapsed(u) / 1000 : lt), today: fmt(lt), pct: g ? lt / g : null, goalText: g ? `goal ${gfmt(g)}` : "", streak: stats(u).streak,
      pet: { emo: ALLP[t].e[st], acc: accOf(t, st), st } };
  };
  return { kind: "together", shape, people: [person(a), person(b)], title: `${a.name} & ${b.name}`, date: `${dayLong(now)} · ${hhmm(now)}`,
    togetherToday: fmt(liveToday(a) + liveToday(b)), coupleText: `Level ${couple().lv + 1} 💞`, garden: gardenSnap() };
}
// ---- recap card: totals for the last 7 / 30 days ----
const isManual = x => { if (x.manual) return true; const t = new Date(x.start.toMillis()); return t.getHours() === 12 && !t.getMinutes() && !t.getSeconds() && !t.getMilliseconds(); }; // "+ add time" sessions are stamped 12:00 on the dot, so their start time is meaningless
const dayShort = t => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const dayNum = t => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const hourLbl = h => new Date(2000, 0, 1, h % 24).toLocaleTimeString(undefined, { hour: "numeric" });
async function cardDataRecap(shape, period) {
  const m = users.find(u => u.id === me.uid), d = m.daily || {}, now = Date.now(), n = period === "month" ? 30 : 7, tk = key(now), t0 = new Date(now - (n - 1) * DAY); t0.setHours(0, 0, 0, 0);
  const days = [...Array(n)].map((_, i) => { const t = now - (n - 1 - i) * DAY, k = key(t); return { t, v: k === tk ? liveToday(m) : d[k] || 0 }; });
  const total = days.reduce((a, x) => a + x.v, 0), studied = days.filter(x => x.v > 0).length; let prev = 0; for (let i = n; i < 2 * n; i++) prev += d[key(now - i * DAY)] || 0;
  let list; try { list = await DB.getSessionsSince(me.uid, t0.getTime()); } catch { list = sessions.filter(x => x.start.toMillis() >= t0.getTime()); } // offline: fall back to the 40 we already have
  const best = days.reduce((b, x) => x.v > b.v ? x : b, { v: 0, t: now }), long = list.reduce((b, x) => x.seconds > (b ? b.seconds : 0) ? x : b, null);
  const hrs = new Array(24).fill(0); // seconds studied in each hour of the day (tracked sessions only, spread forward from their start)
  list.forEach(x => { if (isManual(x)) return; let t = x.start.toMillis(), left = x.seconds * 1000; while (left > 0) { const nx = new Date(t); nx.setHours(nx.getHours() + 1, 0, 0, 0); const step = Math.min(left, nx.getTime() - t); hrs[new Date(t).getHours()] += step; t += step; left -= step; } });
  let bw = 0, bh = 0; for (let h = 0; h < 24; h++) { const w = hrs[h] + hrs[(h + 1) % 24]; if (w > bw) { bw = w; bh = h; } } // best 2-hour window
  const part = bh < 5 || bh >= 21 ? "night owl 🌙" : bh < 9 ? "early bird 🌅" : bh < 12 ? "morning ☀️" : bh < 17 ? "afternoon 🌤️" : "evening 🌆", name = m.name || "you";
  const sub = !total ? "no study yet. Start today ✨" : prev > 0 ? `${total >= prev ? "▲" : "▼"} ${fmt(Math.abs(total - prev))} vs the ${n} days before` : "keep it going ✨";
  return { kind: "recap", shape, name, avatar: m.emoji || "📚", title: `${name}'s ${period}`, date: `${dayNum(t0)} – ${dayNum(now)}`, label: `LAST ${n} DAYS`, total: fmt(total), sub, studied, n, weekTotal: fmt(total),
    tiles: [{ l: "best day", v: best.v ? fmt(best.v) : "–", s: best.v ? dayShort(best.t) : "" },
      { l: "longest session", v: long ? fmt(long.seconds) : "–", s: long ? dayShort(long.start.toMillis()) + (isManual(long) ? "" : " · " + hhmm(long.start.toMillis())) : "" },
      { l: "busiest time", v: bw ? `${hourLbl(bh)}–${hourLbl(bh + 2)}` : "–", s: bw ? part : "track a session ⏱️" },
      { l: "daily average", v: fmt(total / n), s: `${studied} of ${n} days studied` }],
    bars: days.map((x, i) => ({ v: x.v, today: i === n - 1, t: n <= 7 && x.v ? fmt(x.v) : "", l: n <= 7 ? new Date(x.t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2) : i % 5 === 0 || i === n - 1 ? String(new Date(x.t).getDate()) : "" })), garden: gardenSnap() };
}
// ---- milestone card: ms = { type: "evolve" | "streak" | "level", ... } saved when it happened ----
function cardDataMilestone(shape, ms) {
  const m = users.find(u => u.id === me.uid), s = stats(m), name = m.name || "you", out = { kind: "milestone", shape, name, avatar: m.emoji || "📚", date: dayLong(ms.at || Date.now()), garden: gardenSnap() };
  if (ms.type === "evolve") {
    const t = ALLP[ms.pet] ? ms.pet : petOf(m), a = Math.min(ms.a, 3), b = Math.min(ms.b, 3);
    return { ...out, from: ALLP[t].e[a], emo: ALLP[t].e[b], acc: accOf(t, b), title: `${name}'s ${petName(t)} evolved!`, sub: `${stageNames(t)[b]} ✨`, spark: ["✨", "⭐", "💖", "🌟"], chips: [["total studied", fmt(totalOf(m))], ["streak", `${s.streak} day${s.streak === 1 ? "" : "s"} 🔥`]] };
  }
  if (ms.type === "streak") return { ...out, emo: "🔥", title: `${ms.n}-day streak!`, sub: "a new personal record", spark: ["🔥", "✨", "⭐"], chips: [["total studied", fmt(totalOf(m))], ["best streak", `${Math.max(ms.n, s.streak)} days 🔥`]] };
  const lv = Math.min(ms.lv, LV_T.length - 1);
  return { ...out, emo: "💞", title: `Level ${lv + 1}!`, sub: LV_T[lv], spark: ["💞", "✨", "🌸", "⭐"], chips: [["together", fmt(couple().sec)], ["couple level", `${lv + 1} 💞`]] };
}
// ---- garden card: the garden on its own (card.js draws it 2x bigger than the other cards) ----
const WXN = { clear: "clear skies", rain: "rainy ☔", snow: "snowy ❄️", petals: "petals 🌸", leaves: "autumn 🍂" };
function cardDataGarden(shape) {
  const m = users.find(u => u.id === me.uid) || {}, gs = gardenSnap(), name = m.name || "you", lv = Math.min(gs.lv, LV_T.length - 1), n = gs.pets.length;
  return { kind: "garden", shape, name, avatar: m.emoji || "📚", title: `${name}'s garden`, date: dayLong(Date.now()), garden: gs,
    facts: [{ l: "garden pets", v: `${n} 🐾`, s: n === 1 ? "one friend" : "wandering around" }, { l: "garden level", v: `${lv + 1} 💞`, s: LV_T[lv] }, { l: "decorations", v: `${gs.items.length} 🪴`, s: `${WXN[gs.wx] || "clear skies"}${gs.night ? " · night 🌙" : ""}` }] };
}
function cardDataBoard(shape) { // the shared to-do board, as a photocard
  const m = users.find(u => u.id === me.uid) || {};
  return { kind: "board", shape, name: m.name || "you", avatar: m.emoji || "📚", date: dayLong(Date.now()), board: boardSnap(board), garden: gardenSnap() };
}

export { cardData, cardDataBoard, cardDataGarden, cardDataMilestone, cardDataRecap, cardDataTogether, cardPal, dayLong };
