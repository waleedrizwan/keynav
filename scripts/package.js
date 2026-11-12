// Builds dist/keynav-<version>.zip from src/, ready to upload to the Chrome Web Store.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) {
  console.error(
    `Version mismatch: manifest.json is ${manifest.version}, package.json is ${pkg.version}`,
  );
  process.exit(1);
}

mkdirSync(dist, { recursive: true });
const out = join(dist, `keynav-${manifest.version}.zip`);
rmSync(out, { force: true });
execFileSync('zip', ['-r', '-X', out, '.', '-x', '.*'], { cwd: src, stdio: 'inherit' });
console.log(`\nPackaged ${out}`);
