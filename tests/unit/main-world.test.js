// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { runScript } from './load.js';

describe('main-world.js', () => {
  let original;
  beforeAll(() => {
    original = EventTarget.prototype.addEventListener;
    runScript('main-world.js');
  });

  it.each(['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart'])(
    'tags elements that listen for %s',
    (type) => {
      const el = document.createElement('div');
      el.addEventListener(type, () => {});
      expect(el.hasAttribute('data-keynav-click')).toBe(true);
    },
  );

  it('ignores non-click events', () => {
    const el = document.createElement('div');
    el.addEventListener('keydown', () => {});
    el.addEventListener('mouseover', () => {});
    expect(el.hasAttribute('data-keynav-click')).toBe(false);
  });

  it('does not tag <html>, <body>, document or window', () => {
    document.documentElement.addEventListener('click', () => {});
    document.body.addEventListener('click', () => {});
    document.addEventListener('click', () => {});
    window.addEventListener('click', () => {});
    expect(document.documentElement.hasAttribute('data-keynav-click')).toBe(false);
    expect(document.body.hasAttribute('data-keynav-click')).toBe(false);
  });

  it('still registers the listener with the original method', () => {
    expect(EventTarget.prototype.addEventListener).not.toBe(original);
    const el = document.createElement('button');
    let hits = 0;
    el.addEventListener('click', () => hits++, { once: true });
    el.click();
    el.click();
    expect(hits).toBe(1); // options were passed through
  });
});
