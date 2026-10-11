// Colour themes (THEMES, applyTheme) and the reduce-motion switch.
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
function applyTheme(t) {
  try { localStorage.setItem("theme", t); } catch {}
  const real = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "strawberry") : (THEMES[t] ? t : "strawberry");
  document.documentElement.dataset.theme = real;
  document.querySelector('meta[name="theme-color"]').content = THEMES[real][1];
}
applyTheme(theme);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => theme === "auto" && applyTheme("auto"));
let calm = ls("motion") === "off"; // "reduce motion": turns off the endless bobbing / drifting / twinkling
const applyMotion = () => { document.documentElement.dataset.motion = calm ? "off" : "on"; };
applyMotion();
const setTheme = t => { theme = t; applyTheme(t); };
const toggleCalm = () => { calm = !calm; ls("motion", calm ? "off" : "on"); applyMotion(); return calm; };

export { CUTE, DARK, GLASS, SEASON, calm, setTheme, themeBtns, toggleCalm };
