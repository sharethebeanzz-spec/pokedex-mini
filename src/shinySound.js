// Tiny synthesized sound effects for the shiny toggle (no audio files).
//   on  → ascending "shiny sparkle" tinkle (E6 → G6 → C7, with a twinkle on top)
//   off → soft short blip down (C7 → E6)
// Web Audio is created lazily on the first click (a user gesture), so there's
// no autoplay-policy issue; any failure is swallowed — sound must never
// break the toggle.
let ctx = null;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(c, freq, start, dur, type, vol) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.012); // soft attack, no click
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

export function playShinySound(on) {
  try {
    const c = audioCtx();
    const t = c.currentTime + 0.01;
    if (on) {
      // E6 → G6 → C7 ascending sparkle
      tone(c, 1318.5, t, 0.25, "sine", 0.12);
      tone(c, 1975.5, t + 0.07, 0.25, "sine", 0.1);
      tone(c, 2093.0, t + 0.14, 0.4, "sine", 0.12);
      // quiet twinkle an octave up, trailing the top note
      tone(c, 3135.9, t + 0.22, 0.3, "triangle", 0.05);
    } else {
      // C7 → E6 soft blip down
      tone(c, 2093.0, t, 0.15, "sine", 0.09);
      tone(c, 1318.5, t + 0.07, 0.22, "sine", 0.08);
    }
  } catch (e) {
    // sound is best-effort — never break the toggle
  }
}
