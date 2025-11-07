

/**
 * main.js — Site interactions
 * Features:
 *  1) Parallax hero movement
 *  2) Scroll-driven background cross-fade (supports either .chapters or .global-bg setup)
 *  3) Reveal-on-scroll animations
 * 
 * All modules are defensive: if the expected HTML is missing, they quietly do nothing.
 */

(function(){
  'use strict';

  /* ----------------------------- Utilities ----------------------------- */
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Update footer year if present
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
      // progress in [0,1] for first ~600px or 60% of viewport height
      const denom = Math.min(600, h * 0.6);
      const t = clamp(y / denom, 0, 1);

      if (img) {
        const ty = lerp(0, 40, t);      // move image downward slightly
        const sc = lerp(1, 1.06, t);    // subtle scale
        img.style.transform = `translateY(${ty}px) scale(${sc})`;
        img.style.willChange = 'transform';
      }
      if (copy) {
        const ty2 = lerp(0, -22, t);    // copy drifts up slightly
        const op  = lerp(1, 0.92, t);   // tiny fade
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
      if (!layerA || !layerB) return;

      let useA = true;

      // Build a per-marker config: read data attributes if present
      // data-bg="path/to/image.jpeg"  data-tint="rgba(…)"
      const getCfgFor = (marker) => {
        const idx = marker.getAttribute('data-idx') || '0';
        const url = marker.getAttribute('data-bg') || null;
        const tint = marker.getAttribute('data-tint') || null;
        return { idx, url, tint };
      };

      // Initialize an IO that flips layers when markers appear
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (!e.isIntersecting) return;
          const cfg = getCfgFor(e.target);
          if (!cfg.url) return; // ignore markers without a bg specified

          const active   = useA ? layerA : layerB;
          const inactive = useA ? layerB : layerA;

          // If already showing this URL, skip
          if ((active.style.backgroundImage || '').includes(cfg.url)) {
            // still update tint if provided
            if (overlay && cfg.tint) overlay.style.setProperty('--bg-tint', cfg.tint);
            return;
          }

          // Prepare inactive with next image & cross-fade
          inactive.style.backgroundImage = `url('${cfg.url}')`;
          inactive.classList.add('is-active');
          active.classList.remove('is-active');
          useA = !useA;

          // Overlay tint
          if (overlay && cfg.tint) overlay.style.setProperty('--bg-tint', cfg.tint);
        });
      }, { threshold: 0.01, rootMargin: '-30% 0px -65% 0px' });

      globalMarkers.forEach(m => io.observe(m));
      return; // prefer global if present
    }

    // Variant B: Chapters block with internal backgrounds (older approach)
    const chapters = $('.chapters');
    if (!chapters) return;

    const bgA = $('.chapters-bgA', chapters);
    const bgB = $('.chapters-bgB', chapters);
    const markers = $$('.chapter', chapters);
    if (!bgA || !bgB || !markers.length) return;

    let useA = true;

    // Mapping via data attributes on markers:
    // <div class="chapter" data-idx="1" data-bg=".../black.jpeg"></div>
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

        chapters.dataset.active = idx; // drive tint/content via CSS if used
      });
    }, { threshold: 0.01, rootMargin: '-20% 0px -60% 0px' });

    markers.forEach(m => io2.observe(m));
  })();

})();