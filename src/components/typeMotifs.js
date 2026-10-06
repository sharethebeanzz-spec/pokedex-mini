// #A/#D — main-card textures. Pure data + helpers, no React:
//  - TYPE_MOTIFS: per-type "scattered" SVG texture tiles
//  - DEPTH_LAYERS: the neutral glow/halo/vignette that sit on top of them
//
// Instead of a small repeating tile (which reads as wallpaper / template),
// each motif is a large 400px canvas with its shapes placed pseudo-randomly
// (seeded → the same layout on every load) and edge-wrapped, so the repeat
// is seamless and no grid is visible. Same density as the old tiles; CSS-
// only, SVG data-URIs, no image assets.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function svgTile(inner, size) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Scatters `parts` across a large tile. Each part: {
//   body    — self-contained SVG markup, centered at the origin,
//   n       — how many instances,
//   opacity — base opacity (jittered ~25% per instance),
//   r       — approximate radius at scale 1 (used for edge-wrapping),
//   scale   — [min,max] size jitter,
//   rot     — [min,max] random tilt in degrees (omit = no tilt),
// }
// Instances near an edge also get copies shifted by one full tile period,
// so the tile repeats with no seam.
export function scatter(parts, seed, size = 400) {
  const rand = mulberry32(seed);
  let markup = "";
  for (const part of parts) {
    const sMin = part.scale?.[0] ?? 0.8;
    const sMax = part.scale?.[1] ?? 1.2;
    const rMin = part.rot?.[0] ?? 0;
    const rMax = part.rot?.[1] ?? 0;
    const margin = (part.r ?? 12) * sMax + 2;
    for (let i = 0; i < part.n; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rot = rMin + rand() * (rMax - rMin);
      const s = sMin + rand() * (sMax - sMin);
      const op = part.opacity * (0.75 + rand() * 0.5);
      // wrapped copies: x itself plus the tile periods to either side,
      // kept only when they can actually reach inside the canvas
      const xs = [x, x - size, x + size].filter((v) => v > -margin && v < size + margin);
      const ys = [y, y - size, y + size].filter((v) => v > -margin && v < size + margin);
      for (const vx of xs) {
        for (const vy of ys) {
          const t = `translate(${vx.toFixed(1)} ${vy.toFixed(1)})rotate(${rot.toFixed(1)})scale(${s.toFixed(2)})`;
          markup += `<g transform='${t}' opacity='${op.toFixed(2)}'>${part.body}</g>`;
        }
      }
    }
  }
  return { bg: svgTile(markup, size), size: `${size}px ${size}px` };
}

