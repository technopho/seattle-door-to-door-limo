// Site-wide motion & interaction layer: smooth scroll, reveals, split headlines,
// header state, mobile menu, magnetic buttons, cursor follower, counters, preloader.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

declare global {
  interface Window { lenis?: Lenis; gsap?: typeof gsap; ScrollTrigger?: typeof ScrollTrigger }
}
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;

/* ---------- Smooth scroll ---------- */
if (!reduceMotion) {
  const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// In-page anchor links go through Lenis so they glide instead of jumping.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('a[href*="#"]') as HTMLAnchorElement | null;
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  const target = document.querySelector(url.hash);
  if (!target) return;
  e.preventDefault();
  closeMenu();
  if (window.lenis) window.lenis.scrollTo(target as HTMLElement, { offset: -70, duration: 1.4 });
  else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  history.replaceState(null, '', url.hash);
});

/* ---------- Split headlines ---------- */
export function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return el.querySelectorAll<HTMLElement>('.split-word');
  const walk = (node: Node, parent: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent || '').split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const mask = document.createElement('span');
          mask.className = 'split-line';
          mask.style.display = 'inline-block';
          const w = document.createElement('span');
          w.className = 'split-word';
          w.textContent = p;
          mask.appendChild(w);
          frag.appendChild(mask);
        });
        parent.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName !== 'BR') {
        walk(child, child);
      }
    });
  };
  walk(el, el);
  el.dataset.splitDone = '1';
  return el.querySelectorAll<HTMLElement>('.split-word');
}

function initReveals() {
  if (reduceMotion) {
    document.querySelectorAll('[data-reveal],[data-stagger] > *').forEach((el) => el.classList.add('is-in'));
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (el.dataset.splitManual !== undefined) return; // component animates it itself
    const words = splitWords(el);
    gsap.set(words, { yPercent: 115, rotate: 3 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.15, ease: 'expo.out', stagger: 0.045, delay: Number(el.dataset.delay || 0) }),
    });
  });

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const type = el.dataset.reveal;
    const delay = Number(el.dataset.delay || 0);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        if (type === 'scale') {
          gsap.fromTo(el, { clipPath: 'inset(12% 6% 12% 6% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.4, ease: 'expo.out', delay, onComplete: () => el.classList.add('is-in') });
          const img = el.querySelector('img');
          if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out', delay });
        } else {
          gsap.fromTo(el, { opacity: 0, y: type === 'fade' ? 0 : 40 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay, onComplete: () => el.classList.add('is-in') });
        }
      },
    });
  });

  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    const kids = Array.from(group.children) as HTMLElement[];
    ScrollTrigger.create({
      trigger: group,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.fromTo(kids, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: Number(group.dataset.stagger) || 0.08, onComplete: () => kids.forEach((k) => k.classList.add('is-in')) }),
    });
  });

  // Parallax: data-parallax="0.15" moves the element against scroll.
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amt = Number(el.dataset.parallax) || 0.15;
    gsap.fromTo(el, { yPercent: -amt * 100 }, { yPercent: amt * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------- Counters ---------- */
function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
    if (reduceMotion) { el.textContent = fmt(end); return; }
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) }); },
    });
  });
}

/* ---------- Header ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 500 && y > lastY && !document.body.classList.contains('menu-open'));
  }
  document.body.classList.toggle('past-hero', y > window.innerHeight * 0.7);
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
function openMenu() {
  if (!menu || !menuBtn) return;
  document.body.classList.add('menu-open');
  menuBtn.setAttribute('aria-expanded', 'true');
  menu.removeAttribute('inert');
  window.lenis?.stop();
  if (!reduceMotion) {
    gsap.fromTo(menu.querySelectorAll('[data-menu-item]'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
  }
}
function closeMenu() {
  if (!menu || !menuBtn || !document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menu.setAttribute('inert', '');
  window.lenis?.start();
}
menuBtn?.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------- Magnetic buttons ---------- */
if (finePointer && !reduceMotion) {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * strength);
      yTo((e.clientY - r.top - r.height / 2) * strength);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------- Cursor follower ---------- */
if (finePointer && !reduceMotion) {
  const dot = document.createElement('div');
  dot.className = 'cursor';
  const label = document.createElement('div');
  label.className = 'cursor-label';
  document.body.append(dot, label);
  const xTo = gsap.quickTo([dot, label], 'x', { duration: 0.45, ease: 'power3.out' });
  const yTo = gsap.quickTo([dot, label], 'y', { duration: 0.45, ease: 'power3.out' });
  window.addEventListener('mousemove', (e) => { dot.classList.add('is-visible'); xTo(e.clientX); yTo(e.clientY); }, { passive: true });
  document.addEventListener('mouseleave', () => dot.classList.remove('is-visible'));
  document.addEventListener('mouseover', (e) => {
    const t = (e.target as HTMLElement).closest('a, button, [data-cursor], input, select, textarea, label') as HTMLElement | null;
    dot.classList.toggle('is-hover', !!t);
    dot.classList.toggle('has-label', !!t?.dataset.cursor);
    label.textContent = t?.dataset.cursor || '';
  });
}

/* ---------- Preloader ---------- */
function runPreloader(): Promise<void> {
  const pre = document.querySelector<HTMLElement>('[data-preloader]');
  if (!pre) return Promise.resolve();
  const seen = sessionStorage.getItem('sdd-pre');
  if (reduceMotion || seen) { pre.remove(); return Promise.resolve(); }
  sessionStorage.setItem('sdd-pre', '1');
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: () => { pre.remove(); resolve(); } });
    tl.fromTo(pre.querySelector('[data-pre-line]'), { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'expo.inOut' })
      .fromTo(pre.querySelectorAll('[data-pre-word]'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.15)
      .to(pre.querySelectorAll('[data-pre-word]'), { yPercent: -110, duration: 0.6, ease: 'expo.in', stagger: 0.04 }, '+=0.25')
      .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.2');
  });
}

/* ---------- Boot ---------- */
document.documentElement.classList.add('js');
runPreloader().then(() => {
  document.dispatchEvent(new CustomEvent('sdd:ready'));
  document.documentElement.classList.add('is-ready');
});
initReveals();
initCounters();
window.addEventListener('load', () => ScrollTrigger.refresh());

export { gsap, ScrollTrigger, reduceMotion, finePointer };
