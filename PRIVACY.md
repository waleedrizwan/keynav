# Privacy Policy

_Last updated: November 12, 2026_

Keynav is a browser extension that lets you click and navigate web pages with the keyboard. This policy explains what it does with your data. The short version: **nothing leaves your browser.**

## What Keynav collects

Nothing. Keynav does not collect, store, transmit, sell or share any personal data, browsing history, page content, keystrokes or usage statistics.

## How Keynav works on your pages

To label clickable elements, Keynav runs scripts on the pages you visit. Those scripts:

- read the page's layout (element positions, visibility and styles) **only at the moment you press a Keynav key**, to decide where to draw labels;
- mark elements that register click handlers with a `data-keynav-click` attribute, so they can be found later;
- listen for key presses to respond to Keynav shortcuts. Key presses are handled immediately in the page and are never recorded or stored.

All of this happens locally in your browser and is discarded when you leave the page.

## Network access

Keynav makes no network requests. It contains no analytics, tracking, advertising or remote code.

## Storage

Keynav does not use cookies, `localStorage`, `chrome.storage` or any other form of persistent storage.

## Permissions

Keynav asks for no optional Chrome permissions. Its background service worker uses the tabs API only to open, close and switch tabs when you press the matching key (`F`, `t`, `x`, `J`, `K`). It does not read your tabs' URLs or titles.

## Third parties

Keynav shares no data with third parties, because it has no data to share.

## Changes to this policy

If this policy changes, the new version will be published in this file with an updated date. You can see every past version in the [commit history](https://github.com/waleedrizwan/keynav/commits/main/PRIVACY.md).

## Contact

Questions about privacy can be raised by [opening an issue](https://github.com/waleedrizwan/keynav/issues).
