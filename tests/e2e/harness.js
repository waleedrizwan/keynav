import { test as base, chromium, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXTENSION = resolve('src');
/** Fixture pages, served by tests/e2e/server.js (see playwright.config.js). */
export const ORIGIN = 'http://127.0.0.1:4173';

/**
 * Playwright test with Keynav loaded into a fresh Chromium profile.
 */
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const profile = mkdtempSync(join(tmpdir(), 'keynav-'));
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', // full Chromium: the headless shell can't load extensions
      headless: !process.env.HEADED,
      viewport: { width: 1000, height: 700 },
      args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    });
    await use(context);
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  },

  serviceWorker: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(sw);
  },

  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
});

export { expect };

/** Opens a fixture page and waits until Keynav's content script is listening. */
export async function open(page, path) {
  await page.goto(`${ORIGIN}/${path}`);
  await ready(page);
}

/** Waits until Keynav's content script is listening on the current page. */
export async function ready(page) {
  // `?` shows the help bar, which creates the overlay host; retry until the script is in.
  await expect
    .poll(async () => {
      await page.keyboard.press('?');
      return page.locator('keynav-overlay').count();
    })
    .toBe(1);
}

/** Labels in the order Keynav assigns them (mirrors makeLabels in content.js). */
export function labelFor(index, total) {
  const chars = 'asdfjklghqweruio';
  let len = 1;
  while (chars.length ** len < total) len++;
  let s = '';
  for (let j = 0, x = index; j < len; j++, x = Math.floor(x / chars.length)) {
    s = chars[x % chars.length] + s;
  }
  return s;
}

/** Ids recorded by the fixture page's click logger. */
export const clicks = (page) => page.evaluate(() => window.log);

/** Index (in tab-strip order) of the active tab, read via the extension's service worker. */
export async function activeTabIndex(sw) {
  return sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab?.index;
  });
}

export async function tabCount(sw) {
  return sw.evaluate(async () => (await chrome.tabs.query({})).length);
}
