/**
 * main.js — Site interactions
 * Features:
 *  0) DOM bootstrapping: ensure global background + markers exist (non-destructive)
 *  1) Reveal-on-scroll animations
 *  2) Parallax hero movement
 *  3) Scroll-driven background cross-fade
 *     - Variant A: Global (.global-bg + .bg-chapter markers)
 *     - Variant B: Chapters  (.chapters + .chapter markers)
 *
 * All modules are defensive: if expected HTML is missing, they quietly do nothing.
 */

(function(){
  'use strict';

  /* ----------------------------- Utilities ----------------------------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Small helper to create elements
  function el(tag, cls){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function insertMarkerAtTop(parent, marker){
    if (!parent) return;
    if (parent.firstElementChild) parent.insertBefore(marker, parent.firstElementChild);
    else parent.appendChild(marker);
  }

  /* ---------------------- 0) DOM Bootstrapping ------------------------- */
  (function bootstrap(){
    // 0a) Add .reveal to common cards if author didn't add them
    const candidates = [
      '.feature.card', '.about-grid.card', '.project.card',
      '.card.blog-card', '.newsletter.card', '.contact.card'
    ];
    candidates.forEach(sel => {
      $$(sel).forEach(n => { if (!n.classList.contains('reveal')) n.classList.add('reveal'); });
    });

    // 0b) Ensure a global background container exists
    if (!$('.global-bg')) {
      const root = el('div', 'global-bg');
      const a = el('div', 'g-bg g-bgA is-active');
      const b = el('div', 'g-bg g-bgB');
      const overlay = el('div', 'g-overlay');
      root.appendChild(a); root.appendChild(b); root.appendChild(overlay);

      // Place after <header> if possible, else at top of <body>
      const header = $('header.topnav');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(root, header.nextSibling);
      } else {
        document.body.insertBefore(root, document.body.firstChild);
      }
    }

    // 0c) Ensure per-section markers exist (Hero → Blog), with default BG/tint mapping
    const mapping = [
      // idx, selector,           bg,                                tint
      ['1', '.hero',             'background-photos/black.jpeg',     'rgba(59,130,246,.10)'],
      ['2', '#features',         'background-photos/white.jpeg',     'rgba(139,92,246,.10)'],
      ['3', '#about',            'background-photos/black.jpeg',     'rgba(16,185,129,.10)'],
      ['4', '#projects',         'background-photos/white.jpeg',     'rgba(234,179,8,.10)'],
      ['5', '#blog',             'background-photos/black.jpeg',     'rgba(99,102,241,.10)'],
    ];

    mapping.forEach(([idx, sel, bg, tint]) => {
      let target = null;
      if (sel === '#features') {
        target = $('#features');
      } else {
        target = $(sel);
      }
      if (!target) return;

      // skip if this section already has a marker
      const existing = $('.bg-chapter', target);
      if (existing) return;

      const m = el('div', 'bg-chapter');
      m.setAttribute('data-idx', idx);
      m.setAttribute('data-bg', bg);
      m.setAttribute('data-tint', tint);
      insertMarkerAtTop(target, m);
    });

    // 0d) Chapters: if a .chapters block exists but lacks bg layers, add them
    const chapters = $('.chapters');
    if (chapters && !$('.chapters-bgA', chapters) && !$('.chapters-bgB', chapters)) {
      const stage = $('.chapters-stage', chapters) || el('div', 'chapters-stage');
      if (!stage.parentNode) chapters.insertBefore(stage, chapters.firstChild);
      const a = el('div', 'chapters-bg chapters-bgA is-active');
      const b = el('div', 'chapters-bg chapters-bgB');
      stage.appendChild(a); stage.appendChild(b);
    }
  })();

  /* ------------------------- 1) Reveal on scroll ------------------------ */
  (function revealOnScroll(){
    const els = $$('.reveal');
    if (!els.length) return;

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(el => io.observe(el));
  })();

  /* ----------------------- 2) Parallax hero motion ---------------------- */
  (function parallaxHero(){
    if (prefersReduced) return;
    const hero = $('.hero.parallax');
    if (!hero) return;

    const img = $('.hero-media img', hero);
    const copy = $('.hero-copy', hero);

    let ticking = false;
    const apply = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset || 0;
      const h = Math.max(1, window.innerHeight);
      const denom = Math.min(520, h * 0.6);
      const t = clamp(y / denom, 0, 1);
      if (img) {
        const ty = lerp(0, 24, t);      // gentler
        const sc = lerp(1, 1.03, t);    // gentler
        img.style.transform = `translateY(${ty}px) scale(${sc})`;
        img.style.willChange = 'transform';
      }
      if (copy) {
        const ty2 = lerp(0, -14, t);    // gentler
        const op  = lerp(1, 0.94, t);
        copy.style.transform = `translateY(${ty2}px)`;
        copy.style.opacity = String(op);
        copy.style.willChange = 'transform,opacity';
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', apply);
  })();

  /* --------- 3) Scroll-driven background cross-fade controller ---------- */
  (function scrollDrivenBackground(){
    if (prefersReduced) return;

    const preload = (url) => {
      if (!url) return;
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    };
    const initFirstBG = (rootSelector, layerASelector) => {
      const firstMarker = document.querySelector('.bg-chapter');
      const layer = document.querySelector(layerASelector);
      if (firstMarker && layer) {
        const url = firstMarker.getAttribute('data-bg');
        if (url) {
          layer.style.backgroundImage = `url('${url}')`;
          preload(url);
        }
      }
    };

    /* ---------- Variant A: Global background cross-fade (section markers) ---------- */
    (function globalBG(){
      const globalRoot = $('.global-bg');
      const globalMarkers = $$('.bg-chapter');
      if (!(globalRoot && globalMarkers.length)) return;

      const layerA = $('.g-bgA', globalRoot);
      const layerB = $('.g-bgB', globalRoot);
      const overlay = $('.g-overlay', globalRoot);
      if (!(layerA && layerB)) return;

      // Initialize first background from the first marker (prevents initial flash)
      initFirstBG('.global-bg', '.global-bg .g-bgA');

      let useA = true;

      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (!e.isIntersecting) return;

          const url  = e.target.getAttribute('data-bg');
          const tint = e.target.getAttribute('data-tint') || null;
          if (!url) return;

          const active   = useA ? layerA : layerB;
          const inactive = useA ? layerB : layerA;

          // If already showing, still update tint and bail
          if ((active.style.backgroundImage || '').includes(url)) {
            if (overlay && tint) overlay.style.setProperty('--bg-tint', tint);
            return;
          }

          preload(url);
          inactive.style.backgroundImage = `url('${url}')`;
          inactive.classList.add('is-active');
          active.classList.remove('is-active');
          useA = !useA;

          if (overlay && tint) overlay.style.setProperty('--bg-tint', tint);
        });
      }, { threshold: 0.01, rootMargin: '-40% 0px -40% 0px' }); // centered trigger

      globalMarkers.forEach(m => {
        // healthy hitbox in case CSS forgot
        if (!m.style.height) m.style.height = '120px';
        io.observe(m);
      });
    })();

    /* ---------- Variant B: Pinned Chapters (sticky canvas + chapter markers) ---------- */
    (function chaptersBG(){
      const chapters = $('.chapters');
      if (!chapters) return;

      // Ensure background layers exist
      let bgA = $('.chapters-bgA', chapters);
      let bgB = $('.chapters-bgB', chapters);
      let stage = $('.chapters-stage', chapters);

      if (!stage) {
        stage = document.createElement('div');
        stage.className = 'chapters-stage';
        chapters.insertBefore(stage, chapters.firstChild);
      }
      if (!bgA) { bgA = document.createElement('div'); bgA.className = 'chapters-bg chapters-bgA is-active'; stage.appendChild(bgA); }
      if (!bgB) { bgB = document.createElement('div'); bgB.className = 'chapters-bg chapters-bgB'; stage.appendChild(bgB); }

      // Discover content panels (centered copy)
      const panels = $$('.chap-content', chapters);
      const markers = $$('.chapter', chapters);

      // If no markers, create one per panel AFTER the sticky container.
      if (!markers.length && panels.length) {
        const sticky = $('.chapters-sticky', chapters);
        const afterSticky = sticky ? sticky.nextSibling : null;

        panels.forEach((p, i) => {
          const idx = String(i + 1);
          if (!p.getAttribute('data-idx')) p.setAttribute('data-idx', idx);

          const marker = document.createElement('div');
          marker.className = 'chapter';
          marker.setAttribute('data-idx', idx);

          // Alternate defaults if author didn't set data-bg on the panel
          const fromPanel = p.getAttribute('data-bg');
          const fallback  = (i % 2 === 0) ? 'background-photos/black.jpeg' : 'background-photos/white.jpeg';
          marker.setAttribute('data-bg', fromPanel || fallback);

          // Give each marker a healthy scroll budget (controls "dwell" time)
          marker.style.height = '140vh';

          if (afterSticky) chapters.insertBefore(marker, afterSticky);
          else chapters.appendChild(marker);
        });
      }

      const liveMarkers = $$('.chapter', chapters);
      if (!liveMarkers.length) return;

      // Set initial active state so the first panel is visible
      chapters.dataset.active = chapters.dataset.active || '1';
      const setActivePanel = (idx) => {
        chapters.dataset.active = String(idx);
        // also add/remove .is-active class for robustness if CSS doesn't key off dataset
        panels.forEach(p => p.classList.toggle('is-active', p.getAttribute('data-idx') === String(idx)));
      };
      setActivePanel(chapters.dataset.active);

      // Cross-fade controller for pinned section
      let useA = true;
      const io2 = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (!e.isIntersecting) return;
          const idx = e.target.getAttribute('data-idx') || '';
          const nextURL = e.target.getAttribute('data-bg');
          if (!nextURL) return;

          const active   = useA ? bgA : bgB;
          const inactive = useA ? bgB : bgA;

          if (!(active && inactive)) return;

          // If same image, only update panel state
          if ((active.style.backgroundImage || '').includes(nextURL)) {
            setActivePanel(idx);
            return;
          }

          preload(nextURL);
          // Swap image and fade
          inactive.style.backgroundImage = `url('${nextURL}')`;
          inactive.classList.add('is-active');
          active.classList.remove('is-active');
          useA = !useA;

          setActivePanel(idx);
        });
      }, { threshold: 0.01, rootMargin: '-40% 0px -40% 0px' });

      liveMarkers.forEach(m => io2.observe(m));
    })();

    (function headerThemeAuto(){
      const header = document.querySelector('.header[data-auto-theme]');
      const hero = document.querySelector('.hero');
      if (!header || !hero) return;
      // If inline script already set up, avoid double observers
      if (header.dataset.themeObserver) return;
      header.dataset.themeObserver = '1';
      const io = new IntersectionObserver((entries)=>{
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) {
          header.classList.add('theme-light');
          header.classList.remove('theme-solid');
        } else {
          header.classList.remove('theme-light');
          header.classList.add('theme-solid');
        }
      }, { threshold: 0.01 });
      io.observe(hero);
    })();

  })();

})();