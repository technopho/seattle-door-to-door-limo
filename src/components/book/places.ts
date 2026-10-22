// Optional Google Places address suggestions for the booking route (pickup, stops, drop-off).
//
// src/scripts/booking.ts imports this module lazily, only when PUBLIC_GOOGLE_MAPS_KEY is set and
// only on the first focus of an address field, so visitors who never type an address never load
// Google Maps. It uses the Places API (New) data service (AutocompleteSuggestion) and renders its
// own listbox, so the dropdown matches both site themes and stays keyboard and screen reader
// friendly. The browser key needs "Maps JavaScript API" + "Places API (New)" enabled and should be
// restricted to the site's domain.

type Formattable = { text?: string; matches?: { startOffset: number; endOffset: number }[]; toString(): string };
type Place = { displayName?: string | null; formattedAddress?: string | null; fetchFields(o: { fields: string[] }): Promise<unknown> };
type Prediction = { text: Formattable; mainText?: Formattable | null; secondaryText?: Formattable | null; toPlace(): Place };
type PlacesLibrary = {
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions(req: Record<string, unknown>): Promise<{ suggestions: { placePrediction?: Prediction | null }[] }>;
  };
  AutocompleteSessionToken: new () => object;
};
type MapsWindow = Window & {
  google?: { maps?: { importLibrary?: (name: string) => Promise<unknown> } };
  __sddMapsReady?: () => void;
  gm_authFailure?: () => void;
};

const w = window as MapsWindow;
// Bias (not restrict) results to greater Seattle; the US-only restriction is includedRegionCodes.
const SEATTLE = { center: { lat: 47.6062, lng: -122.3321 }, radius: 50000 };
const MAX_RESULTS = 5;
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

let libPromise: Promise<PlacesLibrary> | null = null;

function loadPlaces(key: string): Promise<PlacesLibrary> {
  if (!libPromise) {
    libPromise = new Promise<void>((resolve, reject) => {
      if (w.google?.maps?.importLibrary) return resolve();
      w.__sddMapsReady = () => resolve();
      const params = new URLSearchParams({ key, v: 'weekly', loading: 'async', libraries: 'places', language: 'en', region: 'US', callback: '__sddMapsReady' });
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps script failed to load'));
      document.head.append(s);
    }).then(() => w.google!.maps!.importLibrary!('places') as Promise<PlacesLibrary>);
  }
  return libPromise;
}

const tidy = (s: string) => s.replace(/,\s*(USA|United States)$/i, '').trim();

