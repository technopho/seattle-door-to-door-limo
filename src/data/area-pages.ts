// Service-area landing pages (/service-areas/<slug>/), keyed by site.ts areas[].slug.
// Facts that belong to the business (phone, ETA from SeaTac, fleet, services) stay in site.ts;
// this file only adds local, city-specific copy. Landmarks are public places.
// Travel times: only areas[].eta from site.ts. Anything operational (exact pickup spots) is
// left to the chauffeur, who texts the meeting point.
import { areas, images } from './site';

/** Booking `type` values accepted by /book/ (URL contract). */
export type BookingType = 'p2p' | 'hourly' | 'airport' | 'corporate' | 'weddings' | 'cruise' | 'events';

export type AreaDestination = {
  name: string;
  /** Short category tag shown above the name. */
  kind: string;
  icon: string;
  text: string;
  type: BookingType;
  /** Free-text destination passed to /book/?to=. Leave it out when the card covers more than one
   *  place (e.g. both cruise piers), so the booking form asks instead of guessing. */
  to?: string;
};

export type AreaTrip = {
  icon: string;
  title: string;
  text: string;
  type: BookingType;
  from?: string;
  to?: string;
  /** Show the city's SeaTac ETA (site.ts). Only for SeaTac runs. */
  eta?: boolean;
};

export type AreaPage = {
  slug: string;
  seo: { title: string; description: string };
  /** H1 split into plain text + accent phrase. A no-break space (\u00a0) keeps two words on one line. */
  h1: { text: string; em: string };
  intro: [string, string];
  /** Real local photo for the hero. Omit it and the hero draws the city's route map instead. */
  image?: {
    src: string;
    alt: string;
    /** Intrinsic pixel size of the file, for the img width/height attributes. */
    width: number;
    height: number;
    position?: string;
    tone?: 'day' | 'night';
    /** Daylight stock photo: soften it into the site palette. */
    grade?: boolean;
  };
  /** Lead under "Popular destinations": what this city's guests actually ride to. */
  destinationsLead: string;
  neighborhoods: string[];
  destinations: AreaDestination[];
  trips: AreaTrip[];
  /** Recommended vehicles (site.ts fleet ids) with a city-specific reason. */
  vehicles: { id: string; why: string }[];
  faqs: { q: string; a: string }[];
};

export const SEA = 'Seattle-Tacoma International Airport (SEA)';
export const PAE = 'Paine Field Airport (PAE)';
export const BFI = 'Boeing Field (BFI)';
export const PIER66 = 'Pier 66, Bell Street Cruise Terminal';
export const PIER91 = 'Pier 91, Smith Cove Cruise Terminal';

