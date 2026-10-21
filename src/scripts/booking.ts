// Booking wizard for /book/: 4-step reservation request with live summary,
// URL prefill, per-step validation, draft persistence and an animated success state.
import gsap from 'gsap';
import { fleet, site } from '../data/site';

declare global {
  interface Window { dataLayer?: Record<string, unknown>[] }
}

/* ---------------------------------------------------------------------------
   Types & constants
   --------------------------------------------------------------------------- */
export type BookingData = {
  type: string;
  from: string;
  to: string;
  stops: string[];
  date: string;
  time: string;
  roundTrip: boolean;
  returnDate: string;
  returnTime: string;
  hours: number;
  direction: string;
  airline: string;
  flight: string;
  pax: number;
  luggage: number;
  vehicle: string;
  name: string;
  phone: string;
  email: string;
  leadName: string;
  requests: string;
  addons: string[];
  contact: string;
  consent: boolean;
};

const TYPES: Record<string, string> = {
  airport: 'Airport transfer',
  p2p: 'Point-to-point',
  hourly: 'Hourly / as directed',
  weddings: 'Wedding',
  events: 'Special event',
  cruise: 'Cruise terminal',
  corporate: 'Corporate',
};
const ADDONS: Record<string, string> = {
  'child-seat': 'Child seat',
  'meet-greet': 'Meet & greet sign',
  champagne: 'Champagne on ice',
  'extra-luggage': 'Extra luggage',
  'red-carpet': 'Red carpet',
};
const CONTACT: Record<string, string> = { call: 'Call', text: 'Text', email: 'Email' };
const CONFIRM_BY: Record<string, string> = { call: 'by phone', text: 'by text', email: 'by email' };
const STEP_NAMES = ['Trip', 'Vehicle', 'Details', 'Review'];
const DRAFT_KEY = 'sdd-booking-draft-v1';
const DRAFT_TTL = 14 * 24 * 60 * 60 * 1000;
const VEHICLES = [...fleet].sort((a, b) => a.passengers - b.passengers || a.luggage - b.luggage);
const fleetById = new Map(fleet.map((v) => [v.id, v]));
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Recognises an airport in a free-text address (hero widget sends "SeaTac International Airport (SEA)").
const AIRPORT_RE = /\((SEA|PAE|BFI)\)|airport|sea-?tac|paine field|boeing field/i;
const DEFAULT_AIRPORT = 'Seattle-Tacoma International Airport (SEA)';
const isAirport = (s: string) => AIRPORT_RE.test(s);
const FLIGHT_NOTE: Record<string, string> = {
  arriving: 'We track your flight in real time and adjust pickup automatically.',
  departing: 'Optional for departures. Helps your chauffeur drop you at the right doors.',
};

const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14M3 13.5l2-5A2.5 2.5 0 0 1 7.3 7h9.4a2.5 2.5 0 0 1 2.3 1.5l2 5V17a1 1 0 0 1-1 1h-1.5M3 13.5V17a1 1 0 0 0 1 1h1.5M3 13.5h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/></svg>';

/* ---------------------------------------------------------------------------
   Network
   --------------------------------------------------------------------------- */
/**
 * submitBooking — the ONLY place the reservation leaves the browser.
 *
 * TODO(backend): replace the simulated delay with the real reservations endpoint
 * (e.g. `await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })`)
 * or the client's dispatch/CRM webhook. Resolve with the confirmed reference, or throw so
 * the UI shows the "please call us" fallback message.
 */
export async function submitBooking(data: BookingData): Promise<{ reference: string }> {
  void data; // payload is ready to send once an endpoint exists
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { reference: makeReference() };
}

function makeReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return 'SDD-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function track(event: string, payload: Record<string, unknown> = {}) {
  try { window.dataLayer?.push({ event, ...payload }); } catch { /* analytics must never break booking */ }
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */
const pad = (n: number) => String(n).padStart(2, '0');
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function parseISO(iso: string) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function fmtDate(iso: string) { return parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${pad(m || 0)} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtWhen(date: string, time: string) { return [date && fmtDate(date), time && fmtTime(time)].filter(Boolean).join(' · '); }
function plural(n: number, one: string, many = one + 's') { return `${n} ${n === 1 ? one : many}`; }
function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+') || d.length > 10) return raw;
  if (d.length <= 3) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function smoothScrollTo(el: HTMLElement, offset = -110) {
  if (window.lenis) window.lenis.scrollTo(el, { offset, duration: 1.1 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------------------------------------------------------------------------
   Wizard
   --------------------------------------------------------------------------- */
const root = document.querySelector<HTMLElement>('[data-booking]');
if (root) initBooking(root);

function initBooking(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-wizard]')!;
  const viewport = root.querySelector<HTMLElement>('[data-viewport]')!;
  const stepEls = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
  const progItems = Array.from(root.querySelectorAll<HTMLElement>('[data-progress-item]'));
  const progFill = root.querySelector<HTMLElement>('[data-progress-fill]')!;
  const progReach = root.querySelector<HTMLElement>('[data-progress-reach]')!;
  const navJourney = root.querySelector<HTMLElement>('[data-nav-journey]')!;
  const navJourneyText = root.querySelector<HTMLElement>('[data-nav-journey-text]')!;
  const head = root.querySelector<HTMLElement>('.bk-head');
  const terms = root.querySelector<HTMLDialogElement>('[data-terms]');
  const mqDesktop = window.matchMedia('(min-width: 1024px)');
  const backBtn = root.querySelector<HTMLButtonElement>('[data-back]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-next]')!;
  const nextLabel = root.querySelector<HTMLElement>('[data-next-label]')!;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  const announcer = root.querySelector<HTMLElement>('[data-announce]')!;
  const stopsWrap = root.querySelector<HTMLElement>('[data-stops]')!;
  const addStopBtn = root.querySelector<HTMLButtonElement>('[data-add-stop]')!;
  const swapBtn = root.querySelector<HTMLButtonElement>('[data-swap]')!;
  const review = root.querySelector<HTMLElement>('[data-review]')!;
  const vehicleCards = Array.from(root.querySelectorAll<HTMLElement>('[data-vehicle]'));
  const fitText = root.querySelector<HTMLElement>('[data-fit-text]')!;
  const summary = root.querySelector<HTMLElement>('[data-summary]')!;
  const sumToggle = root.querySelector<HTMLButtonElement>('[data-sum-toggle]')!;
  const sumBody = root.querySelector<HTMLElement>('[data-sum-body]')!;
  const success = root.querySelector<HTMLElement>('[data-success]')!;
  const layout = root.querySelector<HTMLElement>('[data-layout]')!;
  const restore = root.querySelector<HTMLElement>('[data-restore]')!;
  const submitErr = root.querySelector<HTMLElement>('[data-err="submit"]')!;

  let step = 1;
  let maxStep = 1;
  let busy = false;
  let submitting = false;
  let stopUid = 0;

  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;

  /* ---------- Read / write form state ---------- */
  function read(): BookingData {
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) ?? '').trim();
    return {
      type: s('type'),
      from: s('from'),
      to: s('to'),
      stops: Array.from(stopsWrap.querySelectorAll<HTMLInputElement>('input')).map((i) => i.value.trim()),
      date: s('date'),
      time: s('time'),
      roundTrip: fd.has('roundTrip'),
      returnDate: s('returnDate'),
      returnTime: s('returnTime'),
      hours: clampInt(s('hours'), 2, 12, 3),
      direction: s('direction') || 'arriving',
      airline: s('airline'),
      flight: s('flight').toUpperCase(),
      pax: clampInt(s('pax'), 1, 20, 2),
      luggage: clampInt(s('luggage'), 0, 20, 2),
      vehicle: s('vehicle'),
      name: s('name'),
      phone: s('phone'),
      email: s('email'),
      leadName: s('leadName'),
      requests: s('requests'),
      addons: fd.getAll('addons').map(String),
      contact: s('contact') || 'text',
      consent: fd.has('consent'),
    };
  }

  function setRadio(name: string, value: string) {
    form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((r) => { r.checked = r.value === value; });
  }

  function write(d: Partial<BookingData>) {
    if (d.type !== undefined && TYPES[d.type]) setRadio('type', d.type);
    const textKeys = ['from', 'to', 'date', 'time', 'returnDate', 'returnTime', 'airline', 'flight', 'name', 'phone', 'email', 'leadName', 'requests'] as const;
    textKeys.forEach((k) => { const v = d[k]; const el = input(k); if (typeof v === 'string' && el) el.value = v; });
    if (d.hours !== undefined) input('hours')!.value = String(clampInt(d.hours, 2, 12, 3));
    if (d.pax !== undefined) input('pax')!.value = String(clampInt(d.pax, 1, 20, 2));
    if (d.luggage !== undefined) input('luggage')!.value = String(clampInt(d.luggage, 0, 20, 2));
    if (d.roundTrip !== undefined) input('roundTrip')!.checked = !!d.roundTrip;
    if (d.direction) setRadio('direction', d.direction);
    if (d.contact && CONTACT[d.contact]) setRadio('contact', d.contact);
    if (Array.isArray(d.addons)) form.querySelectorAll<HTMLInputElement>('input[name="addons"]').forEach((c) => { c.checked = d.addons!.includes(c.value); });
    if (Array.isArray(d.stops)) { stopsWrap.innerHTML = ''; d.stops.slice(0, 2).forEach((v) => addStop(String(v), false, false)); }
    // Vehicle last: capacity rules depend on passengers.
    updateVehicles(false);
    if (d.vehicle && fleetById.has(d.vehicle)) {
      const radio = form.querySelector<HTMLInputElement>(`input[name="vehicle"][value="${d.vehicle}"]`);
      if (radio && !radio.disabled) radio.checked = true;
    }
  }

  /* ---------- Conditionals (airport / hourly / round trip) ---------- */
  function syncConditionals(animate = true) {
    const d = read();
    const show: Record<string, boolean> = {
      airport: d.type === 'airport',
      hourly: d.type === 'hourly',
      'not-hourly': d.type !== 'hourly',
      round: d.roundTrip,
    };
    root.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => {
      const want = !!show[el.dataset.when!];
      const isShown = !el.hidden;
      if (want === isShown) return;
      if (!animate || reduce) { el.hidden = !want; return; }
      if (want) {
        el.hidden = false;
        gsap.fromTo(el, { height: 0, opacity: 0, overflow: 'hidden' }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'height,opacity,overflow' });
      } else {
        gsap.to(el, { height: 0, opacity: 0, overflow: 'hidden', duration: 0.35, ease: 'power2.inOut', onComplete: () => { el.hidden = true; gsap.set(el, { clearProps: 'height,opacity,overflow' }); } });
      }
    });

    // Copy & placeholders adapt to the service.
    const toLabel = root.querySelector<HTMLElement>('[data-to-label]')!;
    toLabel.textContent = d.type === 'hourly' ? 'Drop-off (optional)' : 'Drop-off';
    const from = input('from')!;
    const to = input('to')!;
    let phFrom = 'Address, hotel or airport';
    let phTo = 'Address, hotel or venue';
    if (d.type === 'airport') {
      if (d.direction === 'arriving') { phFrom = 'e.g. Seattle-Tacoma International Airport (SEA)'; phTo = 'Hotel, home or office'; }
      else { phFrom = 'Hotel, home or office'; phTo = 'e.g. Seattle-Tacoma International Airport (SEA)'; }
    } else if (d.type === 'cruise') { phTo = 'e.g. Pier 91, Smith Cove Cruise Terminal'; }
    else if (d.type === 'hourly') { phTo = 'Where the day ends, if known'; }
    else if (d.type === 'weddings') { phTo = 'Ceremony or reception venue'; }
    from.placeholder = phFrom;
    to.placeholder = phTo;
    const flightOpt = root.querySelector<HTMLElement>('[data-flight-opt]');
    if (flightOpt) flightOpt.hidden = d.direction === 'arriving';
    const flightNote = root.querySelector<HTMLElement>('[data-flight-note]');
    if (flightNote) flightNote.textContent = FLIGHT_NOTE[d.direction] || FLIGHT_NOTE.arriving;
  }

  /* ---------- Airport side of the route ---------- */
  // Put the airport on the correct side for the chosen direction: swap if it was typed on the
  // other side, or suggest SeaTac when that side is still empty.
  function placeAirport() {
    const d = read();
    if (d.type !== 'airport') return;
    const from = input('from')!;
    const to = input('to')!;
    const airportEl = d.direction === 'arriving' ? from : to;
    const otherEl = airportEl === from ? to : from;
    const a = airportEl.value.trim();
    const o = otherEl.value.trim();
    if (isAirport(a)) return;
    if (isAirport(o)) swapRoute(false);
    else if (!a) airportEl.value = DEFAULT_AIRPORT;
    else return;
    if (!reduce) gsap.from(airportEl, { color: '#e8d3a2', duration: 1.6, ease: 'power2.out', clearProps: 'color' });
    clearError('from');
    clearError('to');
  }

  // When the guest picks "Airport transfer", infer the direction from what they've already typed.
  function inferDirection() {
    const d = read();
    let dir = '';
    if (isAirport(d.to) && !isAirport(d.from)) dir = 'departing';
    else if (isAirport(d.from) && !isAirport(d.to)) dir = 'arriving';
    else if (d.from && !d.to) dir = 'departing';
    else if (d.to && !d.from) dir = 'arriving';
    if (dir) setRadio('direction', dir);
  }

  /* ---------- Stops ---------- */
  function relabelStops() {
    stopsWrap.querySelectorAll<HTMLElement>('.bk-route__label').forEach((l, i) => { l.textContent = `Stop ${i + 1}`; });
    addStopBtn.hidden = stopsWrap.children.length >= 2;
  }

  function addStop(value = '', focus = true, animate = true) {
    if (stopsWrap.children.length >= 2) return;
    const id = `f-stop-${++stopUid}`;
    const row = document.createElement('div');
    row.className = 'bk-route__row bk-route__row--stop';
    row.innerHTML = `
      <span class="bk-route__marker bk-route__marker--stop" aria-hidden="true"></span>
      <div class="bk-route__field">
        <label class="bk-route__label" for="${id}">Stop</label>
        <input class="bk-route__input" id="${id}" name="stop" type="text" autocomplete="off" list="bk-places" placeholder="Add an address" aria-describedby="err-stops" />
      </div>
      <button type="button" class="bk-route__remove" data-remove-stop aria-label="Remove stop">${CLOSE_SVG}</button>`;
    row.querySelector('input')!.value = value;
    stopsWrap.append(row);
    relabelStops();
    if (animate && !reduce) gsap.fromTo(row, { height: 0, opacity: 0, overflow: 'hidden' }, { height: 'auto', opacity: 1, duration: 0.55, ease: 'expo.out', clearProps: 'all' });
    if (focus) row.querySelector('input')!.focus();
    renderSummary();
  }

  function removeStop(row: HTMLElement) {
    const done = () => {
      row.remove();
      relabelStops();
      clearError('stops');
      renderSummary();
      saveDraft();
      (addStopBtn.hidden ? input('to') : addStopBtn)?.focus();
    };
    if (reduce) return done();
    gsap.to(row, { height: 0, opacity: 0, overflow: 'hidden', duration: 0.35, ease: 'power2.inOut', onComplete: done });
  }

  addStopBtn.addEventListener('click', () => addStop());
  stopsWrap.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove-stop]');
    if (btn) removeStop(btn.closest('.bk-route__row') as HTMLElement);
  });

  function swapRoute(syncDirection = true) {
    const from = input('from')!;
    const to = input('to')!;
    [from.value, to.value] = [to.value, from.value];
    const stops = Array.from(stopsWrap.querySelectorAll<HTMLInputElement>('input'));
    const vals = stops.map((s) => s.value).reverse();
    stops.forEach((s, i) => { s.value = vals[i]; });
    if (!reduce) gsap.fromTo(swapBtn.querySelector('svg'), { rotate: 0 }, { rotate: 180, duration: 0.7, ease: 'expo.out' });
    // Swapping an airport trip flips its direction too.
    if (syncDirection && read().type === 'airport') {
      const d = read();
      if (isAirport(d.from) !== isAirport(d.to)) {
        setRadio('direction', isAirport(d.from) ? 'arriving' : 'departing');
        syncConditionals();
      }
    }
    clearError('from');
    clearError('to');
  }

  swapBtn.addEventListener('click', () => {
    swapRoute();
    renderSummary();
    saveDraft();
  });

  /* ---------- Steppers ---------- */
  function syncStepper(st: HTMLElement) {
    const el = st.querySelector<HTMLInputElement>('input')!;
    const v = Number(el.value);
    st.querySelector<HTMLButtonElement>('[data-dec]')!.disabled = v <= Number(el.min);
    st.querySelector<HTMLButtonElement>('[data-inc]')!.disabled = v >= Number(el.max);
  }
  root.querySelectorAll<HTMLElement>('[data-stepper]').forEach((st) => {
    const el = st.querySelector<HTMLInputElement>('input')!;
    const bump = (delta: number) => {
      const v = clampInt(Number(el.value) + delta, Number(el.min), Number(el.max), Number(el.min));
      if (String(v) === el.value) return;
      el.value = String(v);
      if (!reduce) gsap.fromTo(el, { y: delta > 0 ? 8 : -8, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expo.out' });
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    st.querySelector('[data-dec]')!.addEventListener('click', () => bump(-1));
    st.querySelector('[data-inc]')!.addEventListener('click', () => bump(1));
    el.addEventListener('blur', () => { el.value = String(clampInt(el.value, Number(el.min), Number(el.max), Number(el.min))); syncStepper(st); el.dispatchEvent(new Event('input', { bubbles: true })); });
    el.addEventListener('input', () => syncStepper(st));
    syncStepper(st);
  });
  const syncAllSteppers = () => root.querySelectorAll<HTMLElement>('[data-stepper]').forEach(syncStepper);

  /* ---------- Vehicles ---------- */
  function updateVehicles(announce = true) {
    const { pax, luggage } = read();
    const rec = VEHICLES.find((v) => v.passengers >= pax && v.luggage >= luggage) ?? VEHICLES.find((v) => v.passengers >= pax);
    let fits = 0;
    let dropped = '';
    // FLIP: vehicles that seat the party move to the front; animate the reflow when step 2 is on screen.
    const visible = !reduce && !stepEls[1].hidden;
    const before = visible ? new Map(vehicleCards.map((c) => [c, c.getBoundingClientRect()])) : null;
    vehicleCards.forEach((card) => {
      const cap = Number(card.dataset.cap);
      const radio = card.querySelector<HTMLInputElement>('input')!;
      const tooSmall = cap < pax;
      if (!tooSmall) fits++;
      if (tooSmall && radio.checked) { radio.checked = false; dropped = fleetById.get(radio.value)?.name || ''; }
      radio.disabled = tooSmall;
      card.classList.toggle('is-disabled', tooSmall);
      card.style.order = tooSmall ? '1' : '0';
      card.querySelector<HTMLElement>('[data-cap-note]')!.hidden = !tooSmall;
      card.querySelector<HTMLElement>('[data-rec]')!.hidden = card.dataset.vehicle !== rec?.id;
    });
    if (before) {
      vehicleCards.forEach((card) => {
        const a = before.get(card)!;
        const b = card.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          card.classList.add('is-flipping');
          gsap.fromTo(card, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.9, ease: 'expo.out', clearProps: 'transform', onComplete: () => card.classList.remove('is-flipping') });
        }
      });
    }
    const total = vehicleCards.length;
    let msg = fits === total
      ? `All ${total} vehicles seat ${plural(pax, 'guest')}.`
      : `${fits} of ${total} vehicles seat ${plural(pax, 'guest')}.`;
    if (dropped) msg = `${dropped} seats fewer guests, so we cleared it. ${msg}`;
    fitText.textContent = msg;
    if (announce && dropped) announce_(msg);
  }

  /* ---------- Summary ---------- */
  const sumSlot = (k: string) => summary.querySelector<HTMLElement>(`[data-sum="${k}"]`)!;
  const prevSum = new Map<string, string>();

  function setSlot(key: string, value: string, placeholder = '') {
    const el = sumSlot(key);
    const text = value || placeholder;
    el.textContent = text;
    el.classList.toggle('is-empty', !value && !!placeholder);
    flashIfChanged(key, value, el.closest('.bk-sum__row') as HTMLElement | null);
  }
  function flashIfChanged(key: string, value: string, row: HTMLElement | null) {
    const prev = prevSum.get(key);
    prevSum.set(key, value);
    if (prev === undefined || prev === value || !value || !row || reduce) return;
    row.classList.remove('is-flash');
    void row.offsetWidth;
    row.classList.add('is-flash');
    row.addEventListener('animationend', () => row.classList.remove('is-flash'), { once: true });
  }

  function renderSummary() {
    const d = read();
    // Service
    summary.querySelectorAll<HTMLElement>('[data-sum-icon]').forEach((i) => { i.hidden = i.dataset.sumIcon !== (d.type || 'none'); });
    let svc = TYPES[d.type] || '';
    if (d.type === 'airport') svc += d.direction === 'arriving' ? ' · Arrival' : ' · Departure';
    setSlot('service', svc, 'Choose a service');
    // Route
    setSlot('from', d.from, 'Add pickup');
    setSlot('to', d.to || (d.type === 'hourly' ? 'As directed' : ''), 'Add drop-off');
    const stopsEl = sumSlot('stops');
    stopsEl.innerHTML = d.stops.filter(Boolean).map((s, i) => `
      <div class="bk-sum__stop"><span class="bk-sum__dot bk-sum__dot--stop" aria-hidden="true"></span>
      <p class="bk-sum__k">Stop ${i + 1}</p><p class="bk-sum__v">${esc(s)}</p></div>`).join('');
    // When
    setSlot('when', fmtWhen(d.date, d.time), 'Choose date & time');
    const sub: string[] = [];
    if (d.type === 'hourly') sub.push(plural(d.hours, 'hour'));
    if (d.type === 'airport' && d.flight) sub.push(`Flight ${[d.airline, d.flight].filter(Boolean).join(' ')}`);
    if (d.roundTrip && d.type !== 'hourly') sub.push(`Return ${fmtWhen(d.returnDate, d.returnTime) || 'to be set'}`);
    sumSlot('when-sub').textContent = sub.join('\n');
    // Party
    setSlot('party', plural(d.pax, 'passenger'));
    sumSlot('party-sub').textContent = d.luggage ? plural(d.luggage, 'bag') : 'No luggage';
    // Vehicle
    const v = fleetById.get(d.vehicle);
    const thumb = sumSlot('thumb');
    if (v) {
      if (thumb.dataset.v !== v.id) {
        thumb.dataset.v = v.id;
        thumb.classList.toggle('is-studio', v.id === 'sprinter');
        thumb.innerHTML = `<img src="${esc(v.image)}" alt="" decoding="async" />`;
        if (!reduce) gsap.fromTo(thumb.firstElementChild, { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out' });
      }
      setSlot('vehicle', v.name);
      sumSlot('vehicle-sub').textContent = `${v.category} · seats up to ${v.passengers}`;
    } else {
      if (thumb.dataset.v) { thumb.dataset.v = ''; thumb.classList.remove('is-studio'); thumb.innerHTML = CAR_SVG; }
      setSlot('vehicle', '', step >= 2 ? 'Choose below' : 'Select in step 2');
      sumSlot('vehicle-sub').textContent = '';
    }
    // Add-ons
    const addonRow = summary.querySelector<HTMLElement>('[data-sum-row="addons"]')!;
    addonRow.hidden = d.addons.length === 0;
    sumSlot('addons').innerHTML = d.addons.map((a) => `<span class="chip">${esc(ADDONS[a] || a)}</span>`).join('');
    // Compact (mobile) line
    const compact = [TYPES[d.type], v?.name, d.date ? fmtDate(d.date) : ''].filter(Boolean).join(' · ');
    summary.querySelector<HTMLElement>('[data-sum-compact]')!.textContent = compact || 'Start with your trip';
    // Same line inside the sticky mobile action bar, so the journey stays in view while filling the form.
    navJourneyText.textContent = compact;
    navJourney.hidden = !compact;
    syncSummaryScroll();
  }

  // The sticky desktop summary scrolls internally on short screens; only then should Lenis leave wheel events to it.
  function syncSummaryScroll() {
    requestAnimationFrame(() => {
      const scrolls = mqDesktop.matches && summary.scrollHeight > summary.clientHeight + 1;
      summary.toggleAttribute('data-lenis-prevent', scrolls);
      syncSummaryFade();
    });
  }
  // Soft fade at the bottom edge hints there is more of the journey card to scroll to.
  function syncSummaryFade() {
    const more = mqDesktop.matches && summary.scrollTop + summary.clientHeight < summary.scrollHeight - 4;
    summary.classList.toggle('has-more', more);
  }
  summary.addEventListener('scroll', syncSummaryFade, { passive: true });

  /* ---------- Review ---------- */
  function reviewHTML(d: BookingData, editable: boolean) {
    const v = fleetById.get(d.vehicle);
    const row = (k: string, val: string, wide = false) => val ? `<div class="${wide ? 'is-wide' : ''}"><dt>${k}</dt><dd>${val}</dd></div>` : '';
    const block = (title: string, n: number, body: string) => `
      <section class="bk-review__block">
        <div class="bk-review__head">
          <h4 class="bk-review__title">${title}</h4>
          ${editable ? `<button type="button" class="bk-review__edit" data-goto="${n}" aria-label="Edit ${title.toLowerCase().replace('&amp;', 'and')}">Edit</button>` : ''}
        </div>
        <dl class="bk-review__list">${body}</dl>
      </section>`;
    let service = esc(TYPES[d.type] || '');
    if (d.type === 'airport') service += ` <span class="muted">· ${d.direction === 'arriving' ? 'Arriving' : 'Departing'}</span>`;
    const flight = d.type === 'airport' ? esc([d.airline, d.flight].filter(Boolean).join(' ')) : '';
    const trip = [
      row('Service', service),
      row('When', esc(fmtWhen(d.date, d.time))),
      row('Pickup', esc(d.from), true),
      ...d.stops.filter(Boolean).map((s, i) => row(`Stop ${i + 1}`, esc(s), true)),
      row('Drop-off', esc(d.to || (d.type === 'hourly' ? 'As directed' : '')), true),
      d.type === 'hourly' ? row('Duration', plural(d.hours, 'hour')) : '',
      row('Flight', flight),
      d.roundTrip && d.type !== 'hourly' ? row('Return', esc(fmtWhen(d.returnDate, d.returnTime))) : '',
    ].join('');
    const vehicle = [
      row('Vehicle', v ? `${esc(v.name)} <span class="muted">· ${esc(v.category)}</span>` : ''),
      row('Party', `${plural(d.pax, 'passenger')} · ${d.luggage ? plural(d.luggage, 'bag') : 'no luggage'}`),
    ].join('');
    const details = [
      row('Name', esc(d.name)),
      row('Mobile', esc(d.phone)),
      row('Email', esc(d.email)),
      row('Lead passenger', esc(d.leadName)),
      row('Confirm by', CONTACT[d.contact] || 'Text'),
      row('Add-ons', esc(d.addons.map((a) => ADDONS[a] || a).join(', '))),
      row('Requests', esc(d.requests), true),
    ].join('');
    return block('Trip', 1, trip) + block('Vehicle &amp; party', 2, vehicle) + block('Your details', 3, details);
  }

  /* ---------- Errors & validation ---------- */
  function errEl(key: string) { return root.querySelector<HTMLElement>(`[data-err="${key}"]`); }
  function clearError(key: string) {
    const el = errEl(key);
    if (el) { el.textContent = ''; el.classList.remove('is-shown'); }
    if (key === 'type' || key === 'vehicle') root.querySelector(`[data-group="${key}"]`)?.removeAttribute('aria-invalid');
    else if (key === 'stops') stopsWrap.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
    else input(key)?.removeAttribute('aria-invalid');
  }
  function clearStepErrors(n: number) {
    stepEls[n - 1].querySelectorAll<HTMLElement>('[data-err]').forEach((e) => clearError(e.dataset.err!));
  }

  type Issue = { key: string; msg: string; focus: HTMLElement | null; mark?: HTMLElement[] };

  function validate(n: number): boolean {
    clearStepErrors(n);
    const d = read();
    const issues: Issue[] = [];
    const add = (key: string, msg: string, focus: HTMLElement | null, mark?: HTMLElement[]) => issues.push({ key, msg, focus, mark });

    if (n === 1) {
      if (!d.type) add('type', 'Choose the kind of ride you need.', form.querySelector<HTMLInputElement>('input[name="type"]'));
      if (!d.from) add('from', 'Where should we pick you up?', input('from'));
      const emptyStops = Array.from(stopsWrap.querySelectorAll<HTMLInputElement>('input')).filter((i) => !i.value.trim());
      if (emptyStops.length) add('stops', 'Add an address for each stop, or remove it.', emptyStops[0], emptyStops);
      if (d.type !== 'hourly' && !d.to) add('to', 'Where are you headed?', input('to'));
      const today = todayISO();
      if (!d.date) add('date', 'Choose your pickup date.', input('date'));
      else if (d.date < today) add('date', 'Choose a date from today onward.', input('date'));
      if (!d.time) add('time', 'Choose a pickup time.', input('time'));
      else if (d.date === today && d.time < nowHM()) add('time', 'That time has already passed today.', input('time'));
      if (d.type === 'airport' && d.direction === 'arriving' && !d.flight) add('flight', 'Add your flight number so we can track it live.', input('flight'));
      if (d.roundTrip && d.type !== 'hourly') {
        if (!d.returnDate) add('returnDate', 'Choose a return date.', input('returnDate'));
        if (!d.returnTime) add('returnTime', 'Choose a return time.', input('returnTime'));
        if (d.returnDate && d.returnTime && d.date && d.time && `${d.returnDate}T${d.returnTime}` <= `${d.date}T${d.time}`) {
          add('returnDate', 'Your return should be after your pickup.', input('returnDate'));
        }
      }
    } else if (n === 2) {
      if (!d.vehicle) add('vehicle', 'Select a vehicle to continue.', form.querySelector<HTMLInputElement>('input[name="vehicle"]:not(:disabled)'));
    } else if (n === 3) {
      if (d.name.length < 2) add('name', 'Please enter your full name.', input('name'));
      if (d.phone.replace(/\D/g, '').length < 10) add('phone', 'Enter a 10-digit mobile number.', input('phone'));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) add('email', 'Enter a valid email for your confirmation.', input('email'));
    } else if (n === 4) {
      if (!d.consent) add('consent', 'Please agree to the booking terms to continue.', input('consent'));
    }

    issues.forEach(({ key, msg, mark, focus }) => {
      const el = errEl(key);
      if (el && !el.classList.contains('is-shown')) {
        el.textContent = msg;
        el.classList.add('is-shown');
        if (!reduce) gsap.fromTo(el, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
      }
      if (key === 'type' || key === 'vehicle') root.querySelector(`[data-group="${key}"]`)?.setAttribute('aria-invalid', 'true');
      else (mark || [focus]).forEach((m) => m?.setAttribute('aria-invalid', 'true'));
    });

    if (issues.length) {
      const first = issues[0].focus;
      if (first) {
        first.focus({ preventScroll: true });
        const r = first.getBoundingClientRect();
        if (r.top < 100 || r.bottom > window.innerHeight - 100) smoothScrollTo(first, -window.innerHeight / 3);
      }
      track('booking_validation_error', { step: n, fields: issues.map((i) => i.key).join(',') });
      return false;
    }
    return true;
  }

  // Clear a field's error as soon as the guest fixes it.
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.name) return;
    if (t.name === 'stop') clearError('stops');
    else if (t.name === 'returnTime' || t.name === 'returnDate') { clearError('returnDate'); clearError('returnTime'); }
    else if (errEl(t.name)) clearError(t.name);
  });

  /* ---------- Navigation ---------- */
  function announce_(msg: string) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = msg; }); }

  function updateChrome() {
    progItems.forEach((li, i) => {
      const n = i + 1;
      const btn = li.querySelector<HTMLButtonElement>('button')!;
      li.classList.toggle('is-current', n === step);
      li.classList.toggle('is-done', n < step || (n <= maxStep && n !== step && n < maxStep));
      btn.disabled = n === step || n > maxStep;
      if (n === step) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
    });
    const ratio = (step - 1) / (stepEls.length - 1);
    const reach = (maxStep - 1) / (stepEls.length - 1);
    if (reduce) { gsap.set(progFill, { scaleX: ratio }); gsap.set(progReach, { scaleX: reach }); }
    else { gsap.to(progFill, { scaleX: ratio, duration: 1, ease: 'expo.out' }); gsap.to(progReach, { scaleX: reach, duration: 1, ease: 'expo.out' }); }

    backBtn.classList.toggle('is-hidden', step === 1);
    backBtn.tabIndex = step === 1 ? -1 : 0;
    backBtn.setAttribute('aria-hidden', String(step === 1));
    const final = step === stepEls.length;
    nextLabel.textContent = final ? 'Request reservation' : step === 3 ? 'Review booking' : 'Continue';
    nextBtn.classList.toggle('is-final', final);
    nextBtn.classList.toggle('btn--lg', final);
    hint.textContent = ['Takes about a minute', 'Every vehicle is chauffeur-driven', 'Your details stay private', 'A concierge confirms within minutes'][step - 1];
  }

  function goTo(n: number, focusHeading = true) {
    if (n === step || busy || n < 1 || n > stepEls.length) return;
    const fromEl = stepEls[step - 1];
    const toEl = stepEls[n - 1];
    const dir = n > step ? 1 : -1;
    if (n === 2) updateVehicles(false);
    if (n === 4) review.innerHTML = reviewHTML(read(), true);
    step = n;
    maxStep = Math.max(maxStep, n);
    updateChrome();
    renderSummary();
    announce_(`Step ${n} of ${stepEls.length}: ${STEP_NAMES[n - 1]}`);
    track('booking_step', { step: n, step_name: STEP_NAMES[n - 1].toLowerCase() });

    const finish = () => {
      busy = false;
      const top = form.getBoundingClientRect().top;
      if (top < 0) smoothScrollTo(form, -90);
      if (focusHeading) toEl.querySelector<HTMLElement>('.bk-step__title')?.focus({ preventScroll: true });
      saveDraft();
    };

    if (reduce) { fromEl.hidden = true; toEl.hidden = false; finish(); return; }

    busy = true;
    const h0 = viewport.offsetHeight;
    viewport.style.height = `${h0}px`;
    viewport.classList.add('is-animating');
    gsap.to(fromEl, {
      opacity: 0, x: -28 * dir, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        fromEl.hidden = true;
        gsap.set(fromEl, { clearProps: 'opacity,transform' });
        toEl.hidden = false;
        const h1 = toEl.offsetHeight;
        gsap.to(viewport, { height: h1, duration: 0.7, ease: 'expo.out', onComplete: () => { viewport.style.height = ''; viewport.classList.remove('is-animating'); } });
        gsap.fromTo(toEl, { opacity: 0, x: 36 * dir }, { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out', clearProps: 'opacity,transform' });
        gsap.fromTo(toEl.querySelectorAll('[data-anim]'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, clearProps: 'opacity,transform' });
        finish();
      },
    });
  }

  // Jump via progress or "Edit": backwards freely; forwards only through valid steps.
  function jumpTo(n: number) {
    if (n < step) return goTo(n);
    for (let s = step; s < n; s++) {
      if (!validate(s)) { if (s !== step) goTo(s); return; }
    }
    goTo(n);
  }

  function advance() {
    if (busy || submitting) return;
    if (!validate(step)) return;
    if (step < stepEls.length) goTo(step + 1);
    else void submit();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); advance(); });
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    const t = e.target as HTMLElement;
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'A') return;
    e.preventDefault();
    advance();
  });
  backBtn.addEventListener('click', () => goTo(step - 1));
  root.addEventListener('click', (e) => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
    if (g && !(g as HTMLButtonElement).disabled) jumpTo(Number(g.dataset.goto));
  });

  /* ---------- Live updates ---------- */
  let draftTimer = 0;
  function saveDraftSoon() { clearTimeout(draftTimer); draftTimer = window.setTimeout(saveDraft, 350); }

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'phone') {
      const atEnd = t.selectionStart === t.value.length;
      if (atEnd && !(e as InputEvent).inputType?.startsWith('delete')) t.value = formatPhone(t.value);
    }
    if (t.name === 'pax' || t.name === 'luggage') updateVehicles();
    renderSummary();
    saveDraftSoon();
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'type' && t.value === 'airport') { inferDirection(); placeAirport(); }
    if (t.name === 'direction') placeAirport();
    if (t.name === 'type' || t.name === 'roundTrip' || t.name === 'direction') {
      syncConditionals();
      if (t.name === 'type') clearError('type');
      if (t.name === 'direction') clearError('flight');
    }
    if (t.name === 'vehicle') {
      clearError('vehicle');
      const card = t.closest<HTMLElement>('.bk-vehicle');
      if (card && !reduce) {
        card.classList.add('is-flipping');
        gsap.fromTo(card, { scale: 0.985 }, { scale: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform', onComplete: () => card.classList.remove('is-flipping') });
      }
    }
    renderSummary();
    saveDraftSoon();
  });

  /* ---------- Mobile summary drawer ---------- */

  sumToggle.addEventListener('click', () => {
    const open = !summary.classList.contains('is-open');
    sumToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      summary.classList.add('is-open');
      if (!reduce) gsap.fromTo(sumBody, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'height,opacity' });
    } else if (reduce) {
      summary.classList.remove('is-open');
    } else {
      gsap.to(sumBody, { height: 0, opacity: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => { summary.classList.remove('is-open'); gsap.set(sumBody, { clearProps: 'height,opacity' }); } });
    }
  });
  mqDesktop.addEventListener('change', () => { summary.classList.remove('is-open'); sumToggle.setAttribute('aria-expanded', 'false'); gsap.set(sumBody, { clearProps: 'height,opacity' }); syncSummaryScroll(); });
  // Mobile: the sticky action bar drops its journey line once it docks at the end of the form,
  // where the full "Your journey" drawer sits right below it.
  const navEl = root.querySelector<HTMLElement>('.bk-nav');
  const navSentinel = root.querySelector<HTMLElement>('[data-nav-sentinel]');
  if (navEl && navSentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => navEl.classList.toggle('is-docked', e.isIntersecting), { rootMargin: '0px 0px -8px 0px' }).observe(navSentinel);
  }
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(syncSummaryScroll, 200); });

  /* ---------- Booking terms dialog ---------- */
  if (terms) {
    const openBtn = root.querySelector<HTMLButtonElement>('[data-terms-open]');
    const inner = terms.querySelector<HTMLElement>('.bk-terms__inner');
    openBtn?.addEventListener('click', () => {
      if (typeof terms.showModal !== 'function') return;
      terms.showModal();
      window.lenis?.stop();
      if (!reduce && inner) gsap.fromTo(inner, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', clearProps: 'opacity,transform' });
      track('booking_terms_view');
    });
    terms.querySelectorAll('[data-terms-close]').forEach((b) => b.addEventListener('click', () => terms.close()));
    terms.addEventListener('click', (e) => { if (e.target === terms) terms.close(); });
    terms.addEventListener('close', () => { window.lenis?.start(); openBtn?.focus(); });
  }

  /* ---------- Draft persistence ---------- */
  function saveDraft() {
    if (submitting) return;
    try {
      const { consent, ...rest } = read();
      void consent;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ t: Date.now(), d: rest }));
    } catch { /* storage unavailable: drafts are a convenience only */ }
  }
  function loadDraft(): Partial<BookingData> | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { t: number; d: Partial<BookingData> };
      if (!parsed?.d || Date.now() - parsed.t > DRAFT_TTL) return null;
      const d = parsed.d;
      if (d.date && d.date < todayISO()) { d.date = ''; d.time = ''; }
      if (d.returnDate && d.returnDate < todayISO()) { d.returnDate = ''; d.returnTime = ''; }
      return d;
    } catch { return null; }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

  /* ---------- URL prefill (?type=&from=&to=&date=&time=&pax=&hours=&vehicle=) ---------- */
  function fromUrl(): Partial<BookingData> {
    const q = new URLSearchParams(location.search);
    const out: Partial<BookingData> = {};
    const type = q.get('type');
    if (type && TYPES[type]) out.type = type;
    const from = q.get('from'); if (from) out.from = from.slice(0, 200);
    const to = q.get('to'); if (to) out.to = to.slice(0, 200);
    const date = q.get('date'); if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayISO()) out.date = date;
    const time = q.get('time'); if (time && /^\d{2}:\d{2}$/.test(time)) out.time = time;
    const pax = q.get('pax'); if (pax) out.pax = clampInt(pax, 1, 20, 2);
    const hours = q.get('hours'); if (hours) out.hours = clampInt(hours, 2, 12, 3);
    if (out.type === 'airport') {
      // The URL contract has no required direction: honour ?direction= if present, otherwise
      // infer it (an airport in "to" means the guest is flying out).
      const dir = q.get('direction');
      if (dir === 'arriving' || dir === 'departing') out.direction = dir;
      else out.direction = to && isAirport(to) && !isAirport(from || '') ? 'departing' : 'arriving';
    }
    const vehicle = q.get('vehicle');
    if (vehicle && fleetById.has(vehicle)) {
      out.vehicle = vehicle;
      // Make sure a deep-linked vehicle is selectable.
      if (out.pax && out.pax > fleetById.get(vehicle)!.passengers) delete out.vehicle;
    }
    return out;
  }

  function hydrate(useDraft: boolean) {
    const url = fromUrl();
    // A deep link (hero widget, service or fleet card) describes a new trip: keep only the guest's
    // contact details from an older draft so routes and stops never mix.
    const deepLink = !!(url.type || url.from || url.to);
    let draft = useDraft ? loadDraft() : null;
    if (draft && deepLink) {
      const { name, phone, email, contact } = draft;
      draft = { name, phone, email, contact };
    }
    if (draft) write(draft);
    write(url);
    syncConditionals(false);
    syncAllSteppers();
    updateVehicles(false);
    renderSummary();
    const meaningful = !deepLink && draft && (draft.from || draft.to || draft.name || draft.type);
    restore.hidden = !meaningful;
  }

  root.querySelector('[data-restart]')!.addEventListener('click', () => {
    clearDraft();
    form.reset();
    stopsWrap.innerHTML = '';
    relabelStops();
    clearStepErrors(1);
    hydrate(false);
    if (!reduce) gsap.to(restore, { opacity: 0, height: 0, marginBottom: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => { restore.hidden = true; gsap.set(restore, { clearProps: 'all' }); } });
    else restore.hidden = true;
    form.querySelector<HTMLInputElement>('input[name="type"]')?.focus();
  });

  /* ---------- Submit ---------- */
  async function submit() {
    submitting = true;
    submitErr.classList.remove('is-shown');
    submitErr.textContent = '';
    nextBtn.classList.add('is-loading');
    nextBtn.setAttribute('aria-busy', 'true');
    announce_('Sending your reservation request');
    const data = read();
    try {
      const { reference } = await submitBooking(data);
      track('booking_submit', { service_type: data.type, vehicle: data.vehicle, passengers: data.pax, hours: data.type === 'hourly' ? data.hours : undefined, round_trip: data.roundTrip, add_ons: data.addons.length });
      clearDraft();
      showSuccess(reference, data);
    } catch {
      submitting = false;
      nextBtn.classList.remove('is-loading');
      nextBtn.removeAttribute('aria-busy');
      submitErr.textContent = `We couldn't send your request. Please try again or call ${site.phone}.`;
      submitErr.classList.add('is-shown');
    }
  }

  function showSuccess(reference: string, data: BookingData) {
    success.querySelector<HTMLElement>('[data-ref]')!.textContent = reference;
    const confirmBy = CONFIRM_BY[data.contact] || 'by text';
    success.querySelector<HTMLElement>('[data-confirm-by]')!.textContent = confirmBy;
    const confirmBy2 = success.querySelector<HTMLElement>('[data-confirm-by-2]');
    if (confirmBy2) confirmBy2.textContent = confirmBy;
    success.querySelector<HTMLElement>('[data-success-summary]')!.innerHTML = `<div class="bk-review">${reviewHTML(data, false)}</div>`;

    const reveal = () => {
      form.hidden = true;
      summary.hidden = true;
      if (head) head.hidden = true;
      layout.classList.add('is-complete');
      success.hidden = false;
      if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
      success.focus({ preventScroll: true });
      announce_(`Request received. Reference ${reference}.`);
      if (reduce) return;
      const paths = Array.from(success.querySelectorAll<SVGGeometryElement>('[data-draw]'));
      paths.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
      const tl = gsap.timeline();
      tl.fromTo(success, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' })
        .to(paths[0], { strokeDashoffset: 0, duration: 1.1, ease: 'expo.inOut' }, 0.1)
        .to(paths[1], { strokeDashoffset: 0, duration: 0.7, ease: 'expo.out' }, 0.75)
        .fromTo(success.querySelectorAll('[data-s-anim]'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.5);
    };
    if (reduce) { reveal(); return; }
    gsap.to([form, summary], { opacity: 0, y: -16, duration: 0.45, ease: 'power2.in', onComplete: reveal });
  }

  /* ---------- Boot ---------- */
  const today = todayISO();
  input('date')!.min = today;
  input('returnDate')!.min = today;
  input('date')!.addEventListener('change', () => { const v = input('date')!.value; input('returnDate')!.min = v || today; });
  hydrate(true);
  relabelStops();
  // Warm the vehicle images while the guest fills step 1, so step 2 appears fully loaded.
  const warm = () => root.querySelectorAll<HTMLImageElement>('.bk-vehicle img').forEach((img) => { img.loading = 'eager'; });
  if (document.readyState === 'complete') setTimeout(warm, 1200);
  else window.addEventListener('load', () => setTimeout(warm, 1200), { once: true });
  updateChrome();
  gsap.set(progFill, { scaleX: 0 });
}
