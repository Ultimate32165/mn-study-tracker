// GAMES TAB: Wordscapes with Level Selector & Progress tracking
import { LEVELS } from "./words.js";
import { tab, ui } from "./state.js";
import { burst, ls, modal, toast } from "./util.js";

const START_COINS = 30;
const HINT_COST = 15;
const BONUS_COIN = 2;
const LEVEL_COMPLETE_COIN = 10;

function loadStore() {
  try {
    const raw = JSON.parse(ls("games") || "{}");
    if (raw.v === 2 && typeof raw.lvl === "number") {
      if (!raw.maxLvl) raw.maxLvl = raw.lvl; // track highest unlocked level
      return raw;
    }
  } catch {}
  return { v: 2, lvl: 1, maxLvl: 1, lv: null, coins: START_COINS, st: { played: 0, won: 0 } };
}

const store = loadStore();
const save = () => ls("games", JSON.stringify(store));

function getLevelDef(lvlNum) {
  const idx = (lvlNum - 1) % LEVELS.length;
  return LEVELS[idx];
}

function initLevelState(lvlNum) {
  const def = getLevelDef(lvlNum);
  const letters = [...def.wheel_letters];
  letters.sort(() => 0.5 - Math.random());
  return {
    lvlNum,
    order: letters,
    found: [],
    bonus: [],
    hints: {},
    done: false
  };
}

function curLevel() {
  const def = getLevelDef(store.lvl);
  const isMismatch = !store.lv || 
    store.lv.lvlNum !== store.lvl || 
    store.lv.order.slice().sort().join("") !== def.wheel_letters.slice().sort().join("");

  if (isMismatch) {
    store.lv = initLevelState(store.lvl);
    save();
  }
  return store.lv;
}

// In-progress letter selection
let sel = [];
let isSwiping = false;

function getLetterUnderPointer(e) {
  const wheel = document.querySelector(".wwheel");
  if (!wheel) return -1;
  const rect = wheel.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const nodes = wheel.querySelectorAll(".wlet");
  for (let i = 0; i < nodes.length; i++) {
    const nr = nodes[i].getBoundingClientRect();
    const nx = nr.left - rect.left + nr.width / 2;
    const ny = nr.top - rect.top + nr.height / 2;
    const dist = Math.hypot(x - nx, y - ny);
    if (dist <= nr.width * 0.6) return i;
  }
  return -1;
}

function updateDirectDom() {
  const lv = curLevel();
  const word = sel.map(i => lv.order[i]).join("");
  const preview = document.querySelector(".wpre");
  if (preview) preview.textContent = word;

  const letterEls = document.querySelectorAll(".wlet");
  letterEls.forEach((el, i) => {
    el.classList.toggle("sel", sel.includes(i));
  });

  const svg = document.querySelector(".wline");
  const wheel = document.querySelector(".wwheel");
  if (svg && wheel && letterEls.length) {
    const rect = wheel.getBoundingClientRect();
    let pts = [];
    sel.forEach(idx => {
      const nr = letterEls[idx].getBoundingClientRect();
      const cx = (nr.left - rect.left) + nr.width / 2;
      const cy = (nr.top - rect.top) + nr.height / 2;
      pts.push(`${cx},${cy}`);
    });
    const poly = svg.querySelector("polyline");
    if (poly) poly.setAttribute("points", pts.join(" "));
  }
}

function submitWord(word) {
  const lv = curLevel();
  const def = getLevelDef(store.lvl);
  word = word.toUpperCase();
  if (word.length < 2) return;

  const target = def.target_words.find(t => t.word === word);
  if (target) {
    if (lv.found.includes(word)) {
      toast("Already found!");
    } else {
      lv.found.push(word);
      if (lv.found.length === def.target_words.length) {
        lv.done = true;
        // Only grant completion coins if finishing for the first time
        if (store.lvl >= store.maxLvl) {
          store.coins += LEVEL_COMPLETE_COIN;
          store.maxLvl = Math.max(store.maxLvl, store.lvl + 1);
          toast(`Level Complete! +${LEVEL_COMPLETE_COIN} 🪙`);
        } else {
          toast("Level Replayed! ⭐");
        }
        store.st.won++;
        save();
        burst(null, 50);
      } else {
        save();
      }
    }
    return;
  }

  if (def.bonus_words && def.bonus_words.includes(word)) {
    if (lv.bonus.includes(word)) {
      toast("Bonus word already found!");
    } else {
      lv.bonus.push(word);
      store.coins += BONUS_COIN;
      save();
      toast(`Bonus word found! +${BONUS_COIN} 🪙`);
    }
    return;
  }

  toast("Not in the word list");
}

