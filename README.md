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

在文章 Frontmatter 中设置 `toc: true` 启用目录。目录随阅读位置展开当前主章节的
小标题，其余章节收起。省略 `toc` 或设为 `false` 时，正文居中加宽至最多 960px；
没有可用标题的文章也采用此布局。窄屏目录保留正文上方的折叠入口。

新增或修改文章、页面内容后，更新中文字体子集以包含新增字符：

```bash
npm run fonts:update
```

字体来源、许可和生成方式见 [字体说明](public/fonts/SOURCES.md)。

## 主题

全站使用一套配色，支持浅色、深色和跟随系统。

- `src/styles/theme.css` 是颜色来源。页面和组件使用语义变量；正文的
  `--markdown-color-*` 继续映射到这些变量。图片上的文字使用独立的 image 颜色，
  强调色填充上的文字使用 `--color-text-on-accent`。
- `src/theme/state.ts` 的 `createThemeStore` 只管理偏好与实际外观，每次调用创建独立实例。
  `getState()` 返回稳定的只读快照，`subscribe()` 返回取消订阅函数；不依赖浏览器或 React。
- `src/theme/controller.ts` 的 `createThemeController` 接收 `ThemeEnvironment`，注入存储和
  系统外观读写／监听。入口持有实例并负责 `dispose()`；单测可直接注入内存实现。
  BFCache 恢复时入口调用 `refreshPreference()`，由 Controller 重新读取、校验存储；
  存储不可读时保留当前会话选择，缺失或无效值回到跟随系统。入口立即同步页面外观。
- `src/theme/bootstrap.ts` 是浏览器入口，创建实例、注入真实依赖、更新根元素颜色状态，
  并处理减少动态效果和页面结束。回退缓存中的页面保留监听。当前 Astro 组件通过
  `window.blogTheme` 取得入口创建的实例，工厂模块本身不创建全局实例。
- `scripts/theme-bootstrap-plugin.mjs` 用构建工具 esbuild 把入口打包为同步内联脚本，
  `BaseLayout` 将其放在 `<head>`，首次渲染前应用偏好。测试使用同一打包入口。
- React 改写时，应用入口把实例传给 Provider，再用 `useSyncExternalStore` 订阅
  `subscribe` / `getState` 即可；SSR 的初始快照由页面宿主明确提供。Provider 不另建主题状态。
  普通组件直接使用 CSS 变量，无须订阅。
- `blog-theme-change` 在根元素实际更新后通知评论区等 DOM 消费者。入口负责这项浏览器事件，
  主题状态本身通过 `subscribe` 提供通知，不依赖全局事件。
- 继续读取 `blog-theme-preference`：旧 `{ themeId, mode }` 会迁移为 `{ mode }`，
  保留用户的显示模式。无效或不可访问的存储回退到系统；存储失败不阻止本页切换。
- 新页面继承 `BaseLayout` 即可；有昼夜图片的页面可依据根元素的 `data-color-mode`
  选择图片，图片内容与布局由页面自己负责。不要另行监听系统外观或读取主题存储。

主题运行时不依赖 React 或 ThemeFoundry，也不再生成多配色目录。
`vendor/themefoundry` 暂保留为原始数据快照，不参与开发和构建。
`tests/theme-state.test.ts` 覆盖独立实例、依赖注入和释放；`tests/theme.test.ts`
覆盖真实打包入口、旧偏好迁移、系统变化、存储失败与快速切换；
`tests/theme-contrast.test.ts` 检查正文和控件主要文字组合的对比度。

### MDX 验证

MDX 正文直接使用 Markdown 表格，滚动容器和键盘焦点由渲染配置自动添加。摘要和字数统计只提取静态正文，不执行文章中的 JavaScript。

`npm run validate` 包含 `npm run verify:mdx`：启动临时本地 Astro 服务，检查已发布文章与试写草稿的表格、代码高亮、锚点和交互组件内容，然后关闭服务；同时确认文章进入正式构建、归档和 RSS，试写草稿仍被排除。交互组件的状态变化由单元测试覆盖，真实浏览器中的加载与操作仍需随相关修改检查。
