// Pop-up sheets: the time wheel (sheet), 'still studying?' (askStill) and the profile / settings sheet.
import * as DB from "./db.js";
import { PETS, petOf } from "./pets.js";
import { elapsed, goalOf, limitOf, me } from "./state.js";
import { CUTE, DARK, GLASS, SEASON, calm, setTheme, themeBtns, toggleCalm } from "./theme.js";
import { $, EMOJI, errMsg, esc, fmt, key, modal, split, toast } from "./util.js";

function askStill(m) {
  const el = Math.floor(elapsed(m) / 1000), start = m.startedAt ? m.startedAt.toMillis() : Date.now();
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>still studying? 🥺</h3><p class="hint">Your timer has been running for ${fmt(el)}.</p>
  <button class="btn" id="y1">yes, still going 💪</button><button class="btn ghost" id="y2">no, I forgot to stop</button></div></div>`;
  $("#y1").onclick = async () => { modal.innerHTML = ""; await DB.checkIn(me.uid); toast("Keep going! 🌟"); };
  $("#y2").onclick = () => sheet({ title: "when did you stop? ⏱️", note: "Slide down to the time you really studied.", secs: el, max: el,
    onSave: async sec => { if (sec < 60) await DB.cancelStudy(me.uid); else await DB.addSession(me.uid, start, split(start, sec), sec, true); toast("Saved! 🌟"); } });
}

// ---------- sheets ----------
function sheet({ title, note = "", secs = 0, max, date, onSave }) { // max = cap in seconds (edit mode: can only reduce)
  const mins = Math.floor(secs / 60), hMax = max === undefined ? 23 : Math.floor(max / 3600);
  const col = (id, n) => `<div class="col" id="${id}">${[...Array(n + 1)].map((_, i) => `<div>${String(i).padStart(2, "0")}</div>`).join("")}</div>`;
  modal.innerHTML = `<div class="back"><div class="sheet"><h3>${title}</h3><p class="hint">${note}</p>
  ${date !== undefined ? `<input type="date" id="sd" value="${date}" max="${key(Date.now())}">` : ""}
  <div class="wheel"><div class="band"></div>${col("wh", hMax)}<b>:</b>${col("wm", 59)}</div><div class="wl"><span>hours</span><span>mins</span></div>
  <div class="row"><button class="btn ghost" id="sx">cancel</button><button class="btn" id="ss">save 💖</button></div></div></div>`;
  const wh = $("#wh"), wm = $("#wm"), idx = c => Math.round(c.scrollTop / 44);
  wh.scrollTop = Math.floor(mins / 60) * 44; wm.scrollTop = (mins % 60) * 44;
  let t;
  const clamp = () => { // if the wheels go above the original time, glide back to it
    if (max === undefined) return; const cap = Math.floor(max / 60);
    if (idx(wh) * 60 + idx(wm) > cap) { wh.scrollTo({ top: Math.floor(cap / 60) * 44, behavior: "smooth" }); wm.scrollTo({ top: (cap % 60) * 44, behavior: "smooth" }); }
  };
  const watch = c => { c.onscroll = () => { const i = idx(c); [...c.children].forEach((d, k) => d.classList.toggle("s", k === i)); clearTimeout(t); t = setTimeout(clamp, 150); }; c.onscroll(); };
  watch(wh); watch(wm);
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#ss").onclick = async () => {
    let sec = (idx(wh) * 60 + idx(wm)) * 60; if (max !== undefined) sec = Math.min(sec, max);
    try { await onSave(sec, $("#sd")?.value); modal.innerHTML = ""; } catch (e) { toast(errMsg(e)); }
  };
}
function profileSheet(mine) {
  modal.innerHTML = `<div class="back"><div class="sheet prof"><h3>your profile</h3><input id="pn" value="${esc(mine.name)}" maxlength="20">
  <div class="emojis">${EMOJI.map(e => `<button class="av ${e === mine.emoji ? "sel" : ""}" data-e="${e}">${e}</button>`).join("")}</div>
  <div class="opts"><button class="btn ghost" id="gl">🎯 daily goal: ${goalOf(mine) ? fmt(goalOf(mine)) : "off"}</button>
  <button class="btn ghost" id="lm">⏰ still-studying: ${limitOf(mine) ? "after " + fmt(limitOf(mine)) : "off"}</button>
  <button class="btn ghost" id="pt">${PETS[petOf(mine)].e[2]} pet: ${petOf(mine)}</button>
  <button class="btn ghost" id="pm">🍅 pomodoro: ${mine.pomoFocus ?? 25} / ${mine.pomoRest ?? 5} min</button>
  <button class="btn ghost" id="nt">🔔 notifications</button>
  <button class="btn ghost" id="rm">🍃 reduce motion: ${calm ? "on" : "off"}</button></div>
  <p class="hint">cute themes</p><div class="emojis">${themeBtns(["auto", ...CUTE])}</div><p class="hint">dark themes 🌙</p><div class="emojis">${themeBtns(DARK)}</div><p class="hint">seasons 🍃 · light, then dark</p><div class="emojis">${themeBtns(SEASON)}</div><p class="hint">glass themes ✨</p><div class="emojis">${themeBtns(GLASS)}</div>
  <div class="row"><button class="btn ghost" id="lo">log out</button><button class="btn" id="ps">save 💖</button></div><button class="link" id="sx">close</button></div></div>`;
  let em = mine.emoji;
  $("#gl").onclick = () => sheet({ title: "daily goal 🎯", note: "How long do you want to study each day? 00:00 turns it off.", secs: goalOf(mine), onSave: sec => DB.updateProfile(me.uid, { goal: sec }) });
  $("#lm").onclick = () => sheet({ title: "still-studying check ⏰", note: "Ask me “still studying?” when the timer runs this long. 00:00 turns it off.", secs: limitOf(mine), onSave: sec => DB.updateProfile(me.uid, { limit: sec }) });
  $("#pt").onclick = () => {
    modal.innerHTML = `<div class="back"><div class="sheet"><h3>pick your pet 🐾</h3><p class="hint">It grows as you study, and gets sleepy if you skip a day.</p><div class="emojis">${Object.keys(PETS).map(t => `<button class="av ${t === petOf(mine) ? "sel" : ""}" data-p="${t}" title="${t}">${PETS[t].e[2]}</button>`).join("")}</div><button class="link" id="sx">close</button></div></div>`;
    $("#sx").onclick = () => modal.innerHTML = "";
    modal.querySelectorAll("[data-p]").forEach(b => b.onclick = async () => { await DB.updateProfile(me.uid, { pet: b.dataset.p }); modal.innerHTML = ""; toast("New friend! " + PETS[b.dataset.p].e[2]); });
  };
  $("#pm").onclick = () => sheet({ title: "focus length 🍅", note: "How long is each study block? (hours : minutes)", secs: (mine.pomoFocus ?? 25) * 60,
    onSave: async sec => {
      if (sec < 60) throw Error("Minimum is 1 minute.");
      await DB.updateProfile(me.uid, { pomoFocus: sec / 60 });
      setTimeout(() => sheet({ title: "break length ☕", note: "How long is each break?", secs: (mine.pomoRest ?? 5) * 60,
        onSave: async s2 => { if (s2 < 60) throw Error("Minimum is 1 minute."); await DB.updateProfile(me.uid, { pomoRest: s2 / 60 }); toast("Pomodoro saved! 🍅"); } }), 0);
    } });
  $("#rm").onclick = () => { toggleCalm(); $("#rm").textContent = `🍃 reduce motion: ${calm ? "on" : "off"}`; toast(calm ? "Motion reduced 🍃" : "Motion back on ✨"); };
  $("#nt").onclick = async () => { try { toast((await Notification.requestPermission()) === "granted" ? "Notifications on! 🔔" : "Notifications blocked."); } catch { toast("Install the app to your home screen first."); } };
  modal.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { setTheme(b.dataset.t); modal.querySelectorAll("[data-t]").forEach(x => x.classList.toggle("sel", x === b)); });
  modal.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { em = b.dataset.e; modal.querySelectorAll("[data-e]").forEach(x => x.classList.toggle("sel", x === b)); });
  $("#sx").onclick = () => modal.innerHTML = "";
  $("#lo").onclick = () => { modal.innerHTML = ""; DB.logOut(); };
  $("#ps").onclick = async () => { await DB.updateProfile(me.uid, { name: $("#pn").value.trim() || mine.name, emoji: em }); modal.innerHTML = ""; };
}

export { askStill, profileSheet, sheet };
