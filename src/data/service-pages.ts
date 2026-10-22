// Service landing page content (/services/<page>/), keyed by the booking slug in site.ts `services`.
// Facts come from site.ts (fleet capacities, travel times, service points, FAQs); everything here is
// presentation copy. Do not add prices, minimums, awards, statistics or named partners.
import { fleet, images, areas } from './site';

/** A headline with an accent tail, rendered as `{text} <em>{em}</em>`. */
export type Heading = { text: string; em: string };

export type QuoteMode = 'airport' | 'cruise' | 'hourly' | 'route';

export type ServicePage = {
  seo: { title: string; description: string };
  /** Hero eyebrow: keep it distinct from the breadcrumb's current item (crumb ?? service title). */
  eyebrow: string;
  /** Short breadcrumb label for the current page when the service title is too long for a phone (defaults to the title). */
  crumb?: string;
  h1: Heading;
  /** Two short paragraphs: the first sits in the hero, the second opens the overview. */
  intro: [string, string];
  /** position: object-position on desktop (tall frame) and on the index/related cards; positionSm: on tablet/phone (wide 4:3 / 5:4 frame).
   *  matte: backdrop colour of a studio shot; on the tall desktop frame the whole photo is letterboxed on it instead of cropped. */
  hero: { image: string; alt: string; width: number; height: number; position?: string; positionSm?: string; matte?: string };
  includedTitle: Heading;
  highlights: { icon: string; title: string; text: string }[];
  stepsTitle: Heading;
  steps: { title: string; text: string }[];
  /** Fleet ids (site.ts) with a one-line reason the vehicle suits this service. */
  vehicles: { id: string; why: string }[];
  /** Well-known local places this service runs to (context only, not links). */
  places: string[];
  faqs: { q: string; a: string }[];
  /** Related booking slugs. */
  related: string[];
  quote: { mode: QuoteMode; title: Heading; fromPlaceholder?: string; toPlaceholder?: string };
  /** Primary button label (links to /book/?type=<slug>). */
  reserveLabel: string;
  cta: Heading;
  /** Per-service section headings, so no two service pages share the same H2s. */
  vehiclesTitle: Heading;
  vehiclesLead: string;
  areasTitle: Heading;
  areasLead: string;
  faqTitle: Heading;
  faqLead: string;
  relatedTitle: Heading;
  /** Service JSON-LD name (keyword-led, e.g. "Seattle Airport Car Service"). */
  schemaName: string;
};

const vehiclesLeadBase = 'Every vehicle is chauffeur-driven and detailed before each ride.';
const faqLeadTail = 'Anything else, our reservations desk is a call or text away, day or night.';

const v = (id: string) => fleet.find((f) => f.id === id)!;
const eta = (slug: string) => areas.find((a) => a.slug === slug)?.eta ?? '';
const etaMin = (slug: string) => eta(slug).replace(/ from SeaTac$/, '');

