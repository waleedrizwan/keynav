import { activeTabIndex, clicks, expect, open, ready, tabCount, test } from './harness.js';

const scrollY = (page) => page.evaluate(() => window.scrollY);

test.describe('scrolling', () => {
  test('j / k scroll down and up', async ({ page }) => {
    await open(page, 'scroll.html');
    await page.keyboard.press('j');
    await expect.poll(() => scrollY(page)).toBe(90);
    await page.keyboard.press('k');
    await expect.poll(() => scrollY(page)).toBe(0);
  });

  test('d / u scroll half a page', async ({ page }) => {
    await open(page, 'scroll.html');
    await page.keyboard.press('d');
    await expect.poll(() => scrollY(page)).toBe(350);
    await page.keyboard.press('u');
    await expect.poll(() => scrollY(page)).toBe(0);
  });

  test('G and gg jump to the bottom and top', async ({ page }) => {
    await open(page, 'scroll.html');
    await page.keyboard.press('Shift+G');
    await expect
      .poll(() => page.evaluate(() => scrollY + innerHeight >= document.body.scrollHeight - 1))
      .toBe(true);
    await page.keyboard.press('g');
    await page.keyboard.press('g');
    await expect.poll(() => scrollY(page)).toBe(0);
  });

  test('scrolls the inner container on app-style pages', async ({ page }) => {
    await open(page, 'app.html');
    await page.keyboard.press('j');
    await expect
      .poll(() => page.evaluate(() => document.getElementById('main').scrollTop))
      .toBe(90);
  });

  test('Ctrl / Cmd / Alt combinations are left alone', async ({ page }) => {
    await open(page, 'scroll.html');
    for (const mod of ['Control', 'Meta', 'Alt']) await page.keyboard.press(`${mod}+j`);
    await page.waitForTimeout(200);
    expect(await scrollY(page)).toBe(0);
  });
});

test.describe('text fields', () => {
  for (const [name, selector] of [
    ['input', '#text'],
    ['textarea', '#area'],
    ['contenteditable', '#editable'],
  ]) {
    test(`keys type normally in a ${name}`, async ({ page }) => {
      await open(page, 'form.html');
      await page.click(selector);
      await page.keyboard.type('fjdk;');
      const value = await page
        .locator(selector)
        .evaluate((el) => ('value' in el ? el.value : el.textContent));
      expect(value).toBe('fjdk;');
      expect(await scrollY(page)).toBe(0);
      expect(await clicks(page)).toEqual([]);
    });
  }

  test('Escape leaves the field, then keys work again', async ({ page }) => {
    await open(page, 'form.html');
    await page.click('#text');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.keyboard.press('j');
    await expect.poll(() => scrollY(page)).toBe(90);
  });

  test('gi focuses the first visible text field', async ({ page }) => {
    await open(page, 'form.html');
    await page.keyboard.press('g');
    await page.keyboard.press('i');
    await expect(page.locator('#text')).toBeFocused();
  });
});

test.describe('tabs and history', () => {
  test('J / K switch to the next and previous tab, wrapping around', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await open(page, 'scroll.html');
    const second = await context.newPage();
    await open(second, 'scroll.html');
    await second.bringToFront();
    expect(await activeTabIndex(serviceWorker)).toBe(1);
    await second.keyboard.press('Shift+J'); // wraps to the first tab
    await expect.poll(() => activeTabIndex(serviceWorker)).toBe(0);
    await page.keyboard.press('Shift+K'); // wraps back to the last tab
    await expect.poll(() => activeTabIndex(serviceWorker)).toBe(1);
  });

  test('t opens a new tab', async ({ page, serviceWorker }) => {
    await open(page, 'scroll.html');
    const before = await tabCount(serviceWorker);
    await page.keyboard.press('t');
    await expect.poll(() => tabCount(serviceWorker)).toBe(before + 1);
  });

  test('x closes the tab', async ({ page, context }) => {
    const keep = await context.newPage(); // keep the browser open
    await open(page, 'scroll.html');
    // The tab can close between keydown and keyup, so the keyup may fail.
    await page.keyboard.press('x').catch(() => {});
    await expect.poll(() => page.isClosed()).toBe(true);
    expect(keep.isClosed()).toBe(false);
  });

  test('H / L go back and forward', async ({ page }) => {
    await open(page, 'scroll.html');
    await open(page, 'form.html');
    await page.keyboard.press('Shift+H');
    await expect(page).toHaveURL(/scroll\.html/);
    await ready(page);
    await page.keyboard.press('Shift+L');
    await expect(page).toHaveURL(/form\.html/);
  });
});
