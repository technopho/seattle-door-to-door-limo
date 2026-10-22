# Seattle Door to Door Limo — Website Redesign

Luxury redesign of seattledoortodoorlimo.com: Astro static site with a light "Ivory & Onyx" theme (default) and a dark "Onyx" mode, 3D hero and map, a booking wizard, and SEO landing pages for every service and city.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
```

Pages: `/`, `/fleet/`, `/book/`, `/services/` (+ 6 service pages), `/service-areas/` (+ 6 city pages), `/about/`, `/contact/`, `/faq/`, `/blog/`, `/privacy/`, `/terms/`, 404.

## Booking & contact requests

Forms POST JSON to `PUBLIC_LEAD_ENDPOINT` (see `.env.example`): a GoHighLevel inbound webhook, Zapier/Make hook or Formspree endpoint all work. Set it as a build environment variable in Cloudflare (**Settings → Variables and Secrets**, build-time). Logic lives in `src/lib/submit.ts`.

Without an endpoint, nothing is sent silently: the booking and contact forms finish on a "one last step" screen that lets the customer text, email or call the request in, with the details prefilled.

Optional: `PUBLIC_GOOGLE_MAPS_KEY` enables address autocomplete on the booking form (restrict the key to the site's domain).

## SEO

- Canonical URLs, Open Graph/Twitter tags and JSON-LD come from `src/layouts/Base.astro` + `src/lib/seo.ts` (LocalBusiness on every page; Service, FAQPage, BreadcrumbList, Article per page).
- `@astrojs/sitemap` writes `sitemap-index.xml`; `public/robots.txt` points to it.
- `public/_redirects` maps old URLs (`/booking`, `/reservations`, `/privacy-policy`); `public/_headers` sets caching and security headers.
- Social share image: `public/og-image.jpg` (1200×630).

## Deploy on Cloudflare

Static site, so no adapter is needed. Node version is pinned in `.node-version`.

- **Workers & Pages → Import a repository (Workers):** build command `npm run build`, deploy command `npx wrangler deploy` (uses `wrangler.jsonc`, which serves `./dist`).
- **Pages:** framework preset *Astro*, build command `npm run build`, output directory `dist`.

## Stack

- **Astro** (static pages, component layouts)
- **Three.js**: hero "Seattle after dark" scene (`src/scripts/hero-scene.ts`) and 3D service-area map (`src/scripts/area-map.ts`)
- **GSAP + ScrollTrigger**: reveals, pinned horizontal services, scroll-drawn timeline
- **Lenis**: smooth scrolling
- Fonts self-hosted via Fontsource: Inter Tight (headings) + Inter (body)
- Themes: light "Ivory & Onyx" by default, dark "Onyx" via the header toggle (`html[data-theme]`, saved in `localStorage`); tokens in `src/styles/global.css`

## Where things live

| What | File |
| --- | --- |
| All business content (phone, services, fleet, areas, reviews, FAQs) | `src/data/site.ts` |
| Design tokens, buttons, forms, reveal classes | `src/styles/global.css` |
| Motion layer (smooth scroll, reveals, cursor, menu, preloader) | `src/scripts/global.ts` |
| Layout, header, footer, mobile action bar | `src/layouts/Base.astro`, `src/components/` |
| Home sections | `src/components/home/*.astro` |
| Booking wizard logic | `src/scripts/booking.ts` |

## Before launch

The full list of questions for the client is in [docs/CLIENT-CHECKLIST.md](docs/CLIENT-CHECKLIST.md).

**Content the client needs to supply or confirm**
- Professional fleet photography. The stretch limo uses a stock studio sedan, and the two Sprinter photos are white-background/daylight shots.
- Real, verifiable reviews. The four testimonials and the review counts (4.9 / 800+, Google 250+, Yelp 300+, Facebook 250+) are copied from the current site.
- "20+ years of experience" vs "since 2008": confirm which claim to lead with.
- Reservations email address. `site.email` is a placeholder.
- Real logo files, if they want to keep their mark. The demo uses a re-typeset wordmark with a Space Needle monogram.

- Legal review of `/privacy/` and `/terms/` (templates), and of the two new draft journal posts.

**Technical**
- Choose where booking requests go and set `PUBLIC_LEAD_ENDPOINT` (the current live `/booking` iframe renders blank).
- Analytics: GA4/GTM and Meta Pixel snippets (events are already pushed to `dataLayer`).
- **Self-host the photos before cutover.** They are hotlinked from the old site on the same domain, so they will break when the domain switches to this build. Optimize them (AVIF/WebP, responsive sizes) at the same time.
- Cross-browser QA on real Safari/iOS devices.
