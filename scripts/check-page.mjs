// Headless visual + console check using the system Chrome.
// Usage: node scripts/check-page.mjs <url> [--out dir] [--name prefix] [--scroll N] [--widths 1440,390] [--full] [--theme light|dark]
// Prints console errors / page errors and writes screenshots: <out>/<name>-<width>[-sN].png
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const out = opt('out', '/tmp/sdd-shots');
const name = opt('name', 'page');
const scrollSteps = Number(opt('scroll', '0'));
const widths = opt('widths', '1440,390').split(',').map(Number);
const wait = Number(opt('wait', '2500'));
const theme = opt('theme', 'light');
fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal', '--hide-scrollbars'],
});
let problems = 0;
for (const w of widths) {
  const page = await browser.newPage();
  const h = w < 700 ? 844 : 900;
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('sdd-theme', t); } catch {} }, theme);
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { console.log(`[${w}] console.${m.type()}: ${m.text()}`); if (m.type() === 'error') problems++; } });
  page.on('pageerror', (e) => { console.log(`[${w}] PAGEERROR: ${e.message}`); problems++; });
  page.on('requestfailed', (r) => console.log(`[${w}] REQFAIL: ${r.url()} ${r.failure()?.errorText}`));
  try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }); } catch (e) { console.log(`[${w}] goto: ${e.message}`); }
  await new Promise((r) => setTimeout(r, wait));
  const file = path.join(out, `${name}-${w}.png`);
  await page.screenshot({ path: file, fullPage: flag('full') });
  console.log('shot', file);
  for (let s = 1; s <= scrollSteps; s++) {
    await page.evaluate((hh) => { window.scrollBy(0, hh * 0.9); if (window.lenis) window.lenis.scrollTo(window.scrollY, { immediate: true }); }, h);
    await new Promise((r) => setTimeout(r, 1200));
    const f2 = path.join(out, `${name}-${w}-s${s}.png`);
    await page.screenshot({ path: f2 });
    console.log('shot', f2);
  }
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (ov > 1) console.log(`[${w}] HORIZONTAL OVERFLOW: ${ov}px`);
  await page.close();
}
await browser.close();
console.log(problems ? `DONE with ${problems} error(s)` : 'DONE clean');
