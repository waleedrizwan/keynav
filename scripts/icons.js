// Renders src/icons/icon-<size>.png from the SVG sources in assets/.
// Sizes 16 and 32 use a simplified design that stays legible in the toolbar.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'icons');
mkdirSync(outDir, { recursive: true });

const full = readFileSync(join(root, 'assets', 'icon.svg'), 'utf8');
const small = readFileSync(join(root, 'assets', 'icon-small.svg'), 'utf8');

for (const size of [16, 32, 48, 128]) {
  const svg = size <= 32 ? small : full;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  console.log(`icons/icon-${size}.png`);
}

// Large preview for the README.
const preview = new Resvg(full, { fitTo: { mode: 'width', value: 256 } }).render().asPng();
writeFileSync(join(root, 'assets', 'icon-256.png'), preview);
