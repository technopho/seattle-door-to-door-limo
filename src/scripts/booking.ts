// Booking wizard for /book/: 4-step reservation request with live summary, URL prefill,
// per-step validation, draft persistence and delivery through src/lib/submit.ts with three
// outcomes: sent (success), no endpoint configured ("One last step": text/email/call it in),
// or failed (inline retry).
import gsap from 'gsap';
import { fleet, site } from '../data/site';
import { submitLead } from '../lib/submit';
import { cropStyle, vehicleMedia } from '../components/book/vehicleMedia';

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
  champagne: 'Champagne',
  'extra-luggage': 'Extra luggage space',
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
const MAPS_KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_KEY as string | undefined;
const HOURS = { min: 1, max: 12, fallback: 3 };
const FLIGHT_NOTE: Record<string, string> = {
  arriving: 'We track your flight in real time and adjust pickup automatically.',
  departing: 'Optional for departures. Helps your chauffeur drop you at the right doors.',
};

const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14M3 13.5l2-5A2.5 2.5 0 0 1 7.3 7h9.4a2.5 2.5 0 0 1 2.3 1.5l2 5V17a1 1 0 0 1-1 1h-1.5M3 13.5V17a1 1 0 0 0 1 1h1.5M3 13.5h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/></svg>';

/* ---------------------------------------------------------------------------
   Lead payload
   --------------------------------------------------------------------------- */
function makeReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return 'SDD-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/*
 * Analytics (GTM dataLayer). The ONE conversion event is `booking_submitted`, pushed by src/lib/submit.ts
 * only when the reservations endpoint accepts the request. Its details are the `booking_*` data layer
 * variables pushed just before sending (see submit()). Everything else here is funnel telemetry:
 * booking_step, booking_validation_error, booking_terms_view, booking_submit_error, booking_retry,
 * booking_handoff_shown / booking_handoff (no endpoint: the guest texts, emails, calls or copies it in).
 */
