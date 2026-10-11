// Photocard UI: the options sheet (cardSheet), drawing the preview (renderCard), save / share / send; remembers the latest milestone.
import { ACCENTS, STYLES, drawCard } from "./card.js";
import * as DB from "./db.js";
import { forestSnap } from "./forest.js";
import { cardData, cardDataBoard, cardDataMilestone, cardDataRecap, cardDataTogether, cardPal } from "./carddata.js";
import { me, sessions, totalOf, users } from "./state.js";
import { $, errMsg, esc, fmt, key, ls, modal, toast } from "./util.js";

// ---- photocard: a shareable image of your session, stats and garden (drawn by js/card.js) ----
// the look (style + accent colour) is chosen in the sheet, remembered on this device, and drawn by card.js (STYLES / ACCENTS live there)
// the latest milestone (pet evolved / streak record / couple level) is remembered on this device so you can still make its card later
const loadMs = () => { try { const m = JSON.parse(ls("lastMs") || "null"); return m && ["evolve", "streak", "level"].includes(m.type) ? m : null; } catch { return null; } };
const saveMs = ms => ls("lastMs", JSON.stringify(ms));
const cardOpt = { shape: ["square", "portrait", "story"].includes(ls("cardShape")) ? ls("cardShape") : "portrait", sid: "today", mode: "me", fid: "", period: "week", ms: loadMs(), scene: ls("cardScene") === "forest" ? "forest" : "garden", style: ls("cardStyle") in STYLES ? ls("cardStyle") : "classic", accent: ls("cardAcc") in ACCENTS ? ls("cardAcc") : "theme" };
let cardUrl = "", cardBlob = null, cardCv = null, cardSeq = 0, lastGift = 0;
async function renderCard() {
  const seq = ++cardSeq, img = $("#cimg"), ld = $(".cload"); if (!img) return;
  cardBlob = null; cardCv = null; if (ld) ld.hidden = false; // until the new card is drawn, save / send say "still drawing"
  try { await Promise.race([Promise.all([document.fonts.load("700 48px Fredoka"), document.fonts.load("800 28px Nunito"), ...(cardOpt.mode === "board" ? [document.fonts.load("30px Rye"), document.fonts.load("30px 'Special Elite'")] : ["film", "ticket"].includes(cardOpt.style) ? [document.fonts.load("30px 'Special Elite'")] : [])]), new Promise(r => setTimeout(r, 1500))]); } catch {}
  if (seq !== cardSeq) return;
  let data; const md = cardOpt.mode;
  try { data = md === "together" ? cardDataTogether(cardOpt.shape, cardOpt.fid) : md === "recap" ? await cardDataRecap(cardOpt.shape, cardOpt.period) : md === "milestone" ? cardDataMilestone(cardOpt.shape, cardOpt.ms) : md === "board" ? cardDataBoard(cardOpt.shape) : cardData(cardOpt.shape, cardOpt.sid); }
  catch { if (seq === cardSeq) { toast("Couldn't draw that card 😢"); if (ld) ld.hidden = true; } return; }
  if (seq !== cardSeq) return;
  const cv = document.createElement("canvas");
  if (cardOpt.scene === "forest") { const fm = users.find(u => u.id === me.uid); if (fm) data.garden = { ...data.garden, forest: forestSnap(fm, totalOf(fm)) }; } // forest instead of garden
  data.style = cardOpt.style; data.accent = cardOpt.accent; // look chosen in the sheet
  drawCard(cv, data, cardPal(data.garden.night, data.garden.wx));
  cv.toBlob(b => {
    if (seq !== cardSeq || !b) return;
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    cardBlob = b; cardCv = cv; cardUrl = URL.createObjectURL(b); img.src = cardUrl; if (ld) ld.hidden = true;
  }, "image/png");
}
// a small jpeg (640px wide, a few hundred KB at most) of the current card, to store in the friend's inbox
function giftImg() {
  const W = 640, c = document.createElement("canvas"); c.width = W; c.height = Math.round(cardCv.height * W / cardCv.width);
  c.getContext("2d").drawImage(cardCv, 0, 0, c.width, c.height);
  let q = .8, u = c.toDataURL("image/jpeg", q); while (u.length > 380000 && q > .35) { q -= .1; u = c.toDataURL("image/jpeg", q); }
  return u;
}
function cardSheet(mode) {
  const sess = sessions.slice(0, 12), friends = users.filter(u => u.id !== me.uid), canShare = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "a.png", { type: "image/png" })] })); } catch { return false; } })();
  if (!cardOpt.ms) cardOpt.ms = loadMs();
  cardOpt.mode = mode === "together" && friends.length ? "together" : mode === "milestone" && cardOpt.ms ? "milestone" : mode === "recap" ? "recap" : mode === "board" ? "board" : "me";
  if (!sess.some(x => x.id === cardOpt.sid)) cardOpt.sid = "today";
  if (!friends.some(u => u.id === cardOpt.fid)) cardOpt.fid = (friends.find(u => u.status === "studying") || friends[0] || {}).id || "";
  const SH = { square: "▫️ square", portrait: "🖼️ 4:5", story: "📱 story" }, PD = { week: "last 7 days", month: "last 30 days" },
    MD = { me: "👤 me", ...(friends.length ? { together: "💞 together" } : {}), recap: "🗓️ recap", board: "📝 board", ...(cardOpt.ms ? { milestone: "🏅 milestone" } : {}) };
  modal.innerHTML = `<div class="back"><div class="sheet cardsheet"><h3>photocard 📸</h3>
  <div class="seg" id="cmode">${Object.keys(MD).map(k => `<button data-mode="${k}" class="${k === cardOpt.mode ? "sel" : ""}">${MD[k]}</button>`).join("")}</div>
  <div class="seg" id="cper">${Object.keys(PD).map(k => `<button data-per="${k}" class="${k === cardOpt.period ? "sel" : ""}">${PD[k]}</button>`).join("")}</div>
  <div class="seg">${Object.keys(SH).map(k => `<button data-shape="${k}" class="${k === cardOpt.shape ? "sel" : ""}">${SH[k]}</button>`).join("")}</div>
  <div class="seg sty" id="cstyle" aria-label="card style">${Object.keys(STYLES).map(k => `<button data-style="${k}" class="${k === cardOpt.style ? "sel" : ""}">${STYLES[k].label}</button>`).join("")}</div>
  <div class="cacc" id="cacc" aria-label="accent colour">${Object.keys(ACCENTS).map(k => `<button data-acc="${k}" class="adot ${k === "theme" ? "athm" : ""} ${k === cardOpt.accent ? "sel" : ""}" ${ACCENTS[k] ? `style="background:${ACCENTS[k][0]}"` : ""} aria-label="${k}">${k === "theme" ? "🎨" : ""}</button>`).join("")}<button class="adot ashuf" id="cshuf" aria-label="surprise me">🎲</button></div>
  <div class="seg" id="cscene">${[["garden", "🌳 garden"], ["forest", "🌲 forest"]].map(([k, l]) => `<button data-scene="${k}" class="${k === cardOpt.scene ? "sel" : ""}">${l}</button>`).join("")}</div>
  <select id="csel" aria-label="which session"><option value="today">Today (all sessions)</option>${sess.map(x => `<option value="${esc(x.id)}" ${x.id === cardOpt.sid ? "selected" : ""}>${new Date(x.start.toMillis()).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${fmt(x.seconds)}</option>`).join("")}</select>
  <select id="cfr" aria-label="which friend">${friends.map(u => `<option value="${esc(u.id)}" ${u.id === cardOpt.fid ? "selected" : ""}>${esc(u.emoji)} ${esc(u.name)}</option>`).join("")}</select>
  <div class="cprev"><div class="cload">drawing your card…</div><img id="cimg" alt="photocard preview"></div>
  ${friends.length ? `<button class="btn" id="csend">💌 send</button>` : ""}
  <div class="row"><button class="btn ghost" id="cclose">close</button>${canShare ? `<button class="btn ghost" id="cshare">share</button>` : ""}<button class="btn ghost" id="csave">save ⬇️</button></div></div></div>`;
  const vis = () => { $("#csel").hidden = cardOpt.mode !== "me"; $("#cfr").hidden = friends.length < 2; $("#cper").hidden = cardOpt.mode !== "recap"; $("#cscene").hidden = cardOpt.mode === "board"; };
  const sendLbl = () => { const b = $("#csend"), f = friends.find(u => u.id === cardOpt.fid); if (b) { b.textContent = `💌 send to ${f ? f.name : "friend"}`; b.disabled = !f; } };
  const done = () => { cardSeq++; if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = ""; } cardBlob = null; cardCv = null; modal.innerHTML = ""; };
  $("#cclose").onclick = done;
  modal.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { cardOpt.mode = b.dataset.mode; modal.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("sel", x === b)); vis(); renderCard(); });
  modal.querySelectorAll("[data-per]").forEach(b => b.onclick = () => { cardOpt.period = b.dataset.per; modal.querySelectorAll("[data-per]").forEach(x => x.classList.toggle("sel", x === b)); renderCard(); });
  modal.querySelectorAll("[data-shape]").forEach(b => b.onclick = () => { cardOpt.shape = b.dataset.shape; ls("cardShape", cardOpt.shape); modal.querySelectorAll("[data-shape]").forEach(x => x.classList.toggle("sel", x === b)); renderCard(); });
  modal.querySelectorAll("[data-scene]").forEach(b => b.onclick = () => { cardOpt.scene = b.dataset.scene; ls("cardScene", cardOpt.scene); modal.querySelectorAll("[data-scene]").forEach(x => x.classList.toggle("sel", x === b)); renderCard(); });
  const lookUi = () => { modal.querySelectorAll("[data-style]").forEach(x => x.classList.toggle("sel", x.dataset.style === cardOpt.style)); modal.querySelectorAll("[data-acc]").forEach(x => x.classList.toggle("sel", x.dataset.acc === cardOpt.accent)); const s = modal.querySelector("[data-style].sel"); if (s) { const c = s.parentElement; c.scrollLeft = s.offsetLeft - c.clientWidth / 2 + s.offsetWidth / 2; } }; // keep the chosen style chip in view
  modal.querySelectorAll("[data-style]").forEach(b => b.onclick = () => { cardOpt.style = b.dataset.style; ls("cardStyle", cardOpt.style); lookUi(); renderCard(); });
  modal.querySelectorAll("[data-acc]").forEach(b => b.onclick = () => { cardOpt.accent = b.dataset.acc; ls("cardAcc", cardOpt.accent); lookUi(); renderCard(); });
  $("#cshuf").onclick = () => { const pick = (a, not) => { const o = a.filter(k => k !== not); return o[Math.floor(Math.random() * o.length)]; }; cardOpt.style = pick(Object.keys(STYLES), cardOpt.style); cardOpt.accent = pick(Object.keys(ACCENTS), cardOpt.accent); ls("cardStyle", cardOpt.style); ls("cardAcc", cardOpt.accent); lookUi(); renderCard(); }; // 🎲 random style + colour
  $("#csel").onchange = e => { cardOpt.sid = e.target.value; renderCard(); };
  $("#cfr").onchange = e => { cardOpt.fid = e.target.value; sendLbl(); if (cardOpt.mode === "together") renderCard(); };
  const file = () => new File([cardBlob], `study${cardOpt.mode === "me" ? "" : "-" + cardOpt.mode}-${key(Date.now())}.png`, { type: "image/png" });
  $("#csave").onclick = () => { if (!cardBlob) return toast("One sec, still drawing…"); const a = document.createElement("a"); a.href = cardUrl; a.download = file().name; document.body.appendChild(a); a.click(); a.remove(); toast("Saved 📸"); };
  const sh = $("#cshare"); if (sh) sh.onclick = async () => {
    if (!cardBlob) return toast("One sec, still drawing…");
    try { await navigator.share({ files: [file()], title: "MN Study Tracker" }); } catch (e) { if (e && e.name !== "AbortError") toast("Couldn't open sharing — try save instead"); }
  };
  const sd = $("#csend"); if (sd) sd.onclick = async () => { // deliver the card straight into the friend's together tab
    const f = friends.find(u => u.id === cardOpt.fid), mine = users.find(u => u.id === me.uid); if (!f || !mine) return;
    if (!cardCv) return toast("One sec, still drawing…");
    if (Date.now() - lastGift < 8000) return toast("Slow down, cutie 😄");
    lastGift = Date.now();
    try { await DB.sendGift(f.id, me.uid, mine.name, mine.emoji, cardOpt.mode, giftImg()); toast(`Sent to ${f.name} 💌`); } catch (e) { lastGift = 0; toast(errMsg(e)); }
  };
  vis(); sendLbl(); lookUi(); renderCard();
}

export { cardOpt, cardSheet, saveMs };
