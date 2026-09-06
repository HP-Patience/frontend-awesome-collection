import { projectTemplate, validateProjects, primaryLink } from "./projects.js";

const $ = (selector) => document.querySelector(selector);
const grid = $("#project-grid");
const status = $("#collection-status");
const dialog = $("#guide-dialog");
$("#project-template").textContent = JSON.stringify(projectTemplate, null, 2);
for (const button of document.querySelectorAll("[data-open-guide]")) {
  button.addEventListener("click", () => {
    $("#copy-status").textContent = "";
    dialog.showModal();
  });
}
$("#close-guide").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
$("#copy-template").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(projectTemplate, null, 2));
    $("#copy-status").textContent = "已复制。请粘贴到清单数组中，并替换示例内容。";
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($("#project-template"));
    selection.removeAllRanges();
    selection.addRange(range);
    $("#copy-status").textContent = "无法访问剪贴板，已选中模板，请手动复制。";
  }
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function externalLink(url, className, label) {
  const link = element("a", className, label);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}
function placeholder() {
  const node = element("div", "cover-placeholder");
  node.append(element("span", "", "↗"), element("small", "", "封面待补充"));
  return node;
}
function card(project) {
  const article = element("article", "project-card");
  const destination = primaryLink(project);
  const cover = destination ? externalLink(destination, "cover") : element("div", "cover");
  if (destination) cover.setAttribute("aria-label", `打开 ${project.title}（新标签页）`);
  if (project.cover) {
    const img = element("img");
    img.alt = `${project.title} 页面截图`;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 1600;
    img.height = 1000;
    img.addEventListener("error", () => img.replaceWith(placeholder()), { once: true });
    img.src = new URL(`../${project.cover}`, import.meta.url).href;
    cover.append(img);
  } else cover.append(placeholder());
  if (destination) {
    const arrow = element("span", "cover-arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    cover.append(arrow);
  }
  const title = element("h3", "card-title", project.title);
  const description = element("p", "card-description", project.description);
  description.title = project.description;
  article.append(cover, title, description);
  const links = element("div", "card-links");
  for (const [field, label] of [["demoUrl", "演示"], ["readmeUrl", "项目说明"], ["sourceUrl", "源码"], ["originalUrl", "原作"]]) {
    if (project[field]) {
      const link = externalLink(project[field], "", `${label} ↗`);
      link.setAttribute("aria-label", `${project.title} · ${label}（新标签页）`);
      links.append(link);
    }
  }
  if (links.childElementCount) article.append(links);
  return article;
}

async function loadProjects() {
  grid.hidden = true;
  grid.replaceChildren();
  $("#empty-state").hidden = true;
  $("#error-state").hidden = true;
  status.hidden = false;
  status.textContent = "正在翻开收藏夹…";
  $("#project-count").textContent = "—";
  try {
    const response = await fetch(new URL("./data/projects.json", import.meta.url), { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`读取收藏清单失败（HTTP ${response.status}）。`);
    const projects = validateProjects(await response.json());
    $("#project-count").textContent = String(projects.length).padStart(2, "0");
    status.textContent = `已收录 ${projects.length} 个项目。`;
    status.className = "sr-only";
    if (projects.length) {
      grid.append(...projects.map(card));
      grid.hidden = false;
    } else $("#empty-state").hidden = false;
  } catch (error) {
    status.hidden = true;
    $("#error-state").hidden = false;
    $("#error-message").textContent = `${error instanceof SyntaxError ? "JSON 格式有误，请检查逗号、引号和括号。" : error.message} 请检查 src/data/projects.json 后重试。`;
  }
}
$("#retry-button").addEventListener("click", () => { status.className = "loading-state"; loadProjects(); });
loadProjects();
