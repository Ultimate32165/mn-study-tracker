// ENTRY POINT. Draws the page (render), wires every button (data-act actions) and boots Firebase auth. Almost no logic of its own.
import { boardBusy, boardDraft, boardKeep, boardMain, boardRestore, boardSheet, boardStyleSheet, initBoard, nextOrder } from "./board.js";
import * as DB from "./db.js";
import { SIGNUP_CODE } from "./firebase-config.js";
import { forestAct, forestMain } from "./forest.js";
import { delSel, enterEdit, exitEdit, gardenPanel, resetSeedBase, seedsLeft, shopSheet } from "./decor.js";
import { clearGarden, findPet, gardenMain, gardenSheet, gardenTap, mountGarden, syncGarden, treat } from "./garden.js";
import { collectVisitor, cycleWx, queueVisit, resetVisits } from "./garden-fx.js";
import { G, isEvening } from "./garden-state.js";
import { authView, compact, homeView, pomo, runInstall, setCompact, setInstallEvt, togglePomo } from "./home.js";
import { cardSheet } from "./photocard.js";
import { profileSheet, sheet } from "./sheets.js";
import { cheerCard, giftKnown, giftSheet, onGifts, short, stickerSheet } from "./social.js";
import { cycleSound, playSelected, stopSound } from "./sound.js";
import { board, elapsed, focusOf, me, resetData, sessions, setBoard, setSessions, setTab, setUsers, tab, totalOf, ui, users } from "./state.js";
import { shiftMonth, statsView } from "./stats-view.js";
import { $, EMOJI, app, burst, errMsg, esc, fmt, foldSet, key, ls, modal, notify, split, toast } from "./util.js";
import { tick } from "./watch.js";

let unsubs = [], lastCheer = 0;
ui.render = render; // let the other files ask for a redraw

// ---------- the page ----------
function render() {
  if (!me) return authView();
  const mine = users.find(u => u.id === me.uid);
  if (!mine) return app.innerHTML = `<div class="auth"><div class="logo">📚</div><p class="hint">loading…</p></div>`;
  if (boardBusy()) return; // a box is in your hand: don't redraw under your finger
  if (tab === "garden" && G.el && G.el.isConnected) { // garden is showing: leave the live scene alone, refresh only what sits around it
    const av = app.querySelector("header .av"); if (av && av.textContent !== mine.emoji) av.textContent = mine.emoji;
    const gp = $("#gpanel"); if (gp) gp.innerHTML = gardenPanel();
    syncGarden(); return;
  }
  const kept = tab === "board" ? boardKeep() : null;
  app.innerHTML = `<header><h1>MN study tracker</h1><div class="hr">${tab === "home" ? `<button class="mtog ${compact ? "on" : ""}" data-act="compact" data-id="${compact ? 0 : 1}" role="switch" aria-checked="${compact}" title="shorter home tab"><em>short</em><i></i></button>` : ""}<button class="av" data-act="profile">${esc(mine.emoji)}</button></div></header>
  <main>${tab === "home" ? homeView(mine) : tab === "garden" ? gardenMain() : tab === "board" ? boardMain(board) : tab === "forest" ? forestMain(mine, seedsLeft(mine), totalOf(mine), isEvening() || /night|cocoa|berry|forest|deepsea|ink|galaxy/.test(document.documentElement.dataset.theme || "")) : statsView(mine)}</main>
  <nav><button class="${tab === "home" ? "act" : ""}" data-act="tab" data-id="home">🏠<span>together</span></button><button class="${tab === "stats" ? "act" : ""}" data-act="tab" data-id="stats">📊<span>my stats</span></button><button class="${tab === "garden" ? "act" : ""}" data-act="tab" data-id="garden">🌳<span>garden</span></button><button class="${tab === "forest" ? "act" : ""}" data-act="tab" data-id="forest">🌲<span>forest</span></button><button class="${tab === "board" ? "act" : ""}" data-act="tab" data-id="board">📝<span>board</span></button></nav>`;
  if (tab === "garden") mountGarden();
  if (kept) boardRestore(kept);
  tick();
}

// ---- shared to-do board (js/board.js) ----
async function addBoardNote(mine) {
  const i = $("#bnew"), text = (i ? i.value : "").trim().slice(0, 140); if (!text || !mine) return i && i.focus();
  i.value = ""; const dr = boardDraft();
  try { await DB.addNote(me.uid, mine.name, mine.emoji, text, 0, nextOrder(board, 0), dr.color, dr.icon); } catch (e) { i.value = text; toast(errMsg(e)); }
}
initBoard(app, {
  move: (id, lane, o, laneChanged) => { DB.moveNote(id, lane, o).catch(e => toast(errMsg(e))); if (laneChanged && lane === 2) { burst(["🎉", "✨"], 20); toast("Done! 🎉"); } },
  tap: id => { const n = board.find(x => x.id === id); if (n) boardSheet(n, { modal, toast, err: errMsg, save: (t, c, ic) => DB.editNote(id, t, c, ic), del: () => DB.deleteNote(id) }); }
});
app.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "bnew") { e.preventDefault(); addBoardNote(users.find(u => u.id === (me && me.uid))); } });


