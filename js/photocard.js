// Photocard UI: the options sheet (cardSheet), drawing the preview (renderCard), save / share / send; remembers the latest milestone.
import { ACCENTS, CORNERS, FILTERS, FONTS, PATTERNS, STICKERS, STYLES, drawCard } from "./card.js";
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
// the look = everything that changes how the card is drawn (tables live in card.js); saved on this device as one JSON string
const DEF = { style: "classic", accent: "theme", font: "theme", round: "soft", pat: "auto", stick: "auto", filt: "none", dark: false, msg: "" }, TBL = { style: STYLES, accent: ACCENTS, font: FONTS, round: CORNERS, pat: PATTERNS, stick: STICKERS, filt: FILTERS };
function loadLook() {
  let s = {}; try { s = JSON.parse(ls("cardLook") || "{}") || {}; } catch {}
  if (!s.style) s.style = ls("cardStyle"); if (!s.accent) s.accent = ls("cardAcc"); // older saves
  const o = { ...DEF }; for (const k in TBL) if (Object.prototype.hasOwnProperty.call(TBL[k], s[k])) o[k] = s[k];
  o.dark = s.dark === true; o.msg = typeof s.msg === "string" ? s.msg.slice(0, 36) : ""; return o;
}
const saveLook = () => ls("cardLook", JSON.stringify(cardOpt.look));
const cardOpt = { shape: ["square", "portrait", "story"].includes(ls("cardShape")) ? ls("cardShape") : "portrait", sid: "today", mode: "me", fid: "", period: "week", ms: loadMs(), scene: ls("cardScene") === "forest" ? "forest" : "garden", look: loadLook() };
let cardUrl = "", cardBlob = null, cardCv = null, cardSeq = 0, lastGift = 0;
async function renderCard() {
  const seq = ++cardSeq, img = $("#cimg"), ld = $(".cload"); if (!img) return;
  cardBlob = null; cardCv = null; if (ld) ld.hidden = false; // until the new card is drawn, save / send say "still drawing"
  try { await Promise.race([Promise.all([document.fonts.load("700 48px Fredoka"), document.fonts.load("800 28px Nunito"), ...(cardOpt.mode === "board" ? [document.fonts.load("30px Rye"), document.fonts.load("30px 'Special Elite'")] : ["film", "ticket"].includes(cardOpt.look.style) || cardOpt.look.font === "type" ? [document.fonts.load("30px 'Special Elite'")] : []), ...(cardOpt.look.font === "western" ? [document.fonts.load("30px Rye")] : []), ...(FONTS[cardOpt.look.font].fam ? [document.fonts.load(`700 48px ${FONTS[cardOpt.look.font].fam}`)] : [])]), new Promise(r => setTimeout(r, 1500))]); } catch {}
  if (seq !== cardSeq) return;
  let data; const md = cardOpt.mode;
  try { data = md === "together" ? cardDataTogether(cardOpt.shape, cardOpt.fid) : md === "recap" ? await cardDataRecap(cardOpt.shape, cardOpt.period) : md === "milestone" ? cardDataMilestone(cardOpt.shape, cardOpt.ms) : md === "board" ? cardDataBoard(cardOpt.shape) : cardData(cardOpt.shape, cardOpt.sid); }
  catch { if (seq === cardSeq) { toast("Couldn't draw that card 😢"); if (ld) ld.hidden = true; } return; }
  if (seq !== cardSeq) return;
  const cv = document.createElement("canvas");
  if (cardOpt.scene === "forest") { const fm = users.find(u => u.id === me.uid); if (fm) data.garden = { ...data.garden, forest: forestSnap(fm, totalOf(fm)) }; } // forest instead of garden
  data.look = cardOpt.look; // style, colour, font, corners, pattern, stickers, filter, dark, footer message
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
  const L = cardOpt.look, sess = sessions.slice(0, 12), friends = users.filter(u => u.id !== me.uid), canShare = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "a.png", { type: "image/png" })] })); } catch { return false; } })();
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
  <div class="seg wrap" id="cstyle" aria-label="card style">${Object.keys(STYLES).map(k => `<button data-look="style" data-v="${k}" class="${k === L.style ? "sel" : ""}">${STYLES[k].label}</button>`).join("")}</div>
  <div class="cacc" id="cacc" aria-label="accent colour">${Object.keys(ACCENTS).map(k => `<button data-look="accent" data-v="${k}" class="adot ${k === "theme" ? "athm" : ""} ${k === L.accent ? "sel" : ""}" ${ACCENTS[k] ? `style="background:${ACCENTS[k][0]}"` : ""} aria-label="${k}">${k === "theme" ? "🎨" : ""}</button>`).join("")}<button class="adot ashuf" id="cshuf" aria-label="surprise me">🎲</button></div>
  <details class="cmore"><summary>🎛️ more ways to customize</summary>
    ${[["font", "font", Object.fromEntries(Object.keys(FONTS).map(k => [k, FONTS[k].label]))], ["round", "corners", CORNERS], ["pat", "background pattern", PATTERNS], ["stick", "corner stickers", STICKERS], ["filt", "photo filter", FILTERS]].map(([key, lab, tb]) => `<div class="crow"><b>${lab}</b><div class="seg wrap">${Object.keys(tb).map(k => `<button data-look="${key}" data-v="${k}" class="${k === L[key] ? "sel" : ""}">${tb[k]}</button>`).join("")}</div></div>`).join("")}
    <div class="crow"><b>tone</b><div class="seg wrap"><button data-look="dark" data-v="false" class="${L.dark ? "" : "sel"}">☀️ style's own</button><button data-look="dark" data-v="true" class="${L.dark ? "sel" : ""}">🌙 dark</button></div></div>
    <div class="crow"><b>footer message</b><input id="cmsg" maxlength="36" value="${esc(L.msg)}" placeholder="🍓 MN Study Tracker"></div>
    <button class="btn ghost" id="creset">↺ reset the look</button>
  </details>
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
  const lookUi = () => modal.querySelectorAll("[data-look]").forEach(x => x.classList.toggle("sel", String(cardOpt.look[x.dataset.look]) === x.dataset.v)); // highlight what is chosen
  const setLook = (k, v) => { cardOpt.look[k] = v; saveLook(); lookUi(); renderCard(); };
  modal.querySelectorAll("[data-look]").forEach(b => b.onclick = () => setLook(b.dataset.look, b.dataset.look === "dark" ? b.dataset.v === "true" : b.dataset.v));
  let msgT = 0; $("#cmsg").oninput = e => { cardOpt.look.msg = e.target.value.slice(0, 36); saveLook(); clearTimeout(msgT); msgT = setTimeout(renderCard, 350); };
  $("#creset").onclick = () => { cardOpt.look = { ...DEF }; saveLook(); $("#cmsg").value = ""; lookUi(); renderCard(); };
  $("#cshuf").onclick = () => { // 🎲 a random look
    const pick = (o, not) => { const a = Object.keys(o).filter(k => k !== not); return a[Math.floor(Math.random() * a.length)]; }, l = cardOpt.look;
    l.style = pick(STYLES, l.style); l.accent = pick(ACCENTS, l.accent); l.font = pick(FONTS, l.font); l.round = pick(CORNERS); l.pat = Math.random() < .5 ? "auto" : pick(PATTERNS, "auto"); l.stick = Math.random() < .5 ? "auto" : pick(STICKERS, "auto"); l.filt = Math.random() < .5 ? "none" : pick(FILTERS, "none");
    saveLook(); lookUi(); renderCard();
  };
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
