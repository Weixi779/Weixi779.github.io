# 伟兮の小屋

基于 Astro 的个人博客。

- `file`：源码分支。
- `main`：部署分支。

推送到 `file` 后，GitHub Actions 会先运行完整校验，再把生成的 `dist` 发布到
`main`。针对 `file` 的 Pull Request 只执行校验，不会触发部署。

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

创建草稿：

```bash
npm run new -- post-slug "文章标题" "分类"
```

文章位于 `src/content/posts/`，页面内容位于 `src/content/pages/`。技术实施与当前基线见 `docs/`。

主题颜色来自 `vendor/themefoundry` 固定版本。`dev`、`check` 和 `build` 会先校验
ThemeFoundry contract，并生成站点使用的 CSS 与主题目录。
