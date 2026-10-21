# Seattle Door to Door Limo — Website Redesign (UI demo)

Luxury redesign of seattledoortodoorlimo.com. This build is the **UI demo for client review**; SEO, the booking back-end and production hardening are deliberately deferred to phase 2.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
```

Pages: `/` (home), `/fleet/`, `/book/` (reservation flow).

## Deploy on Cloudflare

Static site, so no adapter is needed. Node version is pinned in `.node-version`.

- **Workers & Pages → Import a repository (Workers):** build command `npm run build`, deploy command `npx wrangler deploy` (uses `wrangler.jsonc`, which serves `./dist`).
- **Pages:** framework preset *Astro*, build command `npm run build`, output directory `dist`.

## Stack

- **Astro** (static pages, component layouts)
- **Three.js**: hero "Seattle after dark" scene (`src/scripts/hero-scene.ts`) and 3D service-area map (`src/scripts/area-map.ts`)
- **GSAP + ScrollTrigger**: reveals, pinned horizontal services, scroll-drawn timeline
- **Lenis**: smooth scrolling
- Fonts self-hosted via Fontsource: Cormorant Garamond (display) + Manrope (UI)

## Where things live

| What | File |
| --- | --- |
| All business content (phone, services, fleet, areas, reviews, FAQs) | `src/data/site.ts` |
| Design tokens, buttons, forms, reveal classes | `src/styles/global.css` |
| Motion layer (smooth scroll, reveals, cursor, menu, preloader) | `src/scripts/global.ts` |
| Layout, header, footer, mobile action bar | `src/layouts/Base.astro`, `src/components/` |
| Home sections | `src/components/home/*.astro` |
| Booking wizard logic | `src/scripts/booking.ts` |

## Phase 2 (after client sign-off)

**Content the client needs to supply or confirm**
- Professional fleet photography. The stretch limo uses a stock studio sedan, and the two Sprinter photos are white-background/daylight shots.
- Real, verifiable reviews. The four testimonials and the review counts (4.9 / 800+, Google 250+, Yelp 300+, Facebook 250+) are copied from the current site.
- "20+ years of experience" vs "since 2008": confirm which claim to lead with.
- Reservations email address. `site.email` is a placeholder.
- Real logo files, if they want to keep their mark. The demo uses a re-typeset wordmark with a Space Needle monogram.

**Technical**
- Booking back-end: wire `submitBooking()` in `src/scripts/booking.ts` to their CRM, GoHighLevel webhook, Formspree, or the existing booking system. The current `/booking` iframe on the live site renders blank.
- Address autocomplete (Google Places), analytics (GA4/GTM, Meta Pixel and CAPI events are already pushed to `dataLayer`).
- SEO: per-service and per-city landing pages, meta and OG images, LocalBusiness/FAQ schema, sitemap, and redirects from old URLs (`/booking`, `/blog`).
- Self-host and optimize images (AVIF/WebP, responsive sizes) instead of hotlinking.
- Blog migration, privacy and terms pages, 404 page.
- Lighthouse/performance pass (code-split Three.js, reduce-motion and low-power fallbacks), cross-browser QA (Safari/iOS).
