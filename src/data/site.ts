// Single source of truth for business content. Copy is based on the client's current site.
const IMG = 'https://www.seattledoortodoorlimo.com';

export const site = {
  name: 'Seattle Door to Door Limo',
  url: 'https://www.seattledoortodoorlimo.com',
  short: 'Door to Door',
  tagline: 'Private chauffeured travel across Seattle & the Puget Sound',
  phone: '(206) 647-5930',
  phoneHref: 'tel:+12066475930',
  smsHref: 'sms:+12066475930',
  email: 'reservations@seattledoortodoorlimo.com', // TODO: confirm with client
  since: 2008,
  region: 'Seattle, Washington',
  rating: { score: '4.9', count: '800+' },
};

export const images = {
  skyline: `${IMG}/seattle-skyline-hero.jpg`,
  chauffeur: `${IMG}/executive-limo-chauffeur.jpg`,
  seatac: `${IMG}/seatac-transfer.jpeg`,
  escalade: `${IMG}/luxury-cadillac-seattle.jpeg`,
  darkCar: `${IMG}/black-luxury-limo-seattle-service.jpg`,
  sprinter: `${IMG}/white-mercedes-sprinter-van-seattle.jpeg`,
  sprinterStudio: `${IMG}/white-mercedes-sprinter-van-seattle-fleet.jpeg`,
  waterfront: `${IMG}/seattle-waterfront-luxury-car-service.jpg`,
  market: `${IMG}/publicmarket.jpg`,
  bellevue: `${IMG}/seattle-bellevue.jpeg`,
  plane: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80',
  wedding: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80',
  city: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=80',
  studioSedan: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1600&q=80',
};

export type Service = {
  /** Booking `type` value (URL contract) — do not change. */
  slug: string;
  /** SEO landing page path segment: /services/<page>/ */
  page: string;
  title: string;
  kicker: string;
  blurb: string;
  points: string[];
  image: string;
};

export const services: Service[] = [
  {
    slug: 'airport',
    page: 'airport-transfers',
    title: 'Airport Transfers',
    kicker: 'SeaTac · Paine Field · Boeing Field',
    blurb: 'Real-time flight tracking and a chauffeur waiting at arrivals, so a delayed flight never means a missed ride.',
    points: ['Live flight monitoring', 'Meet & greet with name sign', 'Luggage assistance', 'Complimentary wait time'],
    image: images.seatac,
  },
  {
    slug: 'corporate',
    page: 'corporate-car-service',
    title: 'Corporate & Executive',
    kicker: 'Point-to-point · Roadshows · VIP guests',
    blurb: 'Discreet black car service for executives, clients and roadshows. Quiet cabins, Wi-Fi in select vehicles and chauffeurs who know every shortcut.',
    points: ['Corporate accounts & invoicing', 'Wi-Fi on request', 'Multi-stop itineraries', 'Strict confidentiality'],
    image: images.chauffeur,
  },
  {
    slug: 'weddings',
    page: 'wedding-limo',
    title: 'Weddings',
    kicker: 'Bridal party · Guest shuttles · Getaway car',
    blurb: 'From the first look to the grand exit, a meticulously timed fleet so the day runs exactly as rehearsed.',
    points: ['Red carpet arrival', 'Coordinated multi-vehicle timing', 'Champagne on request', 'Decorated vehicles'],
    image: images.wedding,
  },
  {
    slug: 'cruise',
    page: 'cruise-transfers',
    title: 'Cruise Terminal Transfers',
    kicker: 'Pier 66 · Pier 91',
    blurb: 'Door-to-gangway service for Alaskan cruise departures, with room for every suitcase and a seamless curbside drop.',
    points: ['Pier 66 Bell Street Terminal', 'Pier 91 Smith Cove Terminal', 'Hotel → pier → airport routing', 'Oversized luggage space'],
    image: images.waterfront,
  },
  {
    slug: 'events',
    page: 'special-events',
    title: 'Special Events & Nights Out',
    kicker: 'Prom · Bachelor/ette · Concerts · Sports',
    blurb: 'Arrive together and leave in style. Stretch limousines and party Sprinters with ambient lighting, sound and a bar.',
    points: ['Prom & homecoming packages', 'Bachelor & bachelorette parties', 'Stadium & concert drop-offs', 'Birthdays & anniversaries'],
    image: images.market,
  },
  {
    slug: 'hourly',
    page: 'hourly-and-wine-tours',
    title: 'Hourly & Wine Tours',
    kicker: 'As-directed · Woodinville wine country',
    blurb: 'Keep a chauffeur on call for meetings, shopping or a slow afternoon touring Woodinville wineries. Your schedule, your route.',
    points: ['Flexible hourly booking', 'Custom itineraries', 'Woodinville wine tours', 'Sightseeing & landmarks'],
    image: images.bellevue,
  },
];

