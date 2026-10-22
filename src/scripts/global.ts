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
  // Move keyboard focus with the scroll (e.g. "Skip to content" → #main).
  const el = target as HTMLElement;
  if (el.hasAttribute('tabindex') || el.matches('a[href], button, input, select, textarea, summary')) el.focus({ preventScroll: true });
  if (el.id === 'main') {
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  } else if (window.lenis) window.lenis.scrollTo(el, { duration: 1.4 }); // Lenis honours html scroll-padding-top
  else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
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
// Pages with an always-dark hero keep the header in dark mode while it sits over the hero.
const darkHero = document.body.hasAttribute('data-dark-hero') ? (document.querySelector('main')?.firstElementChild as HTMLElement | null) : null;
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 500 && y > lastY && !document.body.classList.contains('menu-open'));
    const overHero = !!darkHero && y < darkHero.offsetHeight - header.offsetHeight && !document.body.classList.contains('menu-open');
    if (overHero) header.dataset.theme = 'dark';
    else header.removeAttribute('data-theme');
    // Browser UI color follows what sits under the status bar (dark hero vs page canvas).
    const tc = overHero || document.documentElement.dataset.theme === 'dark' ? '#0a0a0c' : '#f4efe7';
    if (themeMeta && themeMeta.content !== tc) themeMeta.content = tc;
  }
  document.body.classList.toggle('past-hero', y > window.innerHeight * 0.7);
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Theme toggle (Ivory / Onyx) ---------- */
const root = document.documentElement;
function applyTheme(next: 'light' | 'dark') {
  root.dataset.theme = next;
  try { localStorage.setItem('sdd-theme', next); } catch {}
  themeMeta?.setAttribute('content', next === 'dark' ? '#0a0a0c' : '#f4efe7');
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    // Labeled switches (role="switch") report state; icon buttons describe the action.
    if (b.getAttribute('role') === 'switch') b.setAttribute('aria-checked', String(next === 'dark'));
    else b.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
  document.dispatchEvent(new CustomEvent('sdd:theme', { detail: next }));
}
applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
onScroll(); // re-sync theme-color for pages that open on a dark hero
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition;
    if (!vt || reduceMotion) { applyTheme(next); onScroll(); return; }
    // Circular reveal from the toggle button.
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = vt.call(document, () => { applyTheme(next); onScroll(); });
    t.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
  });
});
// Keep every page on the saved theme: a page restored from the back/forward cache skips the inline
// head script, and other open tabs only learn about a switch through the storage event.
const savedTheme = (): 'light' | 'dark' => { try { return localStorage.getItem('sdd-theme') === 'dark' ? 'dark' : 'light'; } catch { return root.dataset.theme === 'dark' ? 'dark' : 'light'; } };
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  const t = savedTheme();
  if (t !== root.dataset.theme) applyTheme(t);
  onScroll();
});
window.addEventListener('storage', (e) => {
  if (e.key !== 'sdd-theme') return;
  const t = e.newValue === 'dark' ? 'dark' : 'light';
  if (t !== root.dataset.theme) { applyTheme(t); onScroll(); }
});

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
// Everything behind the overlay is made inert while it is open, so focus stays in header + menu.
const behindMenu = () => Array.from(document.querySelectorAll<HTMLElement>('body > main, body > footer, body > .mobile-bar'));
function openMenu() {
  if (!menu || !menuBtn) return;
  document.body.classList.add('menu-open');
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.setAttribute('aria-label', 'Close menu');
  menu.removeAttribute('inert');
  behindMenu().forEach((el) => el.setAttribute('inert', ''));
  const scroller = menu.querySelector<HTMLElement>('[data-menu-scroll]');
  if (scroller) scroller.scrollTop = 0;
  window.lenis?.stop();
  onScroll(); // drop the dark-hero header theme while the (page-themed) menu is open
  if (!reduceMotion) {
    gsap.fromTo(menu.querySelectorAll('[data-menu-item]'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.15, clearProps: 'transform' });
  }
}
function closeMenu(restoreFocus = false) {
  if (!menu || !menuBtn || !document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Open menu');
  menu.setAttribute('inert', '');
  behindMenu().forEach((el) => el.removeAttribute('inert'));
  window.lenis?.start();
  onScroll();
  if (restoreFocus) menuBtn.focus({ preventScroll: true });
}
menuBtn?.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu(true); });
// The overlay only exists below the desktop breakpoint; close it if the viewport grows past it.
window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });

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
  // GSAP owns the centering: percentages stay relative to the label's live width, so any
  // label ("Call", "Reserve") is centered on the disc whatever was hovered first.
  gsap.set(label, { xPercent: -50, yPercent: -50 });
  gsap.set(dot, { xPercent: 0, yPercent: 0 }); // the ring centers itself with negative margins
  const xTo = gsap.quickTo([dot, label], 'x', { duration: 0.45, ease: 'power3.out' });
  const yTo = gsap.quickTo([dot, label], 'y', { duration: 0.45, ease: 'power3.out' });
  let px = -1, py = -1;
  const setVisible = (on: boolean) => { dot.classList.toggle('is-visible', on); label.classList.toggle('is-visible', on); };
  window.addEventListener('mousemove', (e) => { px = e.clientX; py = e.clientY; setVisible(true); xTo(px); yTo(py); }, { passive: true });
  document.addEventListener('mouseleave', () => setVisible(false));
  // Match the theme of the surface under the pointer (dark islands inside an ivory page and vice versa).
  let hovered: Element | null = null;
  const syncCursorTheme = () => {
    const t = hovered?.closest('[data-theme]')?.getAttribute('data-theme') || root.dataset.theme || 'light';
    if (dot.dataset.theme !== t) { dot.dataset.theme = t; label.dataset.theme = t; }
  };
  let scrollRaf = 0;
  const onCursorScroll = () => {
    if (scrollRaf || px < 0) return;
    scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; hovered = document.elementFromPoint(px, py) || hovered; syncCursorTheme(); });
  };
  document.addEventListener('mouseover', (e) => {
    hovered = e.target as Element;
    const t = (e.target as HTMLElement).closest('a, button, [data-cursor], input, select, textarea, label') as HTMLElement | null;
    dot.classList.toggle('is-hover', !!t);
    dot.classList.toggle('has-label', !!t?.dataset.cursor);
    label.textContent = t?.dataset.cursor || '';
    syncCursorTheme();
  });
  document.addEventListener('sdd:theme', syncCursorTheme);
  window.addEventListener('scroll', onCursorScroll, { passive: true });
}

/* ---------- Preloader ---------- */
function runPreloader(): Promise<void> {
  const pre = document.querySelector<HTMLElement>('[data-preloader]');
  if (!pre) return Promise.resolve();
  let seen: string | null = null;
  try { seen = sessionStorage.getItem('sdd-pre'); sessionStorage.setItem('sdd-pre', '1'); } catch {}
  if (reduceMotion || seen) { pre.remove(); return Promise.resolve(); }
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