/** Attach suggestions to every `.bk-route__input` inside `route` (stops added later included). */
export async function initPlaces(route: HTMLElement, key: string): Promise<boolean> {
  let lib: PlacesLibrary;
  try {
    lib = await loadPlaces(key);
    if (!lib?.AutocompleteSuggestion) throw new Error('Places API (New) is not available');
  } catch (err) {
    console.warn('[booking] Address suggestions unavailable:', err);
    return false;
  }
  const service = lib.AutocompleteSuggestion!;

  let disabled = false;
  let setting = false;
  let token = new lib.AutocompleteSessionToken();
  let active: HTMLInputElement | null = null;
  let items: Prediction[] = [];
  let index = -1;
  let seq = 0;
  let timer = 0;

  const box = document.createElement('div');
  box.className = 'bk-ac';
  box.hidden = true;
  // Google Maps Platform attribution for Places data shown without a map: the text form is exactly
  // "Google Maps" (not translated, on one line). It sits outside the listbox so it is never read as an option.
  box.innerHTML = '<ul class="bk-ac__list" id="bk-ac-list" role="listbox" aria-label="Address suggestions"></ul><p class="bk-ac__brand" translate="no">Google Maps</p>';
  const list = box.querySelector('ul')!;
  route.append(box);

  const inputs = () => Array.from(route.querySelectorAll<HTMLInputElement>('input.bk-route__input'));
  const asInput = (t: EventTarget | null) => (t instanceof HTMLInputElement && t.classList.contains('bk-route__input') ? t : null);

  function prime(el: HTMLInputElement) {
    if (disabled || el.dataset.ac) return;
    el.dataset.ac = '1';
    el.removeAttribute('list'); // Google suggestions replace the curated <datalist>
    el.setAttribute('role', 'combobox');
    el.setAttribute('aria-autocomplete', 'list');
    el.setAttribute('aria-controls', 'bk-ac-list');
    el.setAttribute('aria-expanded', 'false');
  }

  function close() {
    clearTimeout(timer);
    seq++;
    box.hidden = true;
    items = [];
    index = -1;
    list.replaceChildren();
    if (active) {
      active.setAttribute('aria-expanded', 'false');
      active.removeAttribute('aria-activedescendant');
    }
  }

  function disable(reason: unknown) {
    if (disabled) return;
    close();
    disabled = true;
    console.warn('[booking] Address suggestions turned off:', reason);
    inputs().forEach((el) => {
      delete el.dataset.ac;
      el.setAttribute('list', 'bk-places');
      ['role', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'aria-activedescendant'].forEach((a) => el.removeAttribute(a));
    });
  }
  w.gm_authFailure = () => disable('the Google Maps key was rejected');

  function appendMatched(target: HTMLElement, ft: Formattable) {
    const text = ft.text ?? ft.toString();
    const ranges = [...(ft.matches ?? [])].sort((a, b) => a.startOffset - b.startOffset);
    let pos = 0;
    for (const r of ranges) {
      if (r.startOffset < pos || r.endOffset > text.length) continue;
      if (r.startOffset > pos) target.append(text.slice(pos, r.startOffset));
      const m = document.createElement('mark');
      m.textContent = text.slice(r.startOffset, r.endOffset);
      target.append(m);
      pos = r.endOffset;
    }
    if (pos < text.length) target.append(text.slice(pos));
  }

  function render(el: HTMLInputElement) {
    list.replaceChildren(...items.map((p, i) => {
      const li = document.createElement('li');
      li.className = 'bk-ac__opt';
      li.id = `bk-ac-opt-${i}`;
      li.dataset.i = String(i);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.innerHTML = `<span class="bk-ac__pin" aria-hidden="true">${PIN}</span>`;
      const txt = document.createElement('span');
      txt.className = 'bk-ac__txt';
      const main = document.createElement('span');
      main.className = 'bk-ac__main';
      appendMatched(main, p.mainText ?? p.text);
      txt.append(main);
      const subText = p.mainText && p.secondaryText ? tidy(p.secondaryText.toString()) : '';
      if (subText) {
        const sub = document.createElement('span');
        sub.className = 'bk-ac__sub';
        sub.textContent = subText;
        txt.append(sub);
      }
      li.append(txt);
      return li;
    }));
    place(el);
    index = -1;
    el.removeAttribute('aria-activedescendant');
    box.hidden = items.length === 0;
    el.setAttribute('aria-expanded', String(items.length > 0));
  }

  // Sit just under the row being typed in (rows are positioned children of the route card).
  function place(el: HTMLInputElement) {
    const row = el.closest<HTMLElement>('.bk-route__row');
    if (row) box.style.top = `${row.offsetTop + row.offsetHeight + 6}px`;
  }

  function highlight(i: number) {
    index = i;
    list.querySelectorAll<HTMLElement>('[role="option"]').forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
    const li = list.children[i] as HTMLElement | undefined;
    if (li && active) {
      active.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    } else active?.removeAttribute('aria-activedescendant');
  }

  async function suggest(el: HTMLInputElement) {
    const q = el.value.trim();
    if (disabled || q.length < 3) { close(); return; }
    const mine = ++seq;
    try {
      const { suggestions } = await service.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: token,
        includedRegionCodes: ['us'],
        locationBias: SEATTLE,
        language: 'en-US',
        region: 'us',
      });
      if (mine !== seq || el !== active || document.activeElement !== el) return;
      items = suggestions.map((s) => s.placePrediction).filter((p): p is Prediction => !!p).slice(0, MAX_RESULTS);
      render(el);
    } catch (err) {
      disable(err);
    }
  }

  function set(el: HTMLInputElement, value: string) {
    setting = true;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true })); // booking.ts updates summary, errors and draft
    setting = false;
  }

  async function choose(i: number) {
    const el = active;
    const p = items[i];
    if (!el || !p) return;
    close();
    const quick = tidy(p.text.toString());
    set(el, quick);
    token = new lib.AutocompleteSessionToken(); // the pick ends this billing session
    try {
      // The full formatted address (street number, ZIP) is what the chauffeur needs.
      const place = p.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress'] });
      const addr = tidy(place.formattedAddress ?? '');
      const name = (place.displayName ?? '').trim();
      const full = addr ? (name && !addr.toLowerCase().startsWith(name.toLowerCase()) ? `${name}, ${addr}` : addr) : '';
      if (full && el.value === quick) set(el, full);
    } catch {
      /* keep the suggestion text */
    }
  }

  route.addEventListener('focusin', (e) => {
    const el = asInput(e.target);
    if (!el) return;
    prime(el);
    active = el;
  });
  route.addEventListener('input', (e) => {
    const el = asInput(e.target);
    if (!el || setting || disabled) return;
    prime(el);
    active = el;
    clearTimeout(timer);
    timer = window.setTimeout(() => void suggest(el), 180);
  });
  route.addEventListener('keydown', (e) => {
    const el = asInput(e.target);
    if (!el || box.hidden || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = items.length;
      highlight(e.key === 'ArrowDown' ? (index + 1) % n : index <= 0 ? n - 1 : index - 1);
    } else if (e.key === 'Enter' && index >= 0) {
      // Pick the suggestion instead of letting the wizard advance.
      e.preventDefault();
      e.stopPropagation();
      void choose(index);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      close();
    }
  });
  route.addEventListener('focusout', (e) => {
    const el = asInput(e.target);
    if (el) window.setTimeout(() => { if (document.activeElement !== el) close(); }, 120);
  });
  // Keep focus in the field while a suggestion is pressed.
  list.addEventListener('pointerdown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (li) void choose(Number(li.dataset.i));
  });
  window.addEventListener('resize', () => { if (!box.hidden && active) place(active); }, { passive: true });

  inputs().forEach(prime);
  const current = asInput(document.activeElement);
  if (current) active = current;
  return true;
}
