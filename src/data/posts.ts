// Journal (blog) posts. Bodies are trusted, hand-authored HTML rendered inside <Prose>.
// Every <h2> in a body needs an id: the post page builds its "In this article" list from them.
//
// `draft: true` = written for the redesign and awaiting client review. Drafts are rendered by the dev
// server only (marked with a "Draft" badge) so the client can review them; production builds leave them
// out entirely: no page, no Journal card, no related link, no JSON-LD, no sitemap entry. They also carry
// `noindex` as a fallback. Flip to `false` once the client approves the copy.
import { images, areas, fleet, services, serviceHref, areaHref } from './site';

export type Post = {
  slug: string;
  /** Visible headline, sentence case like every other heading on the site. */
  title: string;
  /** <title> tag, keyword-first, ≤ 60 chars. */
  seoTitle: string;
  /** Meta description, 140–160 chars. */
  description: string;
  /** Card teaser and article standfirst. */
  excerpt: string;
  category: string;
  /** Short label for the visible breadcrumb. */
  crumb: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  updated?: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  /** object-position for the wide article hero crop. */
  imagePosition?: string;
  /** Booking `type` of the most relevant service (drives the article CTA). */
  service: string;
  draft: boolean;
  body: string;
};

const svc = (slug: string) => services.find((s) => s.slug === slug)!;
const svcLink = (slug: string, label: string) => `<a href="${serviceHref(svc(slug))}">${label}</a>`;
const area = (slug: string) => areas.find((a) => a.slug === slug)!;
const areaLink = (slug: string, label = area(slug).city) => `<a href="${areaHref(area(slug))}">${label}</a>`;
const vehicle = (id: string) => fleet.find((v) => v.id === id)!;
const vehicleLink = (id: string) => `<a href="/fleet/#${id}">${vehicle(id).name}</a>`;
const etaMinutes = (eta: string) => eta.replace(/\s*from SeaTac/i, '');
const byEta = [...areas].sort((a, b) => parseInt(a.eta) - parseInt(b.eta));

const escalade = vehicle('escalade');
const sprinter = vehicle('sprinter');

