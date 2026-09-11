import { readFile, writeFile } from 'node:fs/promises';
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
let html = await read('index.html');
const css = await read('styles.css');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
for (const file of ['assets.js', 'ripple-trail.js', 'app.js']) {
  const code = await read(file);
  html = html.replace(`  <script defer src="${file}"></script>\n`, '');
  html = html.replace('</body>', () => `<script>\n${code.replaceAll('</script', '<\\/script')}\n</script>\n</body>`);
}
await writeFile(new URL('standalone.html', import.meta.url), html, 'utf8');
console.log('Built standalone.html');
