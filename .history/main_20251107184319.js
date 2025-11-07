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
      ['2', '.section .feature-grid, .section:nth-of-type(1) .feature-grid', 'background-photos/white.jpeg', 'rgba(139,92,246,.10)'],
      ['3', '#about.section',    'background-photos/black.jpeg',     'rgba(16,185,129,.10)'],
      ['4', '#projects.section', 'background-photos/white.jpeg',     'rgba(234,179,8,.10)'],
      ['5', '#blog.section',     'background-photos/black.jpeg',     'rgba(99,102,241,.10)'],
    ];

    mapping.forEach(([idx, sel, bg, tint]) => {
      let target = null;
      if (sel.includes('.feature-grid')) {
        // For features, place marker in the parent section that contains .feature-grid
        const grid = $('.feature-grid');
        target = grid ? grid.closest('.section') : null;
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

    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const h = Math.max(1, window.innerHeight);
      const denom = Math.min(600, h * 0.6);
      const t = clamp(y / denom, 0, 1);

      if (img) {
        const ty = lerp(0, 40, t);
        const sc = lerp(1, 1.06, t);
        img.style.transform = `translateY(${ty}px) scale(${sc})`;
        img.style.willChange = 'transform';
      }
      if (copy) {
        const ty2 = lerp(0, -22, t);
        const op  = lerp(1, 0.92, t);
        copy.style.transform = `translateY(${ty2}px)`;
        copy.style.opacity = String(op);
        copy.style.willChange = 'transform,opacity';
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  })();

  /* --------- 3) Scroll-driven background cross-fade controller ---------- */
  (function scrollDrivenBackground(){
    if (prefersReduced) return;

    // Variant A: Global background cross-fade (applies across many sections)
    const globalRoot = $('.global-bg');
    const globalMarkers = $$('.bg-chapter');
    if (globalRoot && globalMarkers.length) {
      const layerA = $('.g-bgA', globalRoot);
      const layerB = $('.g-bgB', globalRoot);
      const overlay = $('.g-overlay', globalRoot);
      if (layerA && layerB) {
        let useA = true;

        const io = new IntersectionObserver((entries)=>{
          entries.forEach(e=>{
            if (!e.isIntersecting) return;
            const idx = e.target.getAttribute('data-idx') || '0';
            const url = e.target.getAttribute('data-bg');
            const tint = e.target.getAttribute('data-tint') || null;
            if (!url) return;

            const active   = useA ? layerA : layerB;
            const inactive = useA ? layerB : layerA;

            if ((active.style.backgroundImage || '').includes(url)) {
              if (overlay && tint) overlay.style.setProperty('--bg-tint', tint);
              return;
            }

            inactive.style.backgroundImage = `url('${url}')`;
            inactive.classList.add('is-active');
            active.classList.remove('is-active');
            useA = !useA;

            if (overlay && tint) overlay.style.setProperty('--bg-tint', tint);
          });
        }, { threshold: 0.01, rootMargin: '-30% 0px -65% 0px' });

        globalMarkers.forEach(m => io.observe(m));
      }
    }

    // Variant B: Chapters block with internal backgrounds (if present)
    const chapters = $('.chapters');
    if (chapters) {
      const bgA = $('.chapters-bgA', chapters);
      const bgB = $('.chapters-bgB', chapters);
      const markers = $$('.chapter', chapters);
      if (bgA && bgB && markers.length) {
        let useA = true;
        const io2 = new IntersectionObserver((entries)=>{
          entries.forEach(e=>{
            if (!e.isIntersecting) return;
            const idx = e.target.getAttribute('data-idx') || '';
            const nextURL = e.target.getAttribute('data-bg');
            if (!nextURL) return;

            const active   = useA ? bgA : bgB;
            const inactive = useA ? bgB : bgA;

            if ((active.style.backgroundImage || '').includes(nextURL)) return;

            inactive.style.backgroundImage = `url('${nextURL}')`;
            inactive.classList.add('is-active');
            active.classList.remove('is-active');
            useA = !useA;

            chapters.dataset.active = idx;
          });
        }, { threshold: 0.01, rootMargin: '-20% 0px -60% 0px' });

        markers.forEach(m => io2.observe(m));
      }
    }
  })();

})();