export const areaPages: Record<string, AreaPage> = {
  seattle: {
    slug: 'seattle',
    seo: {
      title: 'Seattle Car Service: Downtown, SeaTac & Piers | Door to Door',
      description:
        'Seattle car service for downtown hotels, SeaTac flights and the Pier 66 and Pier 91 cruise terminals, plus game days and nights out. Reserve online 24/7.',
    },
    h1: { text: 'Seattle', em: 'car\u00a0service' },
    intro: [
      'From a red-eye into SeaTac to a late dinner in Belltown, Seattle rarely moves in a straight line. Your chauffeur handles the hills, the one-way streets and the stadium traffic, so you arrive composed, on time and at the right door.',
      'We cover the whole city, from downtown hotels and South Lake Union offices to Capitol Hill, Fremont and Ballard, plus both cruise terminals on the waterfront.',
    ],
    image: { src: images.skyline, alt: 'Seattle skyline with the Space Needle and Mount Rainier on a clear day', width: 1280, height: 853, position: '30% 50%', tone: 'day' },
    destinationsLead: 'Stadium nights in SoDo, sailings from the waterfront and the landmarks every visitor asks about. Pick one to start a booking, or bring any address you like.',
    neighborhoods: [
      'Downtown', 'Belltown', 'South Lake Union', 'Capitol Hill', 'First Hill', 'Pioneer Square', 'Queen Anne',
      'Fremont', 'Ballard', 'Wallingford', 'University District', 'Magnolia', 'Madison Park', 'West Seattle',
      'Waterfront · Pier 66', 'Smith Cove · Pier 91',
    ],
    destinations: [
      { name: 'Pike Place Market', kind: 'Landmark', icon: 'pin', type: 'p2p', to: 'Pike Place Market, Seattle', text: 'The historic public market above Elliott Bay. Drop-off close by, and your chauffeur texts the pickup point when you are ready.' },
      { name: 'Space Needle & Seattle Center', kind: 'Landmark', icon: 'sparkle', type: 'p2p', to: 'Seattle Center, Seattle', text: 'The city’s signature view, with museums, gardens and venues across the Seattle Center campus.' },
      { name: 'Lumen Field & T-Mobile Park', kind: 'Stadiums', icon: 'flag', type: 'events', to: 'Lumen Field, Seattle', text: 'Seahawks, Sounders and Mariners game days in SoDo. Dropped off before the first whistle, collected after the last.' },
      { name: 'Climate Pledge Arena', kind: 'Arena', icon: 'glass', type: 'events', to: 'Climate Pledge Arena, Seattle', text: 'Kraken games and headline concerts at Seattle Center, without the parking or the post-show scramble.' },
      { name: 'Seattle Convention Center', kind: 'Conventions', icon: 'briefcase', type: 'corporate', to: 'Seattle Convention Center, Seattle', text: 'Conference and trade-show days downtown, with hotel transfers or a chauffeur on call by the hour.' },
      { name: 'Pier 66 & Pier 91', kind: 'Cruise terminals', icon: 'ship', type: 'cruise', text: 'Bell Street and Smith Cove terminals for Alaska sailings, with room for every suitcase and a smooth curbside drop.' },
    ],
    trips: [
      { icon: 'plane', title: 'SeaTac ↔ Downtown Seattle', text: 'Flight-tracked arrivals and departures for hotels, homes and offices across the city.', type: 'airport', from: SEA, to: 'Downtown Seattle', eta: true },
      { icon: 'ship', title: 'Hotel → Pier 66 or Pier 91', text: 'Door to gangway on embarkation day, then pier to SeaTac when you sail back in.', type: 'cruise' },
      { icon: 'flag', title: 'Game night in SoDo', text: 'Lumen Field or T-Mobile Park, with the car waiting nearby when the crowd heads for the exits.', type: 'events', to: 'Lumen Field, Seattle' },
      { icon: 'briefcase', title: 'Meetings in South Lake Union', text: 'Point-to-point or by the hour for client visits, roadshows and multi-stop days.', type: 'corporate', to: 'South Lake Union, Seattle' },
      { icon: 'glass', title: 'Seattle to Woodinville wine country', text: 'An afternoon of tastings with a chauffeur on call and a safe ride home.', type: 'hourly', from: 'Seattle', to: 'Woodinville wine country' },
    ],
    vehicles: [
      { id: 's550', why: 'Downtown meetings and SeaTac runs' },
      { id: 'escalade', why: 'Families and luggage-heavy arrivals' },
      { id: 'sprinter', why: 'Cruise groups and conference teams' },
      { id: 'stretch', why: 'Weddings, proms and big nights out' },
    ],
    faqs: [
      { q: 'We are sailing from a downtown hotel. How do we allow for cruise-day traffic?', a: 'Embarkation mornings bring heavy curbside traffic at Pier 66 and Pier 91, and a game in SoDo can slow traffic along the waterfront. Share your ship and check-in window when you book and dispatch sets a pickup time with room to spare. Sprinters and SUVs carry cruise luggage, and we can meet you at the pier for the run to SeaTac when you sail back in.' },
      { q: 'Where will my chauffeur meet us after a game or concert?', a: 'Pickup zones around Lumen Field, T-Mobile Park and Climate Pledge Arena change from event to event, so your chauffeur texts the exact meeting point before the final whistle or encore.' },
      { q: 'Can one booking cover dinner in Belltown and a show at Seattle Center?', a: 'Yes. Book hourly, as directed, and your chauffeur stays on call between stops, so the evening moves from dinner to Climate Pledge Arena or the Space Needle without a search for parking. Your quote shows the full rate before you confirm.' },
      { q: 'Do you pick up in West Seattle, Ballard and the U District?', a: 'Yes. Every Seattle neighborhood is door to door, including homes on steep or narrow streets. If the building has a loading zone, a gate or a back entrance, add a note when you book and your chauffeur will plan around it.' },
    ],
  },

  bellevue: {
    slug: 'bellevue',
    seo: {
      title: 'Bellevue Limo & Black Car Service | Door to Door',
      description:
        'Bellevue black car and limo service for SeaTac runs, downtown meetings and Eastside events. About 25 minutes from SeaTac. Reserve your chauffeur online 24/7.',
    },
    h1: { text: 'Bellevue limo\u00a0&', em: 'black car service' },
    intro: [
      'Bellevue runs on tight calendars: a board meeting downtown, client dinner in Old Bellevue, an early flight out of SeaTac. A chauffeured black car turns that schedule into quiet, productive time, with Wi-Fi in our S550 and executive Sprinter, and a chauffeur ready when the meeting ends.',
      'We serve every corner of the city, from the downtown towers and The Bellevue Collection to Crossroads, Factoria and Eastgate, and connect Bellevue with SeaTac, Seattle and the rest of the Eastside, including roadshow days that cross the lake more than once.',
    ],
    destinationsLead: 'Downtown towers, convention days at Meydenbauer and long dinners on Main Street. Pick one to start a booking, or bring any address you like.',
    neighborhoods: [
      'Downtown Bellevue', 'Old Bellevue', 'BelRed', 'Wilburton', 'Crossroads', 'Factoria', 'Eastgate',
      'Newport', 'Somerset', 'Bridle Trails', 'Lake Hills', 'Woodridge',
    ],
    destinations: [
      { name: 'The Bellevue Collection', kind: 'Shopping & dining', icon: 'sparkle', type: 'p2p', to: 'Bellevue Square, Bellevue', text: 'Bellevue Square, Lincoln Square and Bellevue Place: shopping, dining and hotels in the heart of downtown.' },
      { name: 'Meydenbauer Center', kind: 'Conventions', icon: 'briefcase', type: 'corporate', to: 'Meydenbauer Center, Bellevue', text: 'Downtown Bellevue’s convention center. Hotel transfers, or a chauffeur on call for multi-day events.' },
      { name: 'Old Bellevue', kind: 'Dining', icon: 'glass', type: 'events', to: 'Old Bellevue, Main Street, Bellevue', text: 'Main Street’s restaurants and boutiques, made for a long dinner without watching the clock.' },
      { name: 'Bellevue Downtown Park', kind: 'Park', icon: 'sun', type: 'p2p', to: 'Bellevue Downtown Park, Bellevue', text: 'Downtown’s central park, with its waterfall and promenade, steps from Old Bellevue.' },
      { name: 'Bellevue Botanical Garden', kind: 'Garden', icon: 'pin', type: 'p2p', to: 'Bellevue Botanical Garden, Bellevue', text: 'Gardens east of downtown and home to the winter Garden d’Lights display.' },
      { name: 'Factoria & Eastgate', kind: 'Business', icon: 'briefcase', type: 'corporate', to: 'Factoria, Bellevue', text: 'Corporate offices along I-90 for meetings, site visits and early airport runs.' },
    ],
    trips: [
      { icon: 'plane', title: 'SeaTac ↔ Bellevue', text: 'Flight-tracked pickups to downtown hotels, offices and homes across the city.', type: 'airport', from: SEA, to: 'Downtown Bellevue', eta: true },
      { icon: 'briefcase', title: 'Eastside roadshow day', text: 'Back-to-back meetings in Bellevue, Redmond and Seattle, with the car waiting between stops.', type: 'corporate', from: 'Downtown Bellevue' },
      { icon: 'flag', title: 'Bellevue to a Seattle game or show', text: 'Lumen Field, T-Mobile Park or Climate Pledge Arena across the lake, then straight home.', type: 'events', from: 'Bellevue', to: 'Climate Pledge Arena, Seattle' },
      { icon: 'glass', title: 'Woodinville wine afternoon', text: 'Tasting rooms to the north with a chauffeur on call between stops.', type: 'hourly', from: 'Bellevue', to: 'Woodinville wine country' },
      { icon: 'ship', title: 'Bellevue → Seattle cruise terminals', text: 'Pier 66 or Pier 91 with space for the whole family’s luggage.', type: 'cruise', from: 'Bellevue' },
    ],
    vehicles: [
      { id: 's550', why: 'Executive transfers downtown' },
      { id: 'electric', why: 'Quiet, zero-emission city trips' },
      { id: 'escalade', why: 'Families and VIP guests' },
      { id: 'sprinter', why: 'Corporate groups and roadshows' },
    ],
    faqs: [
      { q: 'Can you cover a multi-day event at Meydenbauer Center?', a: 'Yes. Keep a chauffeur on call by the hour for the busiest days, or schedule point-to-point rides between your hotel, Meydenbauer Center and dinners in Old Bellevue. Airport pickups for colleagues flying in can be added as their flight details arrive.' },
      { q: 'Do you pick up at downtown Bellevue hotels and office towers?', a: 'Yes. Share the building or hotel when you book and your chauffeur texts the exact meeting point, whether that is the lobby, a porte-cochère or the curb outside.' },
      { q: 'Can our Bellevue office set up a corporate account?', a: 'Yes. Corporate accounts come with invoicing, and one account can cover executives, visiting clients and roadshows across the Eastside and Seattle.' },
      { q: 'Do you run wine tours from Bellevue to Woodinville?', a: 'Yes. Book hourly and plan the day your way: your chauffeur waits between tastings and drives everyone home. A Sprinter suits larger groups.' },
    ],
  },

  kirkland: {
    slug: 'kirkland',
    seo: {
      title: 'Kirkland Limo, Car Service & Wine Tours | Door to Door',
      description:
        'Kirkland limo and car service for SeaTac and Paine Field transfers, Woodinville wine tours, lakeside weddings and nights out. Reserve a professional chauffeur.',
    },
    h1: { text: 'Kirkland limo\u00a0&', em: 'car service' },
    intro: [
      'Kirkland is lakefront dinners, quiet neighborhoods and a short drive to Woodinville wine country. Whether it is an early SeaTac run from Juanita or an evening on the downtown waterfront, your chauffeur takes the wheel so the day can stay unhurried.',
      'We pick up across the city, from Moss Bay and Houghton to Totem Lake and Finn Hill, and link Kirkland with Bellevue, Redmond, Seattle, SeaTac and Paine Field. Woodinville’s tasting rooms are close enough for an easy afternoon booked by the hour.',
    ],
    destinationsLead: 'Lakefront dining, the downtown waterfront and wine country just up the road. Pick one to start a booking, or bring any address you like.',
    neighborhoods: [
      'Downtown · Moss Bay', 'Juanita', 'Totem Lake', 'Houghton', 'Lakeview', 'Market', 'Norkirk',
      'Highlands', 'Rose Hill', 'Finn Hill', 'Kingsgate', 'Bridle Trails',
    ],
    destinations: [
      { name: 'Downtown waterfront & Marina Park', kind: 'Waterfront', icon: 'sun', type: 'events', to: 'Marina Park, Kirkland', text: 'Lake Washington views, galleries and dining along Kirkland’s downtown shoreline.' },
      { name: 'Carillon Point', kind: 'Lakeside dining', icon: 'glass', type: 'events', to: 'Carillon Point, Kirkland', text: 'A marina and dining destination on the lake, south of downtown.' },
      { name: 'Kirkland Urban', kind: 'Shopping & dining', icon: 'sparkle', type: 'p2p', to: 'Kirkland Urban, Kirkland', text: 'Shops, restaurants and offices at the center of downtown Kirkland.' },
      { name: 'The Village at Totem Lake', kind: 'Shopping & dining', icon: 'sparkle', type: 'p2p', to: 'The Village at Totem Lake, Kirkland', text: 'Restaurants and shopping in the north end of the city, close to I-405.' },
      { name: 'Juanita Beach Park', kind: 'Park', icon: 'pin', type: 'p2p', to: 'Juanita Beach Park, Kirkland', text: 'A swimming beach and boardwalk on Juanita Bay, on Kirkland’s north shore.' },
      { name: 'Woodinville wine country', kind: 'Wine tours', icon: 'glass', type: 'hourly', to: 'Woodinville wine country', text: 'Tasting rooms just north-east of Kirkland, an easy hourly booking with a chauffeur on call.' },
    ],
    trips: [
      { icon: 'plane', title: 'SeaTac ↔ Kirkland', text: 'Flight-tracked pickups to Juanita, Totem Lake, downtown and every neighborhood between.', type: 'airport', from: SEA, to: 'Kirkland', eta: true },
      { icon: 'plane', title: 'Kirkland → Paine Field', text: 'A northbound alternative to SeaTac when your flight leaves from Everett.', type: 'airport', from: 'Kirkland', to: PAE },
      { icon: 'glass', title: 'Woodinville wine tour', text: 'Pickup at home, a chauffeur on call between tastings and a safe ride back.', type: 'hourly', from: 'Kirkland', to: 'Woodinville wine country' },
      { icon: 'sparkle', title: 'Waterfront dinner & night out', text: 'Downtown Kirkland, Carillon Point or across the lake in Seattle.', type: 'events', from: 'Kirkland' },
      { icon: 'rings', title: 'Lakeside wedding day', text: 'Bridal party, guest shuttles and the getaway car, timed to your run of show.', type: 'weddings', from: 'Kirkland' },
    ],
    vehicles: [
      { id: 'escalade', why: 'SeaTac runs with the whole family' },
      { id: 'electric', why: 'Quiet trips around the Eastside' },
      { id: 'sprinter', why: 'Woodinville wine tours for groups' },
      { id: 'stretch', why: 'Lakeside weddings and anniversaries' },
    ],
    faqs: [
      { q: 'Can you take me from Kirkland to Paine Field instead of SeaTac?', a: 'Yes. We serve Paine Field (PAE) in Everett as well as SeaTac. Choose the airport when you book and we plan the pickup around your departure time.' },
      { q: 'Can you handle transport for a lakeside wedding in Kirkland?', a: 'Yes. We coordinate the couple’s car, the wedding party and guest shuttles to your run of show, with stretch limousines, SUVs and Sprinters. Share the venue and timeline when you book and dispatch plans every arrival and departure around them.' },
      { q: 'Is Kirkland a good starting point for a Woodinville wine tour?', a: 'Woodinville’s tasting rooms are a short drive away, which makes it an easy hourly booking: pickup at your door, a chauffeur on call between tastings, and a safe ride home.' },
      { q: 'Do you serve Juanita, Finn Hill and Totem Lake?', a: 'Yes, every Kirkland neighborhood, door to door. If your pickup is on a private road or in a gated community, add a note and your chauffeur will confirm the meeting point.' },
    ],
  },

  redmond: {
    slug: 'redmond',
    seo: {
      title: 'Redmond Black Car & Limo Service | Door to Door',
      description:
        'Redmond black car service for Microsoft campus visits, SeaTac transfers and Eastside roadshows. Quiet sedans, SUVs and Sprinters. Reserve online or call 24/7.',
    },
    h1: { text: 'Redmond', em: 'black car service' },
    intro: [
      'Redmond’s days start early and often end at the airport. Visiting teams, interview days, offsites and investor meetings all depend on transport that simply works: the car at the lobby when expected, a quiet cabin for the next call, and a chauffeur who keeps the schedule.',
      'We serve the Microsoft campus and Overlake, downtown Redmond and Redmond Town Center, Education Hill and the Sammamish Valley, and multi-stop itineraries across Bellevue and Seattle are easy to arrange.',
    ],
    destinationsLead: 'Campus visits, team dinners downtown and summer concerts by the Sammamish River. Pick one to start a booking, or bring any address you like.',
    neighborhoods: [
      'Downtown Redmond', 'Redmond Town Center', 'Overlake', 'Microsoft campus', 'Education Hill', 'Grass Lawn',
      'Idylwood', 'Willows', 'Bear Creek', 'Sammamish Valley', 'Union Hill',
    ],
    destinations: [
      { name: 'Microsoft campus', kind: 'Corporate campus', icon: 'briefcase', type: 'corporate', to: 'Microsoft Campus, Redmond', text: 'Building-to-building and campus-to-airport rides for visitors, candidates and teams. Add the building number when you book.' },
      { name: 'Redmond Town Center', kind: 'Shopping & dining', icon: 'sparkle', type: 'p2p', to: 'Redmond Town Center, Redmond', text: 'Open-air shopping and dining at the heart of downtown Redmond.' },
      { name: 'Marymoor Park', kind: 'Concerts & events', icon: 'flag', type: 'events', to: 'Marymoor Park, Redmond', text: 'Summer concerts and festivals beside the Sammamish River, with a ride home after the encore.' },
      { name: 'Downtown Redmond', kind: 'Dining', icon: 'glass', type: 'events', to: 'Downtown Redmond', text: 'Restaurants and bars around Redmond’s walkable downtown core, for team dinners and celebrations.' },
      { name: 'Overlake', kind: 'Business', icon: 'briefcase', type: 'corporate', to: 'Overlake, Redmond', text: 'Offices and hotels along SR 520, next to the Microsoft campus.' },
      { name: 'Sammamish Valley & Woodinville', kind: 'Wine tours', icon: 'glass', type: 'hourly', to: 'Woodinville wine country', text: 'Tasting rooms a short drive north through the valley, ideal for an hourly booking.' },
    ],
    trips: [
      { icon: 'plane', title: 'SeaTac ↔ Redmond', text: 'Flight-tracked pickups for visitors heading to campus, hotels and homes.', type: 'airport', from: SEA, to: 'Redmond', eta: true },
      { icon: 'briefcase', title: 'Campus visitor day', text: 'Hotel, campus, dinner and back, all on one booking.', type: 'corporate', to: 'Microsoft Campus, Redmond' },
      { icon: 'route', title: 'Eastside roadshow', text: 'Redmond, Bellevue and Seattle meetings back to back, with the car waiting between stops.', type: 'corporate', from: 'Redmond' },
      { icon: 'flag', title: 'Concert at Marymoor Park', text: 'Drop-off for the show and a calm ride home after the encore.', type: 'events', to: 'Marymoor Park, Redmond' },
      { icon: 'users', title: 'Team offsite', text: 'A Sprinter for the whole team, with tastings or dinner in the Sammamish Valley.', type: 'hourly', from: 'Redmond', to: 'Woodinville wine country' },
    ],
    vehicles: [
      { id: 'electric', why: 'Campus and city transfers' },
      { id: 's550', why: 'Executive visitors and airport runs' },
      { id: 'sprinter', why: 'Teams, offsites and roadshows' },
      { id: 'escalade', why: 'Small groups with luggage' },
    ],
    faqs: [
      { q: 'Can one booking cover a visitor’s interview or meeting day in Redmond?', a: 'Yes. The SeaTac pickup, hotel check-in, meetings on the Microsoft campus or in Overlake and the ride back to the airport can all sit on one booking. Add each building and your host’s details, and the chauffeur texts the exact meeting point before every stop.' },
      { q: 'Can you get us home after a concert at Marymoor Park?', a: 'Yes. We drop you off before the show and, because event traffic plans change from night to night, your chauffeur texts the exact pickup point afterward.' },
      { q: 'Can one booking cover several stops in Redmond, Bellevue and Seattle?', a: 'Yes. Book hourly, as directed, and your chauffeur waits between meetings. Multi-stop itineraries are standard for roadshows and visiting teams.' },
      { q: 'Do you offer an electric vehicle for corporate travel?', a: 'Yes. A Tesla Model S is part of the fleet for quiet, zero-emission transfers, subject to availability. Choose it when you reserve.' },
    ],
  },

  tacoma: {
    slug: 'tacoma',
    seo: {
      title: 'Tacoma Limo & Airport Car Service | Door to Door',
      description:
        'Tacoma limo and airport car service: SeaTac transfers in about 30 minutes, Tacoma Dome concerts, weddings and cruise runs to Seattle. Reserve your ride today.',
    },
    h1: { text: 'Tacoma\u00a0limo\u00a0&', em: 'airport\u00a0service' },
    intro: [
      'Tacoma has its own rhythm: concerts at the Tacoma Dome, dinners along Ruston Way, weddings with views of the Sound. We bring the same chauffeured standard south, with spacious vehicles for groups and a calm ride home at the end of the night.',
      'From downtown and the Stadium District to Proctor, Old Town and University Place, we pick up across Tacoma and connect it with SeaTac, Seattle’s stadiums and both cruise terminals.',
    ],
    destinationsLead: 'Arena nights, the museums on Pacific Avenue and the waterfront along Commencement Bay. Pick one to start a booking, or bring any address you like.',
    neighborhoods: [
      'Downtown Tacoma', 'Stadium District', 'Proctor', 'North End', 'Old Town', 'Ruston Way',
      'Point Ruston', 'Hilltop', 'Sixth Avenue', 'South Tacoma', 'University Place', 'Fircrest',
    ],
    destinations: [
      { name: 'Tacoma Dome', kind: 'Arena', icon: 'flag', type: 'events', to: 'Tacoma Dome, Tacoma', text: 'Headline concerts and events, with no parking to find and a calm ride home after.' },
      { name: 'Museum of Glass', kind: 'Museum', icon: 'sparkle', type: 'p2p', to: 'Museum of Glass, Tacoma', text: 'Tacoma’s glass-art landmark on the Thea Foss Waterway, linked to downtown by the Chihuly Bridge of Glass.' },
      { name: 'Point Defiance Park', kind: 'Park', icon: 'sun', type: 'p2p', to: 'Point Defiance Park, Tacoma', text: 'Old-growth forest, gardens, beaches and the Point Defiance Zoo & Aquarium.' },
      { name: 'Ruston Way waterfront', kind: 'Dining', icon: 'glass', type: 'events', to: 'Ruston Way, Tacoma', text: 'Waterfront restaurants and promenades along Commencement Bay, made for dinner out.' },
      { name: 'Museum District', kind: 'Culture', icon: 'pin', type: 'p2p', to: 'Union Station, Tacoma', text: 'Union Station, the Washington State History Museum and Tacoma Art Museum along Pacific Avenue.' },
      { name: 'Chambers Bay', kind: 'Golf', icon: 'flag', type: 'hourly', to: 'Chambers Bay, University Place', text: 'The public links course in University Place, with wide views over Puget Sound.' },
    ],
    trips: [
      { icon: 'plane', title: 'SeaTac ↔ Tacoma', text: 'Flight-tracked pickups to downtown, the North End and University Place.', type: 'airport', from: SEA, to: 'Tacoma', eta: true },
      { icon: 'flag', title: 'Tacoma Dome concert', text: 'Arrive together, skip the parking and leave when you are ready.', type: 'events', to: 'Tacoma Dome, Tacoma' },
      { icon: 'ship', title: 'Tacoma → Seattle cruise terminals', text: 'Pier 66 or Pier 91 with room for every bag, and back again after the voyage.', type: 'cruise', from: 'Tacoma' },
      { icon: 'glass', title: 'Tacoma to a Seattle game', text: 'Lumen Field, T-Mobile Park or Climate Pledge Arena, with the drive home taken care of.', type: 'events', from: 'Tacoma', to: 'Lumen Field, Seattle' },
      { icon: 'rings', title: 'Waterfront wedding', text: 'Coordinated vehicles for the couple, the wedding party and guests.', type: 'weddings', from: 'Tacoma' },
    ],
    vehicles: [
      { id: 'escalade', why: 'SeaTac runs and small groups' },
      { id: 'sprinter', why: 'Cruise and group transfers' },
      { id: 'stretch', why: 'Weddings and proms' },
      { id: 'party-sprinter', why: 'Tacoma Dome nights and birthdays' },
    ],
    faqs: [
      { q: 'Do you provide transportation to Tacoma Dome concerts?', a: 'Yes. We drop you off before the show and your chauffeur texts the exact pickup point afterward, since event traffic plans vary. Our Party Sprinter and stretch limousine suit larger groups.' },
      { q: 'Can you drive us from Tacoma to the Seattle cruise terminals?', a: 'Yes. We run Tacoma pickups to Pier 66 and Pier 91 with vehicles sized for cruise luggage, and can meet you at the pier when you return.' },
      { q: 'Can we book a chauffeur for a round at Chambers Bay?', a: 'Yes. Book hourly and your chauffeur waits while you play, then takes you on to dinner or home. Tell us how many golf bags are coming so we send a vehicle with room for them.' },
      { q: 'Do you serve University Place and the rest of Pierce County?', a: 'We serve Tacoma and University Place every day. For pickups further afield, call us and we will plan and quote a custom route.' },
    ],
  },

  everett: {
    slug: 'everett',
    seo: {
      title: 'Everett Limo & Paine Field Car Service | Door to Door',
      description:
        'Everett limo and car service for Paine Field and SeaTac flights, Angel of the Winds Arena nights and Mukilteo ferry connections. Reserve your chauffeur 24/7.',
    },
    h1: { text: 'Everett limo\u00a0&', em: 'Paine\u00a0Field car\u00a0service' },
    intro: [
      'Everett sits between two airports: Paine Field on its doorstep and SeaTac to the south. Whichever you are flying, we time the pickup to your flight, load the luggage and take the stress out of the drive, including the long I-5 run through Seattle.',
      'We serve downtown Everett and the waterfront, Silver Lake, Mill Creek and Mukilteo, with rides to Angel of the Winds Arena, the Mukilteo ferry and anywhere in the Seattle area.',
    ],
    destinationsLead: 'Your own airport, the arena downtown and the ferry to Whidbey Island. Pick one to start a booking, or bring any address you like.',
    neighborhoods: [
      'Downtown Everett', 'Everett waterfront', 'North Everett', 'Port Gardner', 'Silver Lake', 'South Everett',
      'Paine Field area', 'Mill Creek', 'Mukilteo', 'Harbour Pointe',
    ],
    destinations: [
      { name: 'Paine Field (PAE)', kind: 'Airport', icon: 'plane', type: 'airport', to: PAE, text: 'Commercial flights from Everett’s own passenger terminal, close to Mukilteo and Mill Creek.' },
      { name: 'Angel of the Winds Arena', kind: 'Arena', icon: 'flag', type: 'events', to: 'Angel of the Winds Arena, Everett', text: 'Concerts, hockey and events in downtown Everett, with the car ready when it is over.' },
      { name: 'Port of Everett waterfront', kind: 'Waterfront', icon: 'sun', type: 'events', to: 'Port of Everett waterfront, Everett', text: 'Marina, restaurants and waterfront walks on Port Gardner Bay.' },
      { name: 'Mukilteo waterfront & ferry', kind: 'Ferry', icon: 'ship', type: 'p2p', to: 'Mukilteo ferry terminal, Mukilteo', text: 'The lighthouse park and the ferry to Whidbey Island. Share your sailing and we time the pickup.' },
      { name: 'Mill Creek Town Center', kind: 'Shopping & dining', icon: 'sparkle', type: 'p2p', to: 'Mill Creek Town Center, Mill Creek', text: 'Shops and restaurants at the heart of Mill Creek.' },
      { name: 'Everett Station', kind: 'Rail', icon: 'route', type: 'p2p', to: 'Everett Station, Everett', text: 'Everett’s rail and transit hub, for connections to Amtrak and Sounder trains.' },
    ],
    trips: [
      { icon: 'plane', title: 'SeaTac ↔ Everett', text: 'Flight-tracked pickups for the long run north, with room for the luggage.', type: 'airport', from: SEA, to: 'Everett', eta: true },
      { icon: 'plane', title: 'Everett ↔ Paine Field', text: 'Close-to-home flights with the same flight-tracked pickup.', type: 'airport', from: PAE, to: 'Everett' },
      { icon: 'flag', title: 'Angel of the Winds Arena', text: 'Concerts and hockey nights, with the car waiting afterward.', type: 'events', to: 'Angel of the Winds Arena, Everett' },
      { icon: 'ship', title: 'Mukilteo ferry connection', text: 'Meet a sailing to or from Whidbey Island, timed to the ferry.', type: 'p2p', to: 'Mukilteo ferry terminal, Mukilteo' },
      { icon: 'glass', title: 'Everett to a Seattle night out', text: 'Dinner, a show or a game in the city, and a calm ride back north.', type: 'events', from: 'Everett' },
    ],
    vehicles: [
      { id: 's550', why: 'Paine Field and SeaTac runs' },
      { id: 'escalade', why: 'Families with luggage' },
      { id: 'sprinter', why: 'Group trips into Seattle' },
      { id: 'party-sprinter', why: 'Arena nights and celebrations' },
    ],
    faqs: [
      { q: 'Should I fly from Paine Field or SeaTac?', a: 'It depends on your airline and destination. Paine Field (PAE) is close to home with a compact terminal; SeaTac has far more routes and sits about 45 minutes south in typical traffic. We serve both: tell us the airport and flight number and we time the pickup to your schedule.' },
      { q: 'Can you take a group to an event at Angel of the Winds Arena?', a: 'Yes. The Party Sprinter or an SUV keeps a group together, and your chauffeur texts the exact pickup point after the show, since event traffic plans vary.' },
      { q: 'Can you meet us at the Mukilteo ferry terminal?', a: 'Yes. Ferries can run behind schedule, so add your sailing when you book and your chauffeur will text the exact meeting point.' },
      { q: 'Do you cover Mill Creek and Mukilteo?', a: 'Yes, along with every Everett neighborhood. Pickups are door to door, whether you are heading to an airport, an event or a night out in Seattle.' },
    ],
  },
};

