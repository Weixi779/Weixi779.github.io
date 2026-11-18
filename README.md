# 伟兮の小屋

基于 Astro 的个人博客。

## 目录导航

```text
src/
  pages/              Astro 路由入口，读取数据并组装功能与布局
  layouts/            页面框架与文章布局
  features/
    home/             首页
    archive/          文章归档、搜索与筛选
    post/             文章阅读：目录、评论及目录分组规则
    timeline/         人生时间线及其配置、数据、样式
    article-demos/     正文中的交互示例，按主题分组
  components/
    site/             全站共用的页头、页脚、Banner、主题选择器
    post/             首页和归档共用的文章标题
  styles/             全站样式：global、theme、fonts、prose
  lib/
    content/          内容读取、文章地址、摘要与正文解析
    theme/            主题状态、存储及浏览器生命周期
  content/posts/       文章与当前草稿；英文译文放在 en/
  content/pages/       关于等页面的正文
public/               按原路径发布的图片、字体和下载资料
assets/               制作原稿：fonts/ 字体源文件、images/ 图片原稿
scripts/              新文章、字体更新、站点验证等命令入口
  build/              Astro / Vite 使用的构建插件
tests/                按功能分组；browser/ 为浏览器检查，fixtures/ 为测试数据
docs/                 网站设计说明；drafts/ 保存不参与构建的文章历史稿
```

日常写作从 `src/content/posts/` 开始，修改功能从对应的 `src/features/` 子目录开始。
路由文件负责访问入口和页面组装；`layouts/` 安排页面框架和内容位置。

功能自己的组件、状态、规则、数据和样式放在一起，例如归档的筛选规则属于
`features/archive/`，文章目录的分组和浏览器交互属于 `features/post/`。
只有跨功能共用的展示组件放进 `components/`，共享的非界面能力放进 `lib/`；
它们不反向依赖具体功能。全站共享样式放进 `styles/`。

目录按实际职责形成，不要求每个功能都建立 components、state、services 等固定分层。
`tests/` 按功能或共享能力分组，继续覆盖同一套入口与行为。

`public/` 中的路径就是公开 URL，整理资源时不要随意改名。需要保留的制作原稿
放在 `assets/`，不会随站点发布。`node_modules/`、`dist/`、`.astro/`、
`.codegraph/` 是依赖、构建或本地工具生成目录，不存放手写源码。

## 分支与部署

- `main`：默认分支，保存 Astro 源码。
- `gh-pages`：GitHub Pages 部署产物分支，由 GitHub Actions 自动维护。

推送到 `main` 后，GitHub Actions 会先运行完整校验，再把生成的 `dist` 发布到
`gh-pages`。针对 `main` 的 Pull Request 只执行校验，不会触发部署；不要直接修改
`gh-pages`。

## 本地开发

使用 Node.js 24，与 GitHub Actions 的构建环境保持一致。

```bash
npm ci
npm run dev
```

完整验证：

```bash
npm run validate
```

`validate` 会依次执行类型检查、自动化测试、站点构建、构建产物校验、MDX 检查、开发路由检查和专栏阅读链路验证。
测试使用 Vitest；`tests/archive/archive.test.ts` 覆盖纯筛选规则，
`tests/archive/ArchiveBrowser.test.tsx` 使用 React Testing Library 和 jsdom 验证组件交互。
jsdom 不执行真实页面布局或 View Transition 动画，视觉效果仍需在浏览器中检查。

```bash
npm test           # 执行一次测试
npm run test:watch # 开发时随修改重新执行
```

`npm run verify:dev` 在临时开发服务上逐页核对已构建页面的状态码、标题、主题入口和重定向，
结束后关闭临时服务。也可以用 `npm run verify:dev -- http://127.0.0.1:4321` 检查正在使用的服务；
目录或构建配置调整后，旧进程可能仍持有原来的路径，需要重启，构建通过不能替代这项检查。

## 添加专栏

编辑 [columns.json](src/features/columns/columns.json)。空数组也可以构建，主导航的「专栏」会展示空状态。每增加一项，Astro 就生成一个 `/columns/<slug>/` 阅读列表，例如：

```json
[
  {
    "slug": "wicompress",
    "title": "WICompress 演进史",
    "intro": "从图片压缩的原理，到 WICompress 2.0 的解构与重组。",
    "prominence": "medium",
    "cover": "/images/wicompress-2-architecture.webp",
    "articles": ["image-compression-fundamentals", "ios-image-compression", "wicompress-2-architecture-ai"]
  }
]
```

`articles` 填已发布中文文章的 frontmatter `slug`。专栏详情按原文的 `publishedAt` 从旧到新展示，点击文章列表上方的「发布时间」即可切换方向。发布时间相同时保留数组顺序。

文章标题和摘要取自原文，篇数和正文链接由站点生成。同一篇文章可收录进多个专栏。`prominence` 可选 `large`、`medium`、`small`，默认 `medium`。同档按配置顺序展示。`cover` 可省略，届时沿阅读顺序使用第一张可用的文章头图。累计十个专栏后可以切换纯文字目录。

## 内容

文章位于 `src/content/posts/`，页面内容位于 `src/content/pages/`，Banner、favicon
和文章图片位于 `public/`。文章文件名、Frontmatter `slug` 与公开 URL 使用同一个
英文值，字段定义以 `src/content.config.ts` 为准。

创建草稿：

```bash
npm run new -- post-slug "文章标题" "备忘录"
```

