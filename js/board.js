// Shared to-do board: three lanes of sticky boxes you drag between. Mouse: just drag. Touch: press and hold a box, then drag.
// Saved in the top-level collection board/{id} = { text, lane 0|1|2, o (order inside the lane), color 0-15, icon (sticker emoji), by, name, emoji, at }.
export const COLORS = ["--main", "--alt", "--live", "#ffc857", "#6fc4ff", "#ff8fb8", "#ffab76", "#ffe66d", "#7fe0b5", "#b79cff", "#d9a7ff", "#ff7b7b", "#fff1d6", "#9fb4d6", "#b9d77a", "#d8517f"]; // the first 5 are the original colours
const STICKERS = ["", "🌸", "⭐", "🍓", "🐰", "🐱", "🐻", "☁️", "🍀", "🍰", "🎀", "🧸", "🦋", "🌈", "💖", "🐥", "🍄"];
const STYLES = { // looks for the whole board (saved on this device only); the notes themselves are shared
  cutie:    { n: "cutie",      e: "🌸", lanes: [["to do", "📝"], ["doing", "🔥"], ["done", "🎉"]] },
  western:  { n: "western",    e: "🤠", lanes: [["wanted", "🤠"], ["on the trail", "🐴"], ["case closed", "⭐"]] },
  cork:     { n: "cork board", e: "📌", lanes: [["to do", "📌"], ["doing", "🔥"], ["done", "🎉"]] },
  chalk:    { n: "chalkboard", e: "🖍️", lanes: [["to do", "✏️"], ["doing", "🔥"], ["done", "✅"]] },
  notebook: { n: "notebook",   e: "📓", lanes: [["to do", "📓"], ["doing", "✍️"], ["done", "✔️"]] },
  own:      { n: "my own",     e: "✨", lanes: [["to do", "📝"], ["doing", "🔥"], ["done", "🎉"]] }
};
const PATS = ["plain", "dots", "grid", "lines", "stripes"], KEY = "boardStyle";
const getStyle = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && STYLES[v.s]) return { s: v.s, bg: COLORS[v.bg] ? v.bg : 0, pat: PATS.includes(v.pat) ? v.pat : "dots", faces: v.faces !== false }; } catch {} return { s: "cutie", bg: 0, pat: "dots", faces: true }; };
const setStyle = p => { try { localStorage.setItem(KEY, JSON.stringify({ ...getStyle(), ...p })); } catch {} };
let palOpen = false; // phone: is the colour & sticker card unfolded? (on a wide screen it is a side bar, always open)
let draft = { color: -1, icon: "" }; // colour / sticker for the next new note (-1 = surprise me)
export const boardDraft = () => ({ color: draft.color >= 0 ? draft.color : Math.floor(Math.random() * COLORS.length), icon: draft.icon });
const col = c => c[0] === "-" ? `var(${c})` : c;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tilt = id => (([...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 5) - 2) * .7; // each note leans a little, like sticky notes
const valid = n => n && typeof n.text === "string" && [0, 1, 2].includes(n.lane);
const inLane = (notes, l) => notes.filter(n => valid(n) && n.lane === l).sort((a, b) => (a.o || 0) - (b.o || 0) || ((a.at && a.at.seconds) || 0) - ((b.at && b.at.seconds) || 0));
export const nextOrder = (notes, l) => inLane(notes, l).reduce((m, n) => Math.max(m, n.o || 0), 0) + 1;

const preview = () => `<b${draft.color >= 0 ? ` style="--c:${col(COLORS[draft.color])}"` : ""}>${draft.color < 0 ? "🎲" : ""}</b>${draft.icon ? `<b>${draft.icon}</b>` : ""}`;
const note = n => `<div class="note${n.lane === 2 ? " done" : ""}" data-id="${esc(n.id)}" data-o="${n.o || 0}" data-l="${n.lane}" style="--c:${col(COLORS[n.color] || COLORS[0])};--r:${tilt(n.id)}deg"><span>${esc(n.text)}</span>${STICKERS.includes(n.icon) && n.icon ? `<b class="nstk">${n.icon}</b>` : ""}${n.emoji ? `<i class="by">${esc(n.emoji)}</i>` : ""}</div>`;

// plain data for the photocard (js/card.js draws it): the board's look + the notes in each lane
export function boardSnap(notes) {
  const st = getStyle(), S = STYLES[st.s];
  return { style: st.s, bg: st.bg, pat: st.pat, faces: st.faces, lanes: S.lanes.map(([name, e], l) => ({ name, e, notes: inLane(notes, l).map(n => ({ t: n.text, c: COLORS[n.color] ? n.color : 0, i: STICKERS.includes(n.icon) ? n.icon : "", e: n.emoji || "", r: tilt(n.id) })) })) };
}

export function boardMain(notes) {
  const st = getStyle(), S = STYLES[st.s];
  return `<div class="bnew"><input id="bnew" maxlength="140" placeholder="what do we need to do? ✏️" autocomplete="off" enterkeyhint="send"><button class="chip pri" data-act="badd">add</button></div>
  <aside class="bside${palOpen ? " open" : ""}" id="bside"><button class="bside-t" data-bt>🎨 colours &amp; stickers <span class="now" id="bnow">${preview()}</span><i>▾</i></button>
    <div class="bside-b"><h5>colour</h5><div class="bgrid" id="bcol"><button class="rnd${draft.color < 0 ? " sel" : ""}" data-bc="-1" aria-label="surprise colour" title="surprise me">🎲</button>${COLORS.map((c, i) => `<button data-bc="${i}" class="${draft.color === i ? "sel" : ""}" style="--c:${col(c)}" aria-label="colour ${i + 1}"></button>`).join("")}</div>
    <h5>sticker</h5><div class="bgrid bsg" id="bstk">${STICKERS.map(e => `<button data-bi="${e}" class="${draft.icon === e ? "sel" : ""}" aria-label="sticker ${e || "none"}">${e || "∅"}</button>`).join("")}</div>
    <p class="bhint">for your next note</p></div></aside>
  <div class="bhead"><p class="hint">drag to move · tap to edit · on a phone, press and hold first ✋</p><span class="bbtns"><button class="chip" data-act="card" data-id="board">📸 photocard</button><button class="chip" data-act="bstyle">🎨 style</button></span></div>
  <div class="bd s-${st.s} p-${st.pat}${st.faces ? "" : " nofaces"}" style="--bgc:${col(COLORS[st.bg])}">
  ${S.lanes.map(([name, e], l) => { const list = inLane(notes, l);
    return `<section class="lane" data-lane="${l}"><h4>${e} ${name} <em>${list.length}</em>${l === 2 && list.length ? `<button class="chip" data-act="bclear">clear</button>` : ""}</h4><div class="lbox">${list.map(note).join("")}</div></section>`; }).join("")}</div>`;
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
    ghost.classList.add("ghost"); ghost.style.width = r.width + "px"; (el.closest(".bd") || document.body).appendChild(ghost); // inside the board, so it wears the board style
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
    d.ph.replaceWith(d.el); d.el.classList.remove("lifted"); d.el.classList.toggle("done", lane === 2); d.el.dataset.o = o; d.el.dataset.l = lane;
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
  root.addEventListener("click", e => { // colour / sticker for the next new note
    const c = e.target.closest("[data-bc]"), t = e.target.closest("[data-bi]");
    if (e.target.closest("[data-bt]")) { palOpen = !palOpen; document.querySelector("#bside")?.classList.toggle("open", palOpen); }
    if (c) { draft.color = +c.dataset.bc; document.querySelectorAll("#bcol button").forEach(b => b.classList.toggle("sel", b === c)); }
    if (t) { draft.icon = t.dataset.bi; document.querySelectorAll("#bstk button").forEach(b => b.classList.toggle("sel", b === t)); }
    if (c || t) { const w = document.querySelector("#bnow"); if (w) w.innerHTML = preview(); }
  });
}

// x = { modal, toast, err, save(text, color, icon), del() }
export function boardSheet(n, x) {
  let color = Number.isInteger(n.color) && COLORS[n.color] ? n.color : 0, icon = STICKERS.includes(n.icon) ? n.icon : "";
  x.modal.innerHTML = `<div class="back"><div class="sheet"><h3>edit note ✏️</h3><textarea id="bt" maxlength="140" rows="3">${esc(n.text)}</textarea>
  <div class="swat wrap">${COLORS.map((c, i) => `<button data-c="${i}" class="${i === color ? "sel" : ""}" style="--c:${col(c)}" aria-label="colour ${i + 1}"></button>`).join("")}</div>
  <div class="stks">${STICKERS.map(e => `<button data-i="${e}" class="${e === icon ? "sel" : ""}">${e || "∅"}</button>`).join("")}</div>
  <p class="hint">${esc(n.emoji || "")} ${esc(n.name || "someone")} wrote this</p>
  <div class="row"><button class="btn ghost" id="bdel">delete 🗑️</button><button class="btn" id="bsv">save</button></div><button class="link" id="bx">close</button></div></div>`;
  const q = s => x.modal.querySelector(s), close = () => x.modal.innerHTML = "";
  q("#bx").onclick = close;
  x.modal.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { color = +b.dataset.c; x.modal.querySelectorAll("[data-c]").forEach(o => o.classList.toggle("sel", o === b)); });
  x.modal.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { icon = b.dataset.i; x.modal.querySelectorAll("[data-i]").forEach(o => o.classList.toggle("sel", o === b)); });
  q("#bsv").onclick = async () => { const t = q("#bt").value.trim(); if (!t) return x.toast("Write something first ✏️"); try { await x.save(t.slice(0, 140), color, icon); close(); } catch (e) { x.toast(x.err(e)); } };
  q("#bdel").onclick = async () => { try { await x.del(); close(); x.toast("Note removed 🗑️"); } catch (e) { x.toast(x.err(e)); } };
}

