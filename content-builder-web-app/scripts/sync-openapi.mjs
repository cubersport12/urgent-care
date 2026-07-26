/**
 * Download OpenAPI from Urgent Care API into ./openapi.json
 *
 * Usage:
 *   node scripts/sync-openapi.mjs
 *   node scripts/sync-openapi.mjs http://localhost:8000
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = (process.argv[2] || process.env.OPENAPI_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);
const url = base.endsWith('/openapi.json') ? base : `${base}/openapi.json`;
const outPath = path.join(__dirname, '../openapi.json');

const res = await fetch(url);
if (!res.ok) {
  console.error(`Failed to fetch ${url}: HTTP ${res.status}`);
  process.exit(1);
}

const spec = await res.json();
const paths = Object.keys(spec.paths || {});
const required = ['/api/v1/auth/login', '/api/v1/folders', '/api/v1/articles'];
const missing = required.filter((p) => !paths.some((k) => k === p || k.startsWith(`${p}/`)));
if (missing.length) {
  console.error('OpenAPI missing expected paths:', missing.join(', '));
  process.exit(1);
}

fs.writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath} (${paths.length} paths)`);