export const TYPE_MOTIFS = {
  // sparse dots of varied size
  normal: scatter([
    { body: `<circle r='2' fill='#fff'/>`, n: 40, opacity: 0.14, r: 2, scale: [0.6, 1.5] },
  ], 4001),
  // drifting embers: tilted streaks + stray sparks
  fire: scatter(
    [
      { body: `<line x1='-6' y1='6' x2='6' y2='-6' stroke='#fff' stroke-width='2.5' stroke-linecap='round'/>`, n: 34, opacity: 0.15, r: 9, scale: [0.6, 1.3], rot: [-40, 40] },
      { body: `<circle r='1.8' fill='#fff'/>`, n: 12, opacity: 0.14, r: 1.8 },
    ],
    4002
  ),
  // scattered ripple rings
  water: scatter(
    [
      { body: `<circle r='10' fill='none' stroke='#fff' stroke-width='1.6'/>`, n: 30, opacity: 0.11, r: 10, scale: [0.4, 1.5] },
      { body: `<circle r='1.6' fill='#fff'/>`, n: 8, opacity: 0.1, r: 1.6 },
    ],
    4003
  ),
  // leaves at random angles
  grass: scatter([
    { body: `<path d='M0 -8 q8 5 8 16 q-8 -4 -8 -16 z' fill='#fff'/>`, n: 40, opacity: 0.12, r: 12, scale: [0.5, 1.4], rot: [0, 360] },
  ], 4004),
  // small lightning bolts, tilted
  electric: scatter([
    { body: `<path d='M3 -9 l-5 8 h4 l-4 9 8 -11 h-4 l4 -6 z' fill='#fff'/>`, n: 30, opacity: 0.14, r: 9, scale: [0.5, 1.3], rot: [-25, 25] },
  ], 4005),
  // snow ticks at random angles
  ice: scatter([
    { body: `<g stroke='#fff' stroke-width='2' stroke-linecap='round'><line x1='-6' y1='-6' x2='6' y2='6'/><line x1='6' y1='-6' x2='-6' y2='6'/><line x1='0' y1='-8' x2='0' y2='8'/></g>`, n: 30, opacity: 0.13, r: 8, scale: [0.5, 1.4], rot: [0, 180] },
  ], 4006),
  // heavy power slashes
  fighting: scatter([
    { body: `<line x1='-9' y1='9' x2='9' y2='-9' stroke='#fff' stroke-width='4' stroke-linecap='round'/>`, n: 30, opacity: 0.12, r: 13, scale: [0.6, 1.5], rot: [-30, 30] },
  ], 4007),
  // floating bubbles
  poison: scatter(
    [
      { body: `<circle r='6' fill='none' stroke='#fff' stroke-width='1.6'/>`, n: 36, opacity: 0.12, r: 6, scale: [0.4, 1.6] },
      { body: `<circle r='1.8' fill='#fff'/>`, n: 14, opacity: 0.12, r: 1.8 },
    ],
    4008
  ),
  // pebbles + specks
  ground: scatter(
    [
      { body: `<path d='M0 -6 l6 10 h-12 z' fill='#fff'/>`, n: 36, opacity: 0.12, r: 7, scale: [0.4, 1.4], rot: [0, 360] },
      { body: `<circle r='1.8' fill='#fff'/>`, n: 12, opacity: 0.12, r: 1.8 },
    ],
    4009
  ),
  // wind swooshes
  flying: scatter([
    { body: `<path d='M-16 3 q16 -9 32 -1' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round'/>`, n: 28, opacity: 0.12, r: 16, scale: [0.6, 1.5], rot: [-18, 18] },
  ], 4010),
  // rings + sparkle dots
  psychic: scatter(
    [
      { body: `<circle r='8' fill='none' stroke='#fff' stroke-width='1.6'/>`, n: 28, opacity: 0.12, r: 8, scale: [0.4, 1.4] },
      { body: `<circle r='1.8' fill='#fff'/>`, n: 14, opacity: 0.14, r: 1.8, scale: [0.6, 1.4] },
    ],
    4011
  ),
  // scattered hexagons
  bug: scatter([
    { body: `<polygon points='7,0 3.5,6 -3.5,6 -7,0 -3.5,-6 3.5,-6' fill='none' stroke='#fff' stroke-width='1.6'/>`, n: 30, opacity: 0.12, r: 7, scale: [0.5, 1.4], rot: [0, 60] },
  ], 4012),
  // angular shards
  rock: scatter([
    { body: `<path d='M-6 -7 L7 -2 L2 7 L-4 3 z' fill='#fff'/>`, n: 32, opacity: 0.12, r: 8, scale: [0.5, 1.5], rot: [0, 360] },
  ], 4013),
  // soft mist blobs
  ghost: scatter([
    { body: `<circle r='12' fill='#fff'/>`, n: 36, opacity: 0.07, r: 12, scale: [0.5, 1.8] },
  ], 4014),
  // brushed hairlines, each at its own slight angle (random-scratched look)
  steel: scatter([
    { body: `<line x1='-120' y1='0' x2='120' y2='0' stroke='#fff' stroke-width='1'/>`, n: 52, opacity: 0.05, r: 160, scale: [0.35, 1.2], rot: [59, 71] },
  ], 4015),
  // four-point sparkles
  fairy: scatter([
    { body: `<path d='M0 -8 Q1.5 -1.5 8 0 Q1.5 1.5 0 8 Q-1.5 1.5 -8 0 Q-1.5 -1.5 0 -8 z' fill='#fff'/>`, n: 30, opacity: 0.14, r: 8, scale: [0.4, 1.5], rot: [0, 90] },
  ], 4016),
};

// #D — depth layers: in a multi-layer background the FIRST entry is the
// TOPMOST, so these three sit above the type motif, which sits above the
// type gradient. A soft top-left spotlight, a light halo behind where the
// artwork lives, and a gentle dark vignette along the bottom. All neutral
// white/black, so every type's color still dominates underneath.
export const DEPTH_LAYERS = [
  "radial-gradient(130% 80% at 18% 0%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 45%)",
  "radial-gradient(340px circle at 74% 46%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)",
  "radial-gradient(140% 62% at 50% 118%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 62%)",
];
