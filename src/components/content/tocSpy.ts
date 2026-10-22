// Scroll-spy for "On this page" lists: marks the link whose section the reader is in.
// Links carry data-toc-link="<heading id>".
export function initTocSpy(scope: ParentNode = document) {
  const links = Array.from(scope.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  const heads = links.map((a) => document.getElementById(a.dataset.tocLink!)).filter(Boolean) as HTMLElement[];
  if (!heads.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.3;
    let current = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top - line <= 0) current = h;
      else break;
    }
    // At the very bottom the last section wins, even if its heading never reaches the line.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      const last = heads[heads.length - 1];
      if (last.getBoundingClientRect().top < window.innerHeight) current = last;
    }
    links.forEach((a) => {
      const on = a.dataset.tocLink === current.id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