export const posts: Post[] = [
  {
    slug: 'why-black-car-service-is-more-than-just-a-ride',
    title: 'Why black car service is more than just a ride',
    seoTitle: 'Seattle Black Car Service: More Than a Ride | Door to Door',
    description:
      'Reliability, discretion and a professional chauffeur: why black car service in Seattle is about peace of mind, not just luxury. Read on, then plan your ride.',
    excerpt:
      'For business travelers, special occasions, or anyone who values comfort and discretion, a black car service offers more than just luxury. It offers peace of mind. From airport transfers to private events, here’s why more people are making the switch.',
    category: 'Perspective',
    crumb: 'Black car service',
    date: '2026-10-22',
    image: images.studioSedan,
    imageAlt: 'A black luxury sedan in profile, its silhouette picked out by a single studio light',
    imageWidth: 1600,
    imageHeight: 1000,
    imagePosition: '50% 80%',
    service: 'corporate',
    draft: false,
    body: `
<p>There is a moment, usually somewhere between a delayed flight and a phone at four percent, when getting from one place to another stops being a detail and becomes the whole day. A black car service exists for that moment. Not because it is a nicer way to sit in traffic, but because it removes the parts of travel that tend to go wrong.</p>
<p>For business travelers, couples on their wedding day, families heading to the airport, or anyone who values comfort and discretion, the appeal is the same: someone else has already thought it through. Here is what that looks like in practice, and why so many people now treat it as part of the plan rather than an indulgence.</p>

<h2 id="planned-not-summoned">A ride that is planned, not summoned</h2>
<p>An app-based ride is matched to you when you ask for it. A chauffeured ride is planned before you need it. The vehicle, the pickup time and the route are set in advance and confirmed by a person, so a 6 a.m. departure does not depend on whoever happens to be nearby.</p>
<p>Airport pickups show the difference most clearly. A good service follows your flight and adjusts the pickup to when you actually land. If you are early, the car is there. If you are late, you are not left wondering whether your ride gave up on you.</p>

<h2 id="a-professional-behind-the-wheel">A professional behind the wheel</h2>
<p>The difference between a driver and a chauffeur is mostly invisible, which is the point. A chauffeur’s job is to make the trip uneventful: arrive early, know the route and the alternatives, handle the luggage, keep the cabin quiet unless you want conversation, and drive smoothly enough that you can read.</p>
<p>In Seattle, that local knowledge matters. A chauffeur who knows how I-5, the bridges to the Eastside and the stadium district behave on a game night can choose the route before the traffic chooses it for you.</p>

<h2 id="time-that-belongs-to-you">Time that belongs to you</h2>
<p>A quiet, clean cabin changes what the time in the car is for. Executives use it to prepare for a meeting or take a call without being overheard. Travelers use it to decompress after a long flight. Couples use it for the only ten private minutes they will have all day.</p>
<p>That is hard to put a number on, but most people who ride regularly will tell you it is the main reason they do.</p>

<h2 id="discretion-as-a-standard">Discretion as a standard</h2>
<p>Many clients care less about the car than about privacy. A professional chauffeur service treats who is riding, where they are going and what is said in the cabin as confidential. For executives, public figures and anyone traveling with sensitive work, that standard is not an extra. It is the service.</p>

<h2 id="the-right-vehicle">The right vehicle for the occasion</h2>
<p>Black car service is not one car. A sedan suits a solo traveler or a couple. An SUV gives a family or a small group room for luggage. A Sprinter keeps a corporate team or a wedding party together. A stretch limousine is for the nights when the arrival is part of the celebration.</p>
<p>Choosing the vehicle around the people and the bags, rather than squeezing into whatever arrives, is a quiet but real part of the comfort. If you are not sure what fits, <a href="/fleet/">compare the fleet</a> side by side.</p>

<h2 id="when-it-makes-sense">When it makes the most sense</h2>
<ul>
  <li><strong>${svcLink('airport', 'Airport transfers')}</strong>, especially early departures, late arrivals and trips with heavy luggage.</li>
  <li><strong>${svcLink('corporate', 'Client meetings and roadshows')}</strong>, where arriving composed, on time and together matters.</li>
  <li><strong>${svcLink('weddings', 'Weddings')} and milestone events</strong>, where timing across several vehicles has to hold.</li>
  <li><strong>${svcLink('events', 'Nights out')}</strong>, when nobody in the group should be driving home.</li>
  <li><strong>${svcLink('cruise', 'Cruise days')}</strong>, with a hotel, a terminal and an airport in one itinerary.</li>
</ul>

<h2 id="peace-of-mind">Peace of mind, not just luxury</h2>
<p>Leather seats and a polished car are pleasant. But the reason people switch, and stay, is simpler: they stop worrying about the ride. The car is booked, the chauffeur knows the plan, and the only thing left to do is get in.</p>
<p>That is what a black car service offers when it is done well. Not a more expensive ride, but one less thing to think about.</p>
`,
  },
  {
    slug: 'seatac-airport-pickup-what-to-expect',
    title: 'SeaTac airport pickup: what to expect from a chauffeured transfer',
    seoTitle: 'SeaTac Airport Pickup: What to Expect | Door to Door',
    description:
      'How a chauffeured SeaTac pickup works: flight tracking, finding your chauffeur, luggage help and typical drive times around Seattle. Plan your transfer today.',
    excerpt:
      'From the details worth sharing when you book to the text that tells you exactly where to meet, here is how a chauffeured pickup at Seattle-Tacoma International works.',
    category: 'Airport',
    crumb: 'SeaTac pickups',
    date: '2026-10-22',
    image: images.seatac,
    imageAlt: 'Passenger pickup lanes outside an airport terminal, beside a curved multi-level parking garage',
    imageWidth: 1080,
    imageHeight: 720,
    imagePosition: '50% 70%',
    service: 'airport',
    draft: true,
    body: `
<p>Seattle-Tacoma International Airport is the main gateway to the Puget Sound region, and like any major airport it gets busy, particularly at peak travel times. A ${svcLink('airport', 'chauffeured airport transfer')} takes most of that complexity off your plate. Here is how a typical pickup works, from booking to the moment you step into the car.</p>

<h2 id="before-you-fly">Before you fly</h2>
<p>The most useful detail you can share is your flight number. With it, your chauffeur follows the flight in real time instead of relying on the scheduled arrival. When you book, also include:</p>
<ul>
  <li>The number of passengers and bags, including anything oversized such as skis, golf clubs or a stroller</li>
  <li>Any child seats you need, with each child’s age</li>
  <li>Your destination, and any stops on the way</li>
  <li>A mobile number you will have switched on when you land</li>
</ul>
<p>Your booking is confirmed by a member of the concierge team, and your chauffeur’s details are sent before pickup.</p>

<h2 id="early-or-late">If your flight is early or late</h2>
<p>Flights rarely land exactly on schedule. Because yours is tracked, the pickup moves with it. You don’t need to call to say you’re delayed, and you won’t land early to find nobody there. If your flight is cancelled or you are rebooked, send us the new flight as soon as you have it.</p>

<h2 id="finding-your-chauffeur">Finding your chauffeur</h2>
<p>Arrival areas at a busy airport change with construction and traffic rules, so rather than asking you to memorize a spot in advance, your chauffeur texts you the exact meeting point once you land. If you’d like to be met with a name sign, request meet &amp; greet when you book.</p>
<p>Airport pickups include <a href="/faq/#q-wait-time">complimentary wait time</a>, so there is no need to rush through baggage claim. Your chauffeur helps with the luggage and loads the car.</p>

<h2 id="families-groups-and-guests">Families, groups and guests</h2>
<p>Traveling with children? Request child seats when you book, with each child’s age, so the right seats are in the car when you land. For groups, one larger vehicle keeps everyone and the luggage together: the ${vehicleLink('escalade')} seats up to ${escalade.passengers}, and the ${vehicleLink('sprinter')} up to ${sprinter.passengers}. Tell us how many bags you are bringing and we’ll confirm the fit.</p>
<p>Booking for someone else, such as a client, a colleague or a visiting relative? Give us the guest’s name, flight and mobile number. Your chauffeur can meet them with a name sign, and you can ask us to keep you updated on the pickup as well.</p>

<h2 id="the-drive">The drive</h2>
<p>Once you are on the road, the time is yours. Drive times from SeaTac in normal traffic:</p>
<ul>
${byEta.map((a) => `  <li><strong>${areaLink(a.slug)}</strong>: about ${etaMinutes(a.eta)}</li>`).join('\n')}
</ul>
<p>Peak-hour traffic on I-5, I-405 and the bridges to the Eastside can add time, and your chauffeur plans the route around it. Our <a href="/service-areas/">service areas</a> page covers each city in more detail.</p>

<h2 id="heading-to-seatac">Heading to SeaTac instead</h2>
<p>For departures, we suggest a pickup time based on your flight, your airline’s check-in guidance and the traffic on your route at that hour. Early-morning flights and holiday weekends are worth booking well ahead, because they are when the most people are trying to reach the airport at once.</p>

<h2 id="other-airports">Other airports</h2>
<p>Not flying through SeaTac? Pickups at Paine Field in Everett and at Boeing Field (King County International Airport) work the same way: share the flight details, and your chauffeur coordinates the meeting point with you directly.</p>

<h2 id="checklist">A quick checklist</h2>
<ol>
  <li>Airline and flight number</li>
  <li>Passengers, bags and any oversized items</li>
  <li>Child seats, if needed</li>
  <li>Meet &amp; greet, if you would like a name sign</li>
  <li>Phone on when you land, and watch for your chauffeur’s text</li>
</ol>
`,
  },
  {
    slug: 'seattle-cruise-transfers-pier-66-vs-pier-91',
    title: 'Planning cruise transfers in Seattle: Pier 66 vs. Pier 91',
    seoTitle: 'Seattle Cruise Transfers: Pier 66 vs. Pier 91 | Door to Door',
    description:
      'Sailing from Seattle? How Pier 66 and Pier 91 differ, how to time embarkation and disembarkation, and how to plan luggage and airport transfers. Book your ride.',
    excerpt:
      'Seattle’s two cruise terminals are only a few miles apart, but they are different places to get to. Here is how to plan the ride on either side of your sailing.',
    category: 'Cruise',
    crumb: 'Cruise transfers',
    date: '2026-10-22',
    image: images.market,
    imageAlt: 'The Public Market Center sign and clock at Pike Place Market, near Seattle’s downtown waterfront',
    imageWidth: 5184,
    imageHeight: 3456,
    imagePosition: '50% 56%',
    service: 'cruise',
    draft: true,
    body: `
<p>Seattle is a major departure port for cruises to Alaska, and sailings leave from one of two Port of Seattle terminals: Pier 66 on the downtown waterfront, and Pier 91 at Smith Cove, north of downtown. They are only a few miles apart, but they are different places to get to, and knowing which one you need makes planning your ${svcLink('cruise', 'cruise transfer')} much easier.</p>

<h2 id="pier-66">Pier 66: Bell Street Cruise Terminal</h2>
<p>Pier 66 sits on the central waterfront along Alaskan Way, at the edge of Belltown and a short distance from Pike Place Market. Its location suits travelers staying downtown, and anyone who wants a last look at the waterfront before boarding.</p>
<p>If you are staying nearby, the terminal can look close enough to walk. With a week’s worth of luggage, though, a short ride to the curb is usually the easier option, and it means arriving at check-in rested rather than wrestling suitcases along the waterfront.</p>
<p>Being downtown also means sharing the streets with city traffic, waterfront visitors and, on some days, other events. Allow for that when you plan your arrival.</p>

<h2 id="pier-91">Pier 91: Smith Cove Cruise Terminal</h2>
<p>Pier 91 is north of downtown at Smith Cove, between the Magnolia and Interbay neighborhoods. It is a working maritime area rather than a sightseeing one, so most passengers arrive by car, shuttle or chauffeured transfer rather than on foot. From downtown hotels it is a short drive; from the airport or the Eastside the route is longer and depends more on traffic.</p>

<h2 id="which-pier">Which pier is your ship using?</h2>
<p>Don’t assume the terminal from the cruise line alone. Assignments can differ by ship and by sailing, so check your boarding documents or the cruise line’s app for the terminal name and your check-in window, and share both when you book. It is the single most useful detail for a smooth drop-off.</p>

<h2 id="embarkation-day">Embarkation day</h2>
<p>Cruise lines assign check-in times to spread out arrivals. Plan your pickup to reach the terminal within your window rather than hours before it; arriving very early usually just means waiting at the pier.</p>
<p>If you are flying in on sailing day, leave a generous buffer between your scheduled landing and your check-in time, and follow your cruise line’s guidance on same-day flights. Many travelers prefer to arrive the day before and spend a night downtown.</p>

<h2 id="disembarkation">Disembarkation and the ride home</h2>
<p>Ships typically return early in the morning, and passengers leave the ship in groups over a few hours. Your exact time ashore depends on your disembarkation group and how you handle your luggage, so give us your ship name and expected time, and your chauffeur will text you the meeting point. Flying out the same day? Build in plenty of time for the drive to SeaTac and for airport security.</p>

<h2 id="luggage-and-groups">Luggage, groups and multi-stop days</h2>
<p>Cruise luggage adds up quickly, so choose the vehicle around the bags as much as the passengers. The ${vehicleLink('escalade')} carries up to ${escalade.passengers} passengers, which suits most families. The ${vehicleLink('sprinter')} carries up to ${sprinter.passengers}, so a larger group can travel together in one vehicle. Tell us how many suitcases you are bringing, including anything oversized, and we’ll confirm a vehicle with room for everything.</p>
<p>Common cruise itineraries include:</p>
<ul>
  <li>SeaTac to a downtown hotel the day before sailing, then hotel to the pier</li>
  <li>Home, anywhere from ${areaLink('tacoma')} to ${areaLink('everett')}, straight to the terminal</li>
  <li>The pier to ${svcLink('airport', 'SeaTac')} for a flight home on return day</li>
</ul>

<h2 id="checklist">What to share when you book</h2>
<ol>
  <li>Ship name, sailing date and terminal (Pier 66 or Pier 91)</li>
  <li>Your check-in window, or your expected disembarkation time</li>
  <li>Passengers, suitcases and any oversized items</li>
  <li>Pickup address: hotel, home or airport</li>
  <li>Flight details, if you are connecting through SeaTac</li>
</ol>
`,
  },
];