// x = { modal, rerender } — pick the look of the board (kept on this device)
export function boardStyleSheet(x) {
  const close = () => x.modal.innerHTML = "", q = s => x.modal.querySelectorAll(s);
  const draw = () => {
    const st = getStyle();
    x.modal.innerHTML = `<div class="back"><div class="sheet"><h3>board style 🎨</h3>
    <div class="bsty">${Object.entries(STYLES).map(([id, v]) => `<button data-s="${id}" class="${id === st.s ? "sel" : ""}"><span>${v.e}</span>${v.n}</button>`).join("")}</div>
    ${st.s === "own" ? `<p class="hint">board colour</p><div class="swat wrap">${COLORS.map((c, i) => `<button data-bg="${i}" class="${i === st.bg ? "sel" : ""}" style="--c:${col(c)}" aria-label="colour ${i + 1}"></button>`).join("")}</div>
    <p class="hint">pattern</p><div class="bpat">${PATS.map(p => `<button data-p="${p}" class="${p === st.pat ? "sel" : ""}">${p}</button>`).join("")}</div>` : ""}
    <label class="tgl"><input type="checkbox" id="bf"${st.faces ? " checked" : ""}> little faces on the notes ( • ᴗ • )</label>
    <p class="hint">only changes how the board looks for you · the notes stay shared</p>
    <button class="btn" id="bok">done</button></div></div>`;
    q("[data-s]").forEach(b => b.onclick = () => { setStyle({ s: b.dataset.s }); draw(); x.rerender(); });
    q("[data-bg]").forEach(b => b.onclick = () => { setStyle({ bg: +b.dataset.bg }); draw(); x.rerender(); });
    q("[data-p]").forEach(b => b.onclick = () => { setStyle({ pat: b.dataset.p }); draw(); x.rerender(); });
    x.modal.querySelector("#bf").onchange = e => { setStyle({ faces: e.target.checked }); x.rerender(); };
    x.modal.querySelector("#bok").onclick = close;
  };
  draw();
}
