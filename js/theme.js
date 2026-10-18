// Colour themes (THEMES, applyTheme; also sets <html data-theme / data-dark>) and the reduce-motion switch.
import { ls } from "./util.js";

const THEMES = { strawberry: ["🍓", "#ffd6e7"], matcha: ["🍵", "#e0f4d6"], sky: ["☁️", "#d6ecff"], lilac: ["🔮", "#e9dcff"], sunny: ["🍑", "#ffe7bf"], sakura: ["🌸", "#ffeaf1"], mochi: ["🍡", "#f6ecdf"], ocean: ["🐬", "#d4f3f2"], night: ["🌙", "#1e1830"], cocoa: ["🍫", "#2a1f1c"],
  lemonade: ["🍋", "#fffbe6"], cottoncandy: ["🍭", "#fff0fb"], blueberry: ["🫐", "#eef0ff"],
  berry: ["🍇", "#221030"], forest: ["🌲", "#12201a"], deepsea: ["🌊", "#0f1c2b"], ink: ["🖤", "#000000"],
  spring: ["🌷", "#f3fcea"], summer: ["🌻", "#e8f9ff"], autumn: ["🍁", "#fff3e6"], winter: ["❄️", "#f2f7ff"],
  "spring-night": ["🌿", "#1a2218"], "summer-night": ["🎆", "#101a38"], "autumn-night": ["🎃", "#231510"], "winter-night": ["⛄", "#0f1626"],
  "glass-aurora": ["✨", "#d8c6ff"], "glass-sunset": ["🌅", "#ffc0b0"], "glass-lagoon": ["🫧", "#bfe6f2"], "glass-galaxy": ["🌌", "#1b1245"] };
const GLASS = Object.keys(THEMES).filter(k => k.startsWith("glass-"));
const CUTE = ["strawberry", "matcha", "sky", "lilac", "sunny", "sakura", "mochi", "ocean", "lemonade", "cottoncandy", "blueberry"];
const DARK = ["night", "cocoa", "berry", "forest", "deepsea", "ink"];
const SEASON = ["spring", "summer", "autumn", "winter", "spring-night", "summer-night", "autumn-night", "winter-night"];
const themeBtns = l => l.map(t => `<button class="av ${t === theme ? "sel" : ""}" data-t="${t}" title="${t.replace(/-/g, " ")}">${t === "auto" ? "🌓" : THEMES[t][0]}</button>`).join("");
let theme = "strawberry"; try { theme = localStorage.getItem("theme") || theme; } catch {}
// Extra look (profile sheet > "customize theme"): background tint, accent colour, corners, shadows. (The "background" patterns were removed: they made phones lag.) Saved on this device, applied on <html> by applyLook.
const LOOK = {
  round: [["sharp", "square"], ["theme", "theme"], ["pill", "extra round"]], shadow: [["theme", "theme"], ["soft", "soft"], ["flat", "none"]] };
const HUES = [0, 25, 50, 95, 150, 190, 215, 260, 290, 325];
const ACCENTS = [["#ff8fb8", "#ffa6c9", "#e8639a"], ["#ff8a5c", "#ffa584", "#e0653a"], ["#f2b01e", "#f7c748", "#cf8f0a"], ["#5fcf8f", "#7edba5", "#2f9f68"], ["#3fc1c9", "#66d3d9", "#279aa1"], ["#6fb3ff", "#8cc4ff", "#4a8fe0"], ["#8f7bff", "#a89aff", "#6a55e0"], ["#d77cff", "#e39bff", "#a54bd1"]];
const DEF = { round: "theme", shadow: "theme", hue: -1, acc: -1 }; // hue / acc: -1 = the theme's own colours
let look = { ...DEF }; try { look = { ...DEF, ...JSON.parse(localStorage.getItem("look")) }; } catch {}
delete look.bg; // old saved looks may still carry the removed background option
const isLook = s => { const [k, v] = s.split(":"); return k in look && String(look[k]) === v; };
const lookBtns = k => LOOK[k].map(([v, n]) => `<button class="${isLook(k + ":" + v) ? "sel" : ""}" data-look="${k}:${v}">${n}</button>`).join("");
const dotBtns = k => `<button class="adot athm ${isLook(k + ":-1") ? "sel" : ""}" data-look="${k}:-1" title="theme colours"></button>` +
  (k === "hue" ? HUES.map(h => [h, `hsl(${h} 90% 82%)`]) : ACCENTS.map((a, i) => [i, a[0]])).map(([v, c]) =>
    `<button class="adot ${isLook(k + ":" + v) ? "sel" : ""}" data-look="${k}:${v}" style="background:${c}" title="${k === "hue" ? "background tint" : "accent colour"}"></button>`).join("");
