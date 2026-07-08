# Nav bird — geometry baseline

Reference measurements for the nav bird mark, captured from the original
`transform: scale(3.836)` implementation before any crispness rework.
**Any change to how the bird is rendered must reproduce these numbers
exactly** (verify with the snippet at the bottom).

Source image: `bird.png`, 640 × 709 px natural size (~35 KB).

## Rendered geometry (viewport 1280 px wide; `left` values shift with viewport)

| State                        | top | left   | width | height  |
|------------------------------|-----|--------|-------|---------|
| Tall (homepage top)          | 27  | 601.64 | 76.72 | 84.9914 |
| Compact (scrolled / subpages)| 38  | 451    | 20    | 22.1563 |

## Structural invariants

- `.bird-frame` is a 20 × 22 px layout box inside the `.wordmark` flex
  column — its **layout size must stay 20 × 22**, since the wordmark
  stack (name + tagline positions) is built around it. All visual sizing
  is transform/absolute-position only.
- Tall state: bird rendered 76.72 px wide (= 20 × 3.836), horizontally
  centered on the frame's center (frame center = viewport center), top
  edge 15 px below the frame's top.
- Compact state: bird rendered 20 px wide, aligned to the frame's
  top-left corner; the frame itself carries `translate(-179px, 26px)`.
- Derived constants: center offset (76.72 − 20) / 2 = **28.36 px**;
  compact downscale 20 / 76.72 = **0.26069**.
- Animation: 0.2 s `cubic-bezier(0.4, 0, 0.2, 1)`, transform-only
  (compositor-driven; no layout/paint per frame).
- Compact-only hover glow is a `filter` on `.bird-frame` (applies to
  descendants, so it works regardless of how the img inside is sized).

## Gotchas discovered while tinkering

- `img, svg{ max-width:100% }` (global reset, style.css) clamps any img
  laid out wider than the 20 px frame — an oversized bird img needs
  `max-width: none` or it silently collapses back to 20 px.
- `will-change: transform` on the frame caused a stale compositor
  texture: rasterized at the zoom level current when the layer was
  created and never re-rasterized after browser zoom changed, so the
  scaled-up bird went soft at 200 % zoom. Leave `will-change` off.

## Verify (preview_eval / DevTools console)

```js
// Tall state (load homepage, don't scroll):
document.querySelector('.wordmark img').getBoundingClientRect();
// → expect ~ {top: 27, left: 601.64, width: 76.72, height: 84.99} @1280w

// Compact state:
document.body.classList.add('no-transition');
document.getElementById('site-header').classList.add('is-compact');
document.querySelector('.wordmark img').getBoundingClientRect();
// → expect ~ {top: 38, left: 451, width: 20, height: 22.156} @1280w
// then remove both classes to reset.
```
