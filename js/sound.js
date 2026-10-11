// Cozy background sounds (rain / cafe / ocean) made with the Web Audio API.
import { ls } from "./util.js";

// ---- cozy sounds (generated with the Web Audio API, no files needed) ----
const SOUNDS = { rain: "🌧️ rain", cafe: "☕ cafe", ocean: "🌊 ocean" };
let sound = ls("sound") || "off", actx = null, sNodes = null, sTimer = 0;
const soundLabel = () => sNodes ? "🎧 " + SOUNDS[sound] : sound !== "off" ? "🎧 " + SOUNDS[sound] + " ▶" : "🎧 sounds: off";
function noiseBuf(ctx, brown) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return b;
}
function stopSound() { (sNodes || []).forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch {} }); sNodes = null; clearTimeout(sTimer); }
function playSound(mode) {
  stopSound(); if (mode === "off" || !SOUNDS[mode]) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume();
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), nodes = [src, f, g];
    src.buffer = noiseBuf(actx, mode !== "rain"); src.loop = true;
    if (mode === "rain") { f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = .35; g.gain.value = .22; }
    else {
      f.type = "lowpass"; f.frequency.value = mode === "cafe" ? 1000 : 600; g.gain.value = mode === "cafe" ? .5 : .55;
      const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = mode === "cafe" ? .35 : .09; lg.gain.value = mode === "cafe" ? .12 : .3;
      lfo.connect(lg); lg.connect(g.gain); lfo.start(); nodes.push(lfo, lg);
    }
    src.connect(f); f.connect(g); g.connect(actx.destination); src.start(); sNodes = nodes;
    if (mode === "cafe") { // little cup clinks now and then
      const clink = () => {
        if (!sNodes) return; const o = actx.createOscillator(), cg = actx.createGain(), t = actx.currentTime;
        o.frequency.value = 1800 + Math.random() * 1400; cg.gain.setValueAtTime(.05, t); cg.gain.exponentialRampToValueAtTime(.0001, t + .35);
        o.connect(cg); cg.connect(actx.destination); o.start(); o.stop(t + .4); sTimer = setTimeout(clink, 3000 + Math.random() * 7000);
      };
      sTimer = setTimeout(clink, 4000);
    }
  } catch {}
}

const playSelected = () => playSound(sound);
const soundActive = () => !!sNodes;
function cycleSound() { // the 🎧 chip: start the chosen sound, or move on to the next one
  const order = ["off", ...Object.keys(SOUNDS)];
  if (sound !== "off" && !sNodes) playSound(sound); else { sound = order[(order.indexOf(sound) + 1) % order.length]; ls("sound", sound); playSound(sound); }
}

export { cycleSound, playSelected, soundActive, soundLabel, stopSound };
