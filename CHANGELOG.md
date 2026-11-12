# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-12

### Added

- Hint mode (`f` / `F`) labels every clickable element; type a label to click it or open it in a background tab.
- Step-through mode (`;`) to cycle through clickables with `j`/`k`, Tab or arrow keys.
- Detection of JavaScript click handlers via an `addEventListener` hook, plus `cursor: pointer` heuristics.
- Scrolling (`j`/`k`, `d`/`u`, `gg`/`G`), history (`H`/`L`), tab keys (`J`/`K`, `t`, `x`), reload (`r`), focus first field (`gi`) and help (`?`).
- Support for open shadow DOM and app-style pages that scroll an inner container.
- Extension icon and toolbar button.
- Unit tests (Vitest) and browser tests (Playwright) running in CI.

[Unreleased]: https://github.com/waleedrizwan/keynav/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/waleedrizwan/keynav/releases/tag/v0.1.0
