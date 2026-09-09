import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('public');
const output = path.resolve('dist');
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
async function count(dir) {
  let files = 0, bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) { const child = await count(name); files += child.files; bytes += child.bytes; }
    else { files++; bytes += (await stat(name)).size; }
  }
  return { files, bytes };
}
const result = await count(output);
console.log(`Built ${result.files} files (${(result.bytes / 1024 / 1024).toFixed(1)} MB) into ${output}`);
