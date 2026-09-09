"""Save the publicly served Alche pages and their same-origin dependencies.
No private API, credentials, or source maps are accessed. Analytics are removed.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse, unquote, quote
import re, json, time

ORIGIN = 'https://alche.studio'
ROOT = Path(__file__).resolve().parents[1] / 'public'
PAGES = ['/', '/news', '/works', '/about', '/stellla', '/contact', '/privacypolicy', '/license']
EXT = r'(?:css|js|png|jpe?g|svg|webp|avif|gif|mp4|mp3|wav|ogg|glb|gltf|bin|json|woff2?|ttf|ico|webm)'
seen, records, failures = set(), [], []

def local_path(url):
    path = unquote(urlparse(url).path).lstrip('/')
    if not path or not Path(path).suffix:
        path = (path + '/index.html').lstrip('/')
    target = (ROOT / path).resolve()
    if not target.is_relative_to(ROOT.resolve()):
        raise ValueError('Unsafe path')
    return target

def dependencies(text, url):
    is_html = local_path(url).suffix == '.html'
    candidates = re.findall(r'''(?:src|href|poster)=["']([^"']+)["']''', text) if is_html else []
    candidates += re.findall(r'''["'`]((?:/|\./|\.\./)[^\s"'`<>\\]{1,240}?\.''' + EXT + r''')["'`]''', text)
    candidates += re.findall(r'''url\(["']?([^\s\)"']+)["']?\)''', text)
    # Lottie image paths are relative to the JSON file.
    if url.endswith('.json'):
        try:
            for asset in json.loads(text).get('assets', []):
                if 'p' in asset and not asset['p'].startswith('data:'):
                    candidates.append(asset.get('u', '') + asset['p'])
        except (ValueError, AttributeError):
            pass
    for candidate in candidates:
        if '${' in candidate or candidate.startswith('#') or candidate in ['/replica.css', '/replica.js']:
            continue
        full = urljoin(url, candidate).split('#')[0]
        parsed = urlparse(full)
        if parsed.netloc != 'alche.studio':
            continue
        if re.search(r'\.' + EXT + r'$', parsed.path, re.I) or (is_html and not Path(parsed.path).suffix and re.fullmatch(r'/[\w/% .-]*', parsed.path)):
            yield ORIGIN + parsed.path

def fetch(url):
    target = local_path(url)
    if target.exists():
        data = target.read_bytes()
    else:
        for attempt in range(3):
            try:
                req = Request(quote(url, safe=':/%?=&'), headers={'User-Agent': 'Mozilla/5.0'})
                with urlopen(req, timeout=70) as response:
                    data = response.read()
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1 + attempt)
    deps = []
    if target.suffix in ('.html', '.css', '.js', '.json'):
        text = data.decode('utf-8')
        deps = list(dependencies(text, url))
        if target.suffix == '.html':
            text = re.sub(r'<script\b[^>]*src=["\']https://www.googletagmanager.com/[^>]*>\s*</script>', '', text)
            text = re.sub(r'<script>\s*window\.dataLayer.*?</script>', '', text, flags=re.S)
            text = text.replace('<link rel="stylesheet" href="/replica.css"><script defer src="/replica.js"></script>', '')
            text = text.replace('</head>', '<link rel="stylesheet" href="/replica.css"><script defer src="/replica.js"></script></head>')
            text = text.replace('https://alche.studio/', '/')
        if target.suffix == '.js' and 'const d=document,config={kitId:' in text:
            text = text[:text.index('const d=document,config={kitId:')] + '\n/* Hosted font loader omitted; local font fallbacks are bundled. */\n'
        data = text.encode('utf-8')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return deps, {'path': str(target.relative_to(ROOT)).replace('\\','/'), 'source': url, 'bytes': len(data)}

pending = {ORIGIN + p for p in PAGES}
pending.update(ORIGIN + p for p in ['/sounds/mission_in.mp3','/sounds/typing.mp3','/sounds/works_in.mp3','/top/service/uefn.mp4','/top/service/ue.mp4','/top/service/stellla.mp4','/common/loading.svg'])
with ThreadPoolExecutor(max_workers=10) as pool:
    while pending:
        batch = pending - seen
        seen.update(batch)
        pending = set()
        futures = {pool.submit(fetch, url): url for url in batch}
        for future in as_completed(futures):
            url = futures[future]
            try:
                deps, record = future.result()
                records.append(record)
                pending.update(set(deps) - seen)
                print(f"OK {record['bytes']:>9} {record['path']}", flush=True)
            except Exception as exc:
                failures.append({'url': url, 'error': str(exc)})
                print(f'FAILED {url}: {exc}', flush=True)
ROOT.parent.joinpath('asset-manifest.json').write_text(json.dumps({'origin': ORIGIN, 'retrieved': '2026-09-09', 'assets': sorted(records, key=lambda r: r['path']), 'failures': failures}, indent=2), encoding='utf-8')
print(f'Finished: {len(records)} files, {sum(r["bytes"] for r in records)/1024/1024:.1f} MB, {len(failures)} failures', flush=True)
