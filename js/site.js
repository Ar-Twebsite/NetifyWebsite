// site-v5.js — three.js particle ocean + GSAP choreography.
// Progressive enhancement: the page is fully visible with no JS / no CDN.
// Hidden states are only ever set by GSAP itself (inline styles), and a
// freeze guard clears them if the compositor is throttled and nothing paints.

(function () {
  'use strict';

  var qs = function (s, c) { return (c || document).querySelector(s); };
  var qsa = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('fx');
  }

  /* ————————————————————————————————————————————
     Split an element's text into .w word spans,
     preserving nested elements (.dim, .mark …).
     ———————————————————————————————————————————— */
  function splitWords(el) {
    if (!el || el.dataset.split) { return qsa('.w', el); }
    function walk(node, target) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) { return; }
            if (/^\s+$/.test(part)) {
              target.appendChild(document.createTextNode(' '));
            } else {
              var w = document.createElement('span');
              w.className = 'w';
              w.textContent = part;
              target.appendChild(w);
            }
          });
        } else if (child.nodeType === 1) {
          var clone = child.cloneNode(false);
          walk(child, clone);
          target.appendChild(clone);
        }
      });
    }
    var frag = document.createDocumentFragment();
    walk(el, frag);
    el.innerHTML = '';
    el.appendChild(frag);
    el.dataset.split = '1';
    return qsa('.w', el);
  }

  /* ————————————————————————————————————————————
     THREE.JS — hero particle ocean
     A field of ink dots on a breathing wave; the cursor
     drops ripples into it. Accent dots glow orange.
     ———————————————————————————————————————————— */
  (function initGL() {
    var wrap = qs('.hero-gl');
    var hero = qs('.hero');
    if (!wrap || !hero) { return; }

    // Connection-aware loading: three.js is ~150 KB gzipped and only powers a
    // decorative particle field. Skip it on data-saver or slow links (2g/3g) —
    // the hero still shows its paper + grain texture and the headline, so the
    // page never looks broken without it.
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || /(slow-2g|2g|3g)/.test(conn.effectiveType || ''))) { return; }

    // Lazily fetch three.js only once we've decided the connection can afford it.
    if (!window.THREE) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
      s.onload = build;
      document.head.appendChild(s);
      return;
    }
    build();

    function build() {
    if (!window.THREE) { return; }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) { return; }

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 2, 0.1, 200);
    camera.position.set(0, 9.5, 23);
    camera.lookAt(0, -1.2, 0);

    // — geometry: grid of points on the XZ plane —
    var COLS = 150, ROWS = 80, W = 100, D = 38, ZOFF = -8; // plane recedes away from camera
    var count = COLS * ROWS;
    var positions = new Float32Array(count * 3);
    var tints = new Float32Array(count);
    var sizes = new Float32Array(count);
    var i, x, z, k = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        x = (c / (COLS - 1) - 0.5) * W;
        z = (r / (ROWS - 1) - 0.5) * D;
        positions[k * 3] = x + (Math.random() - 0.5) * 0.22;
        positions[k * 3 + 1] = 0;
        positions[k * 3 + 2] = z + ZOFF + (Math.random() - 0.5) * 0.22;
        var accent = Math.random() < 0.04;
        tints[k] = accent ? 1 : 0;
        sizes[k] = accent ? 1.9 + Math.random() * 1.1 : 1.0 + Math.random() * 1.0;
        k++;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    var uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: 0 },
      uInk: { value: new THREE.Color('#181510') },
      uAccent: { value: new THREE.Color('#EB4F22') },
      uDpr: { value: DPR }
    };

    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: [
        'uniform float uTime;',
        'uniform vec2 uMouse;',
        'uniform float uStrength;',
        'uniform float uDpr;',
        'attribute float aTint;',
        'attribute float aSize;',
        'varying float vTint;',
        'varying float vGlow;',
        'varying float vFade;',
        'void main() {',
        '  vec3 p = position;',
        '  float e = sin(p.x * 0.42 + uTime * 0.85) * cos(p.z * 0.36 + uTime * 0.6) * 0.8;',
        '  e += sin((p.x + p.z) * 0.21 + uTime * 0.45) * 0.55;',
        '  float d = distance(p.xz, uMouse);',
        '  e += exp(-d * d * 0.05) * sin(d * 1.9 - uTime * 5.2) * 1.4 * uStrength;',
        '  p.y += e;',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  gl_PointSize = min(aSize * uDpr * (110.0 / -mv.z), 7.5 * uDpr);',
        '  vTint = aTint;',
        '  vGlow = smoothstep(-1.4, 1.8, e);',
        '  vFade = 1.0 - smoothstep(14.0, 34.0, -mv.z);', 
        '  vFade = 0.35 + 0.65 * vFade;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision mediump float;',
        'uniform vec3 uInk;',
        'uniform vec3 uAccent;',
        'varying float vTint;',
        'varying float vGlow;',
        'varying float vFade;',
        'void main() {',
        '  float m = smoothstep(0.5, 0.3, length(gl_PointCoord - 0.5));',
        '  if (m < 0.02) { discard; }',
        '  vec3 col = mix(uInk, uAccent, vTint);',
        '  float a = m * mix(0.07, 0.38, vGlow);',
        '  a = max(a, m * 0.4 * vTint);',
        '  gl_FragColor = vec4(col, a * vFade);',
        '}'
      ].join('\n')
    });

    scene.add(new THREE.Points(geo, mat));

    // — sizing —
    function resize() {
      var w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // — pointer / touch → ripple center (ray onto y=0 plane) —
    var raycaster = new THREE.Raycaster();
    var planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var ndc = new THREE.Vector2();
    var hit = new THREE.Vector3();
    var target = new THREE.Vector2(0, 0);
    var targetStrength = 0;
    var lastPointer = 0;

    function splashAt(clientX, clientY, strength) {
      var rect = wrap.getBoundingClientRect();
      if (rect.height < 2) { return; }
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(planeY0, hit)) {
        target.set(hit.x, hit.z);
        targetStrength = strength;
        lastPointer = performance.now();
      }
    }

    // drag (mouse move / finger slide) follows the surface; a tap or click
    // drops a bigger splash. pointerdown covers touch taps on mobile, where
    // there is no hover state at all.
    hero.addEventListener('pointermove', function (e) { splashAt(e.clientX, e.clientY, 1); }, { passive: true });
    hero.addEventListener('pointerdown', function (e) { splashAt(e.clientX, e.clientY, 1.7); }, { passive: true });

    // — accent color, read once from CSS (it never changes at runtime) —
    var acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
    if (acc) { uniforms.uAccent.value.set(acc); }

    // — render loop (pauses when hero is offscreen / tab hidden) —
    var visible = true;
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible = e.isIntersecting; });
      }, { threshold: 0 }).observe(hero);
    }

    var t0 = performance.now();
    function render(now) {
      var t = (now - t0) / 1000;
      // autonomous drift when the pointer/finger has been idle — this is the
      // default state on touch devices, so the field is always alive: a
      // wandering ripple centre that gently pulses in strength.
      if (now - lastPointer > 1900) {
        var a = t * 0.38;
        target.set(Math.sin(a) * 16 + Math.sin(a * 2.7) * 5, Math.cos(a * 0.8) * 10);
        targetStrength = 0.78 + Math.sin(t * 1.6) * 0.22;
      }
      uniforms.uTime.value = t;
      uniforms.uMouse.value.lerp(target, 0.055);
      uniforms.uStrength.value += (targetStrength - uniforms.uStrength.value) * 0.04;
      renderer.render(scene, camera);
    }

    if (reduce) {
      // single static frame — alive-looking, but no motion
      uniforms.uTime.value = 1.6;
      uniforms.uMouse.value.set(6, -2);
      uniforms.uStrength.value = 0.8;
      renderer.render(scene, camera);
      return;
    }

    function loop(now) {
      if (visible && !document.hidden) { render(now); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // — fade the field out as the hero scrolls away —
    if (hasGsap) {
      gsap.to(wrap, {
        opacity: 0.06,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    } // build()
  })();

  /* ————————————————————————————————————————————
     GSAP — load + scroll choreography
     ———————————————————————————————————————————— */
  var guarded = []; // elements the freeze-guard may need to rescue

  if (hasGsap && !reduce) {
    // ——— hero intro ———
    var heroSel = document.body.dataset.hero === 'minutes' ? '.hero-h-minutes' : '.hero-h-thesis';
    var h1words = splitWords(qs(heroSel));
    splitWords(qs(heroSel === '.hero-h-thesis' ? '.hero-h-minutes' : '.hero-h-thesis')); // keep both consistent
    var kicker = qs('.hero .kicker');
    var sub = qs('.hero-sub');
    var ctas = qsa('.hero-ctas > *');
    var navIn = qsa('.nav-in > *');
    guarded = guarded.concat(h1words, [kicker, sub], ctas, navIn);

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(navIn, { autoAlpha: 0, y: -16, duration: 0.6, stagger: 0.07 }, 0)
      .from(kicker, { autoAlpha: 0, x: -26, duration: 0.7 }, 0.15)
      .from(h1words, {
        autoAlpha: 0, yPercent: 85, rotation: 3,
        transformOrigin: '0% 100%', duration: 0.95, stagger: 0.055
      }, 0.3)
      .from(sub, { autoAlpha: 0, y: 26, duration: 0.8 }, '-=0.55')
      .from(ctas, { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.09 }, '-=0.5');

    // ——— hero parallax ———
    gsap.to('.hero .wrap', {
      y: -70, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // ——— generic reveals (.rv) ———
    var rvEls = qsa('.rv');
    guarded = guarded.concat(rvEls);
    gsap.set(rvEls, { autoAlpha: 0, y: 34 });
    ScrollTrigger.batch(rvEls, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, overwrite: true });
      }
    });

    // ——— dark band title: word-by-word reading reveal (scrubbed) ———
    var bandWords = splitWords(qs('.band-title'));
    if (bandWords.length) {
      gsap.fromTo(bandWords, { opacity: 0.14 }, {
        opacity: 1, stagger: 0.06, ease: 'none',
        scrollTrigger: { trigger: '.band-dark', start: 'top 72%', end: 'center 48%', scrub: 0.4 }
      });
    }

    // ——— time bars: scrub the old, snap the new ———
    var tbWrap = qs('.timebars');
    if (tbWrap) {
      gsap.fromTo(qs('.tb-old .tb-fill'), { width: '0%' }, {
        width: '100%', ease: 'none',
        scrollTrigger: { trigger: tbWrap, start: 'top 82%', end: 'top 30%', scrub: 0.4 }
      });
      gsap.fromTo(qs('.tb-new .tb-fill'), { width: 0 }, {
        width: 38, duration: 1.1, ease: 'elastic.out(1, 0.55)', delay: 0.25,
        scrollTrigger: { trigger: tbWrap, start: 'top 45%', once: true }
      });
    }

    // ——— mission band: words sweep in, slight zoom (scrubbed) ———
    var missionEl = qs('.band-acc .mission');
    if (missionEl) {
      var mWords = splitWords(missionEl);
      gsap.fromTo(mWords,
        { autoAlpha: 0, y: 60, rotation: 4, transformOrigin: '0% 100%' },
        {
          autoAlpha: 1, y: 0, rotation: 0, stagger: 0.05, ease: 'power2.out',
          scrollTrigger: { trigger: '.band-acc', start: 'top 78%', end: 'center 55%', scrub: 0.5 }
        });
    }

    // ——— nav: progress hairline + hide on scroll down ———
    var progress = qs('.nav-progress');
    if (progress) {
      gsap.to(progress, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
      });
    }
    var nav = qs('.nav');
    if (nav) {
      var navShown = true;
      ScrollTrigger.create({
        onUpdate: function (self) {
          var down = self.direction === 1 && window.scrollY > 320;
          if (down === navShown) {
            navShown = !down;
            gsap.to(nav, { yPercent: down ? -105 : 0, duration: 0.45, ease: 'power3.out', overwrite: true });
          }
        }
      });
    }

    // ——— magnetic buttons ———
    if (canHover) {
      qsa('.btn').forEach(function (btn) {
        var qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
        var qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
        btn.addEventListener('mousemove', function (e) {
          var b = btn.getBoundingClientRect();
          qx((e.clientX - b.left - b.width / 2) * 0.3);
          qy((e.clientY - b.top - b.height / 2) * 0.45);
        });
        btn.addEventListener('mouseleave', function () {
          gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        });
      });
    }

    // ——— freeze guard: if a throttled compositor leaves things invisible,
    //     clear every GSAP-hidden element so the page can never look empty ———
    setTimeout(function () {
      var frozen = guarded.some(function (el) {
        if (!el) { return false; }
        var r = el.getBoundingClientRect();
        var inView = r.top < window.innerHeight && r.bottom > 0 && (r.width || r.height);
        return inView && parseFloat(getComputedStyle(el).opacity) < 0.05;
      });
      if (frozen) {
        gsap.set(guarded, { clearProps: 'opacity,visibility,transform' });
      }
    }, 2800);

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  } else if (hasGsap && reduce) {
    // reduced motion: keep everything static & visible; just the progress hairline
    gsap.to('.nav-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  }

  /* ————————————————————————————————————————————
     Demo generation loop (vanilla, from v3)
     ———————————————————————————————————————————— */
  var demo = document.getElementById('demo');
  if (demo) {
    var files = demo.querySelectorAll('.file');
    var lines = demo.querySelectorAll('.status-line');
    var phase = -1;
    var timer = null;
    var DUR = [1500, 1700, 1900, 4200];

    var setPhase = function (p) {
      phase = p;
      demo.setAttribute('data-phase', String(p));
      files.forEach(function (f, idx) {
        f.classList.toggle('active', p === 0);
        f.classList.toggle('done', p > 0 || (p === 0 && idx < 2));
      });
      lines.forEach(function (l, idx) {
        l.classList.toggle('on', idx === p);
        l.classList.toggle('past', idx < p);
      });
    };

    var tick = function () {
      var next = (phase + 1) % 4;
      setPhase(next);
      timer = setTimeout(tick, DUR[next]);
    };
    var start = function () { if (!timer) { tick(); } };
    var stop = function () { if (timer) { clearTimeout(timer); timer = null; } };

    if (reduce) {
      setPhase(3);
      files.forEach(function (f) { f.classList.add('done'); });
    } else {
      start();
      if (typeof IntersectionObserver === 'function') {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { start(); } else { stop(); } });
        }, { threshold: 0.15 }).observe(demo);
      }
    }
  }
})();

/* ───────────────────────────────────────────────────────────────────────────
   Mobile nav — hamburger toggle. Self-contained; independent of three.js/GSAP,
   so it works even if the CDN libraries fail to load.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var nav = document.querySelector('.nav');
  if (!nav) { return; }
  var btn = nav.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (!btn || !menu) { return; }

  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { menu.removeAttribute('hidden'); } else { menu.setAttribute('hidden', ''); }
  }

  btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) { setOpen(false); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) { setOpen(false); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 980 && nav.classList.contains('open')) { setOpen(false); }
  });
})();