分类使用「备忘录」「后日谈」「画外音」「碎碎念」：分别记录技术实践、个人经历与回顾、
影视和游戏体验，以及日常想法。按内容选择，不限制文章长短；省略命令中的分类时默认为「后日谈」。

新文章默认使用 `draft: true`，不会进入文章列表、归档、RSS 或静态文章路由；发布时
删除该字段或改为 `false`。站点只维护当前 Astro 路由，不兼容旧 Hexo 年月日地址。

每篇文章在内容目录只保留一份当前稿（`.md` 或 `.mdx`）；需要留存的旧版本移到
`docs/drafts/<文章 slug>/`。不要将同名的 `.md` 和 `.mdx` 并排存放，二者会生成
相同的文章 ID。当前草稿仍使用上面的 `draft: true` 流程，历史稿不参与构建。

在文章 Frontmatter 中设置 `toc: true` 启用目录。目录随阅读位置展开当前主章节的
小标题，其余章节收起。正文的段落、标题和列表居中，阅读列最多 760px；代码、表格、
独立图片与交互组件可以使用完整文章区域。省略 `toc` 或设为 `false` 时，文章区域
最多 960px；没有可用标题的文章也采用此布局。窄屏目录保留正文上方的折叠入口。

设置 `recommended: true`，会在首页（含碎碎念）与归档的文章标题后显示实心书签，
表示「作者推荐」。省略或设为 `false` 不显示；此标记不影响文章排序或筛选。

新增或修改文章、页面内容后，更新中文字体子集以包含新增字符：
生成思源黑体子集需要 Python 3 与 `fonttools`（首次使用运行 `python3 -m pip install fonttools`）。

```bash
npm run fonts:update
```

字体来源、许可和生成方式见 [字体说明](public/fonts/SOURCES.md)。

## 主题

全站使用一套配色，支持浅色、深色和跟随系统。

- `src/styles/theme.css` 是颜色来源。页面和组件使用语义变量；正文的
  `--markdown-color-*` 继续映射到这些变量。图片上的文字使用独立的 image 颜色，
  强调色填充上的文字使用 `--color-text-on-accent`。
- `src/lib/theme/state.ts` 的 `createThemeStore` 只管理偏好与实际外观，每次调用创建独立实例。
  `getState()` 返回稳定的只读快照，`subscribe()` 返回取消订阅函数；不依赖浏览器或 React。
- `src/lib/theme/controller.ts` 的 `createThemeController` 接收 `ThemeEnvironment`，注入存储和
  系统外观读写／监听。入口持有实例并负责 `dispose()`；单测可直接注入内存实现。
  BFCache 恢复时入口调用 `refreshPreference()`，由 Controller 重新读取、校验存储；
  存储不可读时保留当前会话选择，缺失或无效值回到跟随系统。入口立即同步页面外观。
- `src/lib/theme/bootstrap.ts` 是浏览器入口，创建实例、注入真实依赖、更新根元素颜色状态与浏览器工具栏配色，
  并处理减少动态效果和页面结束。回退缓存中的页面保留监听。当前 Astro 组件通过
  `window.blogTheme` 取得入口创建的实例，工厂模块本身不创建全局实例。
- `scripts/build/theme-bootstrap-plugin.mjs` 用构建工具 esbuild 把入口打包为同步内联脚本，
  `BaseLayout` 将其放在 `<head>`，首次渲染前应用偏好。测试使用同一打包入口。
  `BaseLayout` 从 `theme.css` 提取昼夜背景色写入 `theme-color`，入口按实际外观同步，颜色不另存一份。
- React 改写时，应用入口把实例传给 Provider，再用 `useSyncExternalStore` 订阅
  `subscribe` / `getState` 即可；SSR 的初始快照由页面宿主明确提供。Provider 不另建主题状态。
  普通组件直接使用 CSS 变量，无须订阅。
- `blog-theme-change` 在根元素实际更新后通知评论区等 DOM 消费者。入口负责这项浏览器事件，
  主题状态本身通过 `subscribe` 提供通知，不依赖全局事件。
- 继续读取 `blog-theme-preference`：旧 `{ themeId, mode }` 会迁移为 `{ mode }`，
  保留用户的显示模式。无效或不可访问的存储回退到系统；存储失败不阻止本页切换。
- 新页面继承 `BaseLayout` 即可；有昼夜图片的页面可依据根元素的 `data-color-mode`
  选择图片，图片内容与布局由页面自己负责。不要另行监听系统外观或读取主题存储。

主题运行时不依赖 React 或外部主题库，也不再生成多配色目录。
`tests/theme/theme-state.test.ts` 覆盖独立实例、依赖注入和释放；`tests/theme/theme.test.ts`
覆盖真实打包入口、旧偏好迁移、系统变化、存储失败与快速切换；
`tests/theme/theme-contrast.test.ts` 检查正文和控件主要文字组合的对比度。

### MDX 验证

MDX 正文直接使用 Markdown 表格，滚动容器和键盘焦点由渲染配置自动添加。摘要和字数统计只提取静态正文，不执行文章中的 JavaScript。

`npm run validate` 包含 `npm run verify:mdx`：启动临时本地 Astro 服务，检查已发布文章与试写草稿的表格、代码高亮、锚点和交互组件内容，然后关闭服务；同时确认文章进入正式构建、归档和 RSS，试写草稿仍被排除。交互组件的状态变化由单元测试覆盖，真实浏览器中的加载与操作仍需随相关修改检查。
