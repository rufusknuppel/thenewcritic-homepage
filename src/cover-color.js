(function(){
  // Each open hover card takes its ground from its cover's primary colour
  // (replacing the white panel). The colour is picked from a downscaled
  // sample of the cover: pixels are quantised into buckets, each weighted
  // toward saturation and away from near-white/near-black, and the
  // heaviest bucket's average is the ground. CORS-loaded so the canvas
  // read is allowed (the Substack CDN permits it).
  function primaryColor(img){
    var W = 28, H = 28;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d'); if (!ctx) return null;
    try { ctx.drawImage(img, 0, 0, W, H); } catch (e) { return null; }
    var data; try { data = ctx.getImageData(0, 0, W, H).data; } catch (e) { return null; }
    var buckets = {};
    for (var i = 0; i < data.length; i += 4){
      var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 128) continue;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      var sat = mx === 0 ? 0 : (mx - mn) / mx;
      var lum = (mx + mn) / 510;                 // 0..1
      var w = 1;
      if (lum > 0.92 || lum < 0.07) w = 0.04;    // skip paper/ink extremes
      w *= (0.22 + sat);                          // reward vivid hues
      var key = (r >> 3) + ',' + (g >> 3) + ',' + (b >> 3);
      var bk = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
      bk.n += w; bk.r += r * w; bk.g += g * w; bk.b += b * w;
    }
    var best = null;
    for (var k in buckets){ if (!best || buckets[k].n > best.n) best = buckets[k]; }
    if (!best || best.n <= 0) return null;
    return 'rgb(' + Math.round(best.r / best.n) + ',' +
                    Math.round(best.g / best.n) + ',' +
                    Math.round(best.b / best.n) + ')';
  }
  function paint(scope){
    var img = scope.querySelector('.card-image');
    var panel = scope.querySelector('.duo-panel');
    if (!img || !panel) return;
    // Sample a separate CORS-loaded copy — putting crossorigin on the
    // DISPLAY img killed covers served without CORS headers (the raw S3
    // fallbacks). If this copy errors, the card just keeps its white.
    var go = function(){
      var col = primaryColor(img); if (!col) return;
      // The card's ink is BLACK, always — so the cover's primary is
      // lightened (blended toward white) until it stands far enough
      // back for black text, keeping the hue while guaranteeing
      // contrast on every cover.
      var m = /rgb\((\d+),(\d+),(\d+)\)/.exec(col);
      if (m){
        var r = +m[1], g = +m[2], b = +m[3];
        var lum = function(){ return (0.2126*r + 0.7152*g + 0.0722*b) / 255; };
        var guard = 24;
        while (lum() < 0.62 && guard-- > 0){
          r += (255 - r) * 0.14; g += (255 - g) * 0.14; b += (255 - b) * 0.14;
        }
        col = 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
      }
      panel.style.setProperty('background', col, 'important');
    };
    var start = function(){
      var probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = function(){ img = probe; go(); };
      probe.src = img.currentSrc || img.src;
    };
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener('load', start, { once: true });
  }
  var cards = document.querySelectorAll('.card--duo .duo-half, .card--feature');
  for (var i = 0; i < cards.length; i++) paint(cards[i]);
})();
