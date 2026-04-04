import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

export function readSeedJson(name) {
  const p = path.join(DATA_DIR, name);
  return JSON.parse(readFileSync(p, 'utf-8'));
}
