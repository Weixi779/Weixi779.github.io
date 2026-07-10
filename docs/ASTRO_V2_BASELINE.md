# Astro V2 基线

> 状态：Implemented
> 最后更新：2026-07-10
> 当前分支：`codex/astro-v2-migration`

## 1. 产品基线

Astro V2 已覆盖当前个人网站的核心能力：

- 首页与分页文章列表。
- 中文导航、毛玻璃页头和深浅色模式。
- 英文稳定文章 Slug。
- 归档与标签筛选。
- 文章 TOC、相邻文章导航与 Giscus 评论。
- About 页面与社交链接。
- RSS 订阅源。
- 自定义 404 页面。

## 2. 路由基线

站点只维护 Astro 新路由：

- `/`
- `/page/2/`
- `/page/3/`
- `/archive/`
- `/about/`
- `/posts/{slug}/`
- `/rss.xml`
- `/404.html`

本站属于私人小站，不继续生成 Hexo 年月日旧路由。旧地址统一进入 404，不维护跳转页、Slug 对照表或兼容清单。

## 3. 内容基线

文章位于 `src/content/posts/`，About 位于 `src/content/pages/`。文章文件名与公开 Slug 使用同一个英文值，中文标题只存在于 Frontmatter。

```yaml
title: string
slug: string
publishedAt: "YYYY-MM-DD HH:mm:ss"
summary: string | undefined
tags: string[]
category: string
hero: string | undefined
toc: boolean
math: boolean
draft: boolean
```

内容结构由 `src/content.config.ts` 统一校验。Hexo 的 `layout`、`catalog`、`top`、`cover`、`password`、`header-img`、`categories` 和 `mathjax` 字段已退出长期模型。

## 4. 视觉基线

- 首页、第二页和第三页共用相同 Banner。
- 文章卡片正文最多两行，日期与标签位于底部，摘要位于右侧。
- 页头提供克制的 hover、click 与滚动状态反馈。
- About、Archive 与首页导航使用中文。
- 页脚包含 GitHub、LeetCode、Bilibili、邮箱和 RSS。

## 5. 验证基线

运行：

```bash
npm run validate
```

验证范围包括：

- Astro 类型与内容 Schema。
- 静态构建。
- 22 篇文章页面数量。
- 首页、分页、归档、About 与 404。
- RSS 条目数量。
- Giscus 与相邻文章导航。
- 生成页面内的站内链接。
