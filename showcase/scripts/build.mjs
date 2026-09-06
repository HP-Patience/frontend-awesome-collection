import { cp, mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateProjects } from "../src/projects.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const projects = validateProjects(JSON.parse(await readFile(path.join(root, "src/data/projects.json"), "utf8")));
for (const project of projects) {
  if (project.cover) {
    const cover = await stat(path.join(root, project.cover)).catch(() => null);
    if (!cover?.isFile()) throw new Error(`Cover not found for ${project.id}: ${project.cover}`);
  }
}
const out = path.join(root, "dist");
await mkdir(out, { recursive: true });
for (const entry of ["index.html", "src", "public"]) {
  await cp(path.join(root, entry), path.join(out, entry), { recursive: true, force: true, filter: source => path.basename(source) !== ".gitkeep" });
}
console.log(`Built ${projects.length} project(s) → showcase/dist/`);
