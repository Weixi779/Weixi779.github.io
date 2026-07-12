# Astro V2 技术实施文档

> 当前阶段：Astro V2 初版已完成
> 发布策略：`file` 校验通过后自动发布 `dist` 到 `main`
> 回退基线：`36486ba`

## 1. 目标

Astro V2 的首要目标是替代 Hexo，同时保留个人网站已经成立的内容、视觉与交互。结构清理阶段进一步完成：

1. Astro 工程提升到仓库根目录。
2. Markdown 进入 Astro Content Collections。
3. 文章文件名、Slug 与 Frontmatter 统一。
4. 移除 Hexo 主题、依赖与跨目录读取。
5. 将检查、构建和输出验证拆成明确脚本。
6. 不维护旧 Hexo URL 兼容。

## 2. 最终目录

```text
.
├── .github/workflows/
├── docs/
├── public/
│   └── images/
├── scripts/
│   ├── generate-themes.mjs
│   ├── new-post.mjs
│   └── verify-build.mjs
├── src/
│   ├── components/
│   ├── content/
│   │   ├── pages/
│   │   └── posts/
│   ├── layouts/
│   ├── pages/
│   ├── styles/
│   ├── theme/
│   ├── utils/
│   └── content.config.ts
├── vendor/
│   └── themefoundry/
├── astro.config.mjs
├── package.json
├── package-lock.json
└── tsconfig.json
```

`src/` 保存需要 Astro 处理的源码与内容；`public/` 保存需要稳定公开路径的 Banner、favicon 和文章图片。

## 3. 内容模型

### 3.1 文章

文章统一存放在：

```text
src/content/posts/{slug}.md
```

文件名、Frontmatter `slug` 和公开 URL 保持一致：

```text
src/content/posts/ios-image-compression.md
/posts/ios-image-compression/
```

发布日期以带引号的上海时间字符串保存，避免本地与 CI 时区造成日期偏移。

### 3.2 页面

About 等内容页面位于 `src/content/pages/`。页面只保存内容与展示元数据，路由和布局由 `src/pages/` 决定。

### 3.3 草稿

`draft: true` 的文章不会进入列表、归档、RSS 或静态文章路由。发布时删除该字段或改为 `false`。

## 4. 脚本职责

```json
{
  "themes:generate": "校验 ThemeFoundry contract 并生成站点主题产物",
  "dev": "启动本地开发服务",
  "check": "执行 Astro 类型和内容检查",
  "build": "生成 dist 静态网站",
  "verify": "检查生成页面、RSS 和站内链接",
  "validate": "依次执行 check、build、verify",
  "new": "创建带标准 Frontmatter 的草稿"
}
```

新建文章：

```bash
npm run new -- my-post-slug "中文标题" "iOS"
```

脚本默认生成 `draft: true`，避免半成品意外进入站点。

## 5. 分支与部署

- `file`：源码分支。
- `main`：GitHub Pages 部署产物分支。

推送到 `file` 后，GitHub Actions 执行 `npm ci` 与 `npm run validate`，保存
`dist` 构建产物，并在校验成功后发布到 `main`。Pull Request 只执行校验；也可
通过重新运行对应的 push workflow 再次部署。

## 6. 已完成

- [x] Astro 静态站点与内容集合。
- [x] 首页、分页、文章、归档、About、RSS 与 404。
- [x] 深浅色、毛玻璃页头、TOC、Giscus 与页脚链接。
- [x] 英文 Slug 与英文 Markdown 文件名。
- [x] Astro 工程提升到仓库根目录。
- [x] 删除 Hexo 工程、主题和依赖。
- [x] 删除旧 URL 兼容层。
- [x] 标准新文章脚本。
- [x] CI 验证脚本使用根目录工程。
- [x] Archive 搜索、分类筛选和重组动画。
- [x] Drake 风格 Markdown 与全站字体。
- [x] ThemeFoundry 构建时数据源、contract 校验与主题 CSS 生成。
- [x] ThemeFoundry 四主题选择面板与 system/light/dark 模式。
- [x] 主题偏好持久化、系统外观响应和切换过渡。
- [x] `file → main` 自动校验与部署。

## 7. 后续优先级

后续功能仍按既定顺序推进，并各自使用独立提交：

1. 四套主题在首页、文章、归档和 About 的视觉校准。
2. 主题颜色对比度与可读性检查。

主题系统不反向阻塞 Astro 迁移，也不要求当前版本携带新的主题内容。

## 8. 约束

- 不改变现有页面视觉作为结构重构的附带结果。
- 不重新引入 Hexo 字段或路径推导。
- 不让文件名、标题和发布日期共同决定公开 URL。
- 不在构建脚本中读取 Markdown 原文并重复解析 Frontmatter。
- 每次结构调整后运行 `npm run validate`。
