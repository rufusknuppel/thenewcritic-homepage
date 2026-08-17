// Generate the cloth as TWO stacked background tiles (printed by the
// --cloth token in style.css, first layer on top), recreating the Faust
// binding's cloth itself:
//   weave (420px, transparent ground): anisotropic fractal noise —
//     high frequency across the thread, low frequency along it — gives
//     thin vertical fiber striations with a fainter horizontal
//     cross-thread pass, plus fine granular speckle light and dark.
//     No drawn lines; the anisotropy does the weaving.
//   mottle (840px): a coarse grid of squares, each colored from a patch
//     of the cover's cloth, Gaussian-blurred until the squares melt
//     into its mottled field. Wrap-around neighbours keep the tile
//     seamless; the big tile keeps the repeat from lining up on screen.
// Seeded LCG so the tiles are reproducible.
let s = 12345;
const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;

const pick = (pool) => {
  let r = rnd();
  for (const [c, w] of pool) { if ((r -= w) <= 0) return c; }
  return pool[0][0];
};

// Fills are written as plain #RRGGBB; encode() escapes everything.
const encode = (svg) => encodeURIComponent(svg)
  .replace(/'/g, '%27')
  .replace(/\(/g, '%28')
  .replace(/\)/g, '%29');

// ---- Tile 1: the weave -------------------------------------------------
const W = 420;
const weave = [];
weave.push(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${W}'>`);
// Vertical fibers: narrow across x, elongated along y — a pale blue-grey
// catching light.
weave.push(`<filter id='v'><feTurbulence type='fractalNoise' baseFrequency='0.85 0.12' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.60 0 0 0 0 0.75 0 0 0 0.055 0'/></filter>`);
// Horizontal cross-threads, fainter.
weave.push(`<filter id='h'><feTurbulence type='fractalNoise' baseFrequency='0.12 0.85' numOctaves='2' seed='19' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.50 0 0 0 0 0.55 0 0 0 0 0.70 0 0 0 0.035 0'/></filter>`);
// Fine granular speckle, light then dark — the thread-level grain.
weave.push(`<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='31' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.60 0 0 0 0 0.64 0 0 0 0 0.78 0 0 0 0.05 0'/></filter>`);
weave.push(`<filter id='k'><feTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='2' seed='43' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.02 0 0 0 0 0.02 0 0 0 0 0.04 0 0 0 0.11 0'/></filter>`);
weave.push(`<rect width='${W}' height='${W}' filter='url(#v)'/>`);
weave.push(`<rect width='${W}' height='${W}' filter='url(#h)'/>`);
weave.push(`<rect width='${W}' height='${W}' filter='url(#g)'/>`);
weave.push(`<rect width='${W}' height='${W}' filter='url(#k)'/>`);
weave.push(`</svg>`);

// ---- Tile 2: the mottle ------------------------------------------------
// Patch tones eye-sampled across the cover's cloth — kept close in value
// so the blend reads as wear, not as a checkerboard.
const GRID = [
  ['#010102', 0.25],
  ['#020204', 0.27],
  ['#030305', 0.22],
  ['#040508', 0.16],
  ['#06070B', 0.10],
];
const MW = 840, MCELL = 120, MN = MW / MCELL, MBLUR = 55;

const cells = [];
for (let j = 0; j < MN; j++) {
  cells.push([]);
  for (let i = 0; i < MN; i++) cells[j].push(pick(GRID));
}

const mottle = [];
mottle.push(`<svg xmlns='http://www.w3.org/2000/svg' width='${MW}' height='${MW}'>`);
// color-interpolation-filters='sRGB' is load-bearing: the default
// linearRGB puts these near-black patch tones a single 8-bit step
// apart in the filter buffer, so the Gaussian ramp has no intermediate
// values to land on and collapses into a hard edge at the midpoint.
mottle.push(`<filter id='b' x='-50%' y='-50%' width='200%' height='200%' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='${MBLUR}'/></filter>`);
mottle.push(`<rect width='${MW}' height='${MW}' fill='#020204'/>`);
mottle.push(`<g filter='url(#b)'>`);
for (let j = -2; j < MN + 2; j++) {
  for (let i = -2; i < MN + 2; i++) {
    const c = cells[(j + MN) % MN][(i + MN) % MN];
    mottle.push(`<rect x='${i * MCELL}' y='${j * MCELL}' width='${MCELL}' height='${MCELL}' fill='${c}'/>`);
  }
}
mottle.push(`</g>`);
mottle.push(`</svg>`);

const value = `url("data:image/svg+xml,${encode(weave.join(''))}"), url("data:image/svg+xml,${encode(mottle.join(''))}")`;
console.log(value);
console.log('LENGTH', value.length);