function track(event: string, payload: Record<string, unknown> = {}) {
  try { window.dataLayer?.push({ event, ...payload }); } catch { /* analytics must never break booking */ }
}
function setLayer(vars: Record<string, unknown>) {
  try { window.dataLayer?.push(vars); } catch { /* ignore */ }
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */
const pad = (n: number) => String(n).padStart(2, '0');
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function parseISO(iso: string) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function fmtDate(iso: string) { return parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
// On screen the time never splits from its AM/PM (no-break space); messages and the payload use a plain space.
function fmtTime(t: string, nbsp = true) {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${pad(m || 0)}${nbsp ? '\u00a0' : ' '}${h >= 12 ? 'PM' : 'AM'}`;
}
// "Point-to-point" never breaks at its hyphens on screen.
const nbHyphen = (s: string) => s.replace(/-/g, '\u2011');
function fmtWhen(date: string, time: string) { return [date && fmtDate(date), time && fmtTime(time)].filter(Boolean).join(' · '); }
function fmtDateFull(iso: string) { return parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
function plural(n: number, one: string, many = one + 's') { return `${n} ${n === 1 ? one : many}`; }
function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}
/** Adds or removes one id in a space-separated attribute such as aria-describedby. */
function setToken(el: Element, attr: string, token: string, on: boolean) {
  const list = (el.getAttribute(attr) || '').split(/\s+/).filter((t) => t && t !== token);
  if (on) list.push(token);
  if (list.length) el.setAttribute(attr, list.join(' '));
  else el.removeAttribute(attr);
}
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
/**
 * The request as flat fields: this is what the reservations endpoint receives (plus the honeypot).
 * Readable values for people, plus machine-friendly ones for CRM / Zapier automation:
 * service_type (booking slug), vehicle_id, date_iso (YYYY-MM-DD), time_24h (HH:MM) and the same for the return.
 */
function leadFields(d: BookingData, reference: string): Record<string, string> {
  const v = fleetById.get(d.vehicle);
  const hourly = d.type === 'hourly';
  const airport = d.type === 'airport';
  const round = d.roundTrip && !hourly;
  const ret = round ? [d.returnDate && fmtDateFull(d.returnDate), d.returnTime && fmtTime(d.returnTime, false)].filter(Boolean).join(' · ') : '';
  return {
    reference,
    service: TYPES[d.type] ? `${TYPES[d.type]}${airport ? (d.direction === 'arriving' ? ' (arriving)' : ' (departing)') : ''}` : '',
    service_type: d.type,
    pickup: d.from,
    stops: d.stops.filter(Boolean).join('; '),
    dropoff: d.to || (hourly ? 'As directed' : ''),
    date: d.date ? fmtDateFull(d.date) : '',
    time: d.time ? fmtTime(d.time, false) : '',
    date_iso: d.date,
    time_24h: d.time,
    return: ret,
    return_date_iso: round ? d.returnDate : '',
    return_time_24h: round ? d.returnTime : '',
    flight: airport ? [d.airline, d.flight].filter(Boolean).join(' ') : '',
    hours: hourly ? plural(d.hours, 'hour') : '',
    passengers: String(d.pax),
    luggage: d.luggage ? plural(d.luggage, 'bag') : 'None',
    vehicle: v ? `${v.name} (${v.category})` : '',
    vehicle_id: v ? v.id : '',
    add_ons: d.addons.map((a) => ADDONS[a] || a).join(', '),
    name: d.name,
    phone: d.phone,
    email: d.email,
    lead_passenger: d.leadName,
    contact_preference: CONTACT[d.contact] || 'Text',
    notes: d.requests,
  };
}

/** The request as a message the guest sends themselves (text / email / copy): same labels as the review step. */
function messageText(d: BookingData, reference: string): string {
  const v = fleetById.get(d.vehicle);
  const hourly = d.type === 'hourly';
  const airport = d.type === 'airport';
  const when = (date: string, time: string) => [date && fmtDateFull(date), time && fmtTime(time, false)].filter(Boolean).join(' · ');
  let service = TYPES[d.type] || '';
  if (airport) service += d.direction === 'arriving' ? ' (arriving)' : ' (departing)';
  const lines: [string, string][] = [
    ['Service', service],
    ['When', when(d.date, d.time)],
    ['Pickup', d.from],
    ...d.stops.filter(Boolean).map((s, i): [string, string] => [`Stop ${i + 1}`, s]),
    ['Drop-off', d.to || (hourly ? 'As directed' : '')],
    ['Duration', hourly ? plural(d.hours, 'hour') : ''],
    ['Flight', airport ? [d.airline, d.flight].filter(Boolean).join(' ') : ''],
    ['Return', d.roundTrip && !hourly ? when(d.returnDate, d.returnTime) : ''],
    ['Vehicle', v ? `${v.name} (${v.category})` : ''],
    ['Party', `${plural(d.pax, 'passenger')} · ${d.luggage ? plural(d.luggage, 'bag') : 'no luggage'}`],
    ['Name', d.name],
    ['Mobile', d.phone],
    ['Email', d.email],
    ['Lead passenger', d.leadName],
    ['Confirm by', CONTACT[d.contact] || 'Text'],
    ['Add-ons', d.addons.map((a) => ADDONS[a] || a).join(', ')],
    ['Requests', d.requests],
  ];
  return [`Reservation request ${reference}`, '', ...lines.filter(([, val]) => val).map(([k, val]) => `${k}: ${val}`)].join('\n');
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
  const handoff = root.querySelector<HTMLElement>('[data-handoff]')!;
  const honeypot = form.querySelector<HTMLInputElement>('input[name="company_website"]');
  const fail = root.querySelector<HTMLElement>('[data-fail]')!;
  const failTitle = root.querySelector<HTMLElement>('[data-fail-title]')!;
  const failMsg = root.querySelector<HTMLElement>('[data-fail-msg]')!;
  const routeEl = root.querySelector<HTMLElement>('[data-route]')!;

  let step = 1;
  let maxStep = 1;
  let busy = false;
  let submitting = false;
  let stopUid = 0;
  let reference = '';

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
      hours: clampInt(s('hours'), HOURS.min, HOURS.max, HOURS.fallback),
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
    if (d.hours !== undefined) input('hours')!.value = String(clampInt(d.hours, HOURS.min, HOURS.max, HOURS.fallback));
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
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim();
    if (!reduce && accent) gsap.from(airportEl, { color: accent, duration: 1.6, ease: 'power2.out', clearProps: 'color' });
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
        <input class="bk-route__input" id="${id}" name="stop" type="text" autocomplete="off" list="bk-places" maxlength="200" placeholder="Add an address" aria-describedby="err-stops" />
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
    const { pax } = read();
    // Recommend on seats only: the per-vehicle luggage figures are placeholders until the client confirms them.
    const rec = VEHICLES.find((v) => v.passengers >= pax);
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
      const isRec = card.dataset.vehicle === rec?.id;
      card.querySelector<HTMLElement>('[data-cap-note]')!.hidden = !tooSmall;
      card.querySelector<HTMLElement>('[data-rec]')!.hidden = !isRec;
      // The option's description lists only what is on screen (a hidden badge would still be read if referenced).
      setToken(radio, 'aria-describedby', `bk-v-${card.dataset.vehicle}-rec`, isRec);
      setToken(radio, 'aria-describedby', `bk-v-${card.dataset.vehicle}-note`, tooSmall);
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
    let svc = nbHyphen(TYPES[d.type] || '');
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
        // Same frame as the step 2 card (src/components/book/vehicleMedia.ts).
        const m = vehicleMedia(v);
        thumb.dataset.v = v.id;
        thumb.classList.toggle('is-studio', !!m.studio);
        thumb.classList.toggle('bk-crop', !!m.crop);
        thumb.classList.toggle('is-graded', !!m.grade);
        thumb.style.cssText = cropStyle(m) ?? '';
        // White-background studio shot: an ivory backdrop (forced light tokens) for the photo to multiply into.
        const backdrop = m.studio ? '<span class="bk-studio" data-theme="light" aria-hidden="true"></span>' : '';
        const pos = m.position && !m.crop ? ` style="object-position:${esc(m.position)}"` : '';
        thumb.innerHTML = `${backdrop}<img src="${esc(m.src)}" alt="" width="${m.width}" height="${m.height}" decoding="async"${pos} />`;
        if (!reduce) gsap.fromTo(thumb.querySelector('img'), { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity' });
      }
      setSlot('vehicle', v.name);
      sumSlot('vehicle-sub').textContent = `${v.category} · seats up to ${v.passengers}`;
    } else {
      if (thumb.dataset.v) { thumb.dataset.v = ''; thumb.classList.remove('is-studio', 'bk-crop', 'is-graded'); thumb.style.cssText = ''; thumb.innerHTML = CAR_SVG; }
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
  // Editable on step 4 (under the step's h3); read-only on the outcome panels, which sit under an h2.
  function reviewHTML(d: BookingData, editable: boolean) {
    const v = fleetById.get(d.vehicle);
    const h = editable ? 'h4' : 'h3';
    const row = (k: string, val: string, wide = false) => val ? `<div class="${wide ? 'is-wide' : ''}"><dt>${k}</dt><dd>${val}</dd></div>` : '';
    const block = (title: string, n: number, body: string) => `
      <section class="bk-review__block">
        <div class="bk-review__head">
          <${h} class="bk-review__title">${title}</${h}>
          ${editable ? `<button type="button" class="bk-review__edit" data-goto="${n}" aria-label="Edit ${title.toLowerCase().replace('&amp;', 'and')}">Edit</button>` : ''}
        </div>
        <dl class="bk-review__list">${body}</dl>
      </section>`;
    let service = esc(nbHyphen(TYPES[d.type] || ''));
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
  // Radio groups carry their error on every option as well as on the group: focus lands on an option,
  // and screen readers read that option's own state and description, not the group's.
  function markGroup(key: 'type' | 'vehicle', invalid: boolean) {
    const group = root.querySelector<HTMLElement>(`[data-group="${key}"]`);
    if (!group) return;
    [group, ...Array.from(group.querySelectorAll<HTMLInputElement>('input[type="radio"]'))].forEach((el) => {
      if (invalid) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      if (el !== group) setToken(el, 'aria-describedby', `err-${key}`, invalid);
    });
  }
  function clearError(key: string) {
    const el = errEl(key);
    if (el) { el.textContent = ''; el.classList.remove('is-shown'); }
    if (key === 'type' || key === 'vehicle') markGroup(key, false);
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
      if (key === 'type' || key === 'vehicle') markGroup(key, true);
      else (mark || [focus]).forEach((m) => m?.setAttribute('aria-invalid', 'true'));
    });

    if (issues.length) {
      // Focus (below) reads the first field and its message; this tells screen-reader users how many more there are.
      announce_(issues.length === 1 ? 'One field needs your attention.' : `${issues.length} fields need your attention.`);
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
    nextLabel.textContent = final ? (fail.hidden ? 'Request reservation' : 'Try again') : step === 3 ? 'Review booking' : 'Continue';
    nextBtn.classList.toggle('is-final', final);
    nextBtn.classList.toggle('btn--lg', final);
    hint.textContent = ['Four quick steps', 'Every vehicle is chauffeur-driven', 'Your details stay private', 'A concierge confirms your ride'][step - 1];
  }

  function goTo(n: number, focusHeading = true) {
    if (n === step || busy || n < 1 || n > stepEls.length) return;
    const fromEl = stepEls[step - 1];
    const toEl = stepEls[n - 1];
    const dir = n > step ? 1 : -1;
    if (n === 2) updateVehicles(false);
    if (n === 4) review.innerHTML = reviewHTML(read(), true);
    hideFail();
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
    if (t.name === 'pax') updateVehicles();
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

  /* ---------- URL prefill (?type=&from=&to=&date=&time=&pax=&hours=&direction=&vehicle=) ---------- */
  const PREFILL_KEYS = ['type', 'from', 'to', 'date', 'time', 'pax', 'hours', 'direction', 'vehicle'];
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
    const hours = q.get('hours'); if (hours) out.hours = clampInt(hours, HOURS.min, HOURS.max, HOURS.fallback);
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
    // A deep link (hero widget, quick quote, service, area or fleet card, including vehicle-only
    // ?vehicle= links) describes a new trip: keep only the guest's contact details from an older draft
    // so routes, stops, party size and vehicles never mix.
    const deepLink = Object.keys(url).length > 0;
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
    if (deepLink) {
      // The link has done its job: drop its prefill parameters from the address bar (other parameters,
      // such as utm_*, stay) and save the trip as the draft. A reload or a discarded mobile tab then
      // restores everything entered since, instead of applying the same link again as a new trip.
      try {
        const q = new URLSearchParams(location.search);
        PREFILL_KEYS.forEach((k) => q.delete(k));
        const rest = q.toString();
        history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
      } catch { /* keep the URL as it is */ }
      saveDraft();
    }
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
  function setLoading(on: boolean) {
    nextBtn.classList.toggle('is-loading', on);
    if (on) nextBtn.setAttribute('aria-busy', 'true');
    else nextBtn.removeAttribute('aria-busy');
  }

  async function submit() {
    if (submitting) return;
    submitting = true;
    if (!fail.hidden) track('booking_retry', { reference });
    hideFail();
    setLoading(true);
    announce_('Sending your reservation request');
    const data = read();
    reference ||= makeReference();
    const fields = leadFields(data, reference);
    const trap = (honeypot?.value ?? '').trim();
    const pause = new Promise((r) => setTimeout(r, reduce ? 0 : 650)); // spinner floor: the hand-off never feels like a glitch

    // Honeypot hit. Browser autofill or a password manager can fill a hidden field for a real guest, so a
    // hit never gets the "Request received" screen (that would hide a lost booking behind a false
    // confirmation). Nothing is sent to the endpoint; the guest gets "One last step" and can still text,
    // email or call the request in. A bot simply stops here.
    if (trap) {
      await pause;
      track('booking_handoff_shown', { reason: 'check', service_type: data.type, vehicle: data.vehicle, reference });
      showOutcome('handoff', data);
      return;
    }

    // Details for the `booking_submitted` conversion that submit.ts pushes on success.
    setLayer({
      booking_reference: reference,
      booking_service_type: data.type,
      booking_vehicle: data.vehicle,
      booking_passengers: data.pax,
      booking_hours: data.type === 'hourly' ? data.hours : undefined,
      booking_round_trip: data.roundTrip,
      booking_add_ons: data.addons.length,
    });
    const [result] = await Promise.all([submitLead('booking', { ...fields, company_website: '' }), pause]);

    if (result.ok) {
      clearDraft();
      showOutcome('success', data);
      return;
    }
    if (result.reason === 'no-endpoint') {
      // Nothing was sent: the guest sends the prefilled request themselves. The draft stays until they do.
      track('booking_handoff_shown', { reason: 'no-endpoint', service_type: data.type, vehicle: data.vehicle, reference });
      showOutcome('handoff', data);
      return;
    }
    submitting = false;
    setLoading(false);
    track('booking_submit_error', { reason: result.reason, status: result.status });
    showFail(result.reason, result.status);
  }

  /* ---------- Delivery failure (network / rejected) ---------- */
  // The main button becomes "Try again" while the notice shows, so there is one primary action, not two.
  function showFail(reason: 'network' | 'rejected', status?: number) {
    fail.hidden = false;
    updateChrome();
    // Fill the alert region after it is visible so screen readers announce it.
    requestAnimationFrame(() => {
      failTitle.textContent = 'We couldn’t send your request';
      failMsg.textContent = reason === 'network'
        ? `Check your connection and try again, or call us at ${site.phone}. Your details are still here.`
        : `Our reservations system didn’t accept it${status ? ` (error ${status})` : ''}. Try again, or call us at ${site.phone}.`;
      // A guest who scrolled up to re-read the review and pressed the sticky button must see why nothing happened.
      const r = fail.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 120) smoothScrollTo(fail, -window.innerHeight / 3);
    });
    if (!reduce) gsap.fromTo(fail, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', clearProps: 'opacity,transform' });
  }
  function hideFail() {
    if (fail.hidden) return;
    fail.hidden = true;
    failTitle.textContent = '';
    failMsg.textContent = '';
    updateChrome();
  }

  /* ---------- End states ---------- */
  function showOutcome(kind: 'success' | 'handoff', data: BookingData) {
    const panel = kind === 'success' ? success : handoff;
    panel.querySelectorAll<HTMLElement>('[data-ref]').forEach((el) => { el.textContent = reference; });
    panel.querySelector<HTMLElement>('[data-outcome-summary]')!.innerHTML = `<div class="bk-review">${reviewHTML(data, false)}</div>`;

    if (kind === 'success') {
      const confirmBy = CONFIRM_BY[data.contact] || 'by text';
      panel.querySelectorAll<HTMLElement>('[data-confirm-by], [data-confirm-by-2]').forEach((el) => { el.textContent = confirmBy; });
    } else {
      prepareHandoff(data);
    }

    const announcement = kind === 'success'
      ? `Request received. Reference ${reference}.`
      : `One last step. Your request ${reference} has not been sent yet. Text, email or call it in.`;

    const reveal = () => {
      form.hidden = true;
      summary.hidden = true;
      // The page h1 stays in the accessibility tree (visually hidden) above the outcome's own heading.
      head?.classList.add('is-collapsed');
      layout.classList.add('is-complete');
      panel.hidden = false;
      if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
      panel.focus({ preventScroll: true });
      announce_(announcement);
      if (reduce) return;
      const paths = Array.from(panel.querySelectorAll<SVGGeometryElement>('[data-draw]'));
      paths.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
      const tl = gsap.timeline();
      tl.fromTo(panel, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', clearProps: 'opacity,transform' })
        .to(paths[0], { strokeDashoffset: 0, duration: 1.1, ease: 'expo.inOut' }, 0.1)
        .to(paths.slice(1), { strokeDashoffset: 0, duration: 0.8, ease: 'expo.out', stagger: 0.12 }, 0.75)
        .fromTo(panel.querySelectorAll('[data-s-anim]'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.5);
    };
    if (reduce) { reveal(); return; }
    gsap.to([form, summary], { opacity: 0, y: -16, duration: 0.45, ease: 'power2.in', onComplete: reveal });
  }

  /* ---------- "One last step": text, email or call the request in ---------- */
  let plainText = '';
  // Prefilled sms:/mailto: links stay under about 2,000 characters, where Windows protocol handlers and
  // Outlook truncate or reject them. A long request shortens only its Requests line; Copy details always
  // carries the full text.
  const LINK_MAX = 1900;
  function fitLink(build: (text: string) => string, data: BookingData) {
    let href = build(plainText);
    const chars = Array.from(data.requests); // code points, so an emoji is never split (encodeURIComponent would throw)
    let n = chars.length;
    while (href.length > LINK_MAX && n > 0) {
      n = Math.max(0, n - Math.max(20, Math.ceil((href.length - LINK_MAX) / 3)));
      const requests = n ? `${chars.slice(0, n).join('').trimEnd()}… (shortened to fit this message)` : 'Too long for this message, sent separately';
      href = build(messageText({ ...data, requests }, reference));
    }
    return href;
  }
  function prepareHandoff(data: BookingData) {
    plainText = messageText(data, reference);
    const sms = handoff.querySelector<HTMLAnchorElement>('[data-send="sms"]')!;
    const email = handoff.querySelector<HTMLAnchorElement>('[data-send="email"]')!;
    // "?&body=" opens prefilled on both iOS and Android.
    sms.href = fitLink((t) => `${site.smsHref}?&body=${encodeURIComponent(t)}`, data);
    const subject = encodeURIComponent(`Reservation request ${reference}`);
    email.href = fitLink((t) => `mailto:${site.email}?subject=${subject}&body=${encodeURIComponent(t.replace(/\n/g, '\r\n'))}`, data);
    // Lead with the likeliest channel for this device: Messages on phones, email on computers. Computers
    // often have no Messages app (sms: does nothing on most Windows/Linux machines), so text goes last there.
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    sms.classList.toggle('is-primary', touch);
    email.classList.toggle('is-primary', !touch);
    // Reorder the list itself (not with CSS order) so the Tab order matches what is on screen.
    const list = handoff.querySelector<HTMLElement>('[data-send-list]');
    if (list) {
      const order = touch ? ['sms', 'email', 'call'] : ['email', 'call', 'sms'];
      order.forEach((k) => { const li = list.querySelector(`[data-send="${k}"]`)?.closest('li'); if (li) list.append(li); });
    }
    const smsNote = handoff.querySelector<HTMLElement>('[data-sms-note]');
    // The number never splits across lines (no-break space and hyphen).
    const phone = site.phone.replace(/ /g, '\u00a0').replace(/-/g, '\u2011');
    if (smsNote) smsNote.textContent = touch ? 'Opens Messages, ready to send' : `Send from your phone to ${phone}`;
  }

  handoff.querySelectorAll<HTMLAnchorElement>('[data-send]').forEach((a) => {
    a.addEventListener('click', () => {
      track('booking_handoff', { channel: a.dataset.send, reference });
      clearDraft();
    });
  });

  const copyBtn = handoff.querySelector<HTMLButtonElement>('[data-copy]')!;
  const copyLabel = handoff.querySelector<HTMLElement>('[data-copy-label]')!;
  const copyStatus = handoff.querySelector<HTMLElement>('[data-copy-status]')!;
  let copyTimer = 0;
  async function copyText(text: string) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    // Older browsers: a temporary off-screen textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    copyBtn.focus();
    if (!ok) throw new Error('copy failed');
  }
  copyBtn.addEventListener('click', async () => {
    try {
      await copyText(plainText);
      copyLabel.textContent = 'Copied';
      copyStatus.textContent = 'Request details copied';
      track('booking_handoff', { channel: 'copy', reference });
    } catch {
      copyLabel.textContent = 'Copy unavailable';
    }
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copyLabel.textContent = 'Copy details'; copyStatus.textContent = ''; }, 2400);
  });

  // Back to the review step to change something; the same reference is kept.
  handoff.querySelector<HTMLButtonElement>('[data-handoff-edit]')!.addEventListener('click', () => {
    handoff.hidden = true;
    form.hidden = false;
    summary.hidden = false;
    head?.classList.remove('is-collapsed');
    layout.classList.remove('is-complete');
    submitting = false;
    setLoading(false);
    gsap.set([form, summary], { clearProps: 'opacity,transform' });
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    stepEls[step - 1].querySelector<HTMLElement>('.bk-step__title')?.focus({ preventScroll: true });
    if (!reduce) gsap.fromTo([form, summary], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,transform' });
    syncSummaryScroll();
    track('booking_handoff_edit', { reference });
  });

  /* ---------- Optional address suggestions (Google Places) ---------- */
  // Loaded on the first focus of an address field, and only when a Maps key is configured.
  if (MAPS_KEY) {
    const start = (e: FocusEvent) => {
      if (!(e.target as HTMLElement).classList?.contains('bk-route__input')) return;
      routeEl.removeEventListener('focusin', start);
      import('../components/book/places')
        .then(({ initPlaces }) => initPlaces(routeEl, MAPS_KEY))
        .catch((err) => console.warn('[booking] Address suggestions unavailable:', err));
    };
    routeEl.addEventListener('focusin', start);
  }

  /* ---------- Boot ---------- */
  const today = todayISO();
  input('date')!.min = today;
  input('returnDate')!.min = today;
  input('date')!.addEventListener('change', () => { const v = input('date')!.value; input('returnDate')!.min = v || today; });
  hydrate(true);
  relabelStops();
  // Warm the step 2 photos only once the guest shows intent (types a route, or reaches for Continue), or
  // when the route arrived prefilled, so step 2 appears fully loaded without every step 1 visit paying
  // for six photos. Never on Save-Data or slow connections: there they load when step 2 is shown.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn?.saveData && !/(^|-)2g|3g/.test(conn?.effectiveType ?? '')) {
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      root.querySelectorAll<HTMLImageElement>('.bk-vehicle img').forEach((img) => { img.loading = 'eager'; });
    };
    routeEl.addEventListener('input', warm, { once: true });
    (['pointerenter', 'focus', 'touchstart'] as const).forEach((ev) => nextBtn.addEventListener(ev, warm, { once: true, passive: true }));
    const { from, to, type } = read();
    if (from && (to || type === 'hourly')) {
      if (document.readyState === 'complete') setTimeout(warm, 1200);
      else window.addEventListener('load', () => setTimeout(warm, 1200), { once: true });
    }
  }
  updateChrome();
  gsap.set(progFill, { scaleX: 0 });
}
