  (function(){
    if (window.matchMedia('(hover: none)').matches) return;
    var card = document.getElementById('preview-card');
    var timer = null;
    var activeLink = null;
    var overCard = false;
    var scrollTimer = null;
    var isScrolling = false;

    // The card is positioned in document coordinates, but it lives outside
    // <main> while its anchor lives inside it — and the sticky nav's compact
    // state applies a compositor transform to <main> (content pull-up) that
    // shifts the anchor's painted position without a real scroll/reflow.
    // Recomputing from a fresh rect on every scroll (see listener below)
    // keeps the card glued to the anchor through that transform instead of
    // drifting away from it.
    function reposition() {
      if (!activeLink) return;
      var anchor = activeLink.closest('.popular-row .card') || activeLink;
      var rect = anchor.getBoundingClientRect();
      var scrollY = window.scrollY || window.pageYOffset;
      var scrollX = window.scrollX || window.pageXOffset;
      var margin = 8;
      var vw = document.documentElement.clientWidth;
      var left = Math.min(Math.max(rect.left + scrollX, margin), vw - rect.width - margin);
      card.style.left = left + 'px';
      card.style.top = (rect.bottom + scrollY) + 'px';
    }

    window.addEventListener('scroll', function() {
      isScrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function(){ isScrolling = false; }, 200);
      if (card.classList.contains('preview-card--visible')) reposition();
    }, { passive: true });
    window.addEventListener('resize', function() {
      if (card.classList.contains('preview-card--visible')) reposition();
    }, { passive: true });

    function esc(s) {
      return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function show(link) {
      var text = link.dataset.preview;
      if (!text) return;
      activeLink = link;
      var glowCanvas = card.querySelector('canvas');
      card.innerHTML = '<span>' + esc(text) + '</span><a class="preview-card-link" href="' + esc(link.href) + '" rel="noopener" tabindex="0">Read on &#8594;</a>';
      if (glowCanvas) card.appendChild(glowCanvas);
      card.setAttribute('aria-hidden', 'false');

      // Absolute positioning — document coordinates so card scrolls with the image.
      // For popular-row items, anchor to the full .card so the popup spans card width.
      var anchor = link.closest('.popular-row .card') || link;
      var rect = anchor.getBoundingClientRect();

      card.style.visibility = 'hidden';
      card.style.left = '-9999px';
      card.style.top = '-9999px';
      card.style.width = rect.width + 'px';
      card.classList.add('preview-card--visible');

      reposition();

      link.classList.add('preview-active');
      card.style.visibility = '';
    }

    function hide() {
      clearTimeout(timer);
      timer = null;
      if (activeLink) activeLink.classList.remove('preview-active');
      activeLink = null;
      card.classList.remove('preview-card--visible');
      card.setAttribute('aria-hidden', 'true');
    }

    document.addEventListener('mouseover', function(e) {
      var link = e.target.closest('.card-image-link[data-preview]');
      if (!link) return;
      if (link === activeLink) return;
      clearTimeout(timer);
      activeLink = link;
      timer = setTimeout(function(){ show(link); }, 500);
    });

    document.addEventListener('mouseout', function(e) {
      var link = e.target.closest('.card-image-link[data-preview]');
      if (!link) return;
      if (link.contains(e.relatedTarget)) return;
      if (e.relatedTarget === card || card.contains(e.relatedTarget)) return;
      if (overCard || isScrolling) return;
      hide();
    });

    card.addEventListener('mouseenter', function(){ overCard = true; clearTimeout(timer); });
    card.addEventListener('mouseleave', function(){ overCard = false; hide(); });

  })();