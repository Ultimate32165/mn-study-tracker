// 'My stats' tab: week card (7-day bars + today / streak / total), calendar, badges (BADGES + checkBadges), session list.
import * as DB from "./db.js";
import { goalOf, liveToday, me, sessions } from "./state.js";
import { DAY, burst, fmt, key, sec, stats, toast } from "./util.js";

const BADGES = [ // [id, emoji, name, description, test(ctx)]
  ["first", "🌱", "First step", "Study for the first time", c => c.total > 0],
  ["h10", "🌟", "10 hours", "10 hours studied in total", c => c.total >= 36000],
  ["h50", "🌈", "50 hours", "50 hours in total", c => c.total >= 180000],
  ["h100", "👑", "100 hours", "100 hours in total", c => c.total >= 360000],
  ["h250", "💎", "250 hours", "250 hours in total", c => c.total >= 900000],
  ["s3", "🔥", "3-day streak", "Study 3 days in a row", c => c.streak >= 3],
  ["s7", "✨", "7-day streak", "Study 7 days in a row", c => c.streak >= 7],
  ["s14", "💫", "14-day streak", "Study 14 days in a row", c => c.streak >= 14],
  ["s30", "🏆", "30-day streak", "Study 30 days in a row", c => c.streak >= 30],
  ["d4", "💪", "4h in a day", "Study 4 hours in one day", c => c.bestDay >= 14400],
  ["d8", "🚀", "8h in a day", "Study 8 hours in one day", c => c.bestDay >= 28800],
  ["n10", "📅", "10 study days", "Study on 10 different days", c => c.days >= 10],
  ["n30", "🗓️", "30 study days", "Study on 30 different days", c => c.days >= 30],
  ["goal", "🎯", "Goal getter", "Reach your daily goal", c => c.goalHit]
];
const badgeBusy = new Set();
const badgeCtx = m => { const v = Object.values(m.daily || {}), st = stats(m); return { total: st.total, streak: Math.max(st.streak, m.bestStreak || 0), bestDay: Math.max(0, ...v), days: v.filter(x => x > 0).length, goalHit: goalOf(m) > 0 && liveToday(m) >= goalOf(m) }; };
function badgeView(mine) {
  const got = mine.badges || {}, n = BADGES.filter(b => got[b[0]]).length;
  return sec("badges", "badges", `<span class="hint" style="margin-left:auto">${n} / ${BADGES.length}</span>`, `<div class="badges">${BADGES.map(b => `<div class="badge ${got[b[0]] ? "" : "lock"}"><span>${b[1]}</span><b>${b[2]}</b><small>${b[3]}</small></div>`).join("")}</div>`);
}
let calMonth = 0; // 0 = this month, -1 = last month, ...
const shiftMonth = n => { calMonth = Math.min(0, calMonth + n); };
function calView(mine) {
  const d = mine.daily || {}, now = new Date(), first = new Date(now.getFullYear(), now.getMonth() + calMonth, 1), y = first.getFullYear(), mo = first.getMonth();
  const n = new Date(y, mo + 1, 0).getDate(), g = goalOf(mine) || 14400, tk = key(now);
  let tot = 0, days = 0, cells = "";
  for (let i = 0; i < first.getDay(); i++) cells += "<span></span>";
  for (let i = 1; i <= n; i++) {
    const k = key(new Date(y, mo, i)), v = k === tk ? liveToday(mine) : d[k] || 0, r = v / g, lv = !v ? 0 : r < .25 ? 1 : r < .5 ? 2 : r < 1 ? 3 : 4;
    tot += v; if (v > 0) days++;
    cells += `<button class="dy l${lv}${k === tk ? " today" : ""}${k > tk ? " fut" : ""}" data-act="day" data-id="${k}" data-v="${v}">${i}</button>`;
  }
  return sec("cal", "calendar", "", `<div class="cal"><div class="calh"><button data-act="calnav" data-id="-1">‹</button><span>${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span><button data-act="calnav" data-id="1" ${calMonth >= 0 ? "disabled" : ""}>›</button></div>
  <div class="cg">${["S", "M", "T", "W", "T", "F", "S"].map(x => `<em>${x}</em>`).join("")}${cells}</div>
  <p class="hint">${days} study days · ${fmt(tot)} this month</p>
  <div class="legend">less ${[0, 1, 2, 3, 4].map(l => `<i class="dy l${l}"></i>`).join("")} more</div></div>`);
}
function checkBadges(m) { // called every second from watch.js: unlock newly earned badges
  const got = BADGES.filter(b => b[4](badgeCtx(m))).map(b => b[0]);
  if (m.badges === undefined) { // first time: quietly record badges she already earned (no confetti spam)
    if (!badgeBusy.has("init")) { badgeBusy.add("init"); DB.updateProfile(me.uid, { badges: Object.fromEntries(got.map(id => [id, Date.now()])) }).catch(() => {}); }
  } else got.filter(id => !m.badges[id] && !badgeBusy.has(id)).forEach(id => {
    badgeBusy.add(id); DB.unlockBadge(me.uid, id).catch(() => {});
    const b = BADGES.find(x => x[0] === id); burst(); setTimeout(() => toast(`Badge unlocked: ${b[1]} ${b[2]}!`), 1800);
  });
}
function statsView(mine) {
  const s = stats(mine), d = mine.daily || {}, now = Date.now(), g = goalOf(mine);
  const days = [...Array(7)].map((_, i) => { const t = now - (6 - i) * DAY; return { l: new Date(t).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), v: i === 6 ? liveToday(mine) : d[key(t)] || 0 }; });
  const max = Math.max(...days.map(x => x.v), 1);
  const bars = days.map((x, i) => `<div class="bar ${i === 6 ? "now" : ""}"><i class="${g && x.v >= g ? "hit" : ""}" style="height:${Math.max(4, x.v / max * 100)}%"></i><em>${x.v ? fmt(x.v) : ""}</em><span>${x.l}</span></div>`).join("");
  const rows = sessions.map(x => { const t = new Date(x.start.toMillis()); return `<div class="sess"><div><b>${t.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</b>
  <span>${t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></div><b class="sv">${fmt(x.seconds)}</b><button class="ic" data-act="edit" data-id="${x.id}" aria-label="shorten session">✏️</button><button class="ic" data-act="del" data-id="${x.id}" aria-label="delete session">🗑️</button></div>`; }).join("");
  return `<section class="wk"><div class="wkh"><div><small>this week</small><b>${fmt(s.week)}</b></div><div class="wkc"><button class="chip" data-act="card">📸 photocard</button><button class="chip" data-act="card" data-id="recap">🗓️ recap</button></div></div>
  <div class="bars">${bars}</div>${g ? `<p class="hint">green days reached your ${fmt(g)} goal</p>` : ""}
  <div class="trio"><div><b>${fmt(s.today)}</b>today</div><div><b>${s.streak}🔥</b>day streak</div><div><b>${fmt(s.total)}</b>all time</div></div></section>
  ${calView(mine)}${badgeView(mine)}${sec("sess", "sessions", `<button class="chip pri" data-act="add">+ add time</button>`, rows || `<p class="hint">No sessions yet — press study to begin!</p>`)}`;
}

export { checkBadges, shiftMonth, statsView };
