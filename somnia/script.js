/* SOMNIA — interactions. No libraries, no assets. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Day / dusk / night ---------- */
  var root = document.documentElement;
  var timeBtns = document.querySelectorAll("[data-set-time]");
  timeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      root.setAttribute("data-time", btn.getAttribute("data-set-time"));
      timeBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  });

  /* ---------- 2. Click the sky, spawn a cloud ---------- */
  var sky = document.getElementById("sky");
  sky.addEventListener("click", function (e) {
    if (e.target.closest("a, button, nav")) return;
    var c = document.createElement("div");
    c.className = "cloud spawned";
    var w = 90 + Math.random() * 130;
    c.style.width = w + "px";
    c.style.height = Math.round(w * 0.3) + "px";
    c.style.top = Math.max(4, (e.clientY / window.innerHeight) * 100 - 4) + "%";
    c.style.left = Math.max(2, (e.clientX / window.innerWidth) * 100 - 8) + "%";
    c.style.animationDuration = (70 + Math.random() * 50) + "s, 14s";
    sky.appendChild(c);
    setTimeout(function () { c.remove(); }, 15000);
  });

  /* ---------- 3. Pool ripples ---------- */
  var pool = document.getElementById("pool");
  function ripple(x, y) {
    var r = document.createElement("span");
    r.className = "ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    pool.appendChild(r);
    setTimeout(function () { r.remove(); }, 1700);
  }
  pool.addEventListener("click", function (e) {
    var rect = pool.getBoundingClientRect();
    ripple(e.clientX - rect.left, e.clientY - rect.top);
  });
  pool.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      var rect = pool.getBoundingClientRect();
      ripple(rect.width * (0.3 + Math.random() * 0.4), rect.height * (0.3 + Math.random() * 0.4));
    }
  });

  /* ---------- 4. The dream machine ---------- */
  var dreams = [
    "You are seven years old and the pool goes on forever. Your mother calls you in for dinner. You stay.",
    "The boardwalk ends in a staircase that goes up into the clouds. The handrail is warm from the sun.",
    "A pink CRT hums in the garden. On its screen: a beach you visited in a dream you had before you were born.",
    "The waterslide is empty. The splash at the bottom happens anyway, every afternoon at four.",
    "You find a lounger that is still warm. Nobody has been here for years. You lie down anyway.",
    "The sun is too big and too pink and too low, and it has been like that for eleven summers.",
    "Every window in the street glows pink and green. Every room is empty. The swing set moves a little.",
    "You walk until the boardwalk becomes a road above a sea of clouds. You do not look down. You do not need to.",
    "A lone figure walks ahead of you, always the same distance away. It is you, from a summer that never happened.",
    "The ferns grew through the keyboards first. Then through the screens. The computers do not mind.",
    "It is always golden hour here. The clocks stopped at 6:47. Nobody has fixed them. Nobody wants to.",
    "You dive into the pink pool and come up in a different summer. The water is still warm."
  ];
  var line = document.getElementById("dream-line");
  var btn = document.getElementById("dream-btn");
  var count = document.getElementById("dream-count");
  var n = 0, last = -1;
  btn.addEventListener("click", function () {
    var i;
    do { i = Math.floor(Math.random() * dreams.length); } while (i === last && dreams.length > 1);
    last = i; n++;
    line.classList.add("fading");
    setTimeout(function () {
      line.textContent = dreams[i];
      line.classList.remove("fading");
      count.textContent = String(n).padStart(3, "0");
    }, 320);
  });

  /* ---------- 5. Fireflies ---------- */
  if (!reduced) {
    var box = document.getElementById("fireflies");
    for (var f = 0; f < 26; f++) {
      var dot = document.createElement("span");
      dot.className = "firefly";
      dot.style.left = Math.random() * 100 + "%";
      dot.style.top = 30 + Math.random() * 70 + "%";
      dot.style.animationDuration = (9 + Math.random() * 12) + "s";
      dot.style.animationDelay = (-Math.random() * 14) + "s";
      box.appendChild(dot);
    }
  }

  /* ---------- 6. Scroll reveals + walker parallax ---------- */
  var revealEls = document.querySelectorAll(".walk-copy, .slide-copy, .slide-art, .garden-copy, .crt-row, .machine, .night-copy");
  revealEls.forEach(function (el) { el.classList.add("reveal"); });
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.18 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  var walker = document.getElementById("walker");
  var ticking = false;
  function onScroll() {
    if (ticking || reduced) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      var max = document.body.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;
      walker.style.left = (8 + p * 84) + "%";
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
