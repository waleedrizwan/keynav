# Contributing to Keynav

Thanks for your interest in improving Keynav! Bug reports, ideas and pull requests are all welcome.

## Reporting bugs

[Open an issue](https://github.com/waleedrizwan/keynav/issues/new/choose) and include:

- the page URL where it went wrong (if it's public),
- what you pressed, what you expected and what happened,
- your browser and version.

Sites where clickable elements aren't detected are especially useful reports.

## Making changes

1. Fork the repo and create a branch from `main`.
2. Install the dev tools: `npm install` (Node.js 20+).
3. Load `src/` as an unpacked extension in `chrome://extensions` (Developer mode on).
4. Make your change, then reload the extension and test it on a few real sites.
5. Run `npm run check` and make sure it passes. `npm run format` fixes formatting for you.
6. Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) if your change is user-visible.
7. Open a pull request describing what changed and how you tested it.

## Guidelines

- **Keep it dependency-free.** The extension ships as plain JavaScript with no build step; dev tooling lives only in `package.json`.
- **Keep it private.** Don't add network requests, analytics, storage or new permissions without discussing it in an issue first. Any change that affects data handling must update [PRIVACY.md](PRIVACY.md).
- **Keep it fast.** Code in `content.js` runs on every page; avoid work that isn't triggered by a key press.
- **Types are checked.** `npm run typecheck` runs TypeScript in strict mode over the JavaScript. Use JSDoc comments when the checker needs help.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By taking part, you agree to uphold it.