/** site.ts areas joined with their landing-page content, in site order. */
export const areaList = areas.map((a) => ({ ...a, page: areaPages[a.slug] }));
export type AreaEntry = (typeof areaList)[number];

/** "25 min from SeaTac" → "25 min" */
export const etaMin = (eta: string) => eta.match(/^\d+\s*min/)?.[0] ?? eta;

/** Short anchor text and icon for each service (keyed by booking type / Service.slug). */
export const serviceIcon: Record<string, string> = {
  airport: 'plane',
  corporate: 'briefcase',
  weddings: 'rings',
  cruise: 'ship',
  events: 'glass',
  hourly: 'hourglass',
};

export const tripLabel: Record<BookingType, string> = {
  airport: 'Airport',
  corporate: 'Corporate',
  weddings: 'Wedding',
  cruise: 'Cruise',
  events: 'Event',
  hourly: 'Hourly',
  p2p: 'Point-to-point',
};

/** /book/ deep link from the URL contract. Empty values are omitted. */
export function bookHref(p: { type?: string; from?: string; to?: string; vehicle?: string }) {
  const q = new URLSearchParams();
  (['type', 'from', 'to', 'vehicle'] as const).forEach((k) => { const v = p[k]; if (v) q.set(k, v); });
  const s = q.toString();
  return s ? `/book/?${s}` : '/book/';
}

/** Great-circle distance in km, used to order "nearby cities". */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

