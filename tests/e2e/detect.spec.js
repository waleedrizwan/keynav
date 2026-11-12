import { clicks, expect, open, test } from './harness.js';

// detect.html is built so that only #js, #pointer and #last are labelled,
// so they get labels a, s and d. Everything else must be skipped.
test.describe('finding clickables', () => {
  for (const [key, id] of [
    ['a', 'js'],
    ['s', 'pointer'],
    ['d', 'last'],
  ]) {
    test(`label "${key}" goes to #${id}`, async ({ page }) => {
      await open(page, 'detect.html');
      await page.keyboard.press('f');
      await page.keyboard.press(key);
      await expect.poll(() => clicks(page)).toEqual([id]);
    });
  }

  test('skips hidden, transparent, tiny, covered, disabled and off-screen elements', async ({
    page,
  }) => {
    await open(page, 'detect.html');
    await page.keyboard.press('f');
    await page.keyboard.press('f'); // a fourth label would exist if anything else were labelled
    expect(await clicks(page)).toEqual([]);
  });

  test('tags elements that register click handlers in page JS', async ({ page }) => {
    await open(page, 'detect.html');
    await expect(page.locator('#js')).toHaveAttribute('data-keynav-click', '');
  });

  test('labels buttons inside open shadow roots, skips closed ones', async ({ page }) => {
    await open(page, 'shadow.html');
    await page.keyboard.press('f');
    await page.keyboard.press('a');
    await expect.poll(() => clicks(page)).toEqual(['open']);
    await page.keyboard.press('f');
    await page.keyboard.press('s'); // the closed root gets no label, so "s" is #last
    await expect.poll(() => clicks(page)).toEqual(['open', 'last']);
  });
});