const isDark = r => DARK.includes(r) || r.endsWith("-night") || r === "glass-galaxy";
function applyLook(real) { // the tint is made light or dark to match the theme, so text stays readable
  const d = document.documentElement, v = {};
  d.dataset.round = look.round; d.dataset.shadow = look.shadow;
  if (look.hue >= 0) {
    const h = look.hue, h2 = (h + 35) % 360, dk = isDark(real);
    v["--bg1"] = dk ? `hsl(${h} 40% 11%)` : `hsl(${h} 100% 95%)`; v["--bg2"] = dk ? `hsl(${h2} 40% 14%)` : `hsl(${h2} 100% 93%)`;
    v["--glow1"] = v["--b1"] = dk ? `hsl(${h} 45% 24%)` : `hsl(${h} 90% 84%)`; v["--glow2"] = v["--b2"] = dk ? `hsl(${h2} 45% 21%)` : `hsl(${h2} 90% 85%)`;
    document.querySelector('meta[name="theme-color"]').content = v["--bg1"];
  }
  if (ACCENTS[look.acc]) [v["--main"], v["--main-l"], v["--main-d"]] = ACCENTS[look.acc];
  ["--bg1", "--bg2", "--glow1", "--glow2", "--b1", "--b2", "--main", "--main-l", "--main-d"].forEach(n => v[n] ? d.style.setProperty(n, v[n]) : d.style.removeProperty(n));
  try { localStorage.setItem("lookCss", Object.entries(v).map(([n, c]) => `${n}:${c}`).join(";")); } catch {} // index.html applies this before the first paint
}
function applyTheme(t) {
  try { localStorage.setItem("theme", t); } catch {}
  const real = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "strawberry") : (THEMES[t] ? t : "strawberry");
  document.documentElement.dataset.theme = real;
  document.documentElement.dataset.dark = isDark(real) ? "1" : "0"; // CSS uses this to turn shadows black on dark themes
  document.querySelector('meta[name="theme-color"]').content = THEMES[real][1];
  applyLook(real);
}
applyTheme(theme);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => theme === "auto" && applyTheme("auto"));
let calm = ls("motion") === "off"; // "reduce motion": turns off the endless bobbing / drifting / twinkling
const applyMotion = () => { document.documentElement.dataset.motion = calm ? "off" : "on"; };
applyMotion();
const setTheme = t => { theme = t; applyTheme(t); };
const setLook = s => { // "round:pill", "hue:215", ... , "random" or "reset"
  const pick = a => a[Math.floor(Math.random() * a.length)];
  if (s === "reset") look = { ...DEF };
  else if (s === "random") look = { round: pick(LOOK.round)[0], shadow: pick(LOOK.shadow)[0], hue: pick(HUES), acc: Math.floor(Math.random() * ACCENTS.length) };
  else { const [k, v] = s.split(":"); look[k] = k === "hue" || k === "acc" ? +v : v; }
  try { localStorage.setItem("look", JSON.stringify(look)); } catch {}
  applyTheme(theme);
};
const toggleCalm = () => { calm = !calm; ls("motion", calm ? "off" : "on"); applyMotion(); return calm; };

export { CUTE, DARK, GLASS, SEASON, calm, dotBtns, isLook, lookBtns, setLook, setTheme, themeBtns, toggleCalm };