// Pointer drag listeners
document.addEventListener("pointerdown", e => {
  if (tab !== "games") return;
  const wheel = e.target.closest(".wwheel");
  if (!wheel) return;
  isSwiping = true;
  sel = [];
  const idx = getLetterUnderPointer(e);
  if (idx !== -1) sel.push(idx);
  updateDirectDom();
});

document.addEventListener("pointermove", e => {
  if (!isSwiping || tab !== "games") return;
  const idx = getLetterUnderPointer(e);
  if (idx !== -1) {
    if (sel.length >= 2 && sel[sel.length - 2] === idx) {
      sel.pop();
    } else if (!sel.includes(idx)) {
      sel.push(idx);
    }
    updateDirectDom();
  }
});

document.addEventListener("pointerup", () => {
  if (!isSwiping || tab !== "games") return;
  isSwiping = false;
  const lv = curLevel();
  const word = sel.map(i => lv.order[i]).join("");
  sel = [];
  updateDirectDom();
  if (word) {
    submitWord(word);
    ui.render();
  }
});

document.addEventListener("pointercancel", () => {
  if (!isSwiping) return;
  isSwiping = false;
  sel = [];
  updateDirectDom();
});

// Keyboard
addEventListener("keydown", e => {
  if (tab !== "games" || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const lv = curLevel();
  if (e.key === " ") {
    e.preventDefault();
    gamesAct("gshuf", {});
    ui.render();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const word = sel.map(i => lv.order[i]).join("");
    sel = [];
    updateDirectDom();
    if (word) {
      submitWord(word);
      ui.render();
    }
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    if (sel.length) sel.pop();
    updateDirectDom();
    return;
  }
  if (/^[a-z]$/i.test(e.key)) {
    const ch = e.key.toUpperCase();
    const available = [];
    lv.order.forEach((letter, idx) => {
      if (letter === ch && !sel.includes(idx)) available.push(idx);
    });
    if (available.length) {
      e.preventDefault();
      sel.push(available[0]);
      updateDirectDom();
    }
  }
});

// Pop-up Sheet for Level Selection
function levelsSheet() {
  const max = store.maxLvl || 1;
  const list = LEVELS.map(l => {
    const num = l.level_id;
    const isUnlocked = num <= max;
    const isCurrent = num === store.lvl;
    const isCompleted = num < max;

    return `<button class="wlvl-btn${isCurrent ? " curr" : ""}${isCompleted ? " done" : ""}${!isUnlocked ? " lock" : ""}" 
      data-act="${isUnlocked ? "gpick" : "glock"}" data-lvl="${num}">
      <b>${num}</b>
      <small>${!isUnlocked ? "🔒" : isCompleted ? "✓" : "▶"}</small>
    </button>`;
  }).join("");

  modal(`<div class="sheet">
    <h3>Select Level</h3>
    <p class="hint">Replay finished levels anytime or resume progress</p>
    <div class="wlvl-grid">${list}</div>
    <button class="btn ghost" data-act="mclose">Close</button>
  </div>`);
}

function gamesAct(act, data) {
  const lv = curLevel();
  const def = getLevelDef(store.lvl);

  if (act === "gshuf") {
    const letters = [...lv.order];
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    lv.order = letters;
    save();
  } else if (act === "ghint") {
    if (lv.done) return;
    if (store.coins < HINT_COST) return toast(`Need ${HINT_COST} 🪙 for a hint!`);
    
    const unrevealed = [];
    def.target_words.forEach(t => {
      if (!lv.found.includes(t.word)) {
        for (let i = 0; i < t.word.length; i++) {
          const r = t.direction === "horizontal" ? t.start[0] : t.start[0] + i;
          const c = t.direction === "horizontal" ? t.start[1] + i : t.start[1];
          const k = `${r},${c}`;
          if (!lv.hints[k]) unrevealed.push({ k, char: t.word[i] });
        }
      }
    });

    if (!unrevealed.length) return toast("All remaining letters are visible!");
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    lv.hints[pick.k] = pick.char;
    store.coins -= HINT_COST;
    save();
    toast(`Hint revealed! -${HINT_COST} 🪙`);
  } else if (act === "glvls") {
    levelsSheet();
  } else if (act === "gpick") {
    const targetLvl = +data.lvl;
    if (targetLvl && targetLvl <= store.maxLvl) {
      store.lvl = targetLvl;
      store.lv = initLevelState(store.lvl);
      save();
      modal(""); // close sheet
    }
  } else if (act === "glock") {
    toast(`Level ${data.lvl} is locked! Complete previous levels first 🔒`);
  } else if (act === "gnext") {
    store.lvl++;
    if (store.lvl > store.maxLvl) store.maxLvl = store.lvl;
    store.lv = initLevelState(store.lvl);
    save();
  }
}

function gridHtml(def, lv) {
  let maxR = 0, maxC = 0;
  const gridCells = {};

  def.target_words.forEach(t => {
    const isFound = lv.found.includes(t.word);
    for (let i = 0; i < t.word.length; i++) {
      const r = t.direction === "horizontal" ? t.start[0] : t.start[0] + i;
      const c = t.direction === "horizontal" ? t.start[1] + i : t.start[1];
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
      const k = `${r},${c}`;
      if (!gridCells[k]) {
        gridCells[k] = { char: t.word[i], revealed: isFound || !!lv.hints[k] };
      } else if (isFound || lv.hints[k]) {
        gridCells[k].revealed = true;
      }
    }
  });

  const rows = maxR + 1;
  const cols = maxC + 1;

  let h = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const item = gridCells[`${r},${c}`];
      if (item) {
        h += `<div class="wcell act${item.revealed ? " rev" : ""}"><span>${item.revealed ? item.char : ""}</span></div>`;
      } else {
        h += `<div class="wcell emp"></div>`;
      }
    }
  }

  return `<div class="wgrid" style="--rows:${rows}; --cols:${cols};">${h}</div>`;
}

