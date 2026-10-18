// Celebrations: pet evolution pop-up, streak / couple-level pop-ups, new garden friend unlocked.
import { ALLP, EXTRA, petFace, petName, petOf, stageNames, stageOf } from "./pets.js";
import { cardOpt, cardSheet, saveMs } from "./photocard.js";
import { LV_T, totalOf } from "./state.js";
import { burst, esc, ls, toast } from "./util.js";

// ---- pet evolutions: when the pet reaches a new stage, show the old → new form with confetti (remembered on this device) ----
function checkEvolve(m) {
  const st = stageOf(totalOf(m)), k = "stg-" + m.id, seen = ls(k);
  if (seen == null) { ls(k, st); return; } // first run on this device: remember quietly
  if (st > +seen) { ls(k, st); evoMoment(m, +seen, st); }
}
function evoMoment(m, a, b) {
  const t = petOf(m), el = document.createElement("div"); el.className = "pop";
  el.innerHTML = `<div class="popc"><div class="evo"><span>${ALLP[t].e[a]}</span><em class="ar">➜</em><span class="new">${petFace(t, b)}</span></div><b>${esc(m.name)}'s ${esc(petName(t))} evolved!</b><p>${stageNames(t)[b]} ✨</p></div>`;
  const ms = { type: "evolve", pet: t, a, b, at: Date.now() }; saveMs(ms);
  el.onclick = () => el.remove(); document.body.appendChild(el); addCardBtn(el, ms); setTimeout(() => el.remove(), 9000);
  burst(); setTimeout(() => burst(["✨", "⭐", "🌟", "💖"], 30), 500);
}
function addCardBtn(el, ms) { // "make a card" button inside a milestone pop-up
  const b = document.createElement("button"); b.className = "chip pri"; b.textContent = "📸 make a card";
  b.onclick = e => { e.stopPropagation(); el.remove(); cardOpt.ms = ms; cardSheet("milestone"); };
  el.querySelector(".popc").appendChild(b);
}
function milestonePop(ms) { // streak record / couple level up
  const [e, t, sub] = ms.type === "streak" ? ["🔥", `${ms.n}-day streak!`, "a new personal record"] : ["💞", `Level ${ms.lv + 1}!`, LV_T[ms.lv]], el = document.createElement("div"); el.className = "pop";
  el.innerHTML = `<div class="popc"><div class="pe">${e}</div><b>${esc(t)}</b><p>${esc(sub)}</p></div>`;
  el.onclick = () => el.remove(); document.body.appendChild(el); addCardBtn(el, ms); setTimeout(() => el.remove(), 9000);
}
let gSeen = null, gSeenFor = "";
function checkUnlocks(m) { // new garden pet unlocked → confetti once (remembered on this device)
  if (gSeenFor !== m.id) { gSeenFor = m.id; try { gSeen = new Set(JSON.parse(ls("gunl-" + m.id) || "[]")); } catch { gSeen = new Set(); } }
  const fresh = Object.keys(EXTRA).filter(id => EXTRA[id].ok(m) && !gSeen.has(id)); if (!fresh.length) return;
  fresh.forEach(id => gSeen.add(id)); ls("gunl-" + m.id, JSON.stringify([...gSeen])); burst();
  setTimeout(() => toast(fresh.length > 1 ? `${fresh.length} new garden friends! 🌳` : `New garden friend: ${EXTRA[fresh[0]].e[2]} ${EXTRA[fresh[0]].n}!`), 1800);
}

export { checkEvolve, checkUnlocks, milestonePop };
