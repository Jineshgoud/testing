/* =============================================================================
   HOLLOW — scroll is descent
   - Lenis smooth scroll + GSAP ScrollTrigger on ONE ticker
   - Altitude meter counts down 412 m -> 0 m with scroll
   - Pinned ladder descent as the single engineered peak
   - Ripple pool, magnetic button, synthesized WebAudio (off by default)
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = reduceMotion.matches;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------------ */
  /* 0. Smooth scroll (Lenis) wired into the GSAP ticker                */
  /* ------------------------------------------------------------------ */

  var lenis = null;

  if (hasLenis && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.25,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      lerp: 0.09
    });

    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  } else {
    root.classList.add('lenis-native');
  }

  function scrollToTop(smooth) {
    if (lenis) {
      lenis.scrollTo(0, { duration: smooth === false ? 0 : 2.4 });
    } else {
      window.scrollTo({ top: 0, behavior: smooth === false ? 'auto' : 'smooth' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 1. Altitude meter — 412 m at the rim, 0 m at the house            */
  /* ------------------------------------------------------------------ */

  var START_ALT = 412;
  var altValue = $('#altValue');
  var meterFill = $('#meterFill');
  var meterTick = $('#meterTick');
  var meter = $('#meter');
  var lastAltShown = null;

  function setAltitude(remaining) {
    var clamped = Math.max(0, Math.min(START_ALT, remaining));
    var shown = Math.round(clamped);
    if (shown !== lastAltShown) {
      altValue.textContent = String(shown);
      lastAltShown = shown;
      // little tick on change (CSS transition handles the meter rack)
      if (meterTick) {
        if (shown === 0) meterTick.textContent = 'floor';
        else if (shown > 330) meterTick.textContent = 'rim';
        else if (shown > 200) meterTick.textContent = 'ladder';
        else if (shown > 90) meterTick.textContent = 'halfway';
        else meterTick.textContent = 'pool';
      }
    }
    var frac = clamped / START_ALT;
    meterFill.style.height = (frac * 100).toFixed(1) + '%';
    if (frac <= 0.02) meter.classList.add('is-low');
    else meter.classList.remove('is-low');
  }
  setAltitude(START_ALT);

  /* ------------------------------------------------------------------ */
  /* 2. Motion: parallax + pinned descent + copy reveals               */
  /* ------------------------------------------------------------------ */

  var heroImg = $('.img--hero');
  var ladderImg = $('#ladderImg');
  var houseImg = $('#houseImg');
  var depthLabel = $('#depthLabel');
  var ladderPin = $('#ladderPin');

  function noMotion() {
    setAltitude(START_ALT); // static fallback: everything visible at once
  }

  if (!hasGSAP || prefersReduced) {
    noMotion();
    $$('.sec').forEach(function (s) { s.style.opacity = 1; });
    initInteractions();
    return;
  }

  /* --- rim: parallax + gentle intro --- */
  // On tall phones the wide hero has no vertical slack under object-fit:cover,
  // so we zoom in and lift the frame — this is what pulls the pool + house up
  // into the clear band above the title.
  var isPhone = window.innerWidth < 760;
  var heroBaseScale = isPhone ? 1.55 : 1.08;
  var heroBaseY = isPhone ? -34 : 0;

  gsap.fromTo(heroImg,
    { scale: heroBaseScale, yPercent: heroBaseY },
    {
      yPercent: heroBaseY + (isPhone ? 6 : 8), ease: 'none',
      scrollTrigger: { trigger: '#section-rim', start: 'top top', end: 'bottom top', scrub: true }
    }
  );

  gsap.fromTo('[data-rim]',
    { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.15, ease: 'power3.out', stagger: 0.11, delay: 0.15 }
  );

  // hero copy drifts up & fades as you leave the rim
  gsap.to('.rim-copy', {
    yPercent: -18, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#section-rim', start: '35% top', end: 'bottom top', scrub: true }
  });
  gsap.to('.cue', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#section-rim', start: 'top top', end: '22% top', scrub: true }
  });

  /* --- altitude: one monotonic source of truth -------------------------- */
  /* Rim = 412, halfway = ~150, house/home = 0. Driven by overall page      */
  /* progress so the pin spacer can never make the number jump or stall.    */
  var pinEl = document.getElementById('section-ladder');

  function pageProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(1, window.scrollY / max));
  }

  function yOf(sel) {
    var el = document.querySelector(sel);
    if (!el) return 0;
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function syncAltitude() {
    var y = window.scrollY;
    var ladderTop = yOf('#section-ladder');
    var halfTop = yOf('#section-half');
    var houseTop = yOf('#section-house');
    // ladder pin range: from ladderTop to the end of its scroll span
    var ladderEnd = pinEl ? ladderTop + pinEl.offsetHeight - window.innerHeight : halfTop;

    if (y <= ladderTop) {
      setAltitude(START_ALT);
      return;
    }
    if (y < ladderEnd) {
      var p = (y - ladderTop) / Math.max(1, ladderEnd - ladderTop);
      setAltitude(START_ALT - p * (START_ALT - 268));
      return;
    }
    if (y <= houseTop) {
      var q = (y - ladderEnd) / Math.max(1, halfTop - ladderEnd + (houseTop - halfTop) * 0.55);
      setAltitude(Math.max(0, 268 - Math.min(1, q) * 268));
      return;
    }
    setAltitude(0);
  }

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: syncAltitude,
    onRefresh: syncAltitude
  });
  syncAltitude();

  /* --- the ladder: pinned, scroll drives the descent (THE PEAK) --- */
  var descent = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#section-ladder',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.1,
      pin: ladderPin,
      pinSpacing: true,
      anticipatePin: 1,
      onUpdate: function (self) {
        // 0 -> 1 across the pinned descent
        var p = self.progress;
        // altitude handled centrally by syncAltitude()
        if (depthLabel) {
          depthLabel.textContent = '−' + Math.round(p * 250) + ' m';
        }
        // tunnel vignette tightens at the peak of the fall, eases off at the end
        var rush = Math.sin(Math.PI * Math.min(1, p * 1.15));
        if (ladderImg) {
          ladderImg.style.filter = 'brightness(' + (1 - rush * 0.16).toFixed(3) + ') contrast(' + (1 + rush * 0.08).toFixed(3) + ')';
        }
      }
    }
  });

  descent
    .fromTo(ladderImg,
      { scale: 1.28, yPercent: -6, rotate: 0 },
      { scale: 1.02, yPercent: 7, rotate: 0.6, duration: 1 },
      0)
    .fromTo('.ladder-copy', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.14 }, 0)
    .to('.ladder-copy', { opacity: 0, y: -46, duration: 0.18 }, 0.66)
    .fromTo('.depth', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.05)
    .to('.depth', { opacity: 0, duration: 0.12 }, 0.6)
    .fromTo('.vert__l', { scaleY: 0.35, opacity: 0 }, { scaleY: 1, opacity: 0.55, duration: 0.45 }, 0)
    .fromTo('.vert__r', { scaleY: 1, opacity: 0.55 }, { scaleY: 0.35, opacity: 0, duration: 0.45 }, 0.55);

  /* --- halfway: slow sway, gentle parallax --- */
  var halfImg = $('#section-half .img');
  gsap.fromTo(halfImg,
    { yPercent: -5, scale: 1.04 },
    {
      yPercent: 5, scale: 1.02, ease: 'none',
      scrollTrigger: { trigger: '#section-half', start: 'top bottom', end: 'bottom top', scrub: true }
    }
  );
  gsap.fromTo('.half-copy > *',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 1.0, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '#section-half', start: 'top 62%', once: true }
    }
  );

  /* --- house: arrival parallax + glows + reveal --- */
  gsap.fromTo(houseImg,
    { yPercent: -6, scale: 1.05 },
    {
      yPercent: 6, scale: 1.0, ease: 'none',
      scrollTrigger: { trigger: '#section-house', start: 'top bottom', end: 'bottom top', scrub: true }
    }
  );
  gsap.fromTo('.house-copy > *',
    { opacity: 0, y: 34 },
    {
      opacity: 1, y: 0, duration: 1.05, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '#section-house', start: 'top 60%', once: true }
    }
  );
  // windows warm up as the section arrives
  gsap.to('.glow__w', {
    opacity: 1, stagger: 0.18, duration: 1.6, ease: 'power2.out',
    scrollTrigger: { trigger: '#section-house', start: 'top 72%', once: true }
  });
  // altitude settles to exactly 0 across sections 3 and 4, in step with scroll
  // (handled by syncAltitude above)


  /* --- home: finale --- */
  var homeImg = $('#section-home .img');
  gsap.fromTo(homeImg,
    { yPercent: -4, scale: 1.04 },
    {
      yPercent: 4, scale: 1.01, ease: 'none',
      scrollTrigger: { trigger: '#section-home', start: 'top bottom', end: 'bottom top', scrub: true }
    }
  );
  gsap.fromTo('.home-copy > *, .credits',
    { opacity: 0, y: 28 },
    {
      opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '#section-home', start: 'top 58%', once: true }
    }
  );
  // guard: sections 3/4 read from the same rule; nothing here can set 0 early
  ScrollTrigger.create({
    trigger: '#section-home',
    start: 'top 70%',
    onEnter: function () { setAltitude(0); },
    onEnterBack: function () { setAltitude(0); }
  });

  // final safety: the floor layout can shift after fonts/images load
  window.addEventListener('resize', syncAltitude, { passive: true });

  /* reveal helper: sections start visible if JS motion fails */
  $$('.sec').forEach(function (s) { s.style.opacity = 1; });

  initInteractions();

  /* ------------------------------------------------------------------ */
  /* 3. Micro-interactions: ripple pool, magnetic button, smooth anchors */
  /* ------------------------------------------------------------------ */

  function initInteractions() {
    /* --- ripple pool --- */
    var rippleLayer = $('#ripples');
    var rippleHint = $('#rippleHint');
    var rippled = false;

    function spawnRipple(x, y, big) {
      if (!rippleLayer) return;
      var r = document.createElement('span');
      r.className = 'ripple' + (Math.random() > 0.62 ? ' ripple--pink' : '');
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      if (big) r.style.animationDuration = '2.9s';
      rippleLayer.appendChild(r);
      setTimeout(function () { r.remove(); }, 3000);
    }

    function rippleBurst(x, y) {
      spawnRipple(x, y, false);
      setTimeout(function () {
        for (var i = 0; i < 3; i++) {
          spawnRipple(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 34, true);
        }
      }, 260);
    }

    function onPoolTap(e) {
      var host = $('#section-house');
      if (!host) return;
      var rect = host.getBoundingClientRect();
      var x, y;
      if (e.touches && e.touches[0]) {
        x = e.touches[0].clientX; y = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches[0]) {
        x = e.changedTouches[0].clientX; y = e.changedTouches[0].clientY;
      } else {
        x = e.clientX; y = e.clientY;
      }
      // ignore taps on controls
      if (e.target.closest && e.target.closest('button, a')) return;
      rippleBurst(x - rect.left, y - rect.top);
      if (!rippled && rippleHint) {
        rippled = true;
        rippleHint.classList.add('is-done');
      }
    }

    var houseSection = $('#section-house');
    if (houseSection) {
      houseSection.addEventListener('pointerdown', onPoolTap);
      houseSection.addEventListener('touchstart', function () {}, { passive: true });
      // keyboard equivalent for the pool: the house heading is focusable
      houseSection.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          var rect = houseSection.getBoundingClientRect();
          rippleBurst(rect.width / 2, rect.height * 0.6);
        }
      });
    }

    /* --- magnetic buttons --- */
    if (!prefersReduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      $$('[data-magnetic]').forEach(function (el) {
        var strength = 18;
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var relX = (e.clientX - r.left - r.width / 2) / (r.width / 2);
          var relY = (e.clientY - r.top - r.height / 2) / (r.height / 2);
          gsap.to(el, {
            x: relX * strength, y: relY * strength * 0.6,
            duration: 0.5, ease: 'power3.out'
          });
        });
        el.addEventListener('pointerleave', function () {
          gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        });
      });
    }

    /* --- climb back up --- */
    var climbBtn = $('#climbBtn');
    if (climbBtn) {
      climbBtn.addEventListener('click', function () {
        scrollToTop(true);
      });
    }

    /* --- smooth anchor for the scroll cue --- */
    var cue = $('.cue');
    if (cue) {
      cue.addEventListener('click', function (e) {
        e.preventDefault();
        var target = $('#section-ladder');
        if (!target) return;
        if (lenis) lenis.scrollTo(target, { duration: 1.6 });
        else target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }

    /* --- keyboard skip link enhancement --- */
    var skip = $('.skip');
    if (skip) {
      skip.addEventListener('click', function (e) {
        e.preventDefault();
        var t = $('#section-home');
        if (!t) return;
        if (lenis) lenis.scrollTo(t, { duration: 1.2 });
        else t.scrollIntoView();
      });
    }

    initSound();
  }

  /* ------------------------------------------------------------------ */
  /* 4. SOUND — fully synthesized WebAudio, OFF by default             */
  /* ------------------------------------------------------------------ */

  function initSound() {
    var toggle = $('#soundToggle');
    var label = $('#soundLabel');
    if (!toggle) return;

    var ctx = null;
    var master = null;
    var nodes = null;
    var started = false;
    var on = false;

    function makeReverbIR(context, seconds, decay) {
      var rate = context.sampleRate;
      var len = Math.floor(rate * seconds);
      var buf = context.createBuffer(2, len, rate);
      for (var ch = 0; ch < 2; ch++) {
        var data = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) {
          var t = i / len;
          // soft-attack, exponential decay, slightly different per channel
          var env = Math.pow(1 - t, decay);
          var n = (Math.random() * 2 - 1) * env;
          data[i] = n * (0.6 + 0.4 * Math.sin(t * Math.PI));
        }
      }
      return buf;
    }

    function makeNoiseBuffer(context, seconds) {
      var rate = context.sampleRate;
      var len = Math.floor(rate * seconds);
      var buf = context.createBuffer(1, len, rate);
      var d = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;   // brownish, softer
        d[i] = last * 3.2;
      }
      return buf;
    }

    function buildGraph() {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // a gentle shelf so it never gets harsh
      var tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 4200;
      tone.Q.value = 0.4;
      tone.connect(master);

      var reverb = ctx.createConvolver();
      reverb.buffer = makeReverbIR(ctx, 6.5, 2.6);
      var wet = ctx.createGain();
      wet.gain.value = 0.85;
      reverb.connect(wet);
      wet.connect(master);

      // ---------- dreamy pad: detuned oscillators, slow major-7th chords ----------
      var padBus = ctx.createGain();
      padBus.gain.value = 0.16;
      padBus.connect(tone);
      padBus.connect(reverb);

      var padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 1250;
      padFilter.Q.value = 0.6;
      padFilter.connect(padBus);

      // slow tremolo so the chord breathes
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      var lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.045;
      lfo.connect(lfoGain);
      lfoGain.connect(padBus.gain);
      lfo.start();

      // Chord progression (Hz) — Cmaj7, Am7, Fmaj7, G6/9 — root freqs
      var chords = [
        [130.81, 196.00, 246.94, 329.63],  // C  G  B  E
        [110.00, 164.81, 196.00, 261.63],  // A  E  G  C
        [ 87.31, 130.81, 174.61, 220.00],  // F  C  F  A
        [ 98.00, 146.83, 196.00, 246.94]   // G  D  G  B
      ];

      var voices = [];
      var voiceGains = [];
      var voiceDetune = [0, -6, 5, -3];

      // Build 4 sustained voices; we retune them per chord (glide) — cheap + endless
      for (var v = 0; v < 4; v++) {
        var g = ctx.createGain();
        g.gain.value = v === 0 ? 0.5 : 0.3;
        g.connect(padFilter);

        var o1 = ctx.createOscillator();
        o1.type = v === 0 ? 'triangle' : 'sine';
        o1.frequency.value = chords[0][v];
        o1.detune.value = voiceDetune[v];

        var o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = chords[0][v] * 2.001; // octave shimmer, slightly off
        o2.detune.value = -voiceDetune[v];

        var g2 = ctx.createGain();
        g2.gain.value = 0.18;
        o2.connect(g2);
        g2.connect(g);
        o1.connect(g);

        o1.start();
        o2.start();
        voices.push({ a: o1, b: o2, g: g });
        voiceGains.push(g);
      }

      var chordIndex = 0;
      var chordTimer = null;

      function nextChord() {
        chordIndex = (chordIndex + 1) % chords.length;
        var t = ctx.currentTime;
        var chord = chords[chordIndex];
        voices.forEach(function (pair, i) {
          pair.a.frequency.cancelScheduledValues(t);
          pair.a.frequency.setTargetAtTime(chord[i], t, 1.6);
          pair.b.frequency.cancelScheduledValues(t);
          pair.b.frequency.setTargetAtTime(chord[i] * 2.001, t, 1.6);
          // slight swell as the chord changes
          pair.g.gain.cancelScheduledValues(t);
          pair.g.gain.setTargetAtTime(chord === chord ? (i === 0 ? 0.44 : 0.27) : 0.3, t, 0.9);
        });
        padFilter.frequency.setTargetAtTime(1000 + Math.random() * 700, t, 2.0);
      }
      chordTimer = setInterval(nextChord, 9000);

      // ---------- wind: filtered noise ----------
      var windSrc = ctx.createBufferSource();
      windSrc.buffer = makeNoiseBuffer(ctx, 4);
      windSrc.loop = true;

      var windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 620;
      windFilter.Q.value = 0.9;

      var windGain = ctx.createGain();
      windGain.gain.value = 0.22;

      // slow gusts
      var gust = ctx.createOscillator();
      gust.frequency.value = 0.11;
      var gustGain = ctx.createGain();
      gustGain.gain.value = 0.08;
      gust.connect(gustGain);
      gustGain.connect(windGain.gain);
      gust.start();

      // shimmer on the filter so gusts feel like moving air
      var gustF = ctx.createOscillator();
      gustF.frequency.value = 0.055;
      var gustFGain = ctx.createGain();
      gustFGain.gain.value = 220;
      gustF.connect(gustFGain);
      gustFGain.connect(windFilter.frequency);
      gustF.start();

      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(tone);
      windGain.connect(reverb);
      windSrc.start();

      // ---------- water: filtered noise swells ----------
      var waterSrc = ctx.createBufferSource();
      waterSrc.buffer = makeNoiseBuffer(ctx, 5);
      waterSrc.loop = true;

      var waterFilter = ctx.createBiquadFilter();
      waterFilter.type = 'lowpass';
      waterFilter.frequency.value = 900;
      waterFilter.Q.value = 1.6;

      var waterGain = ctx.createGain();
      waterGain.gain.value = 0.0;

      // lapping: two slow, offset sine LFOs
      var lap1 = ctx.createOscillator();
      lap1.frequency.value = 0.23;
      var lap1G = ctx.createGain();
      lap1G.gain.value = 0.012;
      lap1.connect(lap1G);
      lap1G.connect(waterGain.gain);
      lap1.start();

      var lap2 = ctx.createOscillator();
      lap2.frequency.value = 0.37;
      var lap2G = ctx.createGain();
      lap2G.gain.value = 0.008;
      lap2.connect(lap2G);
      lap2G.connect(waterGain.gain);
      lap2.start();

      // a slow filter sweep for the "lap"
      var lapF = ctx.createOscillator();
      lapF.frequency.value = 0.19;
      var lapFG = ctx.createGain();
      lapFG.gain.value = 380;
      lapF.connect(lapFG);
      lapFG.connect(waterFilter.frequency);
      lapF.start();

      waterSrc.connect(waterFilter);
      waterFilter.connect(waterGain);
      waterGain.connect(tone);
      waterGain.connect(reverb);
      waterSrc.start();

      nodes = {
        padBus: padBus, windGain: windGain, waterGain: waterGain,
        windFilter: windFilter, padFilter: padFilter, master: master,
        chordTimer: chordTimer
      };

      return nodes;
    }

    /* --- mix follows the descent: wind at the rim, water at the floor --- */
    function updateMix(progress) {
      if (!nodes || !ctx || !on) return;
      var p = Math.max(0, Math.min(1, progress));
      var t = ctx.currentTime;
      var wind = 0.24 * (1 - p * 0.86);          // wind fades as you descend
      var water = 0.30 * Math.pow(p, 1.55);      // water swells near the house
      var pad = 0.13 + 0.05 * Math.sin(p * Math.PI); // pad opens mid-descent

      nodes.windGain.gain.setTargetAtTime(wind, t, 0.9);
      nodes.waterGain.gain.setTargetAtTime(water, t, 0.9);
      nodes.padBus.gain.setTargetAtTime(pad, t, 1.2);
      nodes.windFilter.frequency.setTargetAtTime(560 + (1 - p) * 420, t, 0.8);
    }

    function currentProgress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.max(0, Math.min(1, window.scrollY / max));
    }

    function setPressedState(state) {
      on = state;
      toggle.setAttribute('aria-pressed', state ? 'true' : 'false');
      toggle.setAttribute('aria-label', state ? 'Sound: on. Turn sound off.' : 'Sound: off. Turn sound on.');
      label.textContent = state ? 'sound on' : 'sound off';
    }

    function fadeTo(target, seconds) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(target, t + seconds);
    }

    toggle.addEventListener('click', function () {
      // First tap builds the graph (user gesture — satisfies autoplay policy)
      if (!started) {
        try {
          buildGraph();
        } catch (err) {
          label.textContent = 'no audio';
          return;
        }
        started = true;
      }

      if (ctx.state === 'suspended') ctx.resume();

      if (!on) {
        updateMix(currentProgress());
        fadeTo(0.85, 2.2);
        setPressedState(true);
      } else {
        fadeTo(0.0001, 1.1);
        setPressedState(false);
      }
    });

    // keep the mix in step with the scroll
    var mixRaf = null;
    var lastProgress = -1;
    function mixLoop() {
      var p = currentProgress();
      if (Math.abs(p - lastProgress) > 0.004) {
        lastProgress = p;
        updateMix(p);
      }
      mixRaf = requestAnimationFrame(mixLoop);
    }
    mixLoop();

    // pause audio when the tab is hidden (politeness + battery)
    document.addEventListener('visibilitychange', function () {
      if (!ctx || !started) return;
      if (document.hidden) {
        if (ctx.state === 'running') ctx.suspend();
      } else if (on && ctx.state === 'suspended') {
        ctx.resume();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Reduced-motion listener (live)                                  */
  /* ------------------------------------------------------------------ */

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () {
      if (hasGSAP) ScrollTrigger.refresh();
    });
  }

  // refresh once images are in
  window.addEventListener('load', function () {
    if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 250);
    if (typeof syncAltitude === 'function') syncAltitude();
  });

})();
