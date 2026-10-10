// Shared to-do board: three lanes of sticky boxes you drag between. Mouse: just drag. Touch: press and hold a box, then drag.
// Saved in the top-level collection board/{id} = { text, lane 0|1|2, o (order inside the lane), color 0-4, by, name, emoji, at }.
const LANES = [["to do", "📝"], ["doing", "🔥"], ["done", "🎉"]];
const COLORS = ["--main", "--alt", "--live", "#ffc857", "#6fc4ff"];
const col = c => c[0] === "-" ? `var(${c})` : c;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tilt = id => (([...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 5) - 2) * .7; // each note leans a little, like sticky notes
const valid = n => n && typeof n.text === "string" && [0, 1, 2].includes(n.lane);
const inLane = (notes, l) => notes.filter(n => valid(n) && n.lane === l).sort((a, b) => (a.o || 0) - (b.o || 0) || ((a.at && a.at.seconds) || 0) - ((b.at && b.at.seconds) || 0));
export const nextOrder = (notes, l) => inLane(notes, l).reduce((m, n) => Math.max(m, n.o || 0), 0) + 1;

const note = n => `<div class="note${n.lane === 2 ? " done" : ""}" data-id="${esc(n.id)}" data-o="${n.o || 0}" style="--c:${col(COLORS[n.color] || COLORS[0])};--r:${tilt(n.id)}deg"><span>${esc(n.text)}</span>${n.emoji ? `<i class="by">${esc(n.emoji)}</i>` : ""}</div>`;

export function boardMain(notes) {
  return `<h2>our board</h2>
  <div class="bnew"><input id="bnew" maxlength="140" placeholder="what do we need to do? ✏️" autocomplete="off" enterkeyhint="send"><button class="chip" data-act="badd">add</button></div>
  <p class="hint">drag a box to move it · tap to edit · on a phone, press and hold first ✋</p>
  ${LANES.map(([name, e], l) => { const list = inLane(notes, l);
    return `<section class="lane" data-lane="${l}"><h4>${e} ${name} <em>${list.length}</em>${l === 2 && list.length ? `<button class="chip" data-act="bclear">clear</button>` : ""}</h4><div class="lbox">${list.map(note).join("")}</div></section>`; }).join("")}`;
}

// keep what you were typing when the page redraws (a friend added a note, the 30s refresh...)
export const boardKeep = () => { const i = document.querySelector("#bnew"); return i ? { v: i.value, f: document.activeElement === i } : null; };
export const boardRestore = k => { if (!k) return; const i = document.querySelector("#bnew"); if (i) { i.value = k.v; if (k.f) i.focus(); } };

let drag = null;
export const boardBusy = () => !!drag; // app.js doesn't redraw the page while a box is in your hand

// h = { move(id, lane, o, laneChanged), tap(id) }
export function initBoard(root, h) {
  let pend = null; // pressed, but not (yet) dragging
  const clearOver = () => document.querySelectorAll(".lane.over").forEach(l => l.classList.remove("over"));
  function place(x, y) { // move the ghost and the dotted placeholder to where the finger is
    const d = drag; d.x = x; d.y = y; d.ghost.style.left = x - d.dx + "px"; d.ghost.style.top = y - d.dy + "px";
    const lane = document.elementFromPoint(x, y)?.closest(".lane");
    document.querySelectorAll(".lane.over").forEach(l => l !== lane && l.classList.remove("over")); if (!lane) return; lane.classList.add("over");
    const box = lane.querySelector(".lbox"); let before = null;
    for (const n of box.children) { if (n === d.ph || n === d.el) continue; const r = n.getBoundingClientRect(); if (y < r.top || (y < r.bottom && x < r.left + r.width / 2)) { before = n; break; } }
    if (d.box !== box || d.before !== before) { d.box = box; d.before = before; box.insertBefore(d.ph, before); }
  }
  function begin() {
    const p = pend; pend = null; if (!p || !p.el.isConnected) return; clearTimeout(p.t);
    const el = p.el, r = el.getBoundingClientRect(), ghost = el.cloneNode(true), ph = document.createElement("div");
    ghost.classList.add("ghost"); ghost.style.width = r.width + "px"; document.body.appendChild(ghost);
    ph.className = "note ph"; ph.style.width = r.width + "px"; ph.style.height = r.height + "px"; el.parentNode.insertBefore(ph, el); el.classList.add("lifted");
    drag = { el, ghost, ph, id: p.id, dx: p.lx - r.left, dy: p.ly - r.top, lane0: +el.closest(".lane").dataset.lane, next0: el.nextElementSibling, box: null, before: null, x: p.lx, y: p.ly, si: 0 };
    drag.si = setInterval(() => { const y = drag.y, s = y < 110 ? -10 : y > innerHeight - 140 ? 10 : 0; if (s) { scrollBy(0, s); place(drag.x, drag.y); } }, 16);
    if (navigator.vibrate) navigator.vibrate(12);
    place(p.lx, p.ly);
  }
  function end(cancel) {
    const d = drag; if (!d) return; drag = null; clearInterval(d.si); d.ghost.remove(); clearOver();
    const box = d.ph.parentNode;
    if (cancel || !box) { d.ph.remove(); d.el.classList.remove("lifted"); return; }
    const kids = [...box.children].filter(n => n !== d.el), i = kids.indexOf(d.ph), prev = kids[i - 1], next = kids[i + 1];
    const po = prev && +prev.dataset.o, no = next && +next.dataset.o, lane = +box.parentNode.dataset.lane;
    const o = prev && next ? (po + no) / 2 : prev ? po + 1 : next ? no - 1 : 1;
    d.ph.replaceWith(d.el); d.el.classList.remove("lifted"); d.el.classList.toggle("done", lane === 2); d.el.dataset.o = o;
    if (lane !== d.lane0 || d.el.nextElementSibling !== d.next0) h.move(d.id, lane, o, lane !== d.lane0);
  }
  root.addEventListener("pointerdown", e => {
    const el = e.target.closest(".note"); if (!el || drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    pend = { el, id: el.dataset.id, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, touch: e.pointerType !== "mouse", t: 0 };
    if (pend.touch) pend.t = setTimeout(begin, 260); // press and hold, so normal scrolling still works
  });
  document.addEventListener("pointermove", e => {
    if (drag) return place(e.clientX, e.clientY);
    if (!pend) return;
    pend.lx = e.clientX; pend.ly = e.clientY;
    const far = Math.hypot(e.clientX - pend.x, e.clientY - pend.y);
    if (pend.touch) { if (far > 8) { clearTimeout(pend.t); pend = null; } } else if (far > 5) begin();
  });
  document.addEventListener("pointerup", () => {
    if (drag) return end(false);
    if (pend) { clearTimeout(pend.t); const id = pend.id; pend = null; h.tap(id); } // a tap, not a drag
  });
  document.addEventListener("pointercancel", () => { if (pend) { clearTimeout(pend.t); pend = null; } if (drag) end(true); });
  document.addEventListener("touchmove", e => { if (drag) e.preventDefault(); }, { passive: false }); // no page scrolling while a box is in your hand
  root.addEventListener("contextmenu", e => { if (e.target.closest(".note")) e.preventDefault(); });
}

// x = { modal, toast, err, save(text, color), del() }
export function boardSheet(n, x) {
  let color = Number.isInteger(n.color) && COLORS[n.color] ? n.color : 0;
  x.modal.innerHTML = `<div class="back"><div class="sheet"><h3>edit note ✏️</h3><textarea id="bt" maxlength="140" rows="3">${esc(n.text)}</textarea>
  <div class="swat">${COLORS.map((c, i) => `<button data-c="${i}" class="${i === color ? "sel" : ""}" style="--c:${col(c)}" aria-label="colour ${i + 1}"></button>`).join("")}</div>
  <p class="hint">${esc(n.emoji || "")} ${esc(n.name || "someone")} wrote this</p>
  <div class="row"><button class="btn ghost" id="bdel">delete 🗑️</button><button class="btn" id="bsv">save</button></div><button class="link" id="bx">close</button></div></div>`;
  const q = s => x.modal.querySelector(s), close = () => x.modal.innerHTML = "";
  q("#bx").onclick = close;
  x.modal.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { color = +b.dataset.c; x.modal.querySelectorAll("[data-c]").forEach(o => o.classList.toggle("sel", o === b)); });
  q("#bsv").onclick = async () => { const t = q("#bt").value.trim(); if (!t) return x.toast("Write something first ✏️"); try { await x.save(t.slice(0, 140), color); close(); } catch (e) { x.toast(x.err(e)); } };
  q("#bdel").onclick = async () => { try { await x.del(); close(); x.toast("Note removed 🗑️"); } catch (e) { x.toast(x.err(e)); } };
}
