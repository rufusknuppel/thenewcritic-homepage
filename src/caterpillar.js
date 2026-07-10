(function(){
  var PAD = 6; // canvas overbleed — glow is centered on the border line

  function buildPath(pts) {
    var segs = [], total = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var dx = pts[i+1][0]-pts[i][0], dy = pts[i+1][1]-pts[i][1];
      var len = Math.sqrt(dx*dx+dy*dy);
      segs.push([pts[i], pts[i+1], total, total+len]);
      total += len;
    }
    var fn = function(t) {
      var d = ((t%1)+1)%1 * total;
      for (var i = 0; i < segs.length; i++) {
        if (d <= segs[i][3]+1e-6) {
          var f = segs[i][3]>segs[i][2] ? Math.min(1,(d-segs[i][2])/(segs[i][3]-segs[i][2])) : 0;
          return [segs[i][0][0]+(segs[i][1][0]-segs[i][0][0])*f,
                  segs[i][0][1]+(segs[i][1][1]-segs[i][0][1])*f];
        }
      }
      return pts[pts.length-1];
    };
    fn.total = total;
    return fn;
  }

  // Smooth wire glow: line strokes + shadowBlur, no discrete circles
  // tail is a fraction of path length (capped to ~51px so large elements match nav bar size)
  function drawDroplet(ctx, pathFn, t, cw, ch, opacity, tail) {
    ctx.clearRect(0,0,cw,ch);
    if (opacity < 0.01) return;
    var N = 60;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Pre-sample points
    var pts = [];
    for (var i = 0; i <= N; i++) pts.push(pathFn(t - (1-i/N)*tail));

    // Outer glow halo (shadow pass)
    ctx.save();
    ctx.shadowColor = 'rgba(247,246,241,1)';
    ctx.shadowBlur = 5;
    for (var i = 1; i <= N; i++) {
      var frac = i/N, a = frac*frac*opacity*0.32;
      if (a < 0.003) continue;
      ctx.beginPath();
      ctx.moveTo(pts[i-1][0], pts[i-1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.lineWidth = 1 + frac*2;
      ctx.strokeStyle = 'rgba(247,246,241,'+a+')';
      ctx.stroke();
    }
    ctx.restore();

    // Crisp inner core
    for (var i = 1; i <= N; i++) {
      var frac = i/N, a = frac*frac*opacity*0.88;
      if (a < 0.003) continue;
      ctx.beginPath();
      ctx.moveTo(pts[i-1][0], pts[i-1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.lineWidth = 0.2 + frac*1.1;
      ctx.strokeStyle = 'rgba(247,246,241,'+a+')';
      ctx.stroke();
    }
  }

  function attach(el, makePathFn, speed, zIndex, maxTailPx) {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:-'+PAD+'px;left:-'+PAD+'px;pointer-events:none;z-index:'+(zIndex||4)+';';
    el.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var t=0, raf=null, on=false, opacity=0, pathFn=null, cw=0, ch=0, last=null;
    var sizeChanged = true;

    var ro = new ResizeObserver(function() { sizeChanged = true; });
    ro.observe(el);

    function rebuild() {
      if (!sizeChanged) return;
      var w=el.offsetWidth, h=el.offsetHeight;
      if (!w||!h) return;
      sizeChanged = false;
      cw=w; ch=h;
      pathFn = makePathFn(el,w,h);
      canvas.width  = (pathFn && pathFn.canvasW) || w+2*PAD;
      canvas.height = (pathFn && pathFn.canvasH) || h+2*PAD;
    }

    function frame(now) {
      if (!last) last=now;
      var dt=Math.min(now-last,100); last=now;
      on ? (opacity=Math.min(1,opacity+0.004*dt)) : (opacity=Math.max(0,opacity-0.003*dt));
      rebuild();
      // Maintain constant pixel speed regardless of path length
      var spd = (pathFn && pathFn.total) ? PIX_PER_MS / pathFn.total : speed;
      t=(t+spd*dt)%1;
      if (pathFn) {
        var capPx = maxTailPx || 51;
        var tail = Math.min(0.18, capPx / pathFn.total);
        drawDroplet(ctx,pathFn,t,canvas.width,canvas.height,opacity,tail);
      }
      if (on||opacity>0.01) raf=requestAnimationFrame(frame);
      else { raf=null; ctx.clearRect(0,0,canvas.width,canvas.height); }
    }

    return {
      // cw=0;ch=0 forces rebuild on next frame so the path picks up fresh BCR positions
      start: function(){ sizeChanged=true; on=true;  if(!raf){last=null; raf=requestAnimationFrame(frame);} },
      stop:  function(){ on=false; if(!raf&&opacity>0.01){last=null; raf=requestAnimationFrame(frame);} }
    };
  }

  // Defers the canvas/ResizeObserver setup in attach() until the element is
  // actually hovered, instead of paying that cost upfront for every card on
  // the page (archive.html alone has 80+ of these, nearly all off-screen).
  function lazyAttach(el, makePathFn, speed, zIndex, maxTailPx) {
    var inst = null;
    function ensure() {
      if (!inst) inst = attach(el, makePathFn, speed, zIndex, maxTailPx);
      return inst;
    }
    return {
      start: function(){ ensure().start(); },
      stop: function(){ if (inst) inst.stop(); }
    };
  }

  // Button: 1px CSS border. Canvas positioned from padding edge (1px inside border outer edge).
  // Traces border center (0.5px inside outer edge on each side).
  function btnPathFn(el, w, h) {
    var rect = el.getBoundingClientRect();
    var p=PAD-0.5, q=rect.width+PAD-1.5, r=rect.height+PAD-1.5;
    return buildPath([[p,p],[q,p],[q,r],[p,r],[p,p]]);
  }

  var SPD = 1/4640; // nav bar reference: ~61 px/s on its ~282px perimeter
  var PIX_PER_MS = SPD * 282; // constant pixel speed shared by all elements

  // Every button on the page — .btn (Subscribe and the Give page's CTAs),
  // the black pill buttons (The Latest / Essays), and the "Read on" links
  // (hero, duo panels, hover popup) — glows on hover. Note the popup's own
  // "Read on" is re-created per show() in preview-card.js, after this ran,
  // so only buttons present at load are wired up.
  document.querySelectorAll('a.btn, .hero-latest-btn, .preview-card-link').forEach(function(btn) {
    // Corner-pinned buttons (.duo-essays-btn/.duo-readon-btn) are already
    // position:absolute — inline 'relative' would yank them out of their
    // corners, and absolute anchors the canvas just as well.
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'visible';
    var a = lazyAttach(btn, btnPathFn, SPD);
    var leaveTimer = null;
    btn.addEventListener('mouseenter', function(){
      clearTimeout(leaveTimer);
      a.start();
    });
    // Debounce real mouseleaves briefly so a stray leave/enter pair (e.g.
    // from a layout shift) doesn't stall the glow with no way to restart it.
    btn.addEventListener('mouseleave', function(){
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function(){
        if (!btn.matches(':hover')) a.stop();
      }, 220);
    });
  });

})();