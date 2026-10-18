// Friend features: cheers (pop-up card + sticker picker) and the cards-from-friends inbox (gifts).
import * as DB from "./db.js";
import { dayLong } from "./carddata.js";
import { queueVisit } from "./garden-fx.js";
import { gifts, me, setGifts, ui } from "./state.js";
import { $, burst, errMsg, esc, key, modal, notify, toast } from "./util.js";

// ---- cheers: pop-up card + sticker picker ----
const short = t => [...String(t)].length <= 2; // an emoji vs a text sticker
const STICKERS = ["you got this! 💪", "proud of you! 🥹", "sending hugs 🤗", "sip some water 💧", "I believe in you ✨", "almost there! 🌟", "you're so smart 🧠", "break soon, I promise 🧃"];
function cheerCard(list) {
  const c = list[list.length - 1], el = document.createElement("div"); el.className = "pop";
  el.innerHTML = `<div class="popc"><div class="pe">${short(c.emoji) ? esc(c.emoji) : "💌"}</div><b>${esc(c.name || "Your friend")}</b><p>${short(c.emoji) ? "sent you a cheer!" : esc(c.emoji)}</p>${list.length > 1 ? `<small>+${list.length - 1} more</small>` : ""}</div>`;
  el.onclick = () => el.remove(); document.body.appendChild(el); setTimeout(() => el.remove(), 5500);
}
function stickerSheet(to, mine) {
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>send a sticker 💌</h3><p class="hint">tap one to send it right away</p><div class="stk">${STICKERS.map(t => `<button class="btn ghost" data-s="${esc(t)}">${esc(t)}</button>`).join("")}</div><button class="link" id="sx">close</button></div></div>`;
  $("#sx").onclick = () => modal.innerHTML = "";
  modal.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => { modal.innerHTML = ""; try { await DB.cheer(to, me.uid, mine.name, b.dataset.s); toast("Sticker sent 💌"); } catch (e) { toast(errMsg(e)); } });
}

// ---- cards from friends: the inbox on the together tab ----
const giftKnown = new Set(); // ids already announced on this device
const safeImg = u => typeof u === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(u) ? u : ""; // a friend's document is untrusted: only ever show a plain jpeg
const urls = new Map(); // gift id -> { d: data URL, u: blob URL }: the page gets a short blob: link instead of a ~300 KB data: string on every redraw
function imgSrc(g) {
  const d = safeImg(g.img); if (!d) return "";
  const c = urls.get(g.id); if (c && c.d === d) return c.u;
  try { const b = atob(d.slice(23)), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); const u = URL.createObjectURL(new Blob([a], { type: "image/jpeg" })); if (c) URL.revokeObjectURL(c.u); urls.set(g.id, { d, u }); return u; } catch { return d; }
}
function onGifts(list) {
  list.slice(8).forEach(g => DB.deleteGift(me?.uid, g.id).catch(() => {})); // keep only the newest 8
  setGifts(list.slice(0, 8).filter(g => safeImg(g.img)));
  urls.forEach((c, id) => { if (!gifts.some(g => g.id === id)) { URL.revokeObjectURL(c.u); urls.delete(id); } });
  const fresh = gifts.filter(g => !g.seen && !giftKnown.has(g.id)); gifts.forEach(g => giftKnown.add(g.id));
  if (fresh.length) {
    const who = fresh[0].name || "Your friend"; burst(["💌", "✨"], 20); queueVisit(fresh[0].from);
    toast(fresh.length > 1 ? `${fresh.length} new cards from ${who} 💌` : `${who} sent you a card 💌`); notify(`${who} sent you a card 💌`, "Open the app to see it");
  }
  ui.render();
}
const giftsView = () => !gifts.length ? "" : `<h2>cards for you 💌</h2><div class="gifts">${gifts.map(g => `<button class="gift ${g.seen ? "" : "new"}" data-act="gift" data-id="${esc(g.id)}"><img src="${imgSrc(g)}" alt="card from ${esc(g.name)}" decoding="async"><span>${esc(g.emoji)} ${esc(g.name)}</span></button>`).join("")}</div>`;
function giftSheet(id) {
  const g = gifts.find(x => x.id === id); if (!g) return;
  if (!g.seen) DB.markGift(me.uid, g.id).catch(() => {});
  const when = g.at && g.at.toMillis ? dayLong(g.at.toMillis()) : "";
  modal.innerHTML = `<div class="back"><div class="sheet cardsheet"><h3>${esc(g.emoji)} from ${esc(g.name)}</h3><p class="hint">${esc(when)}</p><div class="cprev"><img src="${imgSrc(g)}" alt="card from ${esc(g.name)}"></div>
  <div class="row"><button class="btn ghost" id="gx">close</button><button class="btn" id="gs">save ⬇️</button></div><button class="link" id="gd">remove this card 🗑️</button></div></div>`;
  $("#gx").onclick = () => modal.innerHTML = "";
  $("#gs").onclick = () => { const a = document.createElement("a"); a.href = safeImg(g.img); a.download = `card-from-${String(g.name || "friend").replace(/[^a-z0-9]+/gi, "-")}-${key(Date.now())}.jpg`; document.body.appendChild(a); a.click(); a.remove(); toast("Saved 📸"); };
  $("#gd").onclick = async () => { if (!confirm("Remove this card?")) return; try { await DB.deleteGift(me.uid, g.id); modal.innerHTML = ""; } catch (e) { toast(errMsg(e)); } };
}

export { cheerCard, giftKnown, giftSheet, giftsView, onGifts, short, stickerSheet };
