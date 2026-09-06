# Frontend Collection · 作品画廊

一个独立的静态展示站：页面截图、项目名称、一行描述，以及可用的演示和源码入口。不包含登录、数据库、后台或自动截图服务；当前清单为空，不展示虚构作品。

[返回仓库首页](../README.md)

## 本地运行

使用 Node.js 22 或更高版本。没有第三方依赖，无需执行 `npm install`。

```powershell
cd D:\frontend-awesome-collection\showcase
npm run dev
```

访问 `http://127.0.0.1:5173`。服务仅监听本机；保存文件后手动刷新浏览器，不提供热更新。不要直接双击 HTML 文件，作品 JSON 需要通过 HTTP 服务读取。

端口被占用时：

```sh
npm run dev -- --port 5174
```

## 添加作品

1. 将作品封面放进 `public/covers/`，建议比例 **16:10**，优先选能体现设计特点的截图，避免直接使用很长的整页截图。
2. 编辑 `src/data/projects.json`。文件是一个 JSON 数组，每件作品是一个对象，顺序即页面展示顺序。
3. 填写真实信息，保存后刷新页面；已部署的网站需要重新构建和上传。
4. 同步维护仓库首页的作品索引和 `collection.md` 中的状态。第一版暂不自动同步 Markdown 索引。

下面仅为格式示例，不是已收录的作品。请替换名称、描述和封面路径；没有链接时保持空字符串。

```json
[
  {
    "id": "my-first-project",
    "title": "我的第一个作品",
    "description": "极简排版与滚动转场的复刻练习。",
    "cover": "public/covers/my-first-project.webp",
    "demoUrl": "",
    "readmeUrl": "",
    "sourceUrl": "",
    "originalUrl": ""
  }
]
```

| 字段 | 要求 | 用途 |
| --- | --- | --- |
| `id` | 必填且唯一 | 小写英文、数字与短横线组成的稳定标识 |
| `title` | 必填 | 项目名称 |
| `description` | 必填 | 一句描述；卡片内超长文字省略，悬停可查看全文 |
| `cover` | 可选 | `public/covers/` 下的 WebP、PNG、JPG、JPEG 或 AVIF 图片；文件名使用英文、数字、短横线或下划线 |
| `demoUrl` | 可选 | 在线演示的完整 HTTP(S) 网址 |
| `readmeUrl` | 可选 | 项目说明的完整 HTTP(S) 网址，例如托管平台中的 README 页面 |
| `sourceUrl` | 可选 | 源码的完整 HTTP(S) 网址 |
| `originalUrl` | 可选 | 原作的完整 HTTP(S) 网址 |

- 点击封面优先打开 **演示 → 项目说明 → 源码**。三者都没有时，封面不伪装成可点击入口。
- 原作只作为独立的参考链接，不会被当成自己的复刻演示。
- 未填封面或运行时图片加载失败，会显示“封面待补充”；填写了不存在的图片路径会使构建失败，防止发布坏图。
- 链接必须为完整网址，不使用本机绝对路径或仓库相对路径，避免部署后链接失效。所有外部链接在新标签页打开。
- 页面上的“收录指南”可查看和复制记录模板；它不是在线编辑器，不会写入本地文件。
- 完整参考图和复盘截图仍留在各个作品的 `screenshots/` 中，这里只存展示用封面。

## 构建与预览

```sh
npm test
npm run build
npm run preview
```

构建会校验数据和封面是否存在，将站点文件复制到 `dist/`。预览同样默认使用 5173 端口；如果开发服务仍在运行，请使用 `npm run preview -- --port 4173`。

部署时将 **`dist/` 的内容** 放到静态网站托管服务。资源路径为相对路径，可放在域名根路径或子目录下。这里不预设部署平台，也不自动发布。

构建会覆盖当前文件，但不会删除上次构建留下的旧封面。需要移除旧资源时，确认路径后手动清理 `showcase/dist/`，再重新构建。

## 文件结构

```text
showcase/
├── index.html                 # 页面结构与收录指南
├── package.json               # 本地运行、测试和构建命令
├── public/
│   ├── favicon.svg
│   └── covers/                # 展示封面
├── src/
│   ├── app.js                 # 加载作品、渲染卡片与弹窗交互
│   ├── projects.js            # 数据校验、模板与跳转规则
│   ├── styles.css             # 响应式布局和视觉样式
│   └── data/projects.json     # 作品清单，初始为 []
├── scripts/                   # 零第三方依赖的本地服务与构建脚本
└── tests/                     # 数据校验和本地服务测试
```

展示站和复刻作品独立：不要求 `projects/` 中的作品使用相同技术栈，也不负责启动它们。
