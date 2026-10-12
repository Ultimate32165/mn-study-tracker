// Garden style: ground (meadow / flower field / sand / snow), fence, border along the front edge and a path.
// Shared garden: the most recently saved style of either of you is what both of you see (users/{uid}.land = { g, f, b, p, at }).
import * as DB from "./db.js";
import { G, LAND, PATH_PTS, WW, landOf, pathD } from "./garden-state.js";
import { me, users } from "./state.js";
import { $, errMsg, modal, toast } from "./util.js";

const BORDER_EMO = { flowers: ["🌷", "🌼", "🌸", "🌻"], mushrooms: ["🍄"] };
const STONE_W = [16, 12, 20, 14];
const borderHtml = b => { // little things in a row along the front edge of the world (card.js draws the same row)
  if (b === "flowers" || b === "mushrooms") { let h = "", i = 0; for (let x = 14; x < WW; x += 32, i++) h += `<i style="left:${x}px">${BORDER_EMO[b][i % BORDER_EMO[b].length]}</i>`; return h; }
  if (b === "stones") { let h = "", i = 0; for (let x = 14; x < WW; x += 32, i++) h += `<i class="st" style="left:${x}px;width:${STONE_W[i % 4]}px"></i>`; return h; }
  return "";
};
function applyLand(L) { // put a style on the live garden (only touches the DOM when something changed)
  if (!G.el) return;
  const sig = `${L.g}|${L.f}|${L.b}|${L.p}`; if (sig === G.landSig) return; G.landSig = sig;
  Object.keys(LAND.g).forEach(k => G.el.classList.toggle("gr-" + k, k === L.g));
  const fe = G.el.querySelector(".gfence"), be = G.el.querySelector(".gborder"), pe = G.el.querySelector(".gpath");
  if (fe) fe.className = "gfence f-" + L.f;
  if (be) { be.className = "gborder b-" + L.b; be.innerHTML = borderHtml(L.b); }
  if (pe) { pe.setAttribute("class", "gpath p-" + L.p); pe.innerHTML = L.p === "none" ? "" : `<path d="${pathD(PATH_PTS)}"/>`; }
}
function syncLand() { // called with every garden refresh
  if (!G.el) return;
  if (G.landEdit) { if (modal.querySelector(".lopt")) return; G.landEdit = false; } // the style sheet is open: show its preview, not the saved style
  applyLand(landOf(users));
}
function landSheet() {
  const saved = landOf(users), L = { ...saved }, rows = [["g", "ground"], ["f", "fence"], ["b", "border"], ["p", "path"]];
  G.landEdit = true;
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>style the garden 🎨</h3><p class="hint">Changes show up right behind this sheet. The garden is shared: whoever saves last decides what you both see.</p>
  ${rows.map(([k, n]) => `<h4 class="lh">${n}</h4><div class="lrow">${Object.keys(LAND[k]).map(v => `<button class="lopt" data-lk="${k}" data-lv="${v}">${LAND[k][v][0]} ${LAND[k][v][1]}</button>`).join("")}</div>`).join("")}
  <div class="row"><button class="btn ghost" id="sx">cancel</button><button class="btn" id="ls">save 💖</button></div></div></div>`;
  const paint = () => modal.querySelectorAll("[data-lk]").forEach(b => b.classList.toggle("sel", L[b.dataset.lk] === b.dataset.lv));
  modal.querySelectorAll("[data-lk]").forEach(b => b.onclick = () => { L[b.dataset.lk] = b.dataset.lv; applyLand(L); paint(); });
  $("#sx").onclick = () => { G.landEdit = false; applyLand(saved); modal.innerHTML = ""; };
  $("#ls").onclick = async () => {
    try { await DB.saveLand(me.uid, { ...L, at: Date.now() }); G.landEdit = false; modal.innerHTML = ""; toast("Garden styled 🎨"); } catch (e) { toast(errMsg(e)); }
  };
  paint();
}

export { landSheet, syncLand };
