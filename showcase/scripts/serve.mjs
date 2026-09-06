import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };
function contained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function createStaticServer(root = siteRoot) {
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end("Method not allowed");
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const segments = pathname.split(/[\\/]/).filter(Boolean);
      if (pathname.includes("\0") || segments.some(part => part.startsWith(".") || part.includes(":"))) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      // Only expose browser assets, not local scripts, tests, or repository files.
      if (!(pathname === "/" || pathname === "/index.html" || pathname.startsWith("/src/") || pathname.startsWith("/public/"))) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const base = await realpath(root);
      let candidate = path.resolve(base, `.${pathname}`);
      if (!contained(base, candidate)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      if ((await stat(candidate)).isDirectory()) candidate = path.join(candidate, "index.html");
      const target = await realpath(candidate);
      if (!contained(base, target)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      const content = await readFile(target);
      res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Content-Length": content.length });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      const status = error instanceof URIError ? 400 : ["ENOENT", "ENOTDIR"].includes(error.code) ? 404 : 500;
      res.writeHead(status);
      res.end(status === 404 ? "Not found" : "Unable to serve this request");
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const root = args.includes("--dist") ? path.join(siteRoot, "dist") : siteRoot;
  const portIndex = args.indexOf("--port");
  const port = Number(portIndex === -1 ? process.env.PORT || 5173 : args[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be between 1 and 65535.");
  try { await stat(path.join(root, "index.html")); }
  catch { console.error("No site found. Run npm run build before previewing dist."); process.exit(1); }
  const server = createStaticServer(root);
  server.on("error", error => { console.error(error.code === "EADDRINUSE" ? `Port ${port} is occupied. Use --port with another port.` : error.message); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`Frontend Collection: http://127.0.0.1:${port}`));
}
