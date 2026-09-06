export const projectTemplate = {
  id: "my-first-collection",
  title: "收藏项目名称",
  description: "记录这个前端项目值得学习的设计细节。",
  cover: "public/covers/my-first-collection.webp"
};

const linkFields = ["demoUrl", "readmeUrl", "sourceUrl", "originalUrl"];
export function isWebUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateProjects(data) {
  if (!Array.isArray(data)) throw new Error("作品清单必须是 JSON 数组。");
  const ids = new Set();
  return data.map((item, index) => {
    const prefix = `第 ${index + 1} 条作品`;
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${prefix}必须是对象。`);
    for (const field of ["id", "title", "description"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) throw new Error(`${prefix}缺少 ${field}。`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error(`${prefix}的 id 需使用小写英文、数字与短横线。`);
    if (ids.has(item.id)) throw new Error(`作品 id 重复：${item.id}`);
    ids.add(item.id);
    if (item.cover !== undefined && item.cover !== "") {
      if (typeof item.cover !== "string" || !/^public\/covers\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(webp|png|jpe?g|avif)$/i.test(item.cover)) {
        throw new Error(`${prefix}的 cover 应为 public/covers/ 下的图片路径（文件名使用英文、数字、短横线或下划线）。`);
      }
    }
    for (const field of linkFields) {
      if (item[field] !== undefined && item[field] !== "" && (typeof item[field] !== "string" || !isWebUrl(item[field]))) {
        throw new Error(`${prefix}的 ${field} 必须是完整的 HTTP(S) 网址，或留空。`);
      }
    }
    return { ...item, title: item.title.trim(), description: item.description.trim() };
  });
}

export function primaryLink(project) {
  return project.demoUrl || project.readmeUrl || project.sourceUrl || "";
}