export const servicePages: Record<string, ServicePage> = {
  /* ---------------------------------------------------------------- Airport */
  airport: {
    seo: {
      title: 'Seattle Airport Limo & SeaTac Car Service | Door to Door',
      description:
        'Flight-tracked SeaTac, Paine Field and Boeing Field transfers with meet & greet and luggage help. Private chauffeurs across Seattle, 24/7. Reserve online.',
    },
    eyebrow: 'Airport car service',
    h1: { text: 'Seattle airport transfers,', em: 'timed to your flight.' },
    intro: [
      'Private car service to and from Seattle-Tacoma International, Paine Field and Boeing Field. We track your flight in real time, so your chauffeur is ready when you actually land, not when you were scheduled to.',
      'An early departure from Bellevue, a late arrival home to Capitol Hill or a family of six with ski bags: we size the vehicle to your party and luggage and handle every bag from the curb to your door. One booking, one chauffeur, no rideshare queue.',
    ],
    hero: { image: images.plane, alt: 'Aircraft wing above the clouds in warm morning light', width: 1600, height: 1063, position: '62% 50%' },
    includedTitle: { text: 'Built around your flight,', em: 'not the clock.' },
    highlights: [
      { icon: 'plane', title: 'Live flight tracking', text: 'We follow your flight from departure and move your pickup for delays or early arrivals. Nothing to call in.' },
      { icon: 'flag', title: 'Meet & greet', text: 'Ask for a name-sign greeting at arrivals. Either way, your chauffeur texts the exact meeting point as you land.' },
      { icon: 'suitcase', title: 'Luggage handled', text: 'Bags loaded and unloaded for you. Mention skis, golf bags or strollers and we size the vehicle to match.' },
      { icon: 'hourglass', title: 'Complimentary wait time', text: 'Wait time is included on airport pickups, so a slow bag carousel never turns into a stressful sprint.' },
      { icon: 'clock', title: 'Early or late, 24/7', text: 'Pre-dawn departures and midnight arrivals are routine. Our reservations desk answers around the clock.' },
      { icon: 'shield', title: 'Vetted chauffeurs', text: 'Every chauffeur is licensed, background-checked and trained in discreet, safety-first service.' },
    ],
    stepsTitle: { text: 'From wheels-down', em: 'to your door.' },
    steps: [
      { title: 'Share your flight', text: 'Book online or by phone with your airline and flight number. A real person confirms your booking.' },
      { title: 'We track it live', text: 'Your chauffeur follows the flight and adjusts the pickup to the real arrival time, early or delayed.' },
      { title: 'Meet at arrivals', text: 'As you land, you get a text with your chauffeur’s name, the vehicle and the exact meeting point.' },
      { title: 'Straight home', text: 'Bags loaded, a quiet cabin, and a direct ride to your home, hotel or office anywhere in the Puget Sound.' },
    ],
    vehicles: [
      { id: 's550', why: 'Solo travelers and couples who want a quiet cabin straight to the meeting or home.' },
      { id: 'escalade', why: 'Families and ski trips, with room for the whole party and the bags.' },
      { id: 'sprinter', why: 'Teams, conferences and family reunions arriving on the same flight.' },
    ],
    places: ['Seattle-Tacoma International (SEA)', 'Paine Field, Everett (PAE)', 'Boeing Field (BFI)'],
    faqs: [
      { q: 'What happens if my flight is delayed or early?', a: 'We track your flight in real time and move your pickup to match the actual arrival. There is nothing to call in: your chauffeur is ready when you land, not when you were scheduled to.' },
      { q: 'Where do I meet my chauffeur at SeaTac?', a: 'As you land, your chauffeur texts you their name, the vehicle and the exact meeting point. If you asked for a meet & greet, they wait at arrivals with a name sign.' },
      { q: 'Do you serve Paine Field and Boeing Field?', a: 'Yes. Alongside SeaTac we serve Paine Field in Everett, convenient for the north end, and Boeing Field for private and charter flights. For a private flight, add the operator or FBO name to your booking notes and we confirm the meeting point.' },
      { q: 'How early should I schedule a departure pickup?', a: `We suggest a pickup time based on your departure, the time of day and the drive from your door. In normal traffic, downtown Seattle is about ${etaMin('seattle')} from SeaTac, Redmond about ${etaMin('redmond')} and Everett about ${etaMin('everett')}; allow extra time at rush hour.` },
      { q: 'Can you provide a child seat?', a: 'Child seats can be requested when you book; we confirm availability with your quote. Add the request to your booking with each child’s age so we can plan the right seat.' },
    ],
    related: ['cruise', 'corporate', 'hourly'],
    quote: { mode: 'airport', title: { text: 'Quote your', em: 'airport transfer.' } },
    reserveLabel: 'Book your transfer',
    cta: { text: 'Leave the airport run', em: 'to us.' },
    vehiclesTitle: { text: 'Cars sized for', em: 'every airport run.' },
    vehiclesLead: `${vehiclesLeadBase} Tell us how many are flying and how many bags are coming, and we match the car to the trip.`,
    areasTitle: { text: 'SeaTac pickups across', em: 'Seattle & the Eastside.' },
    areasLead: 'Door-to-terminal transfers from every city we serve, from Tacoma in the south to Everett and Paine Field in the north. Travel times are from SeaTac in normal traffic.',
    faqTitle: { text: 'Airport transfer', em: 'questions.' },
    faqLead: `Flight delays, meeting points and pickup timing, answered. ${faqLeadTail}`,
    relatedTitle: { text: 'After you land,', em: 'we keep driving.' },
    schemaName: 'Seattle Airport Car Service',
  },

  /* ---------------------------------------------------------------- Corporate */
  corporate: {
    seo: {
      title: 'Seattle Corporate Car Service & Roadshows | Door to Door',
      description:
        'Executive black car service in Seattle, Bellevue and Redmond for roadshows, client meetings and airport runs. Corporate accounts and invoicing. Get a quote.',
    },
    eyebrow: 'Executive car service',
    h1: { text: 'Seattle corporate car service,', em: 'quietly precise.' },
    intro: [
      'Discreet black car service for executives, visiting clients and the teams who host them. From a SeaTac pickup to back-to-back meetings in South Lake Union, downtown Bellevue and the Microsoft campus in Redmond, the schedule holds and conversations stay private.',
      'Book a single ride or open a corporate account with consolidated invoicing. Our reservations desk coordinates roadshows, multi-stop days and VIP guests, so nobody on your team is chasing a driver.',
    ],
    hero: { image: images.escalade, alt: 'Black Cadillac Escalade executive SUV, polished and ready for a corporate pickup', width: 1200, height: 800, position: '30% 60%' },
    includedTitle: { text: 'Your office,', em: 'in motion.' },
    highlights: [
      { icon: 'briefcase', title: 'Accounts & invoicing', text: 'Open a corporate account and keep company travel on consolidated invoices instead of a stack of receipts.' },
      { icon: 'route', title: 'Multi-stop itineraries', text: 'Back-to-back meetings across Seattle and the Eastside, with your chauffeur waiting between stops.' },
      { icon: 'wifi', title: 'Wi-Fi & charging', text: 'Stay connected between meetings. Our S550 and executive Sprinter have Wi-Fi, and the Sprinter has charging ports; ask when you book.' },
      { icon: 'shield', title: 'Strict confidentiality', text: 'Chauffeurs trained in discretion. What is said in the cabin stays in the cabin.' },
      { icon: 'users', title: 'Guests & VIPs', text: 'Book rides for visiting clients, speakers and board members in your company’s name, looked after from the moment they land.' },
      { icon: 'car', title: 'An executive fleet', text: 'Mercedes-Benz S550, Tesla Model S, Cadillac Escalade and an executive Sprinter for teams of up to 14.' },
    ],
    stepsTitle: { text: 'One brief,', em: 'every stop covered.' },
    steps: [
      { title: 'Send the brief', text: 'Flights, meeting addresses and passenger names. One reservation can cover a full day or a multi-day roadshow.' },
      { title: 'We plan the day', text: 'Timings between stops are mapped around Seattle traffic and confirmed in writing by a real person.' },
      { title: 'On time, every stop', text: 'Your chauffeur arrives ahead of time, waits between meetings and adapts as the agenda shifts.' },
      { title: 'One invoice', text: 'Account holders receive consolidated invoicing, so the trip is easy to reconcile.' },
    ],
    vehicles: [
      { id: 's550', why: 'Executives and client pickups that call for a composed, private cabin.' },
      { id: 'escalade', why: 'VIP arrivals and small teams, with a privacy partition for calls on the move.' },
      { id: 'sprinter', why: 'Roadshows, offsites and team transfers with conference seating and Wi-Fi.' },
    ],
    places: ['Microsoft campus, Redmond', 'South Lake Union', 'Downtown Bellevue', 'Seattle Convention Center', 'SeaTac Airport'],
    faqs: [
      { q: 'Can we set up a corporate account?', a: 'Yes. A corporate account lets your team book under one company profile with consolidated invoicing. Call or email our reservations desk and we will set it up with you.' },
      { q: 'Do you handle investor roadshows and multi-stop days?', a: 'Yes. Share the schedule and we plan the day across Seattle, Bellevue and Redmond, with your chauffeur waiting between meetings and adjusting as timings change.' },
      { q: 'Can we book rides for clients and guests?', a: 'Of course. Book in your company’s name, add each guest’s details and flight, and we look after them from pickup to drop-off.' },
      { q: 'Do you serve the Microsoft and Amazon campuses?', a: `Yes. Redmond, South Lake Union and downtown Bellevue are all within our core service area. Redmond is about ${etaMin('redmond')} from SeaTac in normal traffic.` },
      { q: 'Is the cabin private enough for calls?', a: 'Yes. Chauffeurs are trained in discretion, and the Cadillac Escalade has a privacy partition. Tell us you need a quiet ride and we keep it that way.' },
    ],
    related: ['airport', 'hourly', 'events'],
    quote: { mode: 'route', title: { text: 'Quote an', em: 'executive ride.' }, fromPlaceholder: 'Office, hotel or airport', toPlaceholder: 'Office, venue or airport' },
    reserveLabel: 'Book a car',
    cta: { text: 'Your next meeting,', em: 'handled.' },
    vehiclesTitle: { text: 'An executive fleet,', em: 'matched to the agenda.' },
    vehiclesLead: `${vehiclesLeadBase} Tell us who is traveling and how many stops the day holds, and we recommend the right car.`,
    areasTitle: { text: 'Business travel across', em: 'Seattle, Bellevue & Redmond.' },
    areasLead: 'Downtown towers, Eastside campuses and every airport run in between. Travel times are from SeaTac in normal traffic; a roadshow farther afield is a custom route.',
    faqTitle: { text: 'Corporate travel', em: 'questions.' },
    faqLead: `Accounts, roadshows and guest bookings, answered. ${faqLeadTail}`,
    relatedTitle: { text: 'Beyond', em: 'the boardroom.' },
    schemaName: 'Seattle Corporate Car Service',
  },

  /* ---------------------------------------------------------------- Weddings */
  weddings: {
    seo: {
      title: 'Seattle Wedding Limo & Guest Shuttles | Door to Door',
      description:
        'Wedding limousines and guest shuttles across Seattle and the Eastside, timed to your day from the first look to the grand exit. Plan your wedding transport.',
    },
    eyebrow: 'Wedding transportation',
    h1: { text: 'Seattle wedding limousines,', em: 'timed to the minute.' },
    intro: [
      'From the first look to the grand exit, we plan your wedding transportation around the timeline you have rehearsed: a stretch limousine for the wedding party, a Sprinter for guests and an understated getaway car, each arriving exactly when your planner needs it.',
      'We drive to downtown hotels, Woodinville wineries, waterfront venues on Lake Union and Lake Washington and estates across the Eastside. Share the schedule once and we coordinate every vehicle from there.',
    ],
    hero: { image: images.wedding, alt: 'Bride and groom celebrating with their guests at an outdoor wedding reception', width: 1600, height: 1068, position: '68% 50%' },
    includedTitle: { text: 'The day runs', em: 'as rehearsed.' },
    highlights: [
      { icon: 'calendar', title: 'Timeline-led planning', text: 'Pickups built around your run-of-show, from getting ready to the last dance.' },
      { icon: 'car', title: 'Multi-vehicle timing', text: 'Couple, wedding party and guests move on one coordinated plan, so nobody waits at the venue.' },
      { icon: 'sparkle', title: 'Red carpet arrival', text: 'A red carpet at the door for the moment you step out, on request.' },
      { icon: 'glass', title: 'Champagne on request', text: 'Chilled champagne for the couple’s ride or the getaway car, for guests 21 and over.' },
      { icon: 'rings', title: 'Decorated vehicles', text: 'Tasteful wedding decoration on request, so the car looks the part in every photo.' },
      { icon: 'users', title: 'Guest shuttles', text: `A Sprinter carries up to ${v('sprinter').passengers} guests between hotel, ceremony and reception, so nobody drives after the toast.` },
    ],
    stepsTitle: { text: 'Planned once,', em: 'perfect on the day.' },
    steps: [
      { title: 'Share your timeline', text: 'Venues, headcount and the key moments: getting ready, ceremony, portraits, reception and exit.' },
      { title: 'We design the fleet', text: 'We recommend the right mix of vehicles and a pickup plan for each, with breathing room for photos.' },
      { title: 'Confirmed in writing', text: 'A real person confirms every detail, and your chauffeurs’ details arrive before the day.' },
      { title: 'Enjoy the day', text: 'Chauffeurs arrive ahead of time and run the plan, from the first pickup to the grand exit.' },
    ],
    vehicles: [
      { id: 'stretch', why: 'The classic arrival for the couple or the wedding party.' },
      { id: 'sprinter', why: 'Guest shuttles between hotel, ceremony and reception.' },
      { id: 's550', why: 'An understated getaway car for two.' },
    ],
    places: ['Woodinville wine country', 'Lake Union', 'Lake Washington waterfront', 'Downtown Seattle hotels', 'Kirkland waterfront'],
    faqs: [
      { q: 'How far ahead should we book wedding transportation?', a: 'As soon as your date and venues are set. Summer Saturdays are the heart of the Seattle wedding season, so reserve the stretch limousine and any guest shuttles early.' },
      { q: 'Can you move the wedding party and guests at the same time?', a: 'Yes. We coordinate multiple vehicles on one timeline, for example a stretch limousine for the wedding party, a Sprinter shuttling guests from the hotel and a sedan for the getaway.' },
      { q: 'What if the day runs behind schedule?', a: 'We build breathing room into the plan for portraits and toasts. If you need more time on the day, speak to your chauffeur or call us; extra time depends on availability.' },
      { q: 'Can we have champagne in the limousine?', a: 'Champagne is available on request for guests 21 and over. Let us know when you book.' },
      { q: 'Do you serve venues outside Seattle?', a: 'Yes. We cover Seattle, Bellevue, Kirkland, Redmond, Tacoma and Everett, including Woodinville wine country and waterfront venues. For a venue farther afield, ask us about a custom route.' },
    ],
    related: ['events', 'hourly', 'airport'],
    quote: { mode: 'route', title: { text: 'Plan your', em: 'wedding transport.' }, fromPlaceholder: 'Hotel or getting-ready location', toPlaceholder: 'Ceremony or reception venue' },
    reserveLabel: 'Plan your wedding',
    cta: { text: 'Every arrival,', em: 'exactly on cue.' },
    vehiclesTitle: { text: 'A fleet for', em: 'the whole wedding party.' },
    vehiclesLead: `${vehiclesLeadBase} Share your headcount and venues, and we plan the right mix of cars for the couple, the party and your guests.`,
    areasTitle: { text: 'Wedding venues across', em: 'Seattle & the Eastside.' },
    areasLead: 'Downtown hotels, waterfront venues and Woodinville wineries, from Tacoma to Everett. Travel times are from SeaTac, handy for guests flying in.',
    faqTitle: { text: 'Wedding transportation', em: 'questions.' },
    faqLead: `Booking windows, timelines and champagne, answered. ${faqLeadTail}`,
    relatedTitle: { text: 'More for', em: 'the celebration.' },
    schemaName: 'Seattle Wedding Limousine Service',
  },

  /* ---------------------------------------------------------------- Cruise */
  cruise: {
    seo: {
      title: 'Seattle Cruise Transfers: Pier 66 & Pier 91 | Door to Door',
      description:
        'Private transfers between SeaTac, Seattle hotels and the Pier 66 and Pier 91 cruise terminals, with room for every suitcase. Book your cruise transfer today.',
    },
    eyebrow: 'Port of Seattle transfers',
    crumb: 'Cruise Transfers',
    h1: { text: 'Seattle cruise transfers,', em: 'pier to plane.' },
    intro: [
      'Seattle is the gateway to Alaska, and sailing day should start calmly. We drive you from SeaTac or your hotel to the Bell Street Cruise Terminal at Pier 66 or the Smith Cove Cruise Terminal at Pier 91, with room for every suitcase and a smooth curbside drop.',
      'Coming home is just as easy. We meet you after disembarkation and drive you to SeaTac, a downtown hotel or your door, and we can plan the whole loop, airport to hotel to pier and back, as one booking.',
    ],
    hero: { image: images.waterfront, alt: 'Seattle waterfront and downtown skyline at dusk above Elliott Bay', width: 2600, height: 1371, position: '40% 50%' },
    includedTitle: { text: 'Every suitcase,', em: 'every sailing.' },
    highlights: [
      { icon: 'ship', title: 'Both cruise terminals', text: 'Pier 66 Bell Street on the downtown waterfront and Pier 91 Smith Cove at the foot of Magnolia.' },
      { icon: 'route', title: 'Hotel → pier → airport', text: 'Pre-cruise nights and post-cruise flights planned as one seamless itinerary.' },
      { icon: 'suitcase', title: 'Room for the luggage', text: `Our Escalade and Sprinter are sized for a week of Alaska layers; the Sprinter takes up to ${v('sprinter').luggage} bags.` },
      { icon: 'clock', title: 'Timed to boarding', text: 'Pickup planned around your boarding window and morning traffic on the waterfront.' },
      { icon: 'pin', title: 'Exact meeting points', text: 'On disembarkation day your chauffeur texts the precise pickup spot, so you are not searching the curb.' },
      { icon: 'flag', title: 'Sightseeing on the way', text: 'Time before boarding? Ask about a stop at Pike Place Market or a skyline viewpoint.' },
    ],
    stepsTitle: { text: 'Sailing day,', em: 'simplified.' },
    steps: [
      { title: 'Share your sailing', text: 'Ship, terminal and sailing date, your flights, and how many bags are coming along.' },
      { title: 'We plan the route', text: 'Hotel, pier and airport timings mapped as one itinerary and confirmed by a real person.' },
      { title: 'Curbside at the pier', text: 'Your chauffeur handles the bags and drops you at your terminal with every suitcase accounted for.' },
      { title: 'Home from Alaska', text: 'After disembarkation your chauffeur texts the meeting point and drives you to SeaTac, a hotel or home.' },
    ],
    vehicles: [
      { id: 'escalade', why: 'Couples and families with a week of luggage.' },
      { id: 'sprinter', why: 'Groups sailing together, with space for every suitcase.' },
      { id: 's550', why: 'Two travelers packing light.' },
    ],
    places: ['Pier 66, Bell Street Cruise Terminal', 'Pier 91, Smith Cove Cruise Terminal', 'SeaTac Airport', 'Downtown Seattle hotels'],
    faqs: [
      { q: 'Which terminal does my cruise leave from?', a: 'Seattle has two cruise terminals: Bell Street at Pier 66 on the downtown waterfront and Smith Cove at Pier 91, just north of downtown. Your cruise documents list the terminal; share it when you book and we handle the rest.' },
      { q: 'How much luggage can you fit?', a: `It depends on the vehicle: the Cadillac Escalade takes up to ${v('escalade').luggage} bags and the Mercedes-Benz Sprinter up to ${v('sprinter').luggage}. Tell us your headcount and bag count and we recommend the right fit.` },
      { q: 'Can you take us from SeaTac straight to the ship?', a: 'Yes, SeaTac to either terminal is a direct transfer, and we track your flight. Many cruisers fly in the day before; we can collect you at SeaTac, drop you at your hotel and return for the pier the next morning.' },
      { q: 'Can you pick us up after the cruise?', a: 'Yes. We plan the pickup around disembarkation, and your chauffeur texts the exact meeting point that morning. From the pier we go straight to SeaTac, a hotel or your home.' },
      { q: 'Do you collect from outside Seattle?', a: 'Yes. We pick up from hotels and homes across Seattle, Bellevue, Kirkland, Redmond, Tacoma and Everett.' },
    ],
    related: ['airport', 'hourly', 'events'],
    quote: { mode: 'cruise', title: { text: 'Quote your', em: 'cruise transfer.' }, fromPlaceholder: 'Hotel, home or SeaTac' },
    reserveLabel: 'Book your transfer',
    cta: { text: 'Start the voyage', em: 'at your door.' },
    vehiclesTitle: { text: 'Vehicles sized for', em: 'a week of luggage.' },
    vehiclesLead: `${vehiclesLeadBase} Tell us how many are sailing and how many bags are coming, and we match the vehicle to the load.`,
    areasTitle: { text: 'Pier transfers from', em: 'across the Puget Sound.' },
    areasLead: 'Hotels and homes from Tacoma to Everett, to Pier 66 or Pier 91 and back. Travel times are from SeaTac, for cruisers flying in on sailing day.',
    faqTitle: { text: 'Cruise transfer', em: 'questions.' },
    faqLead: `Terminals, luggage and disembarkation pickups, answered. ${faqLeadTail}`,
    relatedTitle: { text: 'Before and after', em: 'the voyage.' },
    schemaName: 'Seattle Cruise Terminal Transfers',
  },

  /* ---------------------------------------------------------------- Events */
  events: {
    seo: {
      title: 'Seattle Event Limo: Prom, Parties & Game Days | Door to Door',
      description:
        'A stretch limousine or party Sprinter for prom, bachelor and bachelorette parties, concerts and game days at Lumen Field and beyond. Reserve your night out.',
    },
    eyebrow: 'Nights out & celebrations',
    crumb: 'Special Events',
    h1: { text: 'Event limousines for', em: 'Seattle’s big nights.' },
    intro: [
      'Prom and homecoming, bachelor and bachelorette parties, milestone birthdays, concerts and game days. Arrive together in a stretch limousine or a party Sprinter with ambient lighting, sound and a bar, and leave the parking and driving to us.',
      'Big nights around Lumen Field, T-Mobile Park and Climate Pledge Arena come with closures and crowds. Your chauffeur gets you as close as event traffic allows and texts the pickup point when it is time to head home.',
    ],
    hero: { image: images.studioSedan, alt: 'Black luxury sedan in silhouette under a single studio light, ready for a night out', width: 1600, height: 1000, position: '50% 58%', positionSm: '46% 55%', matte: '#000' },
    includedTitle: { text: 'The party starts', em: 'at pickup.' },
    highlights: [
      { icon: 'glass', title: 'Party-ready interiors', text: 'Mood and laser lighting, concert-grade sound and a bar for guests 21 and over in our stretch limousine and Party Sprinter.' },
      { icon: 'users', title: 'Room for the group', text: `From ${v('stretch').passengers} guests in the stretch limousine to ${v('party-sprinter').passengers} in the Party Sprinter, so everyone arrives together.` },
      { icon: 'flag', title: 'Stadium & concert drop-offs', text: 'Lumen Field, T-Mobile Park, Climate Pledge Arena and downtown theaters, with a planned pickup for the ride home.' },
      { icon: 'star', title: 'Prom & homecoming', text: 'Group pickups, photo stops and a confirmed return time, agreed in advance with the booking contact. Prom and homecoming rides are alcohol-free.' },
      { icon: 'sparkle', title: 'Bachelor & bachelorette', text: 'Move between Capitol Hill, Belltown and Ballard together, without splitting into rideshares.' },
      { icon: 'calendar', title: 'Birthdays & anniversaries', text: 'Dinner downtown, a surprise pickup or a skyline drive. Tell us the occasion and we help plan the route.' },
    ],
    stepsTitle: { text: 'Plan it once,', em: 'enjoy all night.' },
    steps: [
      { title: 'Tell us the plan', text: 'Date, headcount, pickup addresses and where the night is headed.' },
      { title: 'Pick your ride', text: 'Stretch limousine, Party Sprinter or Escalade, matched to the size of your group.' },
      { title: 'Arrive together', text: 'Your chauffeur handles traffic, parking and the drop-off while the group enjoys the ride.' },
      { title: 'Home safely', text: 'When the night winds down, your chauffeur texts the pickup point and gets everyone home.' },
    ],
    vehicles: [
      { id: 'stretch', why: 'Prom, anniversaries and the classic red-carpet arrival.' },
      { id: 'party-sprinter', why: 'Bachelor and bachelorette parties, birthdays and game days.' },
      { id: 'escalade', why: 'Smaller groups and VIP arrivals at concerts and games.' },
    ],
    places: ['Lumen Field', 'T-Mobile Park', 'Climate Pledge Arena', 'Paramount Theatre', 'Capitol Hill & Belltown'],
    faqs: [
      { q: 'Can you drop us at Lumen Field, T-Mobile Park or Climate Pledge Arena?', a: 'Yes. Your chauffeur drops you as close to the gates as event traffic control allows and texts the exact pickup point for the ride home, so nobody is wandering the streets after the final whistle.' },
      { q: 'Do you offer prom and homecoming transportation?', a: 'Yes. We plan group pickups, photo stops and a confirmed return time in advance, and a parent can be the booking contact so they have the itinerary and the chauffeur’s details. Prom and homecoming rides are alcohol-free.' },
      { q: 'How many people fit?', a: `Our stretch limousine seats up to ${v('stretch').passengers} and the Party Sprinter up to ${v('party-sprinter').passengers}. For a larger group, we coordinate more than one vehicle on the same plan.` },
      { q: 'Can we make multiple stops during the night?', a: 'Yes. Book by the hour and your chauffeur stays with the group, so you can move between dinner, the venue and the after-party on your own schedule.' },
      { q: 'How far ahead should we book?', a: 'Prom, graduation and big game weekends fill up early, so reserve as soon as your date is set. Booking last-minute? Call us and we will check availability.' },
    ],
    related: ['weddings', 'hourly', 'airport'],
    quote: { mode: 'route', title: { text: 'Reserve', em: 'your night out.' }, fromPlaceholder: 'Home, hotel or restaurant', toPlaceholder: 'Venue, stadium or restaurant' },
    reserveLabel: 'Reserve your night',
    cta: { text: 'Make an entrance.', em: 'Leave the driving to us.' },
    vehiclesTitle: { text: 'Sized for', em: 'the whole group.' },
    vehiclesLead: `${vehiclesLeadBase} Tell us the headcount and where the night is headed, and we recommend the right fit.`,
    areasTitle: { text: 'Big nights across', em: 'Seattle & the Eastside.' },
    areasLead: 'Stadiums and theaters downtown, dinner in Capitol Hill or Belltown, and pickups from Tacoma to Everett. Heading farther? Ask about a custom route.',
    faqTitle: { text: 'Event limo', em: 'questions.' },
    faqLead: `Stadium drop-offs, prom and group sizes, answered. ${faqLeadTail}`,
    relatedTitle: { text: 'More occasions,', em: 'same standard.' },
    schemaName: 'Seattle Event & Party Limousine Service',
  },

  /* ---------------------------------------------------------------- Hourly */
  hourly: {
    seo: {
      title: 'Seattle Hourly Limo & Woodinville Wine Tours | Door to Door',
      description:
        'Book a private chauffeur by the hour for meetings, shopping, Seattle sightseeing or a Woodinville wine tour. Your route, your pace. Reserve hourly service.',
    },
    eyebrow: 'Hourly & as-directed',
    h1: { text: 'Seattle hourly chauffeur & wine tours,', em: 'at your pace.' },
    intro: [
      'Keep a private chauffeur on call for as long as you need: meetings across town, an afternoon at Bellevue Square, a first-timer’s tour of the Space Needle and Pike Place Market, or a slow day between tasting rooms in Woodinville wine country.',
      'As-directed service means your chauffeur stays with you and the vehicle is ready wherever you are. Change the plan, add a stop or linger longer within your booked hours. The only schedule is yours.',
    ],
    hero: { image: images.skyline, alt: 'Seattle skyline with the Space Needle and Mount Rainier on a clear day', width: 1280, height: 853, position: '6% 50%' },
    includedTitle: { text: 'Your day,', em: 'your itinerary.' },
    highlights: [
      { icon: 'hourglass', title: 'Flexible hourly booking', text: 'Reserve a block of hours; the chauffeur and vehicle are yours for all of it.' },
      { icon: 'route', title: 'Custom itineraries', text: 'Plan every stop in advance or decide as you go. We are happy to suggest a route.' },
      { icon: 'glass', title: 'Woodinville wine tours', text: 'Tasting rooms across Woodinville wine country, with a designated driver so everyone can enjoy the pours.' },
      { icon: 'pin', title: 'Sightseeing & landmarks', text: 'The Space Needle, Pike Place Market, Kerry Park and the Ballard Locks, at your own pace.' },
      { icon: 'briefcase', title: 'Meetings & errands', text: 'Back-to-back appointments or a shopping day at Bellevue Square, without hunting for parking once.' },
      { icon: 'car', title: 'Ready when you are', text: 'Your chauffeur stays close between stops, so the car is waiting the moment you step out.' },
    ],
    stepsTitle: { text: 'Book the hours,', em: 'skip the logistics.' },
    steps: [
      { title: 'Choose your hours', text: 'Book a block of time and tell us roughly where the day is headed.' },
      { title: 'Shape the route', text: 'Share must-sees and reservations, or let us suggest a route and timing.' },
      { title: 'Ride as directed', text: 'Your chauffeur follows your lead, waits between stops and adapts as plans change.' },
      { title: 'Home at day’s end', text: 'We drop you back at your hotel or front door once the last stop is done.' },
    ],
    vehicles: [
      { id: 'escalade', why: 'Couples and small groups touring wine country in comfort.' },
      { id: 'sprinter', why: 'Wine tours and sightseeing for larger groups.' },
      { id: 's550', why: 'Meetings, errands and dinner reservations for up to three.' },
    ],
    places: ['Woodinville wine country', 'Pike Place Market', 'Space Needle & Seattle Center', 'Kerry Park', 'Bellevue Square'],
    faqs: [
      { q: 'How does hourly, as-directed service work?', a: 'You reserve a block of hours and the chauffeur and vehicle stay with you the whole time. Go wherever you like around the Puget Sound; the plan can change as the day unfolds.' },
      { q: 'Can you plan a Woodinville wine tour?', a: 'Yes. Tell us the wineries you would like to visit, or ask us to suggest a route. Many tasting rooms prefer reservations, especially on weekends, so book those first and we will time the day around them.' },
      { q: 'Which vehicle is best for a wine tour?', a: `For up to ${v('escalade').passengers} guests the Cadillac Escalade is a comfortable choice. For larger groups, the Mercedes-Benz Sprinter seats up to ${v('sprinter').passengers}, with plenty of room for the bottles you bring home.` },
      { q: 'What if we want to stay out longer?', a: 'Speak to your chauffeur or call us. Extra time can usually be added on the day, subject to availability.' },
      { q: 'Is hourly service good for sightseeing with visitors?', a: 'It is the easiest way to see Seattle in a day: the Space Needle and Seattle Center, Pike Place Market, Kerry Park’s skyline view, the Ballard Locks and the waterfront, without parking once.' },
    ],
    related: ['events', 'weddings', 'cruise'],
    quote: { mode: 'hourly', title: { text: 'Book a chauffeur', em: 'by the hour.' }, fromPlaceholder: 'Hotel, home or office' },
    reserveLabel: 'Book by the hour',
    cta: { text: 'Linger longer.', em: 'The car will wait.' },
    vehiclesTitle: { text: 'Vehicles for', em: 'a day on the road.' },
    vehiclesLead: `${vehiclesLeadBase} Tell us who is coming and where the day is headed, and we recommend the right one.`,
    areasTitle: { text: 'Hourly service from', em: 'Tacoma to Everett.' },
    areasLead: 'Start anywhere we serve and go where the day takes you, from Woodinville wine country to the Seattle waterfront. Travel times are from SeaTac in normal traffic.',
    faqTitle: { text: 'Hourly & wine tour', em: 'questions.' },
    faqLead: `How as-directed service works, wine tours and extra time, answered. ${faqLeadTail}`,
    relatedTitle: { text: 'More ways to', em: 'see Seattle.' },
    schemaName: 'Seattle Hourly Chauffeur & Wine Tour Service',
  },
};