// ---------- actions (every data-act button) ----------
// ---------- actions ----------
app.onclick = async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, mine = users.find(u => u.id === me?.uid);
  try {
    if (a === "login" || a === "signup") {
      const u = $("#u").value.trim(), p = $("#p").value;
      if (!/^[a-z0-9_.]{3,20}$/i.test(u)) return toast("Username: 3–20 letters, numbers, _ or .");
      if (a === "login") await DB.logIn(u, p);
      else { if (SIGNUP_CODE && $("#c").value.trim() !== SIGNUP_CODE) return toast("Wrong secret code."); await DB.signUp(u, p, EMOJI[Math.floor(Math.random() * EMOJI.length)]); }
    } else if (a === "tab") { setTab(id); render(); }
    else if (a === "fold") { if (foldSet.has(id)) foldSet.delete(id); else foldSet.add(id); ls("fold", JSON.stringify([...foldSet])); render(); }
    else if (a === "compact") { setCompact(id === "1"); render(); }
    else if (a === "install") { runInstall(); render(); }
    else if (a === "study") { playSelected(); await DB.startStudy(me.uid, pomo, focusOf(mine)); toast("Good luck! 🍀"); }
    else if (a === "pause") { stopSound(); await DB.pauseStudy(me.uid, elapsed(mine)); }
    else if (a === "resume") { playSelected(); await DB.resumeStudy(me.uid); }
    else if (a === "pomo") { togglePomo(); render(); }
    else if (a === "cheer") { if (Date.now() - lastCheer < 3000) return toast("Slow down, cutie 😄"); lastCheer = Date.now(); await DB.cheer(id, me.uid, mine.name, b.dataset.e); toast("Cheer sent " + b.dataset.e); }
    else if (a === "sound") { cycleSound(); render(); }
    else if (a === "stickers") stickerSheet(id, mine);
    else if (a === "gpet") gardenTap(id);
    else if (a === "gchoose") gardenSheet(mine);
    else if (a === "gshop") shopSheet(mine);
    else if (a === "bstyle") boardStyleSheet({ modal, rerender: render });
    else if (a === "badd") addBoardNote(mine);
    else if (a === "bclear") { const ids = board.filter(n => n.lane === 2).map(n => n.id); if (ids.length && confirm(`Clear ${ids.length} finished note${ids.length > 1 ? "s" : ""}?`)) await DB.clearNotes(ids); }
    else if (a === "fcell") forestAct(+id, { u: mine, total: totalOf(mine), left: seedsLeft(mine), modal, toast, err: errMsg, fmt, burst, save: t => DB.saveForest(me.uid, t) });
    else if (a === "gedit") enterEdit(mine);
    else if (a === "gdone") await exitEdit(true);
    else if (a === "gcancel") await exitEdit(false);
    else if (a === "gdel") delSel();
    else if (a === "gwx") cycleWx();
    else if (a === "gtreat") await treat(id, mine);
    else if (a === "gvis") await collectVisitor(mine);
    else if (a === "gfind") findPet();
    else if (a === "card") cardSheet(["together", "recap", "board"].includes(id) ? id : "me");
    else if (a === "gift") giftSheet(id);
    else if (a === "calnav") { shiftMonth(+id); render(); }
    else if (a === "day") { const v = +b.dataset.v; toast(`${new Date(id + "T12:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${v ? fmt(v) : "no study 💤"}`); }
    else if (a === "discard") { if (confirm("Cancel without saving any time?")) { stopSound(); await DB.cancelStudy(me.uid); } }
    else if (a === "profile") profileSheet(mine);
    else if (a === "stop") {
      stopSound();
      const start = mine.startedAt ? mine.startedAt.toMillis() : Date.now(), sec = Math.floor(elapsed(mine) / 1000);
      if (sec < 60) { await DB.cancelStudy(me.uid); toast("Under a minute, so nothing was saved."); }
      else { await DB.addSession(me.uid, start, split(start, sec), sec, true); toast("Saved! 🌟"); }
    } else if (a === "add") {
      sheet({ title: "add study time", note: "Studied without pressing the button? Add it here.", date: key(Date.now()),
        onSave: async (sec, d) => { if (!sec) throw Error("Enter some time first."); const [y, m, dd] = d.split("-").map(Number), st = new Date(y, m - 1, dd, 12).getTime();
          await DB.addSession(me.uid, st, split(st, sec), sec, false, true); toast("Added! ✨"); } });
    } else if (a === "edit") {
      const s = sessions.find(x => x.id === id), st = s.start.toMillis();
      sheet({ title: "shorten session ✏️", note: "You can only reduce this session. To add more time, use “+ add time”.", secs: s.seconds, max: s.seconds,
        onSave: async sec => { if (sec < 60) throw Error("Use the 🗑️ button to remove a session."); sec = Math.min(sec, s.seconds); await DB.editSession(me.uid, s, split(st, sec), sec); toast("Updated! ✨"); } });
    } else if (a === "del") { if (confirm("Delete this session?")) await DB.deleteSession(me.uid, sessions.find(x => x.id === id)); }
  } catch (err) { toast(errMsg(err)); }
};


// ---------- boot ----------
DB.watchAuth(u => {
  unsubs.forEach(f => f()); unsubs = []; resetData(u); giftKnown.clear(); clearGarden(); resetSeedBase(); resetVisits();
  if (u) unsubs = [DB.watchUsers(x => { setUsers(x); render(); }), DB.watchBoard(x => { setBoard(x); render(); }), DB.watchSessions(u.uid, x => { setSessions(x); render(); }),
    DB.watchCheers(u.uid, list => {
      cheerCard(list); list.forEach(c => queueVisit(c.from)); burst(list.map(c => short(c.emoji) ? c.emoji : "💌"), 24);
      notify(`${list[0].name || "Your friend"} sent you a cheer!`, list.map(c => c.emoji).join("  "));
    }), DB.watchGifts(u.uid, onGifts)];
  render();
});
addEventListener("beforeinstallprompt", e => { e.preventDefault(); setInstallEvt(e); render(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
