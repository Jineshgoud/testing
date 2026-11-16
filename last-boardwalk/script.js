/* The Last Boardwalk — interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var body = document.body;
  var figure = document.getElementById("figure");
  var skyHint = document.querySelector(".sky-hint");

  /* ---------- 1. Time of day ---------- */
  var todButtons = Array.prototype.slice.call(document.querySelectorAll(".tod-btn"));

  function setTime(name) {
    body.setAttribute("data-time", name);
    todButtons.forEach(function (btn) {
      var on = btn.getAttribute("data-time") === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  todButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTime(btn.getAttribute("data-time"));
    });
  });

  /* ---------- 3. Parallax (transform only, via rAF) ---------- */
  var layers = [];
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));

  function sceneTopOf(el) {
    var scene = el.closest(".scene");
    var top = 0;
    var node = scene;
    while (node) { top += node.offsetTop; node = node.offsetParent; }
    return top;
  }

  function measureLayers() {
    layers = Array.prototype.slice.call(document.querySelectorAll("[data-speed]")).map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute("data-speed")) || 0, base: sceneTopOf(el) };
    });
  }

  /* ---------- 2. The figure: walks the boardwalk as you scroll ---------- */
  var docHeight = 1;
  var viewH = window.innerHeight;
  var viewW = window.innerWidth;

  function measureDoc() {
    docHeight = Math.max(document.documentElement.scrollHeight, 1);
    viewH = window.innerHeight;
    viewW = window.innerWidth;
  }

  function placeFigure(scrollY) {
    var max = Math.max(docHeight - viewH, 1);
    var p = Math.min(Math.max(scrollY / max, 0), 1);
    // Near end (bottom of the screen, big) to the horizon (higher, small).
    var y = viewH * (0.86 - 0.13 * p);
    var s = 1 - 0.5 * p;
    var x = viewW / 2 - 12;
    figure.style.transform =
      "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")";
    figure.style.opacity = p > 0.92 ? String(Math.max(0, 1 - (p - 0.92) / 0.08)) : "1";
  }

  /* ---------- One rAF loop for scroll work ---------- */
  var ticking = false;
  var lastY = -1;

  function frame() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (y === lastY) { return; }
    lastY = y;
    placeFigure(y);
    skyHint.style.opacity = y > 120 ? "0" : "1";
    if (!reduceMotion.matches) {
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        var offset = (y - L.base) * L.speed;
        L.el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
      }
    }
  }

  function requestFrame() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(frame);
    }
  }

  function onResize() {
    measureDoc();
    measureLayers();
    lastY = -1;
    requestFrame();
  }

  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", onResize);
  reduceMotion.addEventListener && reduceMotion.addEventListener("change", function () {
    lastY = -1;
    requestFrame();
  });

  /* ---------- 4. Click the sky: spawn a cloud (max 12) ---------- */
  var CLOUD_PATH = "M40 90a40 40 0 0 1 20-74 50 50 0 0 1 92-6 36 36 0 0 1 52 30 26 26 0 0 1 4 50z";
  var MAX_CLOUDS = 12;
  var liveClouds = [];

  function removeCloud(node) {
    var idx = liveClouds.indexOf(node);
    if (idx !== -1) { liveClouds.splice(idx, 1); }
    if (node.parentNode) { node.parentNode.removeChild(node); }
  }

  function spawnCloud(scene, x, y) {
    var layer = scene.querySelector(".sky-clouds");
    if (!layer) { return; }
    while (liveClouds.length >= MAX_CLOUDS) {
      removeCloud(liveClouds[0]);
    }
    var cloud = document.createElement("div");
    cloud.className = "sky-cloud";
    cloud.style.left = x + "px";
    cloud.style.top = y + "px";
    cloud.innerHTML =
      '<svg viewBox="0 0 220 100" aria-hidden="true"><path d="' + CLOUD_PATH + '" fill="#FFFFFF"/></svg>';
    cloud.addEventListener("animationend", function () { removeCloud(cloud); });
    layer.appendChild(cloud);
    liveClouds.push(cloud);
  }

  var IGNORE = ".chapter-copy, .crt, .tod, .sky-hint, button, a, input";

  document.addEventListener("click", function (e) {
    if (e.target.closest(IGNORE)) { return; }
    var scene = e.target.closest("[data-sky]");
    if (!scene) { return; }
    var rect = scene.getBoundingClientRect();
    spawnCloud(scene, e.clientX - rect.left, e.clientY - rect.top);
  });

  /* ---------- 5. The Dream Machine ---------- */
  var LINES = [
    "you are walking on a road above a sea of clouds. the road has no end and no beginning.",
    "the ice cream truck plays its song at 3am. nobody is surprised.",
    "your childhood bedroom is at the end of this boardwalk. the door is already open.",
    "the pool is empty because everyone is already inside the dream.",
    "a pink flamingo watches you from the roof. it has always been there.",
    "the sun sets twice here. the second time is just for you.",
    "you left your sandals by the pool in 1998. they are still warm.",
    "the vending machine sells only one thing: yesterday.",
    "every window in this town is lit pink. nobody lives here anymore.",
    "the tide comes in at midnight and brings back everything you lost.",
    "the lifeguard chair is still warm. the lifeguard is in the water, smiling.",
    "the boardwalk ends where the sky starts. walk slowly, it is still summer.",
    "the last ice cream has been melting since 2003. it tastes like the pool.",
    "the carousel turns by itself in the wind. the horses have gone pink.",
    "the swings are still swinging. the rope creaks the name of someone you miss."
  ];

  var screen = document.querySelector(".crt-screen");
  var textEl = document.getElementById("dream-text");
  var dreamBtn = document.getElementById("dream-btn");
  var lastIndex = -1;
  var typeTimer = null;
  var flickerTimer = null;

  function pickLine() {
    var i;
    do { i = Math.floor(Math.random() * LINES.length); }
    while (LINES.length > 1 && i === lastIndex);
    lastIndex = i;
    return LINES[i];
  }

  function typeLine(line) {
    var i = 0;
    textEl.textContent = "";
    clearTimeout(typeTimer);
    (function step() {
      i += 1;
      textEl.textContent = line.slice(0, i);
      if (i < line.length) {
        typeTimer = setTimeout(step, 30);
      }
    })();
  }

  function dreamAgain() {
    clearTimeout(typeTimer);
    clearTimeout(flickerTimer);
    var line = pickLine();
    screen.classList.remove("is-static");
    void screen.offsetWidth; // restart the flicker animation
    screen.classList.add("is-static");
    textEl.textContent = "";
    flickerTimer = setTimeout(function () {
      screen.classList.remove("is-static");
      typeLine(line);
    }, 150);
  }

  dreamBtn.addEventListener("click", dreamAgain);

  /* ---------- Init ---------- */
  measureDoc();
  measureLayers();
  requestFrame();
  setTimeout(function () { typeLine(pickLine()); }, 600);
})();
