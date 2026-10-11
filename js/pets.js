// Study pets: the PETS + unlockable EXTRA pets, growth stages, the pet row on the cards.
import { forestOf } from "./forest.js";
import { couple, liveToday, totalOf } from "./state.js";
import { fmt } from "./util.js";

// ---- study pet / garden: grows with total hours, sleepy if no study today ----
// e = the form at each stage [egg, baby, kid, grown-up]; acc = a little accessory that appears on top at that stage (evolutions!)
const PETS = {
  bunny: { e: ["🥚", "🐰", "🐇", "🐇"], acc: ["", "", "🎀", "👑"] },
  cat: { e: ["🥚", "🐱", "🐈", "🦁"], acc: ["", "", "🎀", "👑"] },
  chick: { e: ["🥚", "🐣", "🐥", "🐔"], acc: ["", "", "", "👑"] },
  plant: { e: ["🌰", "🌱", "🪴", "🌳"], acc: ["", "", "", "🌸"] },
  hamster: { e: ["🥚", "🐹", "🐹", "🐹"], acc: ["", "", "🌻", "👑"] },
  mouse: { e: ["🥚", "🐭", "🐭", "🐁"], acc: ["", "", "🧀", "👑"] },
  pig: { e: ["🥚", "🐷", "🐷", "🐖"], acc: ["", "", "🎀", "👑"] },
  penguin: { e: ["🥚", "🐧", "🐧", "🐧"], acc: ["", "", "🧣", "👑"] },
  koala: { e: ["🥚", "🐨", "🐨", "🐨"], acc: ["", "", "🍃", "👑"] },
  bear: { e: ["🥚", "🧸", "🐻", "🐻"], acc: ["", "", "🍯", "👑"] },
  duck: { e: ["🥚", "🐥", "🦆", "🦆"], acc: ["", "", "🎀", "👑"] },
  hedgehog: { e: ["🥚", "🦔", "🦔", "🦔"], acc: ["", "", "🍎", "👑"] }
};
const accOf = (t, st) => ((ALLP[t] || {}).acc || [])[st] || "";
const petFace = (t, st) => ALLP[t].e[st] + (accOf(t, st) ? `<i class="acc">${accOf(t, st)}</i>` : "");
const petOf = u => PETS[u.pet] ? u.pet : "bunny";
const STAGE = [1800, 18000, 72000]; // seconds studied to reach baby / kid / grown-up
const stageOf = tot => tot >= STAGE[2] ? 3 : tot >= STAGE[1] ? 2 : tot >= STAGE[0] ? 1 : 0;
const stageNames = t => t === "plant" ? ["seed", "sprout", "sapling", "tree"] : ["egg", "baby", "kid", "grown-up"];
function petRow(u) {
  const t = petOf(u), paused = u.status === "paused", on = u.status === "studying", tot = totalOf(u);
  const st = stageOf(tot), fed = liveToday(u) > 0;
  const say = on ? "nom nom 🍓" : paused ? "break time ☕" : fed ? "happy & full 💗" : "sleepy… study to feed me";
  const names = stageNames(t);
  return `<div class="petrow ${on ? "feed" : fed || paused ? "" : "sleepy"}"><span class="pet s${st}">${petFace(t, st)}</span><div><b>${say}</b><small>${names[st]}${st < 3 ? ` · ${fmt(STAGE[st] - tot)} to grow` : " · fully grown 👑"}</small></div></div>`;
}

// Extra pets you can collect. e = [egg, baby, kid, grown-up]; ok(u) = is it unlocked for user u?
const EXTRA = {
  dog: { n: "puppy", e: ["🥚", "🐶", "🐕", "🦮"], acc: ["", "", "🎀", "👑"], req: "study 5 hours in total", ok: u => totalOf(u) >= 18000 },
  panda: { n: "panda", e: ["🥚", "🐼", "🐼", "🐼"], acc: ["", "", "🎋", "👑"], req: "earn the 3-day streak badge 🔥", ok: u => !!(u.badges && u.badges.s3) },
  fox: { n: "fox", e: ["🥚", "🦊", "🦊", "🦊"], acc: ["", "", "🍂", "👑"], req: "study 25 hours in total", ok: u => totalOf(u) >= 90000 },
  frog: { n: "frog", e: ["🥚", "🐸", "🐸", "🐸"], acc: ["", "", "🍃", "👑"], req: "reach couple level 4 💞", ok: () => couple().lv >= 3 },
  turtle: { n: "turtle", e: ["🥚", "🐢", "🐢", "🐢"], acc: ["", "", "🌿", "👑"], req: "earn the 7-day streak badge ✨", ok: u => !!(u.badges && u.badges.s7) },
  unicorn: { n: "unicorn", e: ["🥚", "🦄", "🦄", "🦄"], acc: ["", "", "🌈", "👑"], req: "earn the 100 hours badge 👑", ok: u => !!(u.badges && u.badges.h100) },
  lamb: { n: "lamb", e: ["🥚", "🐑", "🐑", "🐏"], acc: ["", "", "🌼", "👑"], req: "study 2 hours in total", ok: u => totalOf(u) >= 7200 },
  otter: { n: "otter", e: ["🥚", "🦦", "🦦", "🦦"], acc: ["", "", "🐚", "👑"], req: "earn the 10 hours badge 🌟", ok: u => !!(u.badges && u.badges.h10) },
  owl: { n: "owl", e: ["🥚", "🦉", "🦉", "🦉"], acc: ["", "", "📖", "👑"], req: "earn the 4h in a day badge 💪", ok: u => !!(u.badges && u.badges.d4) },
  raccoon: { n: "raccoon", e: ["🥚", "🦝", "🦝", "🦝"], acc: ["", "", "🍓", "👑"], req: "earn the 10 study days badge 📅", ok: u => !!(u.badges && u.badges.n10) },
  deer: { n: "deer", e: ["🥚", "🦌", "🦌", "🦌"], acc: ["", "", "🍂", "👑"], req: "plant 5 trees in your forest 🌲", ok: u => forestOf(u).length >= 5 },
  flamingo: { n: "flamingo", e: ["🥚", "🦩", "🦩", "🦩"], acc: ["", "", "🌺", "👑"], req: "reach couple level 6 💞", ok: () => couple().lv >= 5 },
  giraffe: { n: "giraffe", e: ["🥚", "🦒", "🦒", "🦒"], acc: ["", "", "🌿", "👑"], req: "earn the 14-day streak badge 💫", ok: u => !!(u.badges && u.badges.s14) },
  dragon: { n: "dragon", e: ["🥚", "🐉", "🐉", "🐉"], acc: ["", "", "🔥", "👑"], req: "earn the 250 hours badge 💎", ok: u => !!(u.badges && u.badges.h250) }
};
const ALLP = { ...PETS, ...EXTRA };
const MAX_FRIENDS = 5; // garden friends you can bring along (the garden itself shows 12 animals at most)
const petName = t => EXTRA[t] ? EXTRA[t].n : t;

export { ALLP, EXTRA, MAX_FRIENDS, PETS, STAGE, accOf, petFace, petName, petOf, petRow, stageNames, stageOf };
