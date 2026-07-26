import fs from 'node:fs';
import path from 'node:path';

const generatedDir = path.join(import.meta.dirname, '../api/generated');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.startsWith('// @ts-nocheck')) continue;
    fs.writeFileSync(fullPath, `// @ts-nocheck\n${content}`);
  }
}

walk(generatedDir);
console.log('Stamped generated API with @ts-nocheck');
