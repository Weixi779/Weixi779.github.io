# 伟兮の小屋

基于 Astro 的个人博客。

## 分支与部署

- `main`：默认分支，保存 Astro 源码。
- `gh-pages`：GitHub Pages 部署产物分支，由 GitHub Actions 自动维护。

推送到 `main` 后，GitHub Actions 会先运行完整校验，再把生成的 `dist` 发布到
`gh-pages`。针对 `main` 的 Pull Request 只执行校验，不会触发部署；不要直接修改
`gh-pages`。

## 本地开发

使用 Node.js 24，与 GitHub Actions 的构建环境保持一致。

```bash
git submodule update --init --recursive
npm ci
npm run dev
```

完整验证：

```bash
npm run validate
```

`validate` 会依次执行类型检查、自动化测试、站点构建和构建产物校验。
测试使用 Vitest；`tests/archive.test.ts` 覆盖纯筛选规则，
`tests/ArchiveBrowser.test.tsx` 使用 React Testing Library 和 jsdom 验证组件交互。
jsdom 不执行真实页面布局或 View Transition 动画，视觉效果仍需在浏览器中检查。

```bash
npm test           # 执行一次测试
npm run test:watch # 开发时随修改重新执行
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

新增或修改文章、页面内容后，更新中文字体子集以包含新增字符：

```bash
npm run fonts:update
```

字体来源、许可和生成方式见 [字体说明](public/fonts/SOURCES.md)。

## 主题

主题颜色来自 `vendor/themefoundry` 固定版本。`dev`、`check` 和 `build` 会先校验
ThemeFoundry contract，并生成站点使用的 CSS 与主题目录。

## 访问统计

配置后，生产构建通过 [GoatCounter](https://www.goatcounter.com/) 记录访问，页面不展示访问量。
在 GoatCounter 创建站点后，将后台提供的完整统计地址（例如
`https://你的站点.goatcounter.com/count`）填入 GitHub 仓库的
Settings → Secrets and variables → Actions → Variables，变量名为
`PUBLIC_GOATCOUNTER_ENDPOINT`，然后重新运行部署工作流。

这个地址是公开配置，不是 API 密钥。未配置时不加载统计脚本，`npm run dev`
也不加载。后台请保持私有，并关闭公开访客计数。
访问数据从启用后开始积累。
