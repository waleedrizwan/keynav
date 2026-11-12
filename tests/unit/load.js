import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Runs an extension script from src/ as a classic script, with the given
 * globals in scope (e.g. a mocked `chrome`). Vitest runs from the repo root.
 * @param {string} file
 * @param {Record<string, unknown>} [globals]
 */
export function runScript(file, globals = {}) {
  const code = readFileSync(resolve(process.cwd(), 'src', file), 'utf8');
  const names = Object.keys(globals);
  new Function(...names, code)(...names.map((n) => globals[n]));
}
