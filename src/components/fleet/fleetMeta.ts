// Fleet-page-only presentation data layered on top of src/data/site.ts `fleet`.
// Facts (capacity, features, best-for) stay in site.ts; this file only adds
// filtering categories, display copy and image framing for the /fleet/ page.
import { fleet, images, services, serviceHref, type Vehicle } from '../../data/site';

export type FleetCat = 'sedans' | 'suvs' | 'limousines' | 'vans';

export const categories: { id: 'all' | FleetCat; label: string; singular: string }[] = [
  { id: 'all', label: 'All', singular: 'vehicle' },
  { id: 'sedans', label: 'Sedans', singular: 'sedan' },
  { id: 'suvs', label: 'SUVs', singular: 'SUV' },
  { id: 'limousines', label: 'Limousines', singular: 'limousine' },
  { id: 'vans', label: 'Vans & Coaches', singular: 'van or coach' },
];

// "Seats at least" filter: every option narrows the list, so each tap gives visible feedback.
export const paxRanges = [
  { id: 'any', label: 'Any', min: 0 },
  { id: '4', label: '4+', min: 4 },
  { id: '7', label: '7+', min: 7 },
  { id: '15', label: '15+', min: 15 },
];

type Meta = {
  cat: FleetCat;
  make: string;
  model: string;
  /** Short display name for buttons; unique per vehicle (two models are both "Sprinter"). */
  short: string;
  intro: string;
  signature: string;
  alt: string;
  position?: string;
  /** Daylight stock shot: grade it down so it sits in the dark, cinematic palette. */
  grade?: boolean;
  /** Editorial crop: scale the photo from an origin so only that detail fills the frame. */
  crop?: { scale: number; origin: string };
  /** Booking `type` slugs (site.ts services) this vehicle is most often booked for, linked as "Ideal for". */
  services: string[];
};

export const meta: Record<string, Meta> = {
  s550: {
    cat: 'sedans',
    make: 'Mercedes-Benz',
    model: 'S550',
    short: 'S550',
    intro: 'The benchmark of executive travel. Hushed, composed and impeccably discreet, from the terminal curb to the boardroom door.',
    signature: 'Leather interior',
    alt: 'Black Mercedes-Benz sedan with its door held open to a cream leather cabin',
    position: '0% 50%',
    // The source photo has a person on the right: frame only the open door and cabin.
    crop: { scale: 2.15, origin: '0% 79%' },
    grade: true,
    services: ['airport', 'corporate'],
  },
  escalade: {
    cat: 'suvs',
    make: 'Cadillac',
    model: 'Escalade',
    short: 'Escalade',
    intro: 'Commanding presence with room for the whole party. A composed, private cabin for families and VIP guests.',
    signature: 'Privacy partition',
    alt: 'Black Cadillac Escalade luxury SUV parked at the roadside',
    position: '50% 62%',
    services: ['airport', 'corporate'],
  },
  electric: {
    cat: 'sedans',
    make: 'Tesla',
    model: 'Model S',
    short: 'Model S',
    intro: 'Silent, electric and effortlessly modern. The considered choice for city transfers when the ride should feel as calm as it looks.',
    signature: 'Panoramic glass roof',
    alt: 'Dark luxury electric sedan sculpted by low studio light',
    position: '78% 55%',
    services: ['corporate', 'airport'],
  },
  stretch: {
    cat: 'limousines',
    make: 'Stretch',
    model: 'Limousine',
    short: 'Limousine',
    intro: 'The classic statement arrival. Bar service, mood lighting and surround sound for the moments everyone will remember.',
    signature: 'Bar service',
    alt: 'Black luxury car in silhouette under a single studio light',
    position: '50% 55%',
    services: ['weddings', 'events'],
  },
  'party-sprinter': {
    cat: 'vans',
    make: 'Party',
    model: 'Sprinter',
    short: 'Party Sprinter',
    intro: 'A rolling lounge for up to twenty. Lighting, sound and a premium bar that start the celebration before you arrive.',
    signature: 'Laser lighting',
    alt: 'White Mercedes-Benz Sprinter with its sliding door open, ready for guests to board',
    position: '60% 55%',
    grade: true,
    services: ['events'],
  },
  sprinter: {
    cat: 'vans',
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    short: 'Executive Sprinter',
    intro: 'Boardroom comfort for the whole team. Conference seating, Wi-Fi and generous luggage space for groups of up to fourteen.',
    signature: 'Conference seating',
    alt: 'White Mercedes-Benz Sprinter executive van',
    services: ['corporate', 'cruise', 'hourly'],
  },
};

// Short, descriptive anchor text for the service landing pages.
const serviceLabel: Record<string, string> = {
  airport: 'Airport transfers',
  corporate: 'Corporate car service',
  weddings: 'Wedding limo',
  cruise: 'Cruise transfers',
  events: 'Special events',
  hourly: 'Hourly & wine tours',
};

/** "Ideal for" links from a vehicle to its most relevant service pages. */
export const serviceLinks = (id: string) =>
  (meta[id]?.services ?? []).flatMap((slug) => {
    const s = services.find((x) => x.slug === slug);
    return s ? [{ label: serviceLabel[slug] ?? s.title, href: serviceHref(s) }] : [];
  });

/** Inline style for a vehicle photo: focal point plus optional editorial crop (applied on the image wrapper). */
export const cropStyle = (id: string) => {
  const c = meta[id]?.crop;
  return c ? `--crop-s:${c.scale};--crop-o:${c.origin}` : undefined;
};

export const isStudio = (v: Vehicle) => v.image === images.sprinterStudio;
export const maxPax = Math.max(...fleet.map((v) => v.passengers));
export const catCount = (id: string) => (id === 'all' ? fleet.length : fleet.filter((v) => meta[v.id]?.cat === id).length);
export const pad = (n: number) => String(n).padStart(2, '0');
