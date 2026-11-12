// Generates Chrome Web Store images in store/: four 1280x800 screenshots of
// Keynav running on a demo page, plus the small (440x280) and marquee
// (1400x560) promo tiles. Usage: npm run store:assets
import { chromium } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'store', 'src');
const outDir = join(root, 'store');
const extension = join(root, 'src');
const icon = `data:image/png;base64,${readFileSync(join(root, 'assets', 'icon-256.png')).toString('base64')}`;

const server = createServer((req, res) => {
  let body;
  try {
    body = readFileSync(join(srcDir, new URL(req.url ?? '/', 'http://x').pathname.slice(1)));
  } catch {
    return res.writeHead(404).end();
  }
  res.writeHead(200, { 'content-type': 'text/html' }).end(body);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), 'keynav-store-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});

const page = context.pages()[0] ?? (await context.newPage());
const frame = await context.newPage();
await frame.setViewportSize({ width: 1280, height: 800 });

async function demo(keys) {
  await page.goto(`${origin}/demo.html`);
  // Wait for the content script: `?` creates the overlay once it is listening.
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('?');
    if (await page.locator('keynav-overlay').count()) break;
    await page.waitForTimeout(100);
  }
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  for (const k of keys) await page.keyboard.press(k);
  await page.waitForTimeout(150);
  return page.screenshot({ type: 'png' });
}

const shots = [
  {
    keys: ['f'],
    title: 'Click anything with <kbd>F</kbd>',
    sub: 'Every link, button and field gets a label. Type the label to click it.',
  },
  {
    keys: ['Shift+F'],
    title: 'Open links in the <em>background</em>',
    sub: 'Hold Shift and links open in a new tab, so you can keep reading.',
  },
  {
    keys: [';', ...Array(15).fill('j')], // lands on "Continue reading"
    title: 'Or step through with <kbd>;</kbd>',
    sub: 'Move with <kbd>J</kbd> and <kbd>K</kbd>, then press Enter to click.',
  },
  {
    keys: ['?'],
    title: 'Your whole browser, <em>from the keyboard</em>',
    sub: 'Scroll, switch tabs, go back and forward. Press <kbd>?</kbd> on any page for the keys.',
  },
];

for (const [i, s] of shots.entries()) {
  const png = await demo(s.keys);
  await frame.goto(`${origin}/frame.html`);
  await frame.evaluate(
    ({ title, sub, img }) => {
      document.getElementById('title').innerHTML = title;
      document.getElementById('sub').innerHTML = sub;
      const el = document.getElementById('shot');
      el.src = img;
      return el.decode();
    },
    { title: s.title, sub: s.sub, img: `data:image/png;base64,${png.toString('base64')}` },
  );
  await frame.screenshot({
    path: join(outDir, `screenshot-${i + 1}.jpg`),
    type: 'jpeg',
    quality: 92,
  });
  console.log(`store/screenshot-${i + 1}.jpg`);
}

const tiles = [
  { name: 'promo-small', w: 440, h: 280, icon: 110, title: 44, tag: 15, kbd: 13, gap: 24 },
  { name: 'promo-marquee', w: 1400, h: 560, icon: 280, title: 96, tag: 30, kbd: 24, gap: 64 },
];
for (const t of tiles) {
  await frame.setViewportSize({ width: t.w, height: t.h });
  await frame.goto(`${origin}/promo.html`);
  await frame.evaluate(
    ({ t, icon }) => {
      const s = document.documentElement.style;
      for (const k of ['w', 'h', 'icon', 'title', 'tag', 'kbd', 'gap'])
        s.setProperty(`--${k}`, `${t[k]}px`);
      document.getElementById('tag').innerHTML =
        t.name === 'promo-small'
          ? 'Click anything<br />without a mouse.'
          : 'Click anything on the web<br />without touching the mouse.';
      const img = document.getElementById('icon');
      img.src = icon;
      return img.decode();
    },
    { t, icon },
  );
  await frame.screenshot({ path: join(outDir, `${t.name}.jpg`), type: 'jpeg', quality: 92 });
  console.log(`store/${t.name}.jpg`);
}

await context.close();
server.close();
rmSync(profile, { recursive: true, force: true });