export const occasions = [
  'Airport Transfers', 'Weddings', 'Corporate Travel', 'Cruise Terminals', 'Prom & Homecoming',
  'Bachelor & Bachelorette', 'Wine Tours', 'Sporting Events', 'Anniversaries', 'Road Shows', 'Birthdays', 'Concerts',
];

export type Vehicle = {
  id: string;
  name: string;
  category: string;
  passengers: number;
  luggage: number;
  features: string[];
  image: string;
  bestFor: string;
  note?: string;
};

export const fleet: Vehicle[] = [
  {
    id: 's550',
    name: 'Mercedes-Benz S550',
    category: 'Executive Sedan',
    passengers: 3,
    luggage: 3,
    features: ['Leather interior', 'Climate control', 'Premium sound', 'Wi-Fi'],
    image: images.chauffeur,
    bestFor: 'Executives, airport runs, date nights',
  },
  {
    id: 'escalade',
    name: 'Cadillac Escalade',
    category: 'Luxury SUV',
    passengers: 6,
    luggage: 6,
    features: ['Spacious cabin', 'Entertainment system', 'Privacy partition', 'Refreshments'],
    image: images.escalade,
    bestFor: 'Families, small groups, VIP arrivals',
  },
  {
    id: 'electric',
    name: 'Tesla Model S',
    category: 'Electric Luxury',
    passengers: 4,
    luggage: 3,
    features: ['Zero emissions', 'Panoramic glass roof', 'Premium audio', 'Whisper-quiet ride'],
    image: images.darkCar,
    bestFor: 'Eco-conscious executives, city transfers',
  },
  {
    id: 'stretch',
    name: 'Stretch Limousine',
    category: 'Classic Limousine',
    passengers: 10,
    luggage: 4,
    features: ['Bar service', 'LED mood lighting', 'Surround sound', 'Privacy partition'],
    image: images.studioSedan,
    bestFor: 'Weddings, proms, anniversaries',
  },
  {
    id: 'party-sprinter',
    name: 'Party Sprinter',
    category: 'Party Coach',
    passengers: 20,
    luggage: 6,
    features: ['Dance floor', 'Premium bar', 'Laser lighting', 'Concert-grade sound'],
    image: images.sprinter,
    bestFor: 'Bachelor parties, birthdays, game days',
  },
  {
    id: 'sprinter',
    name: 'Mercedes-Benz Sprinter',
    category: 'Executive Van',
    passengers: 14,
    luggage: 14,
    features: ['Conference seating', 'Wi-Fi', 'Charging ports', 'Generous luggage space'],
    image: images.sprinterStudio,
    bestFor: 'Corporate groups, cruise transfers, wine tours',
  },
];

export const areas = [
  { slug: 'seattle', city: 'Seattle', detail: 'Downtown · Capitol Hill · Fremont · Pier 66 · Pier 91', lat: 47.6062, lng: -122.3321, eta: '25 min from SeaTac' },
  { slug: 'bellevue', city: 'Bellevue', detail: 'Downtown · Crossroads · Factoria', lat: 47.6101, lng: -122.2015, eta: '25 min from SeaTac' },
  { slug: 'kirkland', city: 'Kirkland', detail: 'Downtown · Juanita · Totem Lake', lat: 47.6769, lng: -122.2060, eta: '35 min from SeaTac' },
  { slug: 'redmond', city: 'Redmond', detail: 'Microsoft Campus · Town Center', lat: 47.6740, lng: -122.1215, eta: '35 min from SeaTac' },
  { slug: 'tacoma', city: 'Tacoma', detail: 'Downtown · University Place', lat: 47.2529, lng: -122.4443, eta: '30 min from SeaTac' },
  { slug: 'everett', city: 'Everett', detail: 'Downtown · Mill Creek · Mukilteo', lat: 47.9790, lng: -122.2021, eta: '45 min from SeaTac' },
];

