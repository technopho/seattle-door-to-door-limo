// JSON-LD builders. Pass results to <Base jsonLd={[...]}>.
import { site, areas, services, faqs as homeFaqs } from '../data/site';

const abs = (path: string) => new URL(path, site.url).href;

export const businessId = `${site.url}/#business`;
export const websiteId = `${site.url}/#website`;
/** Home page URL exactly as its canonical tag declares it (trailing slash). */
const homeUrl = `${site.url}/`;

/** The company itself. Rendered on every page so other nodes can reference it by @id. */
export function localBusiness() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': businessId,
    name: site.name,
    description: site.tagline,
    url: homeUrl,
    telephone: '+1-206-647-5930',
    email: site.email,
    image: abs('/og-image.jpg'),
    logo: abs('/favicon.svg'),
    priceRange: '$$$',
    foundingDate: String(site.since),
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    address: { '@type': 'PostalAddress', addressLocality: 'Seattle', addressRegion: 'WA', addressCountry: 'US' },
    areaServed: [...areas.map((a) => ({ '@type': 'City', name: `${a.city}, WA` })), { '@type': 'Airport', name: 'Seattle-Tacoma International Airport' }],
    // No aggregateRating: the 4.9 / 800+ figure sums Google, Yelp and Facebook reviews, and Google's
    // review-snippet policy forbids marking up self-serving or third-party-aggregated ratings on
    // LocalBusiness. Add it back only for first-party reviews collected and shown on this site.
    makesOffer: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, url: abs(`/services/${s.page}/`) } })),
  };
}

/** The site itself, so search results show "Seattle Door to Door Limo" as the site name. Home page only. */
export function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId,
    name: site.name,
    alternateName: ['Door to Door Limo', 'Seattle Door to Door Limousine'],
    url: homeUrl,
    publisher: { '@id': businessId },
  };
}

/** A specific service offered by the business (service and city landing pages). */
export function serviceSchema(opts: { name: string; description: string; path: string; areaServed?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    serviceType: 'Chauffeured limousine and black car service',
    provider: { '@id': businessId },
    areaServed: (opts.areaServed ?? areas.map((a) => `${a.city}, WA`)).map((name) => ({ '@type': 'City', name })),
  };
}

export function faqPage(items: { q: string; a: string }[] = homeFaqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** Breadcrumbs, e.g. breadcrumbs([['Services', '/services/'], ['Airport Transfers', '/services/airport-transfers/']]). Home is prepended. */
export function breadcrumbs(trail: [name: string, path: string][]) {
  const items: [string, string][] = [['Home', '/'], ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
  };
}

export function article(opts: { title: string; description: string; path: string; datePublished: string; dateModified?: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: abs(opts.path),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    image: opts.image ?? abs('/og-image.jpg'),
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@id': businessId },
  };
}
