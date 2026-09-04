// THE POUR. The masthead's foil (see THE FOIL HEADER in style.css)
// ships with one fixed pour baked into the stylesheet — the no-JS
// fallback. This rebuilds it per visit: holographic silver whose
// colour passages alternate with bare metal, always in OIL-SPILL
// colours — violet, blue, teal, green, amber, magenta — never
// sampled from the page. Seeds, rake, rhythm and wave are drawn
// fresh so no two loads stream the same way. The stylesheet reads
// the plate off --foil-uri and the sheen's wavy band off
// --foil-sheen-img; the sheen's seat stays put (the mouse and the
// page both have no say).
(function () {
  var rnd = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  var enc = function (svg) {
    return 'url("data:image/svg+xml,' + svg
      .replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')
      .replace(/%(?![0-9A-F]{2})/gi, '%25') + '")';
  };
  // One crumple per visit: drawn once, reused by every pour.
  var seed1 = Math.floor(rnd(1, 1000));
  var seed2 = Math.floor(rnd(1, 1000));
  // The light stays high and from the upper left — foil under a lamp,
  // not a disco — but wanders enough to move the sheen.
  var az1 = Math.round(rnd(205, 255));
  var az2 = az1 + Math.round(rnd(5, 15));
  var el1 = Math.round(rnd(52, 66));
  var el2 = Math.round(rnd(50, 62));
  // The weave runs DIAGONAL: the tint axis rakes hard across the
  // plate (~27-42 degrees on screen), leaning either way by the
  // toss of the pour.
  var rake = rnd(1.8, 3.2);
  var lean = Math.random() < 0.5;
  var ty1 = (lean ? rake : 0).toFixed(3);
  var ty2 = (lean ? 0 : rake).toFixed(3);
  var gy2 = rnd(0.03, 0.12).toFixed(3);
  // A raked axis runs mostly OFF the rect — only a slice of its 0..1
  // offsets ever crosses the visible plate; the weave is laid inside
  // that slice, projected here once.
  var q = 1 + rake * rake;
  var VIS = lean ? { lo: (rake * rake - rake) / q, hi: 1 }
                 : { lo: 0, hi: (1 + rake) / q };

  // THE OIL: the slick's own colours — violet, blue, teal, green,
  // amber, magenta — [hex, opacity] per stripe. Fixed: the plate
  // does not sample the page.
  var OIL_TINTS = [
    ['#8a5fd6', .7], ['#3a7bd5', .7], ['#3fc3c9', .6],
    ['#66b56a', .6], ['#e0b13e', .7], ['#c25a8a', .65]
  ];

  // THE WEAVE: no lone event any more — the WHOLE plate streams
  // with colour. The palette repeats in dense diagonal stripes
  // across the visible slice of the raked axis, each stripe
  // breathing between full ink and a thinner pass so the metal
  // glints through unevenly; the displacement below waves the lot.
  // Stripe count is drawn once per visit.
  var CYCLES = Math.round(rnd(26, 38));

  function pour(tints) {
    // ALTERNATION: each cycle is a colour PASSAGE and then bare
    // METAL — the hues fade in, cross, and fade back to silver
    // before the next passage begins. The silver share breathes
    // from cycle to cycle (golden-angle again) so the rhythm never
    // reads as a ruled repeat.
    var n = tints.length;
    var span = VIS.hi - VIS.lo;
    var stops = '';
    for (var c = 0; c < CYCLES; c++) {
      var a = VIS.lo + span * c / CYCLES;
      var b = VIS.lo + span * (c + 1) / CYCLES;
      var silver = 0.3 + 0.3 * Math.abs(Math.sin(c * 2.399));
      var ce = a + (b - a) * (1 - silver);
      stops += "<stop offset='" + a.toFixed(4) + "' stop-color='" + tints[c % n][0] + "' stop-opacity='0'/>";
      for (var i = 0; i < n; i++) {
        var t = tints[(c + i) % n];
        var off = a + (ce - a) * (i + 0.5) / n;
        var op = Math.min(1, t[1] * (0.6 + 0.4 * Math.abs(Math.sin((c * n + i) * 2.399))));
        stops += "<stop offset='" + off.toFixed(4) + "' stop-color='" + t[0] +
          "' stop-opacity='" + op.toFixed(2) + "'/>";
      }
      stops += "<stop offset='" + ce.toFixed(4) + "' stop-color='" + tints[(c + n - 1) % n][0] + "' stop-opacity='0'/>";
    }
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='1400' height='300' viewBox='0 0 1400 300' preserveAspectRatio='none'>" +
      "<defs>" +
      // Bright chrome, banded vertically like the reference: near-
      // white bars over mid-silver, the colour columns riding on top.
      "<linearGradient id='g' x1='0' y1='0' x2='1' y2='" + gy2 + "'><stop offset='0' stop-color='#9a9792'/><stop offset='.16' stop-color='#eae7e1'/><stop offset='.34' stop-color='#aeaaa4'/><stop offset='.52' stop-color='#f6f4ee'/><stop offset='.7' stop-color='#a3a09a'/><stop offset='.86' stop-color='#e0dcd6'/><stop offset='1' stop-color='#94918c'/></linearGradient>" +
      "<linearGradient id='t' x1='0' y1='" + ty1 + "' x2='1' y2='" + ty2 + "'>" + stops + "</linearGradient>" +
      // VERTICAL striations — variation runs across, the grain runs
      // down — brushed holo stock, not crumpled kitchen foil.
      "<filter id='f1' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.07 0.004' numOctaves='3' seed='" + seed1 + "'/><feDiffuseLighting lighting-color='#ffffff' surfaceScale='1.6' diffuseConstant='1.3'><feDistantLight azimuth='" + az1 + "' elevation='" + el1 + "'/></feDiffuseLighting></filter>" +
      "<filter id='f2' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.002' numOctaves='2' seed='" + seed2 + "'/><feDiffuseLighting lighting-color='#ffffff' surfaceScale='1.5' diffuseConstant='1.25'><feDistantLight azimuth='" + az2 + "' elevation='" + el2 + "'/></feDiffuseLighting></filter>" +
      // THE MIRROR PASS: specular glints down the same striations —
      // the hard vertical highlights that make it read as chrome.
      "<filter id='sp' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.07 0.004' numOctaves='3' seed='" + seed1 + "'/><feSpecularLighting lighting-color='#ffffff' surfaceScale='2' specularConstant='.9' specularExponent='18'><feDistantLight azimuth='" + az1 + "' elevation='" + el1 + "'/></feSpecularLighting></filter>" +
      // THE SINE: the colour events undulate — a one-octave low-frequency
      // displacement bends each band into a slow wave, the reference
      // foil's wavering reflection rather than a ruled stripe.
      "<filter id='wv' x='-10%' y='-10%' width='120%' height='120%'><feTurbulence type='turbulence' baseFrequency='0.0022 0.009' numOctaves='1' seed='" + seed2 + "'/><feDisplacementMap in='SourceGraphic' scale='70' xChannelSelector='R' yChannelSelector='G'/></filter>" +
      "</defs>" +
      "<rect width='1400' height='300' fill='url(#g)'/>" +
      "<rect width='1400' height='300' filter='url(#f2)' opacity='.5' style='mix-blend-mode:soft-light'/>" +
      "<rect width='1400' height='300' filter='url(#f1)' opacity='.6' style='mix-blend-mode:soft-light'/>" +
      "<rect x='-70' y='-70' width='1540' height='440' fill='url(#t)' filter='url(#wv)' style='mix-blend-mode:overlay'/>" +
      "<rect x='-70' y='-70' width='1540' height='440' fill='url(#t)' filter='url(#wv)' opacity='.6'/>" +
      "<rect width='1400' height='300' filter='url(#sp)' opacity='.7' style='mix-blend-mode:screen'/>" +
      "</svg>";
    document.documentElement.style.setProperty('--foil-uri', enc(svg));
  }

  pour(OIL_TINTS);

  // THE WAVE: the travelling highlight is its own image — a white
  // band bent by a displacement map drawn on the crumple's own seed,
  // so the light that walks the plate undulates with the folds
  // instead of sweeping through as a straight bar. The stylesheet's
  // straight gradient stays as the no-JS fallback.
  document.documentElement.style.setProperty('--foil-sheen-img', enc(
    "<svg xmlns='http://www.w3.org/2000/svg' width='1400' height='300' viewBox='0 0 1400 300' preserveAspectRatio='none'>" +
    "<defs>" +
    "<linearGradient id='s' x1='0' y1='0' x2='1' y2='0'>" +
    "<stop offset='.28' stop-color='#ffffff' stop-opacity='0'/>" +
    "<stop offset='.42' stop-color='#ffffff' stop-opacity='.35'/>" +
    "<stop offset='.5' stop-color='#ffffff' stop-opacity='.12'/>" +
    "<stop offset='.57' stop-color='#ffffff' stop-opacity='.28'/>" +
    "<stop offset='.72' stop-color='#ffffff' stop-opacity='0'/>" +
    "</linearGradient>" +
    "<filter id='w' x='-15%' y='-15%' width='130%' height='130%'>" +
    "<feTurbulence type='fractalNoise' baseFrequency='0.015 0.003' numOctaves='2' seed='" + seed1 + "'/>" +
    "<feDisplacementMap in='SourceGraphic' scale='40' xChannelSelector='R' yChannelSelector='G'/>" +
    "</filter>" +
    "</defs>" +
    "<rect width='1400' height='300' fill='url(#s)' filter='url(#w)'/>" +
    "</svg>"));

})();
