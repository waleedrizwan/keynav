import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runScript } from './load.js';

/** Builds a fake `chrome` API and returns it with the registered message listener. */
function setup(tabs = []) {
  let listener;
  const chrome = {
    runtime: { onMessage: { addListener: (fn) => (listener = fn) } },
    tabs: {
      create: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
      query: vi.fn((_q, cb) => cb(tabs.map((t) => ({ ...t })))),
    },
  };
  runScript('background.js', { chrome });
  return { chrome, send: (msg, tab) => listener(msg, { tab }) };
}

const window1 = [
  { id: 10, index: 0, windowId: 1 },
  { id: 11, index: 1, windowId: 1 },
  { id: 12, index: 2, windowId: 1 },
];

describe('background.js', () => {
  let env;
  beforeEach(() => (env = setup(window1)));

  it('opens a link in an inactive tab right after the current one', () => {
    env.send({ type: 'open', url: 'https://example.com/' }, window1[1]);
    expect(env.chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com/',
      index: 2,
      active: false,
      openerTabId: 11,
    });
  });

  it('closes the sending tab', () => {
    env.send({ type: 'close' }, window1[0]);
    expect(env.chrome.tabs.remove).toHaveBeenCalledWith(10);
  });

  it('opens a new tab right after the current one', () => {
    env.send({ type: 'newtab' }, window1[1]);
    expect(env.chrome.tabs.create).toHaveBeenCalledWith({ index: 2 });
  });

  it.each([
    ['next', 0, 1, 11],
    ['next, wrapping last to first', 2, 1, 10],
    ['previous', 1, -1, 10],
    ['previous, wrapping first to last', 0, -1, 12],
  ])('switches to the %s tab', (_name, from, dir, expected) => {
    env.send({ type: 'tab', dir }, window1[from]);
    expect(env.chrome.tabs.query).toHaveBeenCalledWith({ windowId: 1 }, expect.any(Function));
    expect(env.chrome.tabs.update).toHaveBeenCalledWith(expected, { active: true });
  });

  it('orders tabs by index, not by the order the query returns them', () => {
    env = setup([window1[2], window1[0], window1[1]]);
    env.send({ type: 'tab', dir: 1 }, window1[0]);
    expect(env.chrome.tabs.update).toHaveBeenCalledWith(11, { active: true });
  });

  it('ignores messages that did not come from a tab', () => {
    env.send({ type: 'close' }, undefined);
    env.send({ type: 'close' }, { index: 0, windowId: 1 }); // tab without an id
    expect(env.chrome.tabs.remove).not.toHaveBeenCalled();
  });

  it('ignores unknown message types', () => {
    env.send({ type: 'nope' }, window1[0]);
    for (const fn of Object.values(env.chrome.tabs)) expect(fn).not.toHaveBeenCalled();
  });
});
