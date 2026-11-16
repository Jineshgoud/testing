/* ============================================================
   HALCYON — interactions
   - check-in (remembers your dream name)
   - 12 pickups -> 5 artifacts in the lost & found
   - neon vacancy sign, room-tone audio, kinetic cursor,
     magnetic buttons, scroll-driven scenes, checkout stamp
   ============================================================ */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  /* one request for the boardwalk: every other use copies the decoded src */
  (function reuseBoardwalk() {
    const hero = document.getElementById('heroImg');
    if (!hero) return;
    document.querySelectorAll('[data-reuse="heroImg"]').forEach(img => {
      if (!img.getAttribute('src')) img.src = hero.currentSrc || hero.src;
    });
    document.querySelectorAll('[data-parallax-src="heroImg"]').forEach(el => {
      el.style.backgroundImage = 'url(' + (hero.currentSrc || hero.src) + ')';
    });
  })();
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- storage ---------------- */
  const KEY = 'halcyon.v1';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  };
  const store = Object.assign({ name: '', taken: [], nights: 0, checkedOut: false, vacant: true, sound: false }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };

  const ARTIFACTS = ['postcard', 'key', 'photograph', 'floppy', 'sparkler'];
  const taken = new Set(store.taken.filter(id => ARTIFACTS.includes(id)));

  /* the 12 pickups. `gives` = artifact it yields (only first time). */
  const PICKUPS = {
    key:       ['brass key, still warm from another hand', 'key'],
    letter:    ['a folded letter. your handwriting, more patient than you remember'],
    ring:      ['a pool ring, deflating politely. it has been waiting since 1998'],
    postcard:  ['a postcard, unsent. the stamp is a picture of this house', 'postcard'],
    slideball: ['a plastic ball with someone else\'s teeth marks'],
    floppy:    ['a pink floppy. 1.44 MB of somebody\'s childhood', 'floppy'],
    mouse:     ['the mouse, chewed by something with very small teeth'],
    frond:     ['a fern frond that types when you are not looking'],
    swing:     ['an empty swing, still moving. you push it. it does not stop'],
    sparkler:  ['a spent sparkler, still warm on the cold side of the night', 'sparkler'],
    photograph:['a photograph of you, seven years old, on this pier', 'photograph'],
    lucky:     ['a coin that lands heads twice in a row']
  };
  const TAKEN_LINE = 'already in your pocket';

  /* ---------------- toast ---------------- */
  const toastEl = $('#toast');
  const toastTxt = $('.toast__txt', toastEl);
  let toastTimer = 0;
  function toast(text, ms = 3600) {
    toastTxt.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), window.innerWidth < 760 ? Math.min(ms, 2600) : ms);
  }

  /* ============================================================
     1. BOOT VEIL
     ============================================================ */
  const veil = $('#veil');
  const veilNum = $('#veilNum');
  document.body.classList.add('is-locked');
  let pct = 0;
  const bootTick = setInterval(() => {
    pct = Math.min(100, pct + Math.random() * 19 + 6);
    veilNum.textContent = String(Math.floor(pct)).padStart(2, '0');
    if (pct >= 100) {
      clearInterval(bootTick);
      setTimeout(reveal, 380);
    }
  }, reduce ? 60 : 150);

  function reveal() {
    veil.classList.add('is-gone');
    document.body.classList.remove('is-locked');
    heroIntro();
  }

  /* ============================================================
     2. HERO INTRO
     ============================================================ */
  function heroIntro() {
    const words = $$('.hero__title .w');
    if (!hasGSAP || reduce) {
      words.forEach(w => { w.style.opacity = 1; });
      return;
    }
    const tl = gsap.timeline();
    tl.from('.hero__eyebrow', { y: 16, opacity: 0, duration: .8, ease: 'power3.out' })
      .from(words, { yPercent: 118, opacity: 0, duration: 1.05, stagger: .055, ease: 'power4.out' }, '-=.45')
      .from('.hero__lede', { y: 18, opacity: 0, duration: .8, ease: 'power3.out' }, '-=.55')
      .from('.hero__cta .btn', { y: 16, opacity: 0, duration: .7, stagger: .09, ease: 'power3.out' }, '-=.55')
      .from('.hero__note', { opacity: 0, duration: .6 }, '-=.4')
      .from('.scrollhint', { opacity: 0, duration: .6 }, '-=.4');
    if (!reduce) {
      gsap.to('.hero__img', { scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__content', { y: -70, opacity: .25, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  /* ============================================================
     3. CHECK-IN OVERLAY
     ============================================================ */
  const overlay = $('#checkin');
  const card = $('#checkinCard');
  const nameInput = $('#guestName');
  let lastFocus = null;

  function openCheckin() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.classList.add('is-locked');
    card.classList.toggle('is-done', false);
    setTimeout(() => nameInput.focus({ preventScroll: true }), 320);
    if (store.checkedOut) {
      $('.checkin__title', overlay).textContent = 'Register again.';
      $('.checkin__body', overlay).textContent = 'You were here once. The clerk has crossed out your old name and left the line blank.';
    }
    if (store.name) nameInput.value = store.name;
  }
  function closeCheckin() {
    overlay.classList.remove('is-open');
    card.classList.remove('is-done');
    document.body.classList.remove('is-locked');
    setTimeout(() => { overlay.hidden = true; }, 460);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function register(name) {
    const clean = (name || '').trim().slice(0, 24) || 'stranger';
    store.name = clean;
    const first = !store.taken.length && !store.checkedOut;
    save();
    $('.checkin__title', overlay).textContent = 'The key is yours.';
    $('.checkin__body', overlay).textContent = 'Nobody will ask for it back. That is the whole idea of this place.';
    $('#keyName').textContent = clean;
    $('#keyMeta').textContent = first ? 'no number · no floor' : 'returning guest · same dream';
    card.classList.add('is-done');
    nameTag.textContent = 'guest: ' + clean;
    nameTag.style.opacity = '1';
    if (!reduce) {
      card.animate([{ transform: 'rotate(-1.2deg)' }, { transform: 'rotate(0deg)' }], { duration: 500, easing: 'ease-out' });
    }
    toast('signed in as ' + clean + '. the halls adjust to you.');
    pulseDock();
  }

  $('#checkinBtn').addEventListener('click', openCheckin);
  $('#checkinClose').addEventListener('click', closeCheckin);
  $('#checkinSkip').addEventListener('click', () => register('stranger'));
  $('#checkinForm').addEventListener('submit', e => { e.preventDefault(); register(nameInput.value); });
  $('#checkinGo').addEventListener('click', () => {
    closeCheckin();
    const rooms = $('#rooms');
    if (window.hasLenis) window.hasLenis.scrollTo(rooms, { offset: -10, duration: 1.6 });
    else rooms.scrollIntoView({ behavior: 'smooth' });
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCheckin(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeCheckin();
  });

  /* name tag in the clock */
  const nameTag = document.createElement('span');
  nameTag.style.cssText = 'opacity:0;transition:opacity .6s;margin-right:4px';
  $('#clockTxt').before(nameTag);
  if (store.name) { nameTag.textContent = 'guest: ' + store.name; nameTag.style.opacity = '1'; }

  /* ============================================================
     4. DOCK + COLLECTION
     ============================================================ */
  const dock = $('#dock');
  const foundNum = $('#foundNum');
  const foundBar = $('#foundBar');
  const slots = $$('#dockSlots li');
  const sceneTasks = new Map();

  function pulseDock() {
    dock.classList.remove('is-bump');
    void dock.offsetWidth;
    dock.classList.add('is-bump');
  }
  function renderDock(animateSlot) {
    const n = taken.size;
    foundNum.textContent = n;
    foundBar.style.width = (n / 5 * 100) + '%';
    slots.forEach(li => {
      const found = taken.has(li.dataset.slot);
      const was = li.classList.contains('is-found');
      li.classList.toggle('is-found', found);
      if (found && !was && hasGSAP && !reduce) {
        gsap.fromTo(li, { scale: .5, rotate: -25 }, { scale: 1, rotate: 0, duration: .6, ease: 'back.out(2.4)' });
      }
    });
    $('#lockCount').textContent = n;
    $('#archiveLock').parentElement.classList.toggle('is-unlocked', n === 5);
    syncShelf();
    syncWake(false);
  }

  /* ============================================================
     5. PICKUPS
     ============================================================ */
  const hotspotEls = $$('.hotspot');
  const gated = new Map();
  hotspotEls.forEach(el => {
    if (el.dataset.gated) {
      gated.set(el.dataset.id, el.dataset.gated);
      /* tapping a locked spot still answers — just not with a reward */
      el.addEventListener('click', () => {
        litOnly(el);
        const g = hotspotEls.find(h => h.dataset.id === el.dataset.gated);
        if (g && !g.classList.contains('is-taken')) {
          el.animate?.([
            { transform: 'translate(-50%,-50%) scale(1) rotate(0)' },
            { transform: 'translate(-50%,-50%) scale(.86) rotate(-6deg)' },
            { transform: 'translate(-50%,-50%) scale(1) rotate(0)' }
          ], { duration: 460, easing: 'ease-in-out' });
          toast('not yet. this room wants its other thing back first.');
        }
      });
    }
    const id = el.dataset.id;
    if (store.taken.includes(id)) { el.classList.add('is-taken'); el.setAttribute('aria-disabled', 'true'); }
    el.addEventListener('click', () => take(el));
  });

  /* touch devices: light the tapped marker's label briefly */
  let litTimer = 0;
  function litOnly(el) {
    hotspotEls.forEach(h => h.classList.remove('is-lit'));
    el.classList.add('is-lit');
    clearTimeout(litTimer);
    litTimer = setTimeout(() => el.classList.remove('is-lit'), 2400);
  }
  hotspotEls.forEach(h => h.addEventListener('pointerdown', () => litOnly(h)));

  function take(el) {
    const id = el.dataset.id;
    if (el.classList.contains('is-taken')) return;
    const gate = gated.get(id);
    if (gate) {
      const g = $$('.hotspot').find(h => h.dataset.id === gate);
      if (g && !g.classList.contains('is-taken')) return;
    }
    el.classList.add('is-taken');
    el.setAttribute('aria-disabled', 'true');

    /* ripple from the click point */
    if (hasGSAP && !reduce) {
      gsap.fromTo(el, { scale: 1 }, { scale: 1.35, duration: .18, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    }

    const info = PICKUPS[id] || ['something', null];
    const [line, gives] = info;
    toast(line);

    /* log line for the scene */
    const scene = el.closest('.scene');
    if (scene) {
      const log = $('[data-log]', scene);
      const li = document.createElement('li');
      li.textContent = line.split('.')[0];
      log.appendChild(li);
      updateSceneTask(scene);
    }

    if (gives && !taken.has(gives)) {
      taken.add(gives);
      store.taken = Array.from(new Set([...store.taken, gives]));
      save();
      renderDock(true);
      pulseDock();
      setTimeout(() => {
        if (taken.size === 5) {
          toast('all five found. the drawer in the lobby is open.');
          openDrawerCue();
        }
      }, 900);
    } else {
      store.taken = Array.from(new Set([...store.taken, id]));
      save();
    }
    if (id === 'swing') swingNudge(el);
    if (id === 'letter' && store.name) toast('the letter is addressed to ' + store.name + '. it is not dated.');
  }

  function updateSceneTask(scene) {
    const items = $$('.hotspot', scene);
    const done = items.filter(h => h.classList.contains('is-taken')).length;
    const task = $('[data-task]', scene);
    if (!task) return;
    if (done >= items.length) {
      task.classList.add('is-done');
      task.textContent = 'room emptied — it will refill by morning';
    } else {
      task.innerHTML = 'Find <b>' + (items.length - done) + '</b> more, quietly.';
    }
  }
  $$('.scene').forEach(updateSceneTask);

  /* gated pickups: the second thing in a room is only findable once
     you have taken the first. the marker still answers to a tap. */


  function swingNudge(el) {
    const frame = el.closest('.frame');
    if (!frame || reduce) return;
    frame.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(.5deg)' }, { transform: 'rotate(-.4deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 1100, easing: 'ease-in-out' }
    );
    const glow = $('.lamplight', frame);
    if (glow) glow.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
  }

  function openDrawerCue() {
    const arc = $('#archive');
    arc.animate?.([{ filter: 'brightness(1)' }, { filter: 'brightness(1.15)' }, { filter: 'brightness(1)' }], { duration: 900 });
  }

  /* ============================================================
     6. SHELF (lost & found)
     ============================================================ */
  const shelfItems = $$('.shelf__item');
  function syncShelf() {
    shelfItems.forEach(li => {
      const has = taken.has(li.dataset.item);
      li.classList.toggle('is-empty', !has);
      li.classList.toggle('is-locked', !has);
      const btn = $('.shelf__btn', li);
      btn.setAttribute('aria-pressed', 'false');
      if (!has) li.classList.remove('is-open');
    });
  }
  /* accessible name must match the visible label */
  shelfItems.forEach(li => {
    const btn = $('.shelf__btn', li);
    const nm = $('.shelf__name', li);
    if (nm) btn.setAttribute('aria-label', nm.textContent.trim());
  });

  shelfItems.forEach(li => {
    $('.shelf__btn', li).addEventListener('click', () => {
      const open = li.classList.contains('is-open');
      shelfItems.forEach(o => { o.classList.remove('is-open'); $('.shelf__btn', o).setAttribute('aria-pressed', 'false'); });
      if (!open) {
        li.classList.add('is-open');
        $('.shelf__btn', li).setAttribute('aria-pressed', 'true');
        if (hasGSAP && !reduce) gsap.fromTo($('.shelf__art', li), { rotate: -6, y: -3 }, { rotate: 0, y: 0, duration: .5, ease: 'back.out(2)' });
      }
    });
  });

  /* ============================================================
     7. VACANCY SIGN
     ============================================================ */
  const sign = $('.prologue__sign');
  const vacancyBtn = $('#vacancyBtn');
  const vacancyWord = $('#vacancyWord');
  function setVacant(on, silent) {
    store.vacant = on; save();
    sign.classList.toggle('is-off', !on);
    vacancyWord.textContent = on ? 'Vacant' : 'No';
    vacancyBtn.setAttribute('aria-pressed', String(on));
    vacancyBtn.innerHTML = '<span id="vacancyWord">' + (on ? 'Vacant' : 'Not vacant') + '</span> &mdash; ' +
      (on ? 'leave the light on' : 'the light is off. it is still on');
    if (!silent) toast(on ? 'the sign hums: VACANCY. the light is on for you.' : 'you switch the light off. someone switches it back on.');
  }
  setVacant(store.vacant !== false, true);
  vacancyBtn.addEventListener('click', () => setVacant(!store.vacant));

  /* ============================================================
     8. ROOM TONE (WebAudio, generated — no external audio)
     ============================================================ */
  const soundBtn = $('#soundBtn');
  let audioCtx = null, master = null, soundOn = false;

  /* per-room tone: the room you are standing in decides what you hear */
  const ROOM_TONES = {
    pool:  { low: 58, hi: 87.4, noise: 900,  q: .6, nGain: .12, chimes: [523.25, 659.25, 783.99], every: 9000 },
    slide: { low: 74, hi: 111,  noise: 1400, q: .9, nGain: .09, chimes: [659.25, 880, 987.77], every: 7500 },
    fern:  { low: 49, hi: 98,   noise: 2600, q: 2.2, nGain: .07, chimes: [392, 466.16, 587.33], every: 12000 },
    night: { low: 41.2, hi: 61.7, noise: 700, q: .5, nGain: .10, chimes: [261.63, 329.63, 415.3], every: 13000 },
    pier:  { low: 65.4, hi: 98,   noise: 1800, q: .4, nGain: .16, chimes: [587.33, 698.46, 880], every: 8000 },
    hero:  { low: 58, hi: 87.4,   noise: 900,  q: .6, nGain: .12, chimes: [523.25, 659.25, 783.99], every: 9000 }
  };
  let toneNodes = null, toneRoom = 'hero', chimeTimer = 0;

  function buildTone() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0;
    master.connect(audioCtx.destination);

    /* deep hum: two detuned sines */
    const o1 = audioCtx.createOscillator(), o2 = audioCtx.createOscillator();
    o1.type = 'sine'; o2.type = 'sine';
    const og = audioCtx.createGain(); og.gain.value = .16;
    const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    o1.connect(og); o2.connect(og); og.connect(lp); lp.connect(master);
    o1.start(); o2.start();

    /* soft air / pool noise */
    const len = 3 * audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6;
    const ng = audioCtx.createGain(); ng.gain.value = .12;
    src.connect(bp); bp.connect(ng); ng.connect(master); src.start();
    toneNodes = { o1, o2, bp, ng, lp };

    /* occasional distant chime (very quiet) */
    const chime = () => {
      if (!soundOn) return;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'triangle';
      const chord = (ROOM_TONES[toneRoom] || ROOM_TONES.hero).chimes;
      o.frequency.value = chord[Math.floor(Math.random() * chord.length)];
      g.gain.value = 0;
      o.connect(g); g.connect(master);
      const t = audioCtx.currentTime;
      g.gain.linearRampToValueAtTime(.028, t + .8);
      g.gain.exponentialRampToValueAtTime(.0001, t + 5);
      o.start(t); o.stop(t + 5.2);
      const every = (ROOM_TONES[toneRoom] || ROOM_TONES.hero).every;
      chimeTimer = setTimeout(chime, every * .7 + Math.random() * every * .6);
    };
    chimeTimer = setTimeout(chime, 3000);

    /* set the starting room profile */
    applyTone('hero');
  }

  /* glide the tone to the room the guest is standing in */
  function applyTone(room) {
    if (!toneNodes || !audioCtx) return;
    toneRoom = room;
    const p = ROOM_TONES[room] || ROOM_TONES.hero;
    const t = audioCtx.currentTime;
    toneNodes.o1.frequency.cancelScheduledValues(t);
    toneNodes.o1.frequency.linearRampToValueAtTime(p.low, t + 1.6);
    toneNodes.o2.frequency.cancelScheduledValues(t);
    toneNodes.o2.frequency.linearRampToValueAtTime(p.hi, t + 1.6);
    toneNodes.bp.frequency.cancelScheduledValues(t);
    toneNodes.bp.frequency.linearRampToValueAtTime(p.noise, t + 1.6);
    toneNodes.bp.Q.cancelScheduledValues(t);
    toneNodes.bp.Q.linearRampToValueAtTime(p.q, t + 1.6);
    toneNodes.ng.gain.cancelScheduledValues(t);
    toneNodes.ng.gain.linearRampToValueAtTime(p.nGain, t + 1.6);
  }

  function toggleSound() {
    if (!audioCtx) buildTone();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    soundOn = !soundOn;
    master.gain.cancelScheduledValues(audioCtx.currentTime);
    master.gain.linearRampToValueAtTime(soundOn ? .5 : 0, audioCtx.currentTime + (soundOn ? 1.4 : .6));
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    $('.sound__txt', soundBtn).textContent = soundOn ? 'room tone: on' : 'room tone: off';
    store.sound = soundOn; save();
    if (soundOn) toast('the hum of a pool filter, two rooms away.');
  }
  soundBtn.addEventListener('click', toggleSound);

  /* which room am I standing in? -> which room do I hear? */
  if ('IntersectionObserver' in window) {
    const roomSeen = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const key = e.target.dataset.scene || 'hero';
        if (key !== toneRoom) applyTone(key);
      });
    }, { threshold: .55 });
    document.querySelectorAll('.scene, .hero').forEach(el => roomSeen.observe(el));
  }
  if (store.sound) {
    /* returning guest: arm the tone on the first gesture (autoplay policy) */
    const arm = () => {
      window.removeEventListener('pointerdown', arm);
      if (!soundOn) toggleSound();
      toast('the room tone was already on. it never turned off.', 3200);
    };
    window.addEventListener('pointerdown', arm, { once: true });
  }

  function blip(freq = 660, dur = .12) {
    if (!audioCtx || !soundOn) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = .0001;
    o.connect(g); g.connect(master);
    const t = audioCtx.currentTime;
    g.gain.linearRampToValueAtTime(.09, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.start(t); o.stop(t + dur + .02);
  }

  /* ============================================================
     9. CURSOR + MAGNETIC
     ============================================================ */
  const cursor = $('#cursor');
  const curDot = $('.cursor__dot', cursor);
  const curRing = $('.cursor__ring', cursor);
  const curLabel = $('.cursor__label', cursor);
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;

  if (!isTouch) {
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      curDot.style.left = mx + 'px'; curDot.style.top = my + 'px';
      curLabel.style.left = mx + 'px'; curLabel.style.top = my + 'px';
    }, { passive: true });

    (function ringLoop() {
      rx += (mx - rx) * .16; ry += (my - ry) * .16;
      curRing.style.left = rx + 'px'; curRing.style.top = ry + 'px';
      requestAnimationFrame(ringLoop);
    })();

    document.addEventListener('mouseover', e => {
      const hot = e.target.closest('.hotspot');
      const clicky = e.target.closest('button, a, input, .shelf__btn');
      document.body.classList.toggle('cursor--hot', !!hot);
      document.body.classList.toggle('cursor--text', !!e.target.closest('p, h1, h2, h3'));
      curLabel.textContent = hot ? ($('.hotspot__tag', hot)?.textContent || 'take') : '';
      if (hot) document.body.classList.add('cursor--hot');
      else if (!clicky) document.body.classList.remove('cursor--hot');
    });
  }

  $$('.magnetic').forEach(el => {
    if (isTouch || reduce) return;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${dx * 12}px,${dy * 9}px)`;
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 500);
    });
  });

  /* ============================================================
     10. HOTSPOT / FRAME COORDINATES (crop aware)
     ============================================================ */
  function placeHotspots() {
    $$('.frame').forEach(frame => {
      const img = $('.frame__img', frame);
      if (!img) return;
      const fw = frame.clientWidth, fh = frame.clientHeight;
      const iw = 2048, ih = 1152;
      const s = Math.max(fw / iw, fh / ih);
      const dw = iw * s, dh = ih * s;
      const ox = (dw - fw) / 2, oy = (dh - fh) / 2;
      $$('.hotspot', frame).forEach(h => {
        const x = parseFloat(h.dataset.x), y = parseFloat(h.dataset.y);
        let px = (x * dw - ox) / fw;
        let py = (y * dh - oy) / fh;
        px = Math.min(Math.max(px, .085), .915);
        py = Math.min(Math.max(py, .10), .93);
        h.style.setProperty('--x', (px * 100).toFixed(2) + '%');
        h.style.setProperty('--y', (py * 100).toFixed(2) + '%');
        /* keep the label pill inside the frame on narrow crops */
        h.classList.toggle('pill-left', px > .72);
        h.classList.toggle('pill-right', px < .28);
      });
    });
  }
  placeHotspots();
  window.addEventListener('resize', () => { clearTimeout(window.__ph); window.__ph = setTimeout(placeHotspots, 120); });
  window.addEventListener('load', placeHotspots);

  /* ============================================================
     11. MARQUEE
     ============================================================ */
  const row = $('#marqueeRow');
  if (row) {
    const clone = row.cloneNode(true);
    row.parentElement.appendChild(clone);
    /* duplicate once more so it never gaps on ultrawide */
    const clone2 = row.cloneNode(true);
    row.parentElement.appendChild(clone2);
    if (!reduce) {
      let off = 0, v = .55, vel = 0;
      const loop = () => {
        const w = row.getBoundingClientRect().width;
        off -= v + vel;
        if (-off >= w) off += w;
        row.parentElement.children[1].style.transform = `translateX(${off}px)`;
        row.parentElement.children[2].style.transform = `translateX(${off + w}px)`;
        vel *= .93;
        requestAnimationFrame(loop);
      };
      loop();
      window.addEventListener('scroll', () => { vel = Math.min(6, vel + 1.6); }, { passive: true });
    }
  }

  /* ============================================================
     12. SCROLL CHOREOGRAPHY
     ============================================================ */
  if (hasGSAP && !reduce && window.ScrollTrigger) {
    /* parallax images inside frames */
    $$('.frame').forEach(frame => {
      const img = $('.frame__img', frame);
      gsap.fromTo(img, { yPercent: -4, scale: 1.08 }, {
        yPercent: 4, scale: 1.08, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* scene copy + frame reveal */
    $$('.scene').forEach(scene => {
      gsap.from($('.frame', scene), {
        yPercent: 6, opacity: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: scene, start: 'top 78%' }
      });
      const txt = $$('.scene__copy > *', scene);
      gsap.from(txt, {
        y: 26, opacity: 0, duration: .9, stagger: .07, ease: 'power3.out',
        scrollTrigger: { trigger: scene, start: 'top 72%' }
      });
      gsap.from($$('.hotspot', scene), {
        scale: 0, duration: .6, stagger: .08, ease: 'back.out(2)',
        scrollTrigger: { trigger: scene, start: 'top 65%' }
      });
    });

    gsap.from('.prologue__text', {
      y: 40, opacity: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: '.prologue', start: 'top 80%' }
    });
    gsap.from('.prologue__sign', {
      y: 34, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.prologue', start: 'top 75%' }
    });
    gsap.from('.rooms__head > *', {
      y: 26, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out',
      scrollTrigger: { trigger: '.rooms__head', start: 'top 82%' }
    });
    $$('.shelf__item').forEach((it, i) => {
      gsap.from(it, {
        y: 24, opacity: 0, duration: .7, delay: i * .06, ease: 'power3.out',
        scrollTrigger: { trigger: '.shelf', start: 'top 88%' }
      });
    });
    gsap.from('.wake__line', {
      yPercent: 110, duration: 1, stagger: .1, ease: 'power4.out',
      scrollTrigger: { trigger: '.wake', start: 'top 72%' }
    });
    gsap.to('.wake__img', {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.wake', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
    ScrollTrigger.refresh();
  } else {
    /* no GSAP: make sure nothing stays hidden */
    $$('.hero__title .w, .wake__line, .scene__copy > *, .frame').forEach(el => { el.style.opacity = 1; });
  }

  /* ============================================================
     13. LENIS
     ============================================================ */
  let lenis = null;
  window.hasLenis = null;
  if (typeof window.Lenis !== 'undefined' && !reduce) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true, wheelMultiplier: .95, touchMultiplier: 1.4 });
    hasLenisScroll(lenis);
  }
  function hasLenisScroll(l) {
    if (hasGSAP) {
      l.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => l.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { l.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    window.hasLenis = l;
  }

  /* smooth anchors */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (window.hasLenis) window.hasLenis.scrollTo(t, { offset: 0, duration: 1.6 });
      else t.scrollIntoView({ behavior: 'smooth' });
    });
  });
  $('#scrollHint').addEventListener('click', () => {
    const t = $('#prologue');
    if (window.hasLenis) window.hasLenis.scrollTo(t, { duration: 1.4 });
    else t.scrollIntoView({ behavior: 'smooth' });
  });

  /* ============================================================
     14. CHECKOUT
     ============================================================ */
  const wakeBtn = $('#wakeBtn');
  const wakeStatus = $('#wakeStatus');
  const wakeHint = $('#wakeHint');
  const epilogue = $('#wakeEpilogue');
  const panel = $('#wakePanel');

  const STORY = {
    all: 'You built this motel. Then you left it running without you.',
    body: 'You came back for a question, and the question was never the pool, the pier, or the person who did not arrive. It was whether you were allowed to leave a place you made.',
    clerkDone: 'Room 9 is made up. The pool light stays on. Take the key — it was always yours.'
  };

  function syncWake(celebrate) {
    const n = taken.size;
    const guest = store.name || 'stranger';
    const clerkLine = $('#clerkLine');
    if (clerkLine) {
      clerkLine.textContent = n === 0
        ? 'The drawer is still full. Five things went missing the last time you stayed.'
        : n < 5
          ? 'You are remembering. ' + (5 - n) + ' thing' + (5 - n === 1 ? ' is' : 's are') + ' still in a room.'
          : STORY.clerkDone;
    }
    if (n < 5) {
      wakeBtn.disabled = true;
      wakeStatus.textContent = n + ' of 5 found. The halls are still warm.';
      wakeHint.textContent = n === 0
        ? 'Nothing yet. The rooms are down there, waiting to be touched.'
        : 'Some things are still outside, hiding in the ' + (5 - n) + ' room' + (5 - n === 1 ? '' : 's') + ' you have not emptied.';
      epilogue.hidden = true;
      panel.hidden = false;
    } else {
      wakeBtn.disabled = false;
      wakeStatus.textContent = '5 of 5. Everything you dropped is in your pocket.';
      wakeHint.textContent = 'You may leave now. Leaving is the hard part.';
      const big = $('#wakeBig'), small = $('#wakeSmall'), nm = $('#wakeName');
      if (big) big.textContent = STORY.all;
      if (small && nm) {
        small.innerHTML = STORY.body + ' <b id="wakeName">' + guest + '</b>, you are. The clerk keeps the key. The pool stays open. Come back when you forget — only now the light will be morning.';
      }
      if (store.checkedOut) {
        epilogue.hidden = false;
        $('#stampNights').textContent = Math.max(1, store.nights);
      }
    }
  }

  wakeBtn.addEventListener('click', () => {
    if (taken.size < 5) return;
    store.checkedOut = true;
    store.nights = Math.max(1, (store.nights || 0) + (store.__counted ? 0 : 1));
    store.__counted = true;
    save();
    $('#stampNights').textContent = store.nights;
    panel.hidden = true;
    epilogue.hidden = false;
    toast('checkout complete. the key stays in your pocket anyway.');
    /* THE AWE MOMENT — dawn breaks over the motel */
    document.documentElement.classList.add('is-dawn');
    blip(880, .5);
    if (hasGSAP && !reduce) {
      gsap.fromTo(epilogue, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' });
      gsap.fromTo('.wake__img', { filter: 'brightness(.5) saturate(.9)' }, { filter: 'brightness(.92) saturate(1.15)', duration: 4, ease: 'power2.out' });
      gsap.to('.wake__title, .wake__epilogue', { color: '#fff8f0', duration: 3.2, ease: 'power1.out' });
      gsap.to('.wake__scrim', { opacity: .55, duration: 4, ease: 'power1.out' });
    } else {
      epilogue.hidden = false;
      epilogue.style.opacity = 1;
    }
    applyTone('pier');
  });

  $('#againBtn').addEventListener('click', () => {
    const rooms = $('#rooms');
    if (window.hasLenis) window.hasLenis.scrollTo(rooms, { duration: 1.8 });
    else rooms.scrollIntoView({ behavior: 'smooth' });
    toast('the rooms have refilled behind you. mostly.');
  });

  /* keyboard: reset */
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'r' && e.shiftKey && e.altKey) {
      localStorage.removeItem(KEY);
      location.reload();
    }
  });

  /* click blip on every button for feedback */
  document.addEventListener('click', e => {
    if (e.target.closest('button, a, .shelf__btn')) blip(520 + Math.random() * 240, .1);
  }, true);

  /* ============================================================
     15. INIT STATE
     ============================================================ */
  renderDock(false);
  syncShelf();
  syncWake(false);

  /* if the visitor is a returning guest, mention it once */
  setTimeout(() => {
    if (store.name && taken.size === 0 && !store.checkedOut) {
      toast('welcome back, ' + store.name + '. your room is exactly as you left it.', 4200);
    } else if (store.checkedOut) {
      toast('you have checked out before. the door was never locked.', 4200);
    }
  }, 2600);

  /* expose a couple of things for automated checks */
  window.__halcyon = {
    taken: () => Array.from(taken),
    state: () => store,
    hotspots: hotspotEls.length
  };
})();

/* ============================================================
   HALCYON polish round: three.js stars, 3D tilt, depth parallax,
   smear entrances, scroll-velocity type skew
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduce) return;              /* reduced motion: no 3D, no tilt, no parallax */

  /* ---------- 1. three.js starfield (hero + night room) ---------- */
  const canvas = document.getElementById('starsCanvas');
  let renderer, scene, camera, points, mat, raf = 0, running = false;
  let pointerX = 0, pointerY = 0, tX = 0, tY = 0;

  function initStars() {
    if (!canvas || !window.THREE) return;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(w, h, false);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(62, w / h, .1, 120);
    camera.position.z = 18;

    const COUNT = window.innerWidth < 760 ? 420 : 850;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const palette = [[1, .82, .9], [.72, .9, 1], [1, .94, .8], [.9, .8, 1]];
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - .5) * 46;
      pos[i * 3 + 1] = (Math.random() - .5) * 24;
      pos[i * 3 + 2] = -Math.random() * 34;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    mat = new THREE.PointsMaterial({
      size: .16, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: .9, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    points = new THREE.Points(geo, mat);
    scene.add(points);
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 1.4s ease-out';

    window.addEventListener('resize', onResize, { passive: true });
    if (!coarse) {
      window.addEventListener('mousemove', e => {
        tX = (e.clientX / window.innerWidth - .5) * 2;
        tY = (e.clientY / window.innerHeight - .5) * 2;
      }, { passive: true });
    }
    setRunning(true);
    canvas.dataset.ready = '1';
  }

  function onResize() {
    if (!renderer) return;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame() {
    if (!running) return;
    pointerX += (tX - pointerX) * .045;
    pointerY += (tY - pointerY) * .045;
    camera.position.x = pointerX * 1.9;
    camera.position.y = -pointerY * 1.1;
    camera.lookAt(0, 0, -6);
    points.rotation.z += .00018;
    points.rotation.y += .00012;
    const drift = (Date.now() * .00004) % 34;
    points.position.z = (drift - 17) * .18;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (!points) return;
    if (on && !running) { running = true; canvas.style.opacity = '0.85'; raf = requestAnimationFrame(frame); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  }

  /* load three lazily, only where it is used, never blocking */
  function bootStars() {
    if (!canvas) return;
    const tag = document.createElement('script');
    tag.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    tag.async = true;
    tag.onload = initStars;
    document.head.appendChild(tag);
  }
  if ('IntersectionObserver' in window) {
    const heroSeen = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting && !canvas.dataset.ready) { bootStars(); heroSeen.disconnect(); }
      });
    }, { threshold: .05 });
    heroSeen.observe(canvas);
    /* pause when the hero is off-screen: no wasted frames */
    const pauseIO = new IntersectionObserver(es => {
      es.forEach(e => setRunning(e.isIntersecting));
    }, { threshold: 0 });
    pauseIO.observe(canvas);
  } else {
    bootStars();
  }

  /* ---------- 2. 3D tilt on room cards ---------- */
  if (!coarse) {
    document.querySelectorAll('.frame').forEach(frame => {
      if (!frame.querySelector('.frame__shine')) {
        const sh = document.createElement('div');
        sh.className = 'frame__shine';
        sh.setAttribute('aria-hidden', 'true');
        frame.appendChild(sh);
      }
      let rafId = 0, pending = null;
      frame.addEventListener('pointermove', e => {
        pending = e;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const r = frame.getBoundingClientRect();
          const px = (pending.clientX - r.left) / r.width;
          const py = (pending.clientY - r.top) / r.height;
          const ry = (px - .5) * 11;   /* max ~5.5deg each way */
          const rx = -(py - .5) * 11;
          frame.classList.add('is-tilting');
          frame.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
          frame.style.boxShadow = `${(-ry * 2.2).toFixed(1)}px ${(8 + rx * 2).toFixed(1)}px 60px -28px rgba(0,0,0,.75)`;
          frame.style.setProperty('--sx', (px * 100).toFixed(0) + '%');
          frame.style.setProperty('--sy', (py * 100).toFixed(0) + '%');
        });
      }, { passive: true });
      frame.addEventListener('pointerleave', () => {
        frame.classList.remove('is-tilting');
        frame.style.transform = '';
        frame.style.boxShadow = '';
      });
    });
  }

  /* ---------- 3. hero depth parallax (3 layers) ---------- */
  const deps = [
    { el: document.querySelector('.dep--sky'), speed: .16 },
    { el: document.querySelector('.dep--motel'), speed: .44 },
    { el: document.querySelector('.dep--dune'), speed: .72 }
  ].filter(d => d.el);
  const hero = document.querySelector('.hero');
  if (deps.length && hero) {
    let ticking = false;
    const move = () => {
      ticking = false;
      const y = window.scrollY || 0;
      if (y > window.innerHeight * 1.2) return;
      deps.forEach(d => { d.el.style.transform = `translate3d(0,${(-y * d.speed).toFixed(1)}px,0)`; });
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(move); }
    }, { passive: true });
    move();
  }

  /* ---------- 4. smear entrances ---------- */
  if ('IntersectionObserver' in window) {
    const smearIO = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('smear-in');
        smearIO.unobserve(e.target);
      });
    }, { threshold: .15 });
    document.querySelectorAll('.scene__copy, .frame').forEach(el => smearIO.observe(el));
  }

  /* ---------- 5. feedback: squash, pop, tick ---------- */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .shelf__btn, .sign__toggle, .sound, .hotspot');
    if (!b) return;
    b.classList.remove('is-squash');
    void b.offsetWidth;
    b.classList.add('is-squash');
    setTimeout(() => b.classList.remove('is-squash'), 260);
  }, true);

  /* ---------- 6. scroll-velocity reactions (title skew + grain) ---------- */
  const title = document.querySelector('.hero__title');
  const film = document.querySelector('.film');
  let lastY = window.scrollY, vel = 0, vRaf = 0;
  function velLoop() {
    const y = window.scrollY;
    vel += ((y - lastY) - vel) * .2;
    lastY = y;
    const skew = Math.max(-4.5, Math.min(4.5, vel * .18));
    if (title) title.style.transform = `skewY(${skew.toFixed(2)}deg)`;
    if (film) film.style.opacity = String(Math.min(.42, .18 + Math.abs(vel) * .012));
    vRaf = requestAnimationFrame(velLoop);
  }
  vRaf = requestAnimationFrame(velLoop);
  /* stop the loop when the tab is hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(vRaf);
    else vRaf = requestAnimationFrame(velLoop);
  });

  window.__halcyon = { ...window.__halcyon, stars: () => !!points };
})();
