/* LUCID — motion & interaction engine.
   GSAP + ScrollTrigger + Lenis via CDN when available; every feature
   degrades to plain JS so the page is fully usable without them.
   All initial hidden states are set here (never in CSS), so a CDN
   failure still leaves a readable page. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (hasGsap && hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Persistent state ---------- */
  var STORE_KEY = "lucid-state-v1";
  var state = { ripples: 0, rides: 0, dreams: [], windows: [] };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved) state = Object.assign(state, saved);
  } catch (e) { /* private mode: state just won't persist */ }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- Loader ---------- */
  var loader = document.getElementById("loader");
  function hideLoader() {
    if (!loader || loader.classList.contains("done")) return;
    loader.classList.add("done");
    heroEntrance();
  }
  window.addEventListener("load", function () { setTimeout(hideLoader, 500); });
  setTimeout(hideLoader, 2200); // never trap the user behind the loader

  /* ---------- Lenis smooth scroll (one animation loop) ---------- */
  var lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis; // exposed for screenshot harness / debugging
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  function scrollToEl(target) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  }
  document.querySelectorAll("[data-scroll-to]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      scrollToEl(a.getAttribute("data-scroll-to"));
    });
  });
  document.getElementById("dream-again").addEventListener("click", function () {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Hero entrance: smear-in title ---------- */
  var heroPlayed = false;
  function heroEntrance() {
    if (heroPlayed) return;
    heroPlayed = true;
    document.querySelectorAll(".hero-copy .reveal-line").forEach(function (el) {
      el.classList.add("in-view");
    });
    if (!hasGsap || reduceMotion) return;
    gsap.fromTo(".hero-title .char",
      { y: 90, scaleY: 1.7, filter: "blur(14px)", opacity: 0 },
      { y: 0, scaleY: 1, filter: "blur(0px)", opacity: 1,
        duration: 1.1, ease: "power4.out", stagger: 0.07, delay: 0.15 });
    gsap.fromTo(".time-toggle", { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.5 });
    gsap.fromTo(".scroll-cue", { opacity: 0 }, { opacity: 1, duration: 1, delay: 1.2 });
  }

  /* ---------- Smear reveals on scroll ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in-view"); revealObs.unobserve(en.target); }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".smear, .reveal-line").forEach(function (el) { revealObs.observe(el); });

  /* ---------- Time-of-day toggle ---------- */
  var timeBtns = Array.prototype.slice.call(document.querySelectorAll(".time-btn"));
  var thumb = document.querySelector(".toggle-thumb");
  function setTime(t) {
    document.body.setAttribute("data-time", t);
    timeBtns.forEach(function (b, i) {
      var on = b.getAttribute("data-time") === t;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on && thumb) thumb.style.transform = "translateX(" + (i * 100) + "%)";
    });
  }
  timeBtns.forEach(function (b) {
    b.addEventListener("click", function () { setTime(b.getAttribute("data-time")); });
  });

  /* ---------- Cursor glow (desktop) ---------- */
  var glow = document.getElementById("cursor-glow");
  var gx = -300, gy = -300, tx = -300, ty = -300;
  if (finePointer && glow && !reduceMotion) {
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function glowLoop() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = "translate(" + (gx - 110) + "px," + (gy - 110) + "px)";
      requestAnimationFrame(glowLoop);
    })();
  } else if (glow) { glow.style.display = "none"; }

  /* ---------- Hero parallax tilt ---------- */
  var hero = document.getElementById("hero");
  var heroImg = document.querySelector(".hero-img");
  var heroCopy = document.querySelector(".hero-copy");
  var skyCanvas = document.getElementById("sky-canvas");
  if (finePointer && hasGsap && !reduceMotion && hero) {
    var imgX = gsap.quickTo(heroImg, "x", { duration: 0.9, ease: "power3.out" });
    var imgY = gsap.quickTo(heroImg, "y", { duration: 0.9, ease: "power3.out" });
    var copyX = gsap.quickTo(heroCopy, "x", { duration: 1.1, ease: "power3.out" });
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      imgX(nx * -22); imgY(ny * -14);
      copyX(nx * 10);
      if (skyCanvas) skyCanvas.style.transform = "translate(" + (nx * 30) + "px," + (ny * 18) + "px)";
    });
  }
  // Scroll parallax on the hero image (works on touch too)
  if (hasGsap && hasST && !reduceMotion && heroImg) {
    gsap.to(heroImg, {
      yPercent: 18, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(heroCopy, {
      yPercent: -30, opacity: 0.25, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "70% top", scrub: true }
    });
  }

  /* ---------- Sky canvas: drifting clouds + dust motes ---------- */
  function initSky() {
    if (!skyCanvas || reduceMotion) return;
    var ctx = skyCanvas.getContext("2d");
    var W, H, clouds = [], motes = [];
    function resize() {
      var r = skyCanvas.parentElement.getBoundingClientRect();
      W = skyCanvas.width = r.width; H = skyCanvas.height = r.height;
    }
    resize();
    window.addEventListener("resize", resize);
    for (var i = 0; i < 6; i++) {
      clouds.push({ x: Math.random(), y: 0.06 + Math.random() * 0.4,
        s: 0.10 + Math.random() * 0.16, v: 0.00004 + Math.random() * 0.00008, o: 0.5 + Math.random() * 0.4 });
    }
    for (var j = 0; j < 34; j++) {
      motes.push({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.00012, vy: -0.00006 - Math.random() * 0.00012,
        tw: Math.random() * Math.PI * 2 });
    }
    function drawCloud(cx, cy, s) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * W * 0.5);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.55, "rgba(255,255,255,0.45)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * W * 0.5, s * W * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    (function loop(t) {
      ctx.clearRect(0, 0, W, H);
      clouds.forEach(function (c) {
        c.x += c.v; if (c.x > 1.25) c.x = -0.25;
        ctx.globalAlpha = c.o;
        drawCloud(c.x * W, c.y * H, c.s);
      });
      ctx.globalAlpha = 1;
      motes.forEach(function (m) {
        m.x += m.vx; m.y += m.vy; m.tw += 0.03;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02) m.x = 1.02; if (m.x > 1.02) m.x = -0.02;
        var a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(m.tw));
        ctx.beginPath();
        ctx.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,240,200," + a.toFixed(2) + ")";
        ctx.fill();
      });
      requestAnimationFrame(loop);
    })(0);
  }
  initSky();

  /* ---------- Ripple feedback on buttons ---------- */
  document.querySelectorAll(".cta, .dream-btn, .keep-btn, .light-all, .ride-btn, .time-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var r = btn.getBoundingClientRect();
      var s = document.createElement("span");
      s.className = "ripple";
      var size = Math.max(r.width, r.height) * 2.2;
      s.style.width = s.style.height = size + "px";
      s.style.left = (e.clientX - r.left) + "px";
      s.style.top = (e.clientY - r.top) + "px";
      btn.appendChild(s);
      setTimeout(function () { s.remove(); }, 650);
    });
  });

  /* ---------- Magnetic buttons (desktop) ---------- */
  if (finePointer && hasGsap && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.25, y: dy * 0.25, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ---------- Tilt on chapter media (desktop) ---------- */
  if (finePointer && hasGsap && !reduceMotion) {
    document.querySelectorAll(".chapter-media").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: nx * 5, rotateX: ny * -5, transformPerspective: 900, duration: 0.5, ease: "power2.out" });
      });
      card.addEventListener("pointerleave", function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" });
      });
    });
  }

  /* ---------- The Walk: pinned scroll journey ---------- */
  var walkSection = document.getElementById("walk");
  var walkFigure = document.querySelector(".walk-figure");
  var walkWords = [
    document.querySelector(".walk-word.w1"),
    document.querySelector(".walk-word.w2"),
    document.querySelector(".walk-word.w3")
  ];
  var walkBarFill = document.querySelector(".walk-bar");
  var walkPct = document.querySelector(".walk-pct");
  var walkImg = walkSection ? walkSection.querySelector(".scene-img") : null;
  var walkGrade = walkSection ? walkSection.querySelector(".grade-overlay") : null;
  var lastP = -1, lastT = 0, velocity = 0;

  function renderWalk(p) {
    p = Math.max(0, Math.min(1, p));
    // Figure walks INTO the distance: rises toward the horizon, shrinks.
    var scale = 1 - p * 0.72;
    var bottom = 14 + p * 26; // % up the frame toward the horizon
    var blur = Math.min(6, velocity * 14); // smear with scroll speed
    if (walkFigure) {
      walkFigure.style.transform = "translateX(-50%) scale(" + scale.toFixed(3) + ")";
      walkFigure.style.bottom = bottom.toFixed(1) + "%";
      walkFigure.style.filter = "blur(" + blur.toFixed(1) + "px)";
    }
    // Words crossfade across the journey.
    var spans = [[0.04, 0.34], [0.36, 0.66], [0.68, 0.96]];
    walkWords.forEach(function (w, i) {
      if (!w) return;
      var a = spans[i][0], b = spans[i][1], o = 0;
      if (p > a && p < b) {
        var mid = (a + b) / 2;
        o = p < mid ? (p - a) / 0.06 : (b - p) / 0.06;
        o = Math.max(0, Math.min(1, o));
      }
      w.style.opacity = o.toFixed(2);
      w.style.filter = "blur(" + ((1 - o) * 8).toFixed(1) + "px)";
    });
    // Sky cycles dawn -> golden -> night as you walk.
    if (walkGrade && walkImg) {
      if (p < 0.45) {
        var g = p / 0.45;
        walkGrade.style.opacity = (g * 0.42).toFixed(2);
        walkGrade.style.background = "linear-gradient(180deg, rgba(255,170,60,0.55), rgba(255,110,140,0.35) 60%, rgba(255,150,80,0.25))";
        walkGrade.style.mixBlendMode = "overlay";
        walkImg.style.filter = "sepia(" + (g * 0.22).toFixed(2) + ") saturate(" + (1 + g * 0.25).toFixed(2) + ") brightness(" + (1 + g * 0.04).toFixed(2) + ")";
      } else {
        var n = (p - 0.45) / 0.55;
        walkGrade.style.opacity = (0.42 + n * 0.2).toFixed(2);
        walkGrade.style.background = "linear-gradient(180deg, rgba(20,20,90,0.75), rgba(60,20,110,0.45) 55%, rgba(10,10,50,0.6))";
        walkGrade.style.mixBlendMode = "multiply";
        walkImg.style.filter = "brightness(" + (1.04 - n * 0.32).toFixed(2) + ") saturate(" + (1.25 + n * 0.05).toFixed(2) + ")";
      }
    }
    if (walkBarFill) walkBarFill.style.setProperty("--p", p);
    var barAfter = walkSection.querySelector(".walk-bar");
    if (barAfter) {
      // drive the ::after fill via a CSS var on the element is unreliable;
      // instead scale a child-free approach: set background-size trick
      barAfter.style.background = "linear-gradient(90deg, var(--pink) " + (p * 100).toFixed(1) + "%, rgba(255,255,255,0.3) " + (p * 100).toFixed(1) + "%)";
    }
    if (walkPct) walkPct.textContent = Math.round(p * 100) + "%";
  }

  function walkProgress() {
    if (!walkSection) return 0;
    var r = walkSection.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, -r.top / total));
  }
  function onWalkScroll() {
    var now = performance.now();
    var p = walkProgress();
    if (lastP >= 0 && now > lastT) velocity = Math.min(1, Math.abs(p - lastP) / ((now - lastT) / 1000) * 0.4);
    lastP = p; lastT = now;
    renderWalk(p);
    if (!reduceMotion) requestAnimationFrame(function () { velocity *= 0.85; });
  }
  if (walkSection) {
    if (hasGsap && hasST && !reduceMotion) {
      ScrollTrigger.create({
        trigger: walkSection, start: "top top", end: "bottom bottom",
        scrub: true, onUpdate: function (self) {
          velocity = Math.min(1, Math.abs(self.getVelocity()) / 4000);
          renderWalk(self.progress);
        }
      });
    } else {
      window.addEventListener("scroll", onWalkScroll, { passive: true });
    }
    renderWalk(0);
  }

  /* ---------- Pool ripples ---------- */
  var poolStage = document.getElementById("pool-stage");
  var rippleCanvas = document.getElementById("ripple-canvas");
  var rippleNum = document.getElementById("ripple-num");
  var ripples = [];
  function setRippleCount() {
    if (rippleNum) rippleNum.textContent = state.ripples;
    var f = document.getElementById("finale-ripples");
    if (f) f.textContent = state.ripples;
  }
  setRippleCount();
  if (poolStage && rippleCanvas) {
    var rctx = rippleCanvas.getContext("2d");
    var RW, RH;
    function rResize() {
      var r = poolStage.getBoundingClientRect();
      RW = rippleCanvas.width = r.width; RH = rippleCanvas.height = r.height;
    }
    rResize();
    window.addEventListener("resize", rResize);
    function addRipple(x, y, big) {
      ripples.push({ x: x, y: y, r: 6, max: (big ? 220 : 130) + Math.random() * 60, a: 0.85 });
      if (ripples.length > 14) ripples.shift();
    }
    poolStage.addEventListener("pointerdown", function (e) {
      var r = poolStage.getBoundingClientRect();
      addRipple(e.clientX - r.left, e.clientY - r.top, false);
      state.ripples++; setRippleCount(); persist();
    });
    // Ambient ripples while the pool is on screen
    var poolVisible = false;
    new IntersectionObserver(function (en) { poolVisible = en[0].isIntersecting; }, { threshold: 0.3 }).observe(poolStage);
    setInterval(function () {
      if (poolVisible && !reduceMotion && document.visibilityState === "visible") {
        addRipple(RW * (0.2 + Math.random() * 0.6), RH * (0.35 + Math.random() * 0.5), true);
      }
    }, 4200);
    (function rippleLoop() {
      rctx.clearRect(0, 0, RW, RH);
      ripples = ripples.filter(function (rp) { return rp.a > 0.02; });
      ripples.forEach(function (rp) {
        rp.r += 2.6; rp.a *= 0.965;
        rctx.beginPath();
        rctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, Math.PI * 2);
        rctx.strokeStyle = "rgba(255,255,255," + rp.a.toFixed(2) + ")";
        rctx.lineWidth = 2.2;
        rctx.stroke();
        rctx.beginPath();
        rctx.ellipse(rp.x, rp.y, rp.r * 0.62, rp.r * 0.26, 0, 0, Math.PI * 2);
        rctx.strokeStyle = "rgba(255,215,232," + (rp.a * 0.7).toFixed(2) + ")";
        rctx.lineWidth = 1.4;
        rctx.stroke();
      });
      requestAnimationFrame(rippleLoop);
    })();
  }

  /* ---------- Waterslide ride ---------- */
  var rideBtn = document.getElementById("ride-btn");
  var rider = document.querySelector(".slide-rider");
  var splashCanvas = document.getElementById("splash-canvas");
  var rideNum = document.getElementById("ride-num");
  function setRideCount() {
    if (rideNum) rideNum.textContent = state.rides;
    var f = document.getElementById("finale-rides");
    if (f) f.textContent = state.rides;
  }
  setRideCount();
  function splash(x, y) {
    if (!splashCanvas) return;
    var ctx = splashCanvas.getContext("2d");
    var drops = [];
    for (var i = 0; i < 42; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
      drops.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4, r: 1.5 + Math.random() * 3, a: 1 });
    }
    var rings = [{ r: 8, a: 0.9 }, { r: 4, a: 0.7 }];
    (function anim() {
      ctx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);
      var alive = false;
      drops.forEach(function (d) {
        d.vy += 0.35; d.x += d.vx; d.y += d.vy; d.a *= 0.94;
        if (d.a > 0.05) {
          alive = true;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(190,240,255," + d.a.toFixed(2) + ")";
          ctx.fill();
        }
      });
      rings.forEach(function (rg) {
        rg.r += 5; rg.a *= 0.93;
        if (rg.a > 0.05) {
          alive = true;
          ctx.beginPath();
          ctx.ellipse(x, y, rg.r, rg.r * 0.4, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255," + rg.a.toFixed(2) + ")";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      });
      if (alive) requestAnimationFrame(anim);
      else ctx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);
    })();
  }
  if (rideBtn && rider) {
    rideBtn.addEventListener("click", function () {
      if (rideBtn.disabled) return;
      rideBtn.disabled = true;
      var stage = document.getElementById("slide-stage");
      var r = stage.getBoundingClientRect();
      splashCanvas.width = r.width; splashCanvas.height = r.height;
      // Spiral path down the tower (right side of the image) to the pool.
      var W = r.width, H = r.height;
      var path = [
        { x: 0, y: 0 }, { x: -W * 0.10, y: H * 0.10 }, { x: W * 0.02, y: H * 0.22 },
        { x: -W * 0.11, y: H * 0.34 }, { x: W * 0.01, y: H * 0.46 },
        { x: -W * 0.12, y: H * 0.58 }, { x: -W * 0.22, y: H * 0.72 },
        { x: -W * 0.30, y: H * 0.80 }
      ];
      rider.style.opacity = "1";
      rider.classList.add("riding");
      if (hasGsap && !reduceMotion) {
        var tl = gsap.timeline({ onComplete: finishRide });
        path.forEach(function (pt, i) {
          if (i === 0) return;
          tl.to(rider, { x: pt.x, y: pt.y, scaleX: 1.35, scaleY: 0.8, duration: 0.26, ease: "power1.in" }, i === 1 ? 0 : ">");
        });
        tl.to(rider, { scaleX: 1, scaleY: 1, duration: 0.1 }, ">");
      } else {
        var last = path[path.length - 1];
        rider.style.transform = "translate(" + last.x + "px," + last.y + "px)";
        setTimeout(finishRide, 300);
      }
      function finishRide() {
        var endX = r.width * 0.62 + path[path.length - 1].x;
        var endY = r.height * 0.08 + path[path.length - 1].y + 30;
        splash(endX, endY);
        rider.classList.remove("riding");
        if (hasGsap) gsap.to(rider, { opacity: 0, duration: 0.4, delay: 0.15, onComplete: resetRider });
        else { rider.style.opacity = "0"; resetRider(); }
        state.rides++; setRideCount(); persist();
        rideBtn.disabled = false;
      }
      function resetRider() {
        if (hasGsap) gsap.set(rider, { x: 0, y: 0 });
        rider.style.transform = "";
      }
    });
  }

  /* ---------- Dream machine + Dream Jar ---------- */
  var DREAMS = [
    "the vending machine sells only one thing: yesterday",
    "you left your childhood in a locker at the pool. the key still works.",
    "the clouds here are solid. you can sit on the big one.",
    "someone is grilling corn on the beach. there is no beach.",
    "your grandmother is waving from the waterslide. she looks twelve.",
    "the pool is warm because the sun never actually left.",
    "every window on this street is lit, and every house is empty.",
    "the ferris wheel turns once a year. today is the day.",
    "you can hear the arcade from here. it closed in 1998.",
    "the tide comes in pink. the tide goes out pink.",
    "a payphone rings on the boardwalk. it knows your name.",
    "the ice cream truck plays your favorite song. you never had a favorite song.",
    "someone wrote your name in the wet cement. the cement is still wet.",
    "the stars here are just the streetlights, reflected.",
    "you have dreamed this dream before. it remembers you too."
  ];
  var dreamLine = document.getElementById("dream-line");
  var dreamBtn = document.getElementById("dream-btn");
  var keepBtn = document.getElementById("keep-btn");
  var jar = document.getElementById("dream-jar");
  var jarOrbs = document.querySelector(".jar-orbs");
  var jarCount = document.querySelector(".jar-count");
  var toast = document.getElementById("jar-toast");
  var currentDream = -1, typing = null, toastTimer = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }
  function renderJar() {
    if (jarCount) jarCount.textContent = state.dreams.length;
    if (jarOrbs) {
      jarOrbs.innerHTML = "";
      state.dreams.slice(-14).forEach(function () {
        var o = document.createElement("span");
        o.className = "orb";
        jarOrbs.appendChild(o);
      });
    }
    var f = document.getElementById("finale-count");
    if (f) f.textContent = state.dreams.length;
  }
  renderJar();
  function typeDream(text) {
    if (!dreamLine) return;
    clearInterval(typing);
    if (reduceMotion) { dreamLine.textContent = text; return; }
    var i = 0;
    dreamLine.textContent = "";
    typing = setInterval(function () {
      dreamLine.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typing);
    }, 26);
  }
  function newDream() {
    var n;
    do { n = Math.floor(Math.random() * DREAMS.length); } while (n === currentDream && DREAMS.length > 1);
    currentDream = n;
    typeDream(DREAMS[n]);
    keepBtn.classList.remove("kept");
    keepBtn.textContent = "keep this dream ✦";
    keepBtn.disabled = false;
  }
  if (dreamBtn) dreamBtn.addEventListener("click", newDream);
  if (keepBtn) keepBtn.addEventListener("click", function () {
    if (currentDream < 0 || keepBtn.disabled) return;
    var text = DREAMS[currentDream];
    if (state.dreams.indexOf(text) === -1) state.dreams.push(text);
    persist();
    // FLIP fly: the dream line flies into the jar.
    var from = dreamLine.getBoundingClientRect();
    var to = jar.getBoundingClientRect();
    var fly = document.createElement("div");
    fly.className = "fly-dream";
    fly.textContent = text;
    fly.style.left = from.left + "px";
    fly.style.top = from.top + "px";
    document.body.appendChild(fly);
    keepBtn.classList.add("kept");
    keepBtn.textContent = "kept ✓";
    keepBtn.disabled = true;
    var done = function () {
      fly.remove();
      renderJar();
      jar.classList.remove("pop");
      void jar.offsetWidth; // restart the pop animation
      jar.classList.add("pop");
      showToast("dream kept ✦  (" + state.dreams.length + " in your jar)");
    };
    if (hasGsap && !reduceMotion) {
      gsap.to(fly, {
        left: to.left + to.width / 2 - 40, top: to.top + to.height / 2 - 12,
        scale: 0.25, opacity: 0.6, duration: 0.85, ease: "power2.inOut", onComplete: done
      });
    } else { setTimeout(done, 150); }
  });
  if (jar) jar.addEventListener("click", function () {
    if (!state.dreams.length) { showToast("no dreams kept yet — press “keep this dream” ✦"); return; }
    var d = state.dreams[Math.floor(Math.random() * state.dreams.length)];
    showToast("from your jar: “" + d + "”");
  });
  // Auto-type one dream when the machine scrolls into view.
  var machine = document.getElementById("dream-machine");
  if (machine) {
    new IntersectionObserver(function (en, obs) {
      if (en[0].isIntersecting && currentDream < 0) { newDream(); obs.disconnect(); }
    }, { threshold: 0.4 }).observe(machine);
  }

  /* ---------- Fireflies (night street) ---------- */
  var nightStage = document.getElementById("night-stage");
  var fireflyCanvas = document.getElementById("firefly-canvas");
  if (nightStage && fireflyCanvas && !reduceMotion) {
    var fctx = fireflyCanvas.getContext("2d");
    var FW, FH, flies = [], mouse = { x: -9999, y: -9999 };
    // Pre-rendered glow sprite (fast: drawImage instead of shadowBlur).
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    var sctx = sprite.getContext("2d");
    var sg = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sg.addColorStop(0, "rgba(255,240,180,1)");
    sg.addColorStop(0.35, "rgba(255,220,130,0.7)");
    sg.addColorStop(1, "rgba(255,220,130,0)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 32, 32);
    function fResize() {
      var r = nightStage.getBoundingClientRect();
      FW = fireflyCanvas.width = r.width; FH = fireflyCanvas.height = r.height;
    }
    fResize();
    window.addEventListener("resize", fResize);
    for (var i = 0; i < 22; i++) {
      flies.push({ x: Math.random(), y: 0.3 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006,
        s: 0.5 + Math.random() * 0.9, ph: Math.random() * Math.PI * 2 });
    }
    nightStage.addEventListener("pointermove", function (e) {
      var r = nightStage.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top) / r.height;
    }, { passive: true });
    nightStage.addEventListener("pointerleave", function () { mouse.x = -9999; mouse.y = -9999; });
    var nightVisible = false;
    new IntersectionObserver(function (en) { nightVisible = en[0].isIntersecting; }, { threshold: 0.15 }).observe(nightStage);
    (function flyLoop(t) {
      requestAnimationFrame(flyLoop);
      if (!nightVisible || document.visibilityState !== "visible") return;
      fctx.clearRect(0, 0, FW, FH);
      flies.forEach(function (f) {
        f.vx += (Math.random() - 0.5) * 0.00006;
        f.vy += (Math.random() - 0.5) * 0.00006;
        // Gentle attraction to the pointer/finger.
        var dx = mouse.x - f.x, dy = mouse.y - f.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 0.04 && d2 > 0.0001) { f.vx += dx * 0.00002; f.vy += dy * 0.00002; }
        f.vx = Math.max(-0.0012, Math.min(0.0012, f.vx));
        f.vy = Math.max(-0.0012, Math.min(0.0012, f.vy));
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0.02 || f.x > 0.98) f.vx *= -1;
        if (f.y < 0.1 || f.y > 0.95) f.vy *= -1;
        var glow = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t / 500 + f.ph));
        var size = 26 * f.s * (0.7 + 0.3 * glow);
        fctx.globalAlpha = glow;
        fctx.drawImage(sprite, f.x * FW - size / 2, f.y * FH - size / 2, size, size);
      });
      fctx.globalAlpha = 1;
    })(0);
  }

  /* ---------- Window hotspots (image-coordinate positioning) ---------- */
  var hotspots = Array.prototype.slice.call(document.querySelectorAll(".window-hotspot"));
  var windowNum = document.getElementById("window-num");
  function setWindowCount() {
    if (windowNum) windowNum.textContent = state.windows.length;
    var f = document.getElementById("finale-windows");
    if (f) f.textContent = state.windows.length;
  }
  function positionHotspots() {
    if (!nightStage || !hotspots.length) return;
    var img = nightStage.querySelector(".scene-img");
    if (!img || !img.naturalWidth) return;
    var r = nightStage.getBoundingClientRect();
    var scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
    var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    // object-position is center on all viewports (windows sit mid-frame).
    var ox = (r.width - dw) * 0.5, oy = (r.height - dh) * 0.5;
    hotspots.forEach(function (h) {
      var ix = parseFloat(h.getAttribute("data-ix"));
      var iy = parseFloat(h.getAttribute("data-iy"));
      h.style.left = (ox + ix * dw) + "px";
      h.style.top = (oy + iy * dh) + "px";
    });
  }
  if (nightStage) {
    var nImg = nightStage.querySelector(".scene-img");
    if (nImg.complete) positionHotspots();
    else nImg.addEventListener("load", positionHotspots);
    window.addEventListener("resize", positionHotspots);
    hotspots.forEach(function (h) {
      var id = h.getAttribute("data-window");
      if (state.windows.indexOf(id) !== -1) h.classList.add("lit");
      h.addEventListener("click", function () {
        var lit = h.classList.toggle("lit");
        if (lit && state.windows.indexOf(id) === -1) state.windows.push(id);
        if (!lit) state.windows = state.windows.filter(function (w) { return w !== id; });
        setWindowCount(); persist();
      });
    });
    setWindowCount();
    var lightAll = document.getElementById("light-all");
    if (lightAll) lightAll.addEventListener("click", function () {
      hotspots.forEach(function (h, i) {
        setTimeout(function () {
          h.classList.add("lit");
          var id = h.getAttribute("data-window");
          if (state.windows.indexOf(id) === -1) state.windows.push(id);
          setWindowCount(); persist();
        }, i * 160);
      });
    });
  }

  /* ---------- Finale counts (live) ---------- */
  var finale = document.getElementById("finale");
  if (finale) {
    new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      renderJar(); setRippleCount(); setRideCount(); setWindowCount();
    }, { threshold: 0.2 }).observe(finale);
  }

  /* ---------- Rider start position fix (tower is on the right) ---------- */
  if (rider) { rider.style.left = "62%"; }
})();
