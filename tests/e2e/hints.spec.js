import { activeTabIndex, clicks, expect, labelFor, open, test } from './harness.js';

test.describe('hint mode (f)', () => {
  test('typing a label clicks that element', async ({ page }) => {
    await open(page, 'buttons.html?n=3');
    await page.keyboard.press('f');
    await page.keyboard.press('d'); // third label
    await expect.poll(() => clicks(page)).toEqual(['b2']);
  });

  test('labels follow reading order', async ({ page }) => {
    await open(page, 'buttons.html?n=3');
    for (const [i, key] of ['a', 's', 'd'].entries()) {
      await page.keyboard.press('f');
      await page.keyboard.press(key);
      await expect.poll(async () => (await clicks(page))[i]).toBe(`b${i}`);
    }
  });

  test('switches to two-character labels past 16 elements', async ({ page }) => {
    await open(page, 'buttons.html?n=20');
    await page.keyboard.press('f');
    const label = labelFor(17, 20);
    expect(label).toHaveLength(2);
    await page.keyboard.press(label[0]);
    expect(await clicks(page)).toEqual([]); // waits for the second character
    await page.keyboard.press(label[1]);
    await expect.poll(() => clicks(page)).toEqual(['b17']);
  });

  test('Backspace removes the last typed character', async ({ page }) => {
    await open(page, 'buttons.html?n=20');
    await page.keyboard.press('f');
    await page.keyboard.press('s');
    await page.keyboard.press('Backspace');
    for (const k of labelFor(2, 20)) await page.keyboard.press(k);
    await expect.poll(() => clicks(page)).toEqual(['b2']);
  });

  test('Escape cancels without clicking', async ({ page }) => {
    await open(page, 'buttons.html?n=3');
    await page.keyboard.press('f');
    await page.keyboard.press('Escape');
    await page.keyboard.press('a');
    expect(await clicks(page)).toEqual([]);
  });

  test('a label that matches nothing exits hint mode', async ({ page }) => {
    await open(page, 'buttons.html?n=3');
    await page.keyboard.press('f');
    await page.keyboard.press('q'); // only a, s, d exist
    await page.keyboard.press('a');
    expect(await clicks(page)).toEqual([]);
  });

  test('scrolling the page clears the labels', async ({ page }) => {
    await open(page, 'buttons.html?n=40');
    await page.keyboard.press('f');
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.keyboard.press('a');
    await page.keyboard.press('a');
    expect(await clicks(page)).toEqual([]);
  });
});

test.describe('new-tab hint mode (F)', () => {
  test('opens the link in a background tab', async ({ page, context, serviceWorker }) => {
    await open(page, 'links.html');
    const before = await activeTabIndex(serviceWorker);
    const opened = context.waitForEvent('page');
    await page.keyboard.press('Shift+F');
    await page.keyboard.press('s');
    const tab = await opened;
    await expect.poll(() => tab.url()).toContain('/target.html?1');
    expect(await activeTabIndex(serviceWorker)).toBe(before);
    expect(await clicks(page)).toEqual([]); // opened, not clicked
  });

  test('clicks javascript: links instead of opening them', async ({ page, context }) => {
    await open(page, 'links.html');
    let opened = false;
    context.on('page', () => (opened = true));
    await page.keyboard.press('Shift+F');
    await page.keyboard.press('d');
    await expect.poll(() => clicks(page)).toEqual(['js']); // clicked in place
    expect(opened).toBe(false);
  });
});
