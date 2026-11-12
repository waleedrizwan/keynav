import { clicks, expect, open, test } from './harness.js';

test.describe('step-through mode (;)', () => {
  const cases = [
    ['starts on the first element', [], 'b0'],
    ['j moves forward', ['j', 'j'], 'b2'],
    ['k wraps from first to last', ['k'], 'b2'],
    ['j wraps from last to first', ['j', 'j', 'j'], 'b0'],
    ['arrow keys move', ['ArrowDown', 'ArrowRight', 'ArrowUp'], 'b1'],
    ['Tab and Shift+Tab move', ['Tab', 'Tab', 'Shift+Tab'], 'b1'],
  ];
  for (const [name, keys, expected] of cases) {
    test(name, async ({ page }) => {
      await open(page, 'buttons.html?n=3');
      await page.keyboard.press(';');
      for (const k of keys) await page.keyboard.press(k);
      await page.keyboard.press('Enter');
      await expect.poll(() => clicks(page)).toEqual([expected]);
    });
  }

  test('Escape leaves without clicking', async ({ page }) => {
    await open(page, 'buttons.html?n=3');
    await page.keyboard.press(';');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    expect(await clicks(page)).toEqual([]);
  });

  test('Shift+Enter opens a link in a new tab', async ({ page, context }) => {
    await open(page, 'links.html');
    const opened = context.waitForEvent('page');
    await page.keyboard.press(';');
    await page.keyboard.press('j');
    await page.keyboard.press('Shift+Enter');
    await expect.poll(async () => (await opened).url()).toContain('/target.html?1');
  });
});
