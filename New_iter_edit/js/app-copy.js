(function () {
  'use strict';

  // ----------- COUNTDOWN -----------
  function initCountdown(targetISO) {
    var daysEl  = document.getElementById('cd-days');
    var hoursEl = document.getElementById('cd-hours');
    var minsEl  = document.getElementById('cd-mins');
    var secsEl  = document.getElementById('cd-secs');
    if (!daysEl) return;
    var target = new Date(targetISO).getTime();
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      var now = Date.now();
      var diff = Math.max(0, target - now);
      var days = Math.floor(diff / 86400000); diff -= days * 86400000;
      var hrs  = Math.floor(diff / 3600000);  diff -= hrs  * 3600000;
      var mins = Math.floor(diff / 60000);    diff -= mins * 60000;
      var secs = Math.floor(diff / 1000);
      daysEl.textContent  = pad(days);
      hoursEl.textContent = pad(hrs);
      minsEl.textContent  = pad(mins);
      secsEl.textContent  = pad(secs);
    }
    tick();
    setInterval(tick, 1000);
  }

  // ----------- REVEAL ON SCROLL -----------
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = parseInt(entry.target.dataset.revealDelay || '0', 10);
          setTimeout(function () { entry.target.classList.add('is-visible'); }, delay);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  // ----------- ABOUT SECTION CINEMATIC ENTRANCE -----------
  function initAboutCinematic() {
    var section = document.getElementById('about');
    if (!section || !('IntersectionObserver' in window)) {
      // fallback: show everything immediately
      section && section.classList.add('about-section-active');
      document.querySelectorAll('.about-text-block').forEach(function (el) { el.classList.add('text-visible'); });
      return;
    }
    var triggered = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          // Phase 1: trigger beam draw animation
          section.classList.add('about-section-active');
          // Phase 2: after beam animation completes (~1.4s), fade in the text
          setTimeout(function () {
            document.querySelectorAll('.about-text-block').forEach(function (el, i) {
              setTimeout(function () { el.classList.add('text-visible'); }, i * 120);
            });
          }, 1350);
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    io.observe(section);
  }

  // ----------- COUNT-UP STATS -----------
  function formatNum(n) {
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return String(Math.round(n));
  }
  function animateCount(el) {
    var target = parseFloat(el.dataset.target || '0');
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    var duration = 1800;
    var start = performance.now();
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var v = target * ease(t);
      el.textContent = prefix + formatNum(v) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + formatNum(target) + suffix;
    }
    requestAnimationFrame(step);
  }
  function initCounters() {
    var stats = document.querySelectorAll('.stat-num');
    if (!stats.length || !('IntersectionObserver' in window)) {
      stats.forEach(function (el) {
        var target = parseFloat(el.dataset.target || '0');
        var prefix = el.dataset.prefix || '';
        var suffix = el.dataset.suffix || '';
        el.textContent = prefix + formatNum(target) + suffix;
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    stats.forEach(function (s) { io.observe(s); });
  }

  // ----------- 3D TILT CARDS -----------
  function initTilt() {
    var cards = document.querySelectorAll('.tilt');
    var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        var cx = r.width / 2;
        var cy = r.height / 2;
        var ry = ((x - cx) / cx) * 10;
        var rx = -((y - cy) / cy) * 10;
        card.style.setProperty('--rx', rx + 'deg');
        card.style.setProperty('--ry', ry + 'deg');
        card.style.setProperty('--mx', ((x / r.width) * 100) + '%');
        card.style.setProperty('--my', ((y / r.height) * 100) + '%');
      });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ----------- EVENT FILTER CHIPS -----------
  function initFilters() {
    var chips = document.querySelectorAll('.chip');
    var cards = document.querySelectorAll('.event-card');
    if (!chips.length) return;
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('chip-active'); });
        chip.classList.add('chip-active');
        var f = chip.dataset.filter;
        cards.forEach(function (card) {
          var cat = card.dataset.cat;
          var show = f === 'all' || cat === f;
          if (show) card.classList.remove('is-hidden');
          else card.classList.add('is-hidden');
        });
      });
    });
  }

  // ----------- CUSTOM CURSOR -----------
  function initCursor() {
    if (!matchMedia('(pointer: fine)').matches) return;
    var dot  = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    var mx = 0, my = 0, rx = 0, ry = 0, tmx = 0, tmy = 0;
    document.addEventListener('mousemove', function (e) {
      tmx = e.clientX; tmy = e.clientY;
      mx = tmx; my = tmy;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    });
    (function loop() {
      rx += (tmx - rx) * 0.18;
      ry += (tmy - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    var sel = 'a, button, input, [role="button"], .tilt, summary';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(sel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(sel)) document.body.classList.remove('cursor-hover');
    });
  }

  // ----------- NAV PEBBLE ON SCROLL -----------
  function initNavScroll() {
    var nav = document.querySelector('.glass-nav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        nav.classList.add('nav-scrolled');
      } else {
        nav.classList.remove('nav-scrolled');
      }
    });
  }

  // ----------- MOBILE NAV -----------
  function initMobileNav() {
    var toggle = document.getElementById('nav-toggle');
    var menu   = document.getElementById('mobile-menu');
    var close  = document.getElementById('nav-close');
    if (!toggle || !menu) return;
    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function shut() {
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    toggle.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) shut(); else open();
    });
    if (close) close.addEventListener('click', shut);
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', shut); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
  }

  // ----------- SMOOTH SCROLL -----------
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var offset = 64;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  // ----------- 3D CYBORG HEAD -----------
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }


  // ----------- 3D BACKGROUND -----------
  function initBackground(canvas) {
    if (!canvas || typeof THREE === 'undefined') return null;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 6, 14);
    camera.lookAt(0, 0, 0);

    // Grid floor (custom shader)
    var gridGeom = new THREE.PlaneGeometry(200, 200, 1, 1);
    var gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColorFar: { value: new THREE.Color(0xFF5A1F) },
        uColorNear: { value: new THREE.Color(0xD32F2F) },
      },
      vertexShader:
        'varying vec2 vUv; varying float vDepth;' +
        'void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'uniform float uTime; uniform vec3 uColorFar; uniform vec3 uColorNear;' +
        'varying vec2 vUv; varying float vDepth;' +
        'float gridLine(vec2 p, float thickness){ vec2 g = abs(fract(p-0.5)-0.5)/fwidth(p); float line = min(g.x,g.y); return 1.0 - smoothstep(0.0, thickness, line); }' +
        'void main(){' +
        '  vec2 uv = vUv * 80.0; uv.y += uTime * 1.5;' +
        '  float line1 = gridLine(uv, 1.5);' +
        '  float line2 = gridLine(uv * 0.2, 1.0);' +
        '  float grid = max(line1, line2);' +
        '  float depthFade = smoothstep(0.0, 30.0, vDepth);' +
        '  float alpha = grid * (1.0 - depthFade) * 0.8;' +
        '  vec3 col = mix(uColorNear, uColorFar, smoothstep(2.0, 30.0, vDepth));' +
        '  float horizon = 1.0 - smoothstep(8.0, 20.0, vDepth);' +
        '  col += uColorFar * horizon * 0.4 * (1.0 - depthFade);' +
        '  gl_FragColor = vec4(col, alpha);' +
        '}',
    });
    var grid = new THREE.Mesh(gridGeom, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -1.8;
    scene.add(grid);

    // Horizon glow removed (rendered in HTML now)

    // Particles
    var particleCount = window.innerWidth < 768 ? 350 : 800;
    var positions = new Float32Array(particleCount * 3);
    for (var p = 0; p < particleCount; p++) {
      positions[p * 3]     = (Math.random() - 0.5) * 40;
      positions[p * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[p * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    var partGeom = new THREE.BufferGeometry();
    partGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var partMat = new THREE.PointsMaterial({
      color: 0x00f0ff, size: 0.04,
      transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    var particles = new THREE.Points(partGeom, partMat);
    scene.add(particles);

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(canvas); }
    resize();

    var clock = new THREE.Clock();
    var rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      if (!reduceMotion) {
        gridMat.uniforms.uTime.value = t;
        var arr = partGeom.attributes.position.array;
        for (var q = 0; q < particleCount; q++) {
          arr[q * 3 + 1] += 0.02;
          if (arr[q * 3 + 1] > 10) {
            arr[q * 3 + 1] = -10;
            arr[q * 3]     = (Math.random() - 0.5) * 40;
            arr[q * 3 + 2] = (Math.random() - 0.5) * 40;
          }
        }
        partGeom.attributes.position.needsUpdate = true;
        camera.position.x = Math.sin(t * 0.2) * 0.5;
        camera.position.y = 6 + Math.sin(t * 0.4) * 0.2;
      }
      renderer.render(scene, camera);
    }
    animate();
    return { dispose: function () { cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); if (ro) ro.disconnect(); renderer.dispose(); } };
  }

  // ----------- BOOTSTRAP -----------
  function boot() {
    initCountdown('2026-12-26T00:00:00+05:30');
    initReveal();
    initAboutCinematic();
    initCounters();
    initTilt();
    initFilters();
    initMobileNav();
    initSmoothScroll();
    initCursor();
    initNavScroll();
    fitFooterWatermark();

    if (hasWebGL()) {
      var bgCanvas = document.getElementById('bg-canvas');
      try { if (bgCanvas) initBackground(bgCanvas); } catch (e) { console.warn('Background init failed:', e); }
    } else {
      document.querySelectorAll('#bg-canvas').forEach(function (c) { c.style.display = 'none'; });
      var hero = document.querySelector('main > section');
      if (hero) {
        hero.style.background = 'radial-gradient(circle at 70% 50%, rgba(255,90,31,0.3), transparent 50%), radial-gradient(circle at 30% 30%, rgba(255,90,31,0.2), transparent 60%), #0B0A0A';
      }
    }
  }

  // ----------- FOOTER WATERMARK AUTO-FIT -----------
  function fitFooterWatermark() {
    var el = document.querySelector('.footer-wm-text');
    if (!el) return;
    var parent = el.parentElement;

    // 1. Set a known reference size so we can measure proportionally
    el.style.fontSize = '200px';

    // 2. scrollWidth gives the full rendered text width at 200px
    var refWidth  = el.scrollWidth;
    var available = parent.offsetWidth;

    if (refWidth <= 0 || available <= 0) return;

    // 3. Scale font-size so text fills ~97% of the footer width
    var fitted = (200 * (available / refWidth)) * 0.97;
    el.style.fontSize = fitted + 'px';
  }

  window.addEventListener('resize', fitFooterWatermark);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


