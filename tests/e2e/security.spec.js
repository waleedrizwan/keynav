import { clicks, expect, open, tabCount, test } from './harness.js';

/** Dispatches a fake keydown from page script, the way a malicious site would. */
const fakeKey = (page, key, target = 'document') =>
  page.evaluate(
    ([key, target]) => {
      const t = target === 'window' ? window : document.activeElement || document;
      t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    },
    [key, target],
  );

test.describe('security', () => {
  test('page scripts cannot close the tab with a fake "x"', async ({ page, context }) => {
    const keep = await context.newPage();
    await open(page, 'buttons.html');
    await fakeKey(page, 'x');
    await fakeKey(page, 'x', 'window');
    await page.waitForTimeout(500);
    expect(page.isClosed()).toBe(false);
    await keep.close();
  });

  test('page scripts cannot open tabs with a fake "t"', async ({ page, serviceWorker }) => {
    await open(page, 'buttons.html');
    const before = await tabCount(serviceWorker);
    for (let i = 0; i < 5; i++) await fakeKey(page, 't');
    await page.waitForTimeout(500);
    expect(await tabCount(serviceWorker)).toBe(before);
  });

  test('page scripts cannot drive hint mode to click or open links', async ({ page, context }) => {
    await open(page, 'links.html');
    let opened = false;
    context.on('page', () => (opened = true));
    await fakeKey(page, 'f');
    await fakeKey(page, 'a');
    await fakeKey(page, 'F');
    await fakeKey(page, 's');
    await page.waitForTimeout(500);
    expect(await clicks(page)).toEqual([]);
    expect(opened).toBe(false);
  });

  test('page scripts cannot scroll or switch tabs', async ({ page }) => {
    await open(page, 'buttons.html?n=60');
    for (const key of ['j', 'd', 'G', 'J', 'H']) await fakeKey(page, key);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page).toHaveURL(/buttons\.html/);
  });

  test('the page cannot read the overlay', async ({ page }) => {
    await open(page, 'buttons.html');
    await page.keyboard.press('f');
    const exposed = await page.evaluate(() => {
      const host = document.querySelector('keynav-overlay');
      return { found: !!host, shadow: host?.shadowRoot ?? null, children: host?.children.length };
    });
    expect(exposed).toEqual({ found: true, shadow: null, children: 0 });
  });

  test('the page cannot message the extension', async ({ page, serviceWorker }) => {
    await open(page, 'buttons.html');
    const id = new URL(serviceWorker.url()).host;
    const result = await page.evaluate(async (id) => {
      try {
        if (!globalThis.chrome?.runtime?.sendMessage) return 'no runtime';
        await chrome.runtime.sendMessage(id, { type: 'close' });
        return 'sent';
      } catch {
        return 'rejected';
      }
    }, id);
    expect(['no runtime', 'rejected']).toContain(result);
    await page.waitForTimeout(300);
    expect(page.isClosed()).toBe(false);
  });
});
