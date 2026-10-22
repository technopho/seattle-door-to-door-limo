import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.seattledoortodoorlimo.com',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  // Inline each page's CSS (~10–30 KB gzipped) into its HTML: first paint no longer waits on
  // 2–3 render-blocking stylesheet requests, and the @font-face URLs are found with the HTML.
  build: { inlineStylesheets: 'always' },
  // Keep vendor prefixes Safari 15–17 still needs (e.g. -webkit-backdrop-filter for the frosted glass);
  // without explicit targets the CSS minifier drops them.
  vite: { build: { cssTarget: ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'] } },
  server: { port: 4321, host: true },
  devToolbar: { enabled: false },
});
