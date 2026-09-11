# 灵感收藏

记录值得学习的网站、页面与交互。收藏不等于承诺复刻，先记下来源和具体看点，再按兴趣选择实现。

[返回仓库首页](README.md)

## 收藏清单

已收录 Rive 猫爪按钮、Alche Studio 和 Ripple Shader，相关交互演示与素材已归档。

| 名称 | 原作链接 | 类型 / 标签 | 值得学习的细节 | 状态 | 本地项目 |
| --- | --- | --- | --- | --- | --- |
| Rive 猫爪按钮 | [Rive for game UI](https://rive.app/game-ui) | 微交互 / Rive / 按钮 | 透明感应区驱动状态机，猫爪从按钮边缘探出，并响应左右及下方区域 | 已复刻 | [rive-cat-paw](projects/rive-cat-paw/README.md) |
| Alche Studio | [Alche, Inc](https://alche.studio/) | 品牌官网 / WebGL / Three.js / 滚动动效 | 金属标志环境反射、3D 滚动联动、材质与旋转调节面板；原站公开构建产物本地化 | 已复刻 | [alche-studio](projects/alche-studio/README.md) |
| Ripple Shader | [Olivier Larose](https://blog.olivierlarose.com/demos/ripple-shader) | 水波 / WebGL / Shader / 指针交互 | 离屏笔刷位移使图像与边缘同步变形，连续路径采样与自然淡出避免固定数量截断拖尾 | 已复刻 | [ripple-shader](projects/ripple-shader/README.md) |

## 记录约定

- **名称与来源**：记录原作名称、可访问的链接，作者或团队信息可补充在名称旁。
- **类型 / 标签**：例如品牌官网、作品集、落地页、滚动动效；无需按标签建立文件夹。
- **具体看点**：尽量写清楚想研究的细节，例如“首屏标题随滚动缩放”，而不是只写“很好看”。
- **状态**：使用 `已收藏`、`计划复刻`、`复刻中`、`已复刻` 或 `暂缓`。
- **本地项目**：尚未开始实现时填 `—`；开始后链接到 `projects/` 下的实际项目目录。

## 先加入截图收藏墙

推荐一并收录源码并注明来源，方便后续学习与复刻；暂时没有源码也可以先收藏。将项目截图放入 `showcase/public/covers/`，在 `showcase/src/data/projects.json` 中补上名称、描述和截图路径，就能在本地收藏墙看到它。画廊展示不依赖源码、live 演示或公网部署；源码仓库等链接可按实际情况补充。具体格式见[收录指南](showcase/README.md)。

## 从收藏到复刻（可选）

1. 新发现先加入上方清单，不必立即创建项目目录。
2. 确定要动手后，在 `projects/` 下创建独立项目，明确本次实现范围。
3. 补充该项目的 README，并将作品加入仓库首页的项目索引。
4. 回到这里填写本地项目链接；后续同步更新收藏清单和作品索引的状态。

仅做收藏时，展示截图存入 `showcase/public/covers/` 即可。开始复刻后，额外的项目参考图和复盘截图再放入该项目的 `screenshots/`。