export const hub = { city: 'SeaTac Airport', lat: 47.4502, lng: -122.3088 };

// Only figures the site can back up: "100% on-time" and "1,000+ trips" were carried over from the old
// site without a source (and the Terms disclaim delays), so they are replaced by the review count shown
// with the platform badges and the number of cities with their own page.
export const stats = [
  { value: 20, suffix: '+', label: 'Years of experience' },
  { value: Number(site.rating.count.replace(/\D/g, '')), suffix: '+', label: 'Client reviews' },
  { value: areas.length, suffix: '', label: 'Cities served' },
  { value: 24, suffix: '/7', label: 'Concierge support' },
];

export const landmarks = [
  { name: 'Pier 66 — Bell Street Cruise Terminal', text: 'A major departure point for Alaskan cruises with quick curbside drop-off and pickup.' },
  { name: 'Pier 91 — Smith Cove Cruise Terminal', text: 'Just north of downtown and home to multiple cruise lines.' },
  { name: 'Seattle Landmarks', text: 'The Space Needle, Pike Place Market and every view worth stopping for.' },
  { name: 'Event Venues & Stadiums', text: 'Lumen Field, T-Mobile Park, Climate Pledge Arena and private venues.' },
];

// Verbatim as published on the client's current site: customer quotes are never reworded.
// TODO (client): confirm these are real customers, or replace them with verbatim Google/Yelp reviews
// (first name + initial, platform, month/year). If they cannot be confirmed, remove them.
export const testimonials = [
  { quote: 'Absolutely exceptional service! The driver was professional, the vehicle was immaculate, and they were perfectly on time for our wedding. Couldn’t have asked for better!', name: 'Sarah Johnson', context: 'Wedding Transportation' },
  { quote: 'I use Seattle Door to Door Limo for all my corporate events. Their reliability and professionalism make them my go-to choice for important client meetings.', name: 'Michael Chen', context: 'Corporate Events' },
  { quote: 'The airport pickup was seamless. Driver was waiting when I landed, helped with luggage, and the ride was incredibly comfortable. Will definitely use again!', name: 'Emily Rodriguez', context: 'Airport Transfer' },
  { quote: 'Booked the Hummer limo for my bachelor party. The experience was unforgettable - great service, amazing vehicle, and the driver was fantastic!', name: 'David Thompson', context: 'Bachelor Party' },
];

export const ratings = [
  { platform: 'Google', score: '4.9', count: '250+ reviews' },
  { platform: 'Yelp', score: '4.8', count: '300+ reviews' },
  { platform: 'Facebook', score: '4.9', count: '250+ reviews' },
];

export const faqs = [
  { q: 'How do I book a ride?', a: 'Reserve online in four quick steps or call us 24/7. Every request is reviewed and confirmed by a real person, with your chauffeur’s details sent before pickup.' },
  { q: 'What vehicles are in the fleet?', a: 'Executive sedans, luxury SUVs, an electric Tesla, classic stretch limousines, executive Sprinters and party coaches for up to 20 guests.' },
  { q: 'Are your chauffeurs professionally trained?', a: 'Yes. Every chauffeur is licensed, background-checked and trained in discreet, safety-first service. They know Seattle inside out.' },
  { q: 'What happens if my flight is delayed?', a: 'We track your flight in real time and adjust your pickup automatically. Your chauffeur is at arrivals when you land, not when you were scheduled to.' },
  { q: 'Is pricing all-inclusive?', a: 'Your quote shows the full rate before you confirm and spells out what’s included, such as gratuity, tolls and airport fees. No hidden fees; if your trip changes, we confirm any rate change first.' },
  { q: 'Which areas do you serve?', a: 'All of greater Seattle, including Bellevue, Kirkland, Redmond, Tacoma and Everett, plus SeaTac, Paine Field and both cruise terminals. Custom routes on request.' },
];

export const nav = [
  { label: 'Fleet', href: '/fleet/' },
  { label: 'Services', href: '/services/' },
  { label: 'Service Areas', href: '/service-areas/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
];

export const serviceHref = (s: Service) => `/services/${s.page}/`;
export const areaHref = (a: { slug: string }) => `/service-areas/${a.slug}/`;
