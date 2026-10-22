// Full FAQ for /faq/. Starts from site.ts `faqs` (kept verbatim and in sync) and adds conservative answers.
// Where a policy is not confirmed (payment methods, gratuity, cancellation, wait allowance, minimums),
// the answer points to the quote or the concierge instead of stating terms.
// Answers are plain text: they are also published as FAQPage JSON-LD.
//
// Questions that a service page also answers are reused from service-pages.ts word for word (`shared`),
// so both pages say the same thing, and their FAQPage markup is left to the service page (`markupOn`).
// `keywords` are search-only synonyms (never displayed): what a customer might type instead.
import { faqs, fleet, areas, services, serviceHref, areaHref } from '../../data/site';
import { servicePages } from '../../data/service-pages';
import { isPostPublished, postHref } from '../../data/posts';

export type FaqItem = {
  id: string;
  q: string;
  a: string;
  link?: { label: string; href: string };
  /** Search synonyms, space separated. Not displayed. */
  keywords?: string;
  /** Path of the page that carries this question's FAQPage markup (it is left out of /faq/'s). */
  markupOn?: string;
};
export type FaqGroup = { id: string; title: string; icon: string; items: FaqItem[] };

const base = (q: string) => {
  const f = faqs.find((x) => x.q === q);
  if (!f) throw new Error(`faqData: missing site.ts FAQ "${q}"`);
  return f.a;
};
const svc = (slug: string) => serviceHref(services.find((s) => s.slug === slug)!);
/**
 * A question also answered on /services/<slug>/: reuse that page's exact wording and leave the markup to it.
 * If the service page has since reworded or dropped it, fall back to our own copy (and keep the markup here).
 */
const shared = (slug: string, q: string, fallback: { q: string; a: string }) => {
  const f = servicePages[slug]?.faqs.find((x) => x.q === q);
  return f ? { q: f.q, a: f.a, markupOn: svc(slug) } : fallback;
};
/** Link to a Journal article only when it is part of this build; otherwise to the related service page. */
const guideOr = (slug: string, label: string, fallback: { label: string; href: string }) =>
  isPostPublished(slug) ? { label, href: postHref({ slug }) } : fallback;
const bellevue = areas.find((a) => a.slug === 'bellevue')!;

const byPax = [...fleet].sort((a, b) => a.passengers - b.passengers);
const maxPax = Math.max(...fleet.map((v) => v.passengers));
const byEta = [...areas].sort((a, b) => parseInt(a.eta) - parseInt(b.eta));
const list = (parts: string[]) => parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];