/**
 * Drafts exist only on the dev server (for client review). `import.meta.env.DEV` is false in
 * `astro build`, so a draft gets no page, no card, no related link and no JSON-LD in production.
 */
export const isPublished = (p: Pick<Post, 'draft'>) => !p.draft || import.meta.env.DEV;
export const publishedPosts = posts.filter(isPublished);
/** True when the post with this slug is part of the current build (use before linking to it). */
export const isPostPublished = (slug: string) => publishedPosts.some((p) => p.slug === slug);
/** True on the dev server for a draft: shows the review badge. Never true in production. */
export const showDraftBadge = (p: Pick<Post, 'draft'>) => p.draft && import.meta.env.DEV;

/** Published posts, newest first; ties keep authoring order. */
export const sortedPosts = [...publishedPosts].sort((a, b) => b.date.localeCompare(a.date));

export const postHref = (p: Pick<Post, 'slug'>) => `/blog/${p.slug}/`;

export const postService = (p: Post) => svc(p.service);
export const postServiceHref = (p: Post) => serviceHref(svc(p.service));

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
export const wordCount = (p: Post) => stripTags(p.body).split(/\s+/).filter(Boolean).length;
/** Whole minutes at ~220 words per minute. */
export const readingTime = (p: Post) => Math.max(1, Math.round(wordCount(p) / 220));

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "In this article" entries, read from the body's <h2 id="…"> headings. */
export const postToc = (p: Post) =>
  Array.from(p.body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)).map((m) => ({ id: m[1], label: stripTags(m[2]).replace(/\s+/g, ' ').trim() }));

/** Other published posts, preferring the same category. */
export const relatedPosts = (p: Post, n = 2) =>
  sortedPosts.filter((o) => o.slug !== p.slug).sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category)).slice(0, n);
