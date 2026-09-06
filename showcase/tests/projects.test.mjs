import test from "node:test";
import assert from "node:assert/strict";
import { validateProjects, primaryLink, projectTemplate, isWebUrl } from "../src/projects.js";

const sample = () => ({ ...projectTemplate });
test("empty collection stays empty", () => assert.deepEqual(validateProjects([]), []));
test("valid project is normalized without changing input", () => {
  const item = { ...sample(), title: "  Title  " };
  assert.equal(validateProjects([item])[0].title, "Title");
  assert.equal(item.title, "  Title  ");
});
test("rejects malformed collections and entries", () => {
  for (const data of [null, {}, "[]", [null], [[]], [{}]]) assert.throws(() => validateProjects(data));
});
test("requires unique, path-safe ids and text fields", () => {
  assert.throws(() => validateProjects([sample(), sample()]), /重复/);
  for (const patch of [{ id: "../bad" }, { id: "UPPER" }, { title: " " }, { description: 42 }]) assert.throws(() => validateProjects([{ ...sample(), ...patch }]));
});
test("allows blank optional links and cover", () => {
  assert.equal(validateProjects([{ id: "minimal", title: "Minimal", description: "Text" }]).length, 1);
  assert.equal(validateProjects([{ ...sample(), cover: "" }]).length, 1);
});
test("rejects unsafe urls and unsafe cover paths", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//example.com", "../README.md", "https://user:password@example.com"]) {
    assert.equal(isWebUrl(url), false);
    assert.throws(() => validateProjects([{ ...sample(), sourceUrl: url }]));
  }
  for (const cover of ["../secret.png", "public/covers/../../secret.png", "https://example.com/a.png", "public/covers/a.svg", "public/covers/a.png?x", 7]) {
    assert.throws(() => validateProjects([{ ...sample(), cover }]));
  }
});
test("accepts supported raster formats and https urls", () => {
  for (const ext of ["webp", "png", "jpg", "jpeg", "avif"]) {
    assert.equal(validateProjects([{ ...sample(), cover: `public/covers/my-cover.${ext}`, sourceUrl: "https://example.com/source" }]).length, 1);
  }
});
test("main destination is demo then readme then source, never original", () => {
  assert.equal(primaryLink({ demoUrl: "demo", readmeUrl: "readme", sourceUrl: "source" }), "demo");
  assert.equal(primaryLink({ readmeUrl: "readme", sourceUrl: "source" }), "readme");
  assert.equal(primaryLink({ sourceUrl: "source" }), "source");
  assert.equal(primaryLink({ originalUrl: "original" }), "");
});

test("screenshot-only collections need no demo, source, readme or original URL", () => {
  const item = {
    id: "design-inspiration",
    title: "收藏的设计",
    description: "只记录截图与设计看点，没有源码或演示。",
    cover: "public/covers/design-inspiration.png"
  };
  assert.equal(validateProjects([item]).length, 1);
  assert.equal(primaryLink(item), "");
  assert.equal(validateProjects([{ ...item, demoUrl: "", readmeUrl: "", sourceUrl: "", originalUrl: "" }]).length, 1);
});
test("the default template only asks for screenshot collection metadata", () => {
  assert.deepEqual(Object.keys(projectTemplate), ["id", "title", "description", "cover"]);
  assert.equal(validateProjects([projectTemplate]).length, 1);
  assert.equal(primaryLink(projectTemplate), "");
});