export const faqGroups: FaqGroup[] = [
  {
    id: 'booking',
    title: 'Booking & payment',
    icon: 'calendar',
    items: [
      { id: 'how-to-book', q: 'How do I book a ride?', a: base('How do I book a ride?'), link: { label: 'Reserve online', href: '/book/' }, keywords: 'reserve reservation reservations booking schedule order online phone call app' },
      {
        id: 'confirmation',
        q: 'Is my reservation confirmed as soon as I submit it?',
        a: 'Not yet. An online or phone request is reviewed by our concierge team, who check availability and confirm the details with you. Your ride is reserved once you receive that confirmation. If you haven’t heard back when you expected to, call or text us.',
        keywords: 'confirm confirmed confirmation pending request status booked',
      },
      {
        id: 'how-far-ahead',
        q: 'How far in advance should I book?',
        a: 'As early as your plans allow. Weekends in wedding season, prom and graduation dates, the Alaska cruise season and holidays tend to book up first. For same-day or last-minute trips, call us directly and we’ll tell you right away what’s available.',
        keywords: 'ahead notice early lead time same day today tonight tomorrow last minute short notice urgent availability available',
      },
      { id: 'pricing', q: 'Is pricing all-inclusive?', a: base('Is pricing all-inclusive?'), keywords: 'price prices pricing cost costs rate rates fare fares fee fees charge charges quote quotes estimate how much expensive cheap affordable hidden extra tolls parking' },
      {
        id: 'payment',
        q: 'How do I pay for my ride?',
        a: 'Payment is arranged with the concierge when your booking is confirmed. If you have a preference, such as paying by card or invoicing a company account, mention it when you book and we’ll confirm the options for your trip.',
        keywords: 'pay paying payment payments card cards credit debit visa amex mastercard cash invoice billing bill deposit prepay receipt',
      },
      {
        id: 'gratuity',
        q: 'Is gratuity included in my quote?',
        a: 'Your quote spells out exactly what is and isn’t included, including gratuity. If anything is unclear, ask the concierge before you confirm and we’ll walk you through it.',
        keywords: 'tip tips tipping gratuity gratuities service charge',
      },
      {
        id: 'cancellation',
        q: 'What is your cancellation policy?',
        a: 'Cancellation terms depend on the vehicle and the type of booking, and they’re stated on your quote and confirmation. If your plans change, let us know as early as possible by phone or text.',
        link: { label: 'Read our terms', href: '/terms/#changes-and-cancellations' },
        keywords: 'cancel cancels cancelled canceled cancelling canceling cancellation refund refunds refundable money back no show no-show',
      },
      {
        id: 'changes',
        q: 'Can I change my reservation after it’s confirmed?',
        a: 'Yes. Call or text the concierge with the change, whether it’s a new time, an extra stop or more passengers. We’ll confirm it based on availability and let you know if it affects your rate.',
        keywords: 'change modify edit update amend reschedule move new time date',
      },
      {
        id: 'corporate-accounts',
        ...shared('corporate', 'Can we set up a corporate account?', {
          q: 'Do you offer corporate accounts?',
          a: 'Yes. Companies that book regularly can set up a corporate account with invoicing, which keeps executive travel, client pickups and roadshows in one place. Call us or get in touch through the contact page to set one up.',
        }),
        link: { label: 'Corporate car service', href: svc('corporate') },
        keywords: 'corporate business company companies account accounts invoice invoicing billing executive employees team',
      },
    ],
  },
  {
    id: 'airport',
    title: 'Airport & flights',
    icon: 'plane',
    items: [
      {
        id: 'flight-delays',
        ...shared('airport', 'What happens if my flight is delayed or early?', { q: 'What happens if my flight is delayed?', a: base('What happens if my flight is delayed?') }),
        keywords: 'flight flights delay delays delayed late early cancelled canceled rebooked tracking tracked track landing land',
      },
      {
        id: 'meeting-point',
        ...shared('airport', 'Where do I meet my chauffeur at SeaTac?', {
          q: 'Where will I meet my chauffeur at SeaTac?',
          a: 'Your chauffeur texts you the exact meeting point once you land, so you’re never searching the curb. If you’d like to be met with a name sign, request meet & greet when you book.',
        }),
        link: guideOr('seatac-airport-pickup-what-to-expect', 'What to expect at SeaTac', { label: 'Airport transfers', href: svc('airport') }),
        keywords: 'meet meeting point pickup pick up location curb arrivals baggage claim find chauffeur driver sign name greet sea-tac sea tac',
      },
      {
        id: 'wait-time',
        q: 'Is wait time included for airport pickups?',
        a: 'Yes. Airport pickups include complimentary wait time so you can collect your bags without rushing. The exact allowance is listed on your quote.',
        keywords: 'wait waiting free grace period minutes',
      },
      {
        id: 'airports',
        q: 'Which airports do you serve?',
        a: 'Seattle-Tacoma International Airport (SeaTac), Paine Field in Everett and Boeing Field. For other airports or private terminals, call us with the details.',
        link: { label: 'Airport transfers', href: svc('airport') },
        keywords: 'sea-tac sea tac paine field pae boeing field bfi king county private jet charter fbo terminal',
      },
      {
        id: 'airport-details',
        q: 'What should I include when booking an airport transfer?',
        a: 'Your airline and flight number, the date, the number of passengers and bags (including anything oversized, like skis or golf clubs), any child seats, and a mobile number you’ll have switched on when you land.',
        keywords: 'information info details need provide flight number reservation',
      },
      {
        id: 'departure-timing',
        ...shared('airport', 'How early should I schedule a departure pickup?', {
          q: 'When should my pickup be for a departing flight?',
          a: 'We’ll recommend a pickup time based on your departure, your airline’s check-in guidance and the traffic on your route at that hour. Early-morning and holiday departures are worth booking well ahead.',
        }),
        keywords: 'departure departures departing leaving outbound drop off dropoff to the airport what time',
      },
      {
        id: 'luggage-help',
        q: 'Will my chauffeur help with luggage?',
        a: 'Yes. Your chauffeur loads and unloads your bags at both ends of the trip. If you’re traveling with a lot of luggage, tell us when you book so we can recommend a vehicle with enough room.',
        keywords: 'luggage bag bags baggage suitcase suitcases carry help skis golf stroller',
      },
    ],
  },
  {
    id: 'vehicles',
    title: 'Vehicles & capacity',
    icon: 'car',
    items: [
      { id: 'fleet', q: 'What vehicles are in the fleet?', a: base('What vehicles are in the fleet?'), link: { label: 'Compare the fleet', href: '/fleet/' }, keywords: 'vehicle vehicles car cars fleet sedan sedans suv suvs limo limos limousine van vans sprinter mercedes cadillac escalade tesla electric ev party bus coach' },
      {
        id: 'passengers',
        q: 'How many passengers can each vehicle carry?',
        a: `${byPax.map((v) => `${v.name}: up to ${v.passengers}`).join('. ')}. For groups larger than ${maxPax}, we can coordinate several vehicles.`,
        keywords: 'passenger passengers people persons guests capacity seats seating seat group large groups size how many fit',
      },
      {
        id: 'luggage-capacity',
        q: 'How much luggage fits in each vehicle?',
        // No per-vehicle bag counts: the fleet's luggage figures are placeholders until the client confirms them.
        a: 'It depends on the vehicle and the size of your bags. Tell us how many you’re bringing when you book, including anything oversized like skis, golf clubs or a stroller, and we’ll confirm a vehicle with room for everything.',
        keywords: 'luggage bag bags baggage suitcase suitcases trunk space room capacity fit',
      },
      {
        id: 'specific-vehicle',
        q: 'Can I request a specific vehicle?',
        a: 'Yes. Choose a vehicle when you book and the concierge confirms availability for your date. If your first choice is already reserved, we’ll suggest the closest alternative.',
        keywords: 'choose choice pick select specific particular model request',
      },
      {
        id: 'child-seats',
        ...shared('airport', 'Can you provide a child seat?', {
          q: 'Can you provide child car seats?',
          a: 'Child seats can be requested when you book. Let us know each child’s age and size so we can confirm the right seat for your trip.',
        }),
        keywords: 'child children kid kids baby babies infant infants toddler toddlers booster car seat seats family families',
      },
      { id: 'chauffeurs', q: 'Are your chauffeurs professionally trained?', a: base('Are your chauffeurs professionally trained?'), keywords: 'chauffeur chauffeurs driver drivers trained training professional experienced background check safety safe' },
      {
        id: 'wifi',
        q: 'Do your vehicles have Wi-Fi and charging?',
        a: 'Our Mercedes-Benz S550 and executive Mercedes-Benz Sprinter have Wi-Fi, and the Sprinter has charging ports. If staying connected matters, mention it when you book and we’ll match the vehicle to your trip.',
        keywords: 'wifi wi-fi internet online connected charging charger chargers usb phone laptop work',
      },
    ],
  },
  {
    id: 'events',
    title: 'Events & weddings',
    icon: 'rings',
    items: [
      {
        id: 'weddings',
        q: 'Do you provide wedding transportation?',
        a: 'Yes: arrivals and the getaway car for the couple, the wedding party, and guest shuttles between the ceremony, reception and hotels. We time multiple vehicles to your schedule, and a red carpet arrival, decorated vehicles and champagne can be requested.',
        link: { label: 'Wedding limousines', href: svc('weddings') },
        keywords: 'wedding weddings bride groom bridal couple getaway ceremony reception guests shuttle',
      },
      {
        id: 'wedding-timing',
        ...shared('weddings', 'How far ahead should we book wedding transportation?', {
          q: 'How early should we book for a wedding?',
          a: 'As soon as your date and venues are set. Popular dates book early, and multi-vehicle weddings need the most notice. A call with the concierge helps us plan timing, routes and vehicles around your day.',
        }),
        keywords: 'wedding weddings advance ahead early notice date season',
      },
      {
        id: 'prom',
        ...shared('events', 'Do you offer prom and homecoming transportation?', {
          q: 'Do you offer prom and homecoming transportation?',
          a: 'Yes. Stretch limousines and party Sprinters are popular for prom and homecoming groups. Parents are welcome to call the concierge to talk through pickup times, the itinerary and any questions before booking.',
        }),
        link: { label: 'Special events', href: svc('events') },
        keywords: 'prom proms homecoming school dance teens teenagers students parents graduation formal',
      },
      {
        id: 'alcohol',
        q: 'Can we have drinks on board?',
        a: 'Some vehicles, such as the stretch limousine and the Party Sprinter, include bar service, and champagne can be arranged on request. Alcohol is for guests of legal drinking age only, and the concierge can explain what’s permitted for your booking.',
        keywords: 'drink drinks drinking alcohol champagne bar beer wine bottle bottles toast',
      },
      {
        id: 'games-concerts',
        ...shared('events', 'Can you drop us at Lumen Field, T-Mobile Park or Climate Pledge Arena?', {
          q: 'Can you take us to a game or a concert?',
          a: 'Yes. We drop off and pick up at Lumen Field, T-Mobile Park, Climate Pledge Arena and other venues across the city. After the event, your chauffeur texts you the pickup point.',
        }),
        keywords: 'game games concert concerts show shows event events stadium stadiums arena venue venues seahawks mariners kraken sounders football baseball hockey',
      },
      {
        id: 'hourly',
        ...shared('hourly', 'How does hourly, as-directed service work?', {
          q: 'How does hourly service work?',
          a: 'With hourly, as-directed service, your chauffeur stays with you for the time you book: meetings, shopping, sightseeing or a night with several stops. The route can change as your plans do. Any minimum booking time is stated on your quote.',
        }),
        link: { label: 'Hourly & wine tours', href: svc('hourly') },
        keywords: 'hourly hour hours per hour by the hour as directed as-directed day half day full day minimum sightseeing tour',
      },
      {
        id: 'wine-tours',
        ...shared('hourly', 'Can you plan a Woodinville wine tour?', {
          q: 'Do you offer Woodinville wine tours?',
          a: 'Yes. With a chauffeur on call for the afternoon, your group can visit several Woodinville tasting rooms and nobody has to drive. Tell us which wineries you have in mind, or ask us to help shape the itinerary.',
        }),
        keywords: 'wine wines winery wineries tasting tastings vineyard woodinville tour tours',
      },
      {
        id: 'stops',
        q: 'Can we add stops along the way?',
        a: 'Yes. Add stops when you book or tell the concierge in advance. Multi-stop itineraries are common for corporate days, weddings and nights out. Additional stops may affect your rate, which the concierge will confirm.',
        keywords: 'stop stops multiple multi-stop extra detour errand pick up friends',
      },
    ],
  },
  {
    id: 'area',
    title: 'Service area',
    icon: 'pin',
    items: [
      { id: 'areas', q: 'Which areas do you serve?', a: base('Which areas do you serve?'), link: { label: 'Explore service areas', href: '/service-areas/' }, keywords: 'area areas city cities where location locations coverage serve near me region puget sound king county' },
      {
        id: 'drive-times',
        q: 'How long is the drive from SeaTac?',
        a: `In normal traffic, drive times from SeaTac are about ${list(byEta.map((a) => `${a.eta.replace(/\s*from SeaTac/i, '')} to ${a.city}`))}. Peak-hour traffic can add time, and your chauffeur plans the route around it.`,
        keywords: 'drive time times travel time how long minutes distance far eta traffic airport',
      },
      {
        id: 'eastside',
        q: 'Do you serve Bellevue, Redmond and the Eastside?',
        a: 'Yes. Downtown Bellevue, Kirkland and Redmond, including the Microsoft campus, are part of our everyday service area, for airport runs, corporate travel and evenings out alike.',
        link: { label: 'Bellevue car service', href: areaHref(bellevue) },
        keywords: 'eastside east side bellevue redmond kirkland microsoft campus',
      },
      {
        id: 'cruise-terminals',
        q: 'Do you serve the cruise terminals?',
        a: 'Yes, both: Pier 66 (Bell Street Cruise Terminal) and Pier 91 (Smith Cove Cruise Terminal). We plan hotel-to-pier and pier-to-airport routes with room for cruise luggage.',
        link: guideOr('seattle-cruise-transfers-pier-66-vs-pier-91', 'Pier 66 vs. Pier 91 guide', { label: 'Cruise transfers', href: svc('cruise') }),
        keywords: 'cruise cruises ship ships port pier piers terminal terminals alaska bell street smith cove embarkation disembarkation',
      },
      {
        id: 'outside-seattle',
        q: 'Do you travel outside the Seattle area?',
        a: 'Custom routes are available on request. For trips beyond greater Seattle, call the concierge with your route and we’ll confirm availability and a quote.',
        keywords: 'outside out of town long distance far away custom route trip travel beyond',
      },
      {
        id: 'hours',
        q: 'Are you available 24/7?',
        a: 'Yes. The concierge answers around the clock, and rides can be scheduled at any hour, including early-morning flights and late-night pickups.',
        keywords: '24/7 24 hours hour open opening night late overnight midnight early morning weekend weekends holiday holidays',
      },
    ],
  },
];

export const allFaqs = faqGroups.flatMap((g) => g.items);
/** For /faq/'s FAQPage JSON-LD: questions whose markup lives on a service page are left out. */
export const markupFaqs = allFaqs.filter((f) => !f.markupOn);
