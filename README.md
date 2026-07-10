# 伟兮の小屋

基于 Astro 的个人博客。

- `file`：源码分支。
- `main`：部署分支。

## 本地开发

```bash
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
