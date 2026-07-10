# Astro V2.0 迁移基线

> 记录日期：2026-07-10<br>
> 基线分支：`file`<br>
> 实施分支：`codex/astro-v2-migration`

## 内容基线

- 本地 Markdown 文章：22 篇。
- 已跟踪文章：21 篇。
- 尚未跟踪文章：1 篇，文件为 `「后日谈」马男&博德之门&近期.md`。
- 当前 Hexo `public/` 中已生成文章：21 篇。
- 当前 Hexo `public/` 中的 `index.html` 路由：70 个。
- 另有静态 `/404.html`。

迁移期间暂停新增文章。Astro V2.0 直接读取 `server/source/_posts/` 作为单一内容源，避免 Hexo 与 Astro 各自维护一份文章。

## V2.0 核心能力矩阵

| 能力 | 当前状态 | V2.0 目标 |
|---|---|---|
| 首页文章列表 | Hexo 分页，每页 10 篇 | 保留排序和分页能力 |
| 文章详情 | Banner、元数据、正文、标签、上下篇 | 在 Astro 中重建 |
| Markdown | 自定义 Stylus 样式 | 保证全部现有内容正确渲染，暂不扩展新组件 |
| Light/Dark | 本地持久化、跟随系统、首屏防闪烁 | 使用站内语义颜色变量重建 |
| Archive | 年份列表、标签筛选、URL Query | V2.0 保留基础能力，V2.1 再改版和搜索 |
| TOC | 旧侧栏实现 | 不迁移旧代码和界面，在 Astro 中重写 |
| Giscus | 已配置，无历史评论 | 全新接入并同步 Light/Dark |
| About | 独立页面 | 迁移现有内容和 Banner |
| 404 | `/404.html` | 生成 GitHub Pages 可用的静态 404 |
| SEO | Title、Description、Canonical | 迁移并补齐文章级元数据 |
| 部署 | `file` 源码，`main` 静态产物 | 保持分支职责不变 |

## Frontmatter 基线

现有文章出现过以下字段：

```text
catalog
categories
cover
date
header-img
layout
mathjax
password
summary
tags
title
toc
top
```

Astro Content Collection Schema 必须兼容这些字段。空 `tags:` 需要统一转换为空数组，不能导致构建失败。

## 路由基线

完整路由清单见 [`legacy-routes.txt`](./legacy-routes.txt)。

V2.0 应优先保留：

- `/`
- `/page/2/`、`/page/3/`
- `/:year/:month/:day/:legacy-slug/`
- `/archive/`
- `/about/`
- `/404.html`

旧的 `/archives/`、`/tags/`、`/categories/` 是否继续生成，在路由实现前确认；即使不保留完整页面，也不能在不记录处理策略的情况下直接消失。

## 构建与 SEO 基线

- Hexo 工程目录：`server/`。
- 本地构建：`npm run build`，实际执行 `hexo generate`。
- 本地预览：`npm run server`，实际执行 `hexo server`。
- 当前部署：`hexo deploy` 将静态产物发布到 `main`。
- 当前页面包含 Title、全站 Description、Keywords 和 Canonical。
- 当前没有完整的文章级 Description、Open Graph、RSS 或 Sitemap 实现。

## V2.0 不做的扩展

- Archive 搜索与大规模界面改版。
- 新字体和高级自定义 Markdown 组件。
- ThemeFoundry 正式接入。
- 多主题选择器。

这些能力依次进入 V2.1、V2.2、V2.3。

## 首次 Astro 构建记录

- Astro：7.0.7。
- TypeScript：6.0.3。
- `astro check`：0 errors、0 warnings、0 hints。
- 静态构建页面：28 个。
- 文章页面：22 个，与本地 Markdown 数量一致。
- 自动验证：22 个文章页面、27 条 V2.0 必须兼容的旧路由，以及 28 个 HTML 页面中的内部链接通过。
- 已接入：分页、基础 Archive 标签筛选、TOC、上下篇、Light/Dark、Giscus、About、404。
- 已增加：仅检查和构建 Astro、不部署 `main` 的迁移分支 CI。
- 尚未执行：浏览器视觉验收、跨浏览器检查、`main` 部署。