/** Places the booking wizard recognises (src/pages/book/index.astro), so quick-quote prefills match its suggestions. */
export const airportPlaces = [
  { code: 'SEA', label: 'SeaTac (SEA)', value: 'Seattle-Tacoma International Airport (SEA)' },
  { code: 'PAE', label: 'Paine Field (PAE)', value: 'Paine Field Airport (PAE)' },
  { code: 'BFI', label: 'Boeing Field (BFI)', value: 'Boeing Field (BFI)' },
];
export const cruisePlaces = [
  { label: 'Pier 66 · Bell Street', value: 'Pier 66, Bell Street Cruise Terminal' },
  { label: 'Pier 91 · Smith Cove', value: 'Pier 91, Smith Cove Cruise Terminal' },
];

/** Index-page reasons to book, drawn from the commitments in site.ts FAQs. */
export const reasons = [
  { icon: 'plane', title: 'Flight-tracked pickups', text: 'We follow every flight live and adjust your pickup automatically, early or late.' },
  { icon: 'check', title: 'Confirmed by a real person', text: 'Every booking is reviewed and confirmed by a real person, with your chauffeur’s details sent before pickup.' },
  { icon: 'shield', title: 'Licensed, vetted chauffeurs', text: 'Background-checked professionals trained in discreet, safety-first service.' },
  { icon: 'sparkle', title: 'Transparent quotes', text: 'No hidden fees. You see the full rate before you confirm.' },
];

/** Occasion shortcuts (site.ts `occasions`) mapped to the service that covers them. */
export const occasionService: Record<string, string> = {
  'Airport Transfers': 'airport',
  Weddings: 'weddings',
  'Corporate Travel': 'corporate',
  'Cruise Terminals': 'cruise',
  'Prom & Homecoming': 'events',
  'Bachelor & Bachelorette': 'events',
  'Wine Tours': 'hourly',
  'Sporting Events': 'events',
  Anniversaries: 'events',
  'Road Shows': 'corporate',
  Birthdays: 'events',
  Concerts: 'events',
};

/** Icon per service, shared by the index grid and related-service cards. */
export const serviceIcon: Record<string, string> = {
  airport: 'plane',
  corporate: 'briefcase',
  weddings: 'rings',
  cruise: 'ship',
  events: 'glass',
  hourly: 'hourglass',
};