function wheelHtml(lv) {
  const letters = lv.order;
  const n = letters.length;
  const radius = 68;
  const center = 96;

  let lets = "";
  letters.forEach((ch, i) => {
    const theta = (2 * Math.PI / n) * i - Math.PI / 2;
    const x = Math.round(center + radius * Math.cos(theta));
    const y = Math.round(center + radius * Math.sin(theta));
    const isSelected = sel.includes(i);
    lets += `<div class="wlet${isSelected ? " sel" : ""}" style="left:${x}px; top:${y}px;">${ch}</div>`;
  });

  return `<div class="wwheel">
    <svg class="wline"><polyline points="" /></svg>
    ${lets}
  </div>`;
}

function gamesMain() {
  const lv = curLevel();
  const def = getLevelDef(store.lvl);

  return `<h2>Wordscapes<span class="wbar">🪙 ${store.coins}</span></h2>
  <div class="gm">
    <div class="wtop">
      <button class="chip wlvl-trigger" data-act="glvls">Level ${store.lvl} ▾</button>
      <span class="chip ghost">${def.tier}</span>
    </div>
    
    <div class="wgrid-wrap">
      ${gridHtml(def, lv)}
    </div>

    <div class="wpre"></div>

    <div class="wplay">
      <button class="wbtn" data-act="gshuf" aria-label="Shuffle Letters">🔀</button>
      ${wheelHtml(lv)}
      <button class="wbtn" data-act="ghint" aria-label="Hint">💡<small>${HINT_COST}</small></button>
    </div>

    ${lv.done ? `
      <div class="wdone card">
        <h3>Level Complete! 🎉</h3>
        <p class="hint">You found all words in this level!</p>
        <button class="btn" data-act="gnext">Next Level ➔</button>
      </div>
    ` : ""}
  </div>`;
}

export { gamesAct, gamesMain };