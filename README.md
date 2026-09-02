# 伟兮の小屋

基于 Astro 的个人博客。

## 分支与部署

- `main`：默认分支，保存 Astro 源码。
- `gh-pages`：GitHub Pages 部署产物分支，由 GitHub Actions 自动维护。

推送到 `main` 后，GitHub Actions 会先运行完整校验，再把生成的 `dist` 发布到
`gh-pages`。针对 `main` 的 Pull Request 只执行校验，不会触发部署；不要直接修改
`gh-pages`。

## 本地开发

```bash
git submodule update --init --recursive
npm ci
npm run dev
```

完整验证：

```bash
npm run validate
```

## 内容

文章位于 `src/content/posts/`，页面内容位于 `src/content/pages/`，Banner、favicon
和文章图片位于 `public/`。文章文件名、Frontmatter `slug` 与公开 URL 使用同一个
英文值，字段定义以 `src/content.config.ts` 为准。

创建草稿：

```bash
npm run new -- post-slug "文章标题" "分类"
```

新文章默认使用 `draft: true`，不会进入文章列表、归档、RSS 或静态文章路由；发布时
删除该字段或改为 `false`。站点只维护当前 Astro 路由，不兼容旧 Hexo 年月日地址。

## 主题

主题颜色来自 `vendor/themefoundry` 固定版本。`dev`、`check` 和 `build` 会先校验
ThemeFoundry contract，并生成站点使用的 CSS 与主题目录。
