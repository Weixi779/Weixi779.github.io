# 个人网站 Astro V2 总体技术实施方案

> 文档状态：Draft / 持续维护<br>
> 目标版本：V2（Hexo → Astro）<br>
> 源码与资源分支：`file`<br>
> 部署产物分支：`main`<br>
> 最后更新：2026-07-10

## 1. 文档目的

本次改造是个人网站的一次大版本升级，不是单纯替换静态站点生成器。目标是在保留现有文章内容和个人化功能的基础上，建立一套可以长期维护、持续演进的 Astro 网站架构。

本文档作为项目的长期主实施文档，用于：

- 固化已经确认的需求与边界。
- 说明目标架构和关键技术决策。
- 将工作拆成有依赖关系的阶段，并定义每个阶段的完成标准。
- 记录后续新增需求、决策变化、风险和进度。
- 保证升级期间现有线上网站可以继续运行并随时回滚。

后续需求可以持续补充，但应先进入本文档的“待确认事项”或“后续版本”，再决定是否改变当前阶段范围。

## 2. 已确认的项目约束

### 2.1 分支职责

- `file` 是唯一的源码与资源分支。
- `main` 是部署产物分支，只保存最终生成的静态网站。
- 日常开发、文章、图片、Astro 源码、配置和技术文档都在 `file` 或从 `file` 创建的功能分支中维护。
- 不直接在 `main` 开发或手工修改页面。
- Astro V2 完成验收前，不覆盖 `main` 上的现有 Hexo 网站。

### 2.2 主题系统

- 主题颜色来自 [Weixi779/ThemeFoundry](https://github.com/Weixi779/ThemeFoundry)。
- ThemeFoundry 是可持续修改的个人主题配置仓库。
- ThemeFoundry 负责主题相关的颜色 Token，不负责博客布局和组件实现。
- Light/Dark 或不同主题之间只改变颜色，不改变 Markdown 字号、字体、行高、内容宽度和间距。
- 完整 ThemeFoundry 接入不是 Astro V2.0 迁移的核心目标，安排在迁移完成后的独立版本和分支中实施。
- V2.0 只需要保留现有 Light/Dark 能力，并预留稳定的语义颜色变量接口，不能让 ThemeFoundry 阻塞 Astro 上线。
- 后续接入时，Astro 项目作为 ThemeFoundry 的消费方，负责将 Token 转换成网站可用的 CSS Variables。

### 2.3 Markdown 阅读系统

- Markdown 文章排版由 Astro 网站统一配置。
- V2.0 先保证现有 Markdown 内容能够正确渲染和阅读，不要求同时推出新的阅读功能。
- 字体更换和更完整的自定义 Markdown 设计属于迁移后的扩展版本。
- 正文字号、标题比例、行高、代码字体、内容宽度和间距不跟随主题变化。
- 现有 Markdown 内容应尽量原样迁移，不把普通文章批量改写成 MDX。

### 2.4 评论系统

- V2 继续使用 Giscus。
- 当前没有需要保留的历史评论，因此不做评论数据迁移和旧 Discussion 映射。
- 新站只需要正确创建并跟随网站主题切换 Giscus 外观。

### 2.5 项目节奏

- 本项目预计会持续多个阶段，允许后续陆续补充需求。
- 每一阶段必须有独立的可验证产物。
- 在达到切换门槛前，现有 Hexo 网站保持可构建、可部署。
- V2.0 可以是没有新增用户功能的平台迁移版本，只要现有核心能力得到保留或合理重写。
- 扩展优先级固定为：Archive 改造与搜索 → 自定义 Markdown → ThemeFoundry 完整接入。

## 3. 当前网站基线

当前源码位于 `server/`，主要组成如下：

- Hexo 6.3 静态站点。
- Hux/BeanTech 模板基础。
- 约 22 篇 Markdown 文章，以及 About、Archive、404 页面。
- 自定义 Markdown 样式。
- 自定义 Light/Dark 切换和本地持久化。
- 自定义 Archive 页面和标签筛选。
- Giscus 评论及主题同步。
- 文章目录（TOC）、上一篇/下一篇、Banner、标签和分类。
- Git 部署到 `main` 分支。

现有个人化功能是 V2 的需求来源，但旧模板的 Bootstrap、jQuery、Stylus、EJS 和历史兼容代码不作为必须迁移的实现。

## 4. V2 目标

### 4.1 产品目标

- 保持“个人小屋 + 技术长文 + 随笔”的网站气质。
- V2.0 先完成框架迁移和核心能力对齐，不以新增功能作为上线条件。
- 首页、文章页、Archive、About 和 404 在 Astro 中完整可用。
- 支持稳定的 Light/Dark 体验。
- 保持写作流程简单：新增 Markdown、填写 Frontmatter、提交即可部署。
- 在 V2.0 稳定后，再依次改善 Archive、Markdown 阅读系统和主题系统。

### 4.2 技术目标

- 使用 Astro 生成纯静态网站。
- 默认使用 Astro 组件和原生 JavaScript，不引入 React/Vue 等客户端运行时。
- 使用 Content Collections 管理并校验文章元数据。
- 移除对 Bootstrap、jQuery、FastClick 和旧 Hexo 主题脚本的依赖。
- 建立清晰的 Design Token、基础样式、阅读样式和组件样式分层。
- 建立自动构建、检查和发布到 `main` 的流程。
- 保留明确的回滚路径。

### 4.3 版本序列

本项目按“先迁移、后扩展”推进：

| 版本 | 核心目标 | 是否要求新增用户功能 |
|---|---|---:|
| V2.0 | 从 Hexo 迁移到 Astro，保留现有核心能力，重写不合格的 TOC | 否 |
| V2.1 | 改造 Archive 界面并加入文章搜索 | 是 |
| V2.2 | 扩展自定义 Markdown 阅读系统并更换字体 | 是 |
| V2.3 | 正式接入 ThemeFoundry 主题系统 | 是 |

每个版本单独建立功能分支、独立验收，避免主题设计和新功能拖慢 V2.0 迁移。

## 5. 非目标

以下内容不进入 V2 首次上线的必做范围：

- 后台 CMS 或在线文章编辑器。
- 用户账号、服务端数据库或自建评论服务。
- 为每种前端框架建立组件版本。
- 复杂动画系统。
- Archive 搜索和大规模界面改版。
- 新的自定义 Markdown 组件与字体方案。
- ThemeFoundry 完整接入及多主题选择器。
- 为迁移而重写文章正文。
- 在首次上线前删除旧 Hexo 工程。

## 6. 核心技术决策

### 6.1 采用并行迁移

推荐在 `file` 分支中新增 `site/` 作为 Astro 工程，暂时保留 `server/`：

```text
Weixi779.github.io/
  docs/
  server/                 # 现有 Hexo，切换前保留
  site/                   # 新 Astro V2
  README.md
```

V2.3 接入主题系统时，再根据版本管理方案决定是否增加 `vendor/ThemeFoundry/`。

并行迁移的原则：

- Hexo 继续提供线上网站。
- Astro 可以独立开发、构建和预览。
- 内容迁移完成后进行新旧页面对照。
- 只有 Astro 达到上线门槛后，才将其构建产物发布到 `main`。
- V2 稳定运行一段时间后，再决定是否删除 `server/`。

### 6.2 V2.0 预留主题接口，后续接入 ThemeFoundry

V2.0 使用站内语义颜色变量重建现有 Light/Dark，不要求构建流程读取 ThemeFoundry。组件不直接写死主题色值，为后续接入留下稳定边界：

```text
V2.0：站内 Light/Dark 配置 → 语义 CSS Variables → 页面和 Markdown
V2.3：ThemeFoundry JSON → Astro Adapter → 同一组语义 CSS Variables
```

V2.0 先定义以下稳定接口：

```css
--color-background-primary
--color-surface-primary
--color-text-primary
--color-text-secondary
--color-accent-primary
--color-border-primary
```

V2.3 接入时优先使用 ThemeFoundry 现有 `core` contract。如果现有 Token 无法精确表达代码块、引用、表格等阅读颜色，再考虑新增只包含颜色的 `reader-colors` contract。字体、字号和行高不进入主题 Token。

ThemeFoundry 的 Submodule、固定下载或其他版本固定方式在 V2.3 设计阶段确认，不阻塞 V2.0。

### 6.3 Markdown 排版保持全站统一

建议将阅读系统集中在 `prose.css` 和独立配置中：

```text
typography.css  # 字体声明、字号尺度、行高
prose.css       # Markdown 元素样式与阅读布局
tokens.css      # 站内或 ThemeFoundry 生成的颜色变量
global.css      # Reset、全站基础样式
```

主题切换只能影响 `tokens.css` 中的颜色变量，不能改变以下内容：

- 正文字体与代码字体。
- 正文字号与标题比例。
- 行高、段落间距和列表缩进。
- 文章最大宽度。
- TOC 和正文布局尺寸。

V2.0 只建立结构正确、覆盖现有内容的基础阅读样式；字体更换、Callout、代码块增强等自定义能力在 V2.2 集中设计。

### 6.4 内容继续使用 Markdown

- 现有文章迁移到 Astro Content Collection。
- 保留 Markdown 文件作为内容源。
- 允许现有少量原生 HTML，例如 `<details>`、`<summary>`、`<br>`。
- 图片路径进行一次机械校正，不人工重写正文结构。
- 只有确实需要交互组件的文章才单独使用 MDX，V2 首次上线不要求 MDX。

### 6.5 使用稳定 Slug，并兼容现有路由

文章的正式路由使用人工维护的 ASCII Slug：

```text
/posts/{slug}/
```

Markdown 文件名和文章标题可以继续使用中文。Slug 一旦发布就视为永久标识，不跟随标题、文件名或日期变化。具体映射见 `docs/ASTRO_V2_SLUG_MAP.md`。

现有 `/:year/:month/:day/:legacy-slug/` 保留为静态跳转页，通过 canonical、`meta refresh` 和备用链接指向新地址，避免搜索引擎收录与历史分享链接直接失效。

## 7. 目标工程结构

建议的 Astro 工程结构如下：

```text
site/
  public/
    fonts/
    images/
  src/
    components/
      Header.astro
      Footer.astro
      ThemeToggle.astro
      PostCard.astro
      TableOfContents.astro
      GiscusComments.astro
      ArchiveFilter.astro
    content/
      posts/
    layouts/
      BaseLayout.astro
      PostLayout.astro
      PageLayout.astro
    pages/
      index.astro
      archive/index.astro
      about.astro
      404.astro
      [...postPath].astro
    styles/
      global.css
      tokens.css
      typography.css
      prose.css
      components.css
    theme/
      semantic-colors.ts  # V2.0 站内 Light/Dark
      adapter.ts          # V2.3 ThemeFoundry Adapter
    utils/
      posts.ts
      routes.ts
      seo.ts
  astro.config.mjs
  package.json
```

实际文件可以在实现时调整，但“内容、布局、组件、主题适配、阅读样式”必须保持边界清晰。

## 8. 内容模型

建议的文章 Frontmatter Schema：

```yaml
title: string
description: string | optional
date: date
updated: date | optional
tags: string[]
categories: string[]
heroImage: string | optional
catalog: boolean
draft: boolean | optional
legacyPath: string
```

迁移规则：

- `header-img` 迁移为 `heroImage`。
- `date` 保持原发布日期。
- `catalog` 控制是否展示 TOC。
- `tags` 和 `categories` 统一为数组。
- `legacyPath` 保存当前文章公开路径。
- 未填写 `description` 时，可在构建时从正文生成摘要，但重要文章应允许手工填写。
- Draft 不输出到生产构建。

需要编写一次性迁移检查，报告以下问题：

- 缺失或格式错误的 Frontmatter。
- 重复路径。
- 缺失图片。
- 无效站内链接。
- 旧 HTML 在新 Markdown 渲染器中的差异。

## 9. 页面与功能范围

| 页面/功能 | V2 首次上线 | 说明 |
|---|---:|---|
| 首页文章列表 | 必须 | 按日期排序，是否保留分页待确认 |
| 文章详情 | 必须 | Banner、元数据、正文、标签、上下篇 |
| Markdown 基础阅读样式 | 必须 | 正确渲染现有内容，先不扩展新语法和新组件 |
| Light/Dark | 必须 | 系统偏好、本地持久化、首屏防闪烁 |
| Archive 基础能力 | 必须 | V2.0 先保留可浏览和标签筛选能力 |
| TOC 重写 | 必须 | 保留目录能力，但不迁移旧实现 |
| Giscus | 必须 | 全新接入，不迁移旧评论 |
| About | 必须 | 迁移现有内容并统一布局 |
| 404 | 必须 | GitHub Pages 可用的静态 404 |
| SEO | 必须 | Title、Description、Canonical、Open Graph |
| Sitemap / RSS | 建议 | 在首次上线前视工期决定 |
| 分类独立页 | 待确认 | 当前主要入口已经收敛到 Archive |
| 标签独立页 | 待确认 | 可由 Archive 查询参数替代 |
| Archive 新界面与搜索 | V2.1 | 迁移稳定后的第一扩展优先级 |
| 自定义 Markdown | V2.2 | 字体、阅读视觉和扩展组件 |
| ThemeFoundry | V2.3 | 通过预留颜色接口正式接入 |

## 10. 视觉与字体实施原则

### 10.1 字体分工

最终字体仍需确认，建议保持三类职责：

- UI/导航/标题字体。
- Markdown 正文字体。
- 代码字体。

候选方向：

- 正文：`LXGW WenKai Screen` 或 `Noto Serif SC`。
- UI/标题：系统无衬线字体栈。
- 代码：`JetBrains Mono` 或系统等宽字体栈。

中文 Web Font 可能显著增加资源体积。正式采用前需要验证：

- WOFF2 文件体积。
- 首屏字体交换效果。
- 中英文混排。
- iPhone、macOS 和 Windows 的回退字体表现。
- 粗体是否真实存在，避免浏览器合成粗体影响阅读。

### 10.2 阅读排版基线

初始基线建议从现有阅读体验出发，而不是直接沿用旧 CSS：

- 正文基础字号保持全站一致。
- 正文行高约 `1.8–1.9`，最终通过真机阅读确定。
- 正文最大宽度约 `680–760px`，最终根据字体确定。
- 标题使用稳定的比例尺度。
- 代码块、表格和图片允许横向滚动或响应式缩放。
- 移动端不通过缩小全部字号来强行塞入内容。

具体值在字体确定后统一落入 `typography.css`，不分散到组件中。

## 11. 交互实现原则

### 11.1 主题切换

- 在 `<head>` 中尽早读取用户偏好，避免页面闪烁。
- 优先读取用户保存值，没有保存值时跟随系统。
- 使用 `data-theme` 或等价属性驱动 CSS Variables。
- 切换按钮必须支持键盘和清晰的无障碍标签。
- 同步更新浏览器 `color-scheme` 和 Giscus 主题。

### 11.2 Archive

- V2.0 不做完整改版，只建立 Astro 版本的基础 Archive。
- 文章分组和标签数据在构建期生成。
- 客户端只负责筛选和 URL Query 同步。
- 无 JavaScript 时至少可以浏览完整文章列表。
- “Show All” 和标签按钮需要有可访问的真实链接或明确按钮语义。
- V2.1 再设计界面、搜索范围、匹配规则、空状态和移动端体验。

### 11.3 TOC

- 旧 TOC 的实现和界面不迁移，只保留“文章需要目录导航”这一能力需求。
- 标题数据优先在 Markdown 构建阶段生成。
- 使用语义化层级输出目录，至少覆盖文章中的 `h2` 和 `h3`。
- 客户端脚本只负责滚动高亮、当前位置同步和必要的固定定位。
- 桌面端采用稳定的侧栏或悬浮目录；移动端采用折叠区、抽屉或其他专门设计，不能简单隐藏后视为完成。
- TOC 必须处理长标题、重复标题、中文锚点、深层标题和内容高度变化。
- 禁用 JavaScript 时仍能看到并使用静态目录链接。

### 11.4 Giscus

- 作为独立组件，仅在需要评论的页面加载。
- 使用新的配置接入，不处理旧 Discussion。
- 评论框加载失败不能影响正文阅读。

## 12. 构建与部署流程

目标流程：

```text
file 分支更新
  → 安装依赖
  → 内容校验
  → Astro check/build
  → 链接与路由检查
  → 生成 site/dist
  → 发布静态产物到 main
```

必须遵守：

- `main` 只接收构建产物。
- 部署提交应明确标记来源 `file` 的 Commit SHA。
- 构建失败时不得修改 `main`。
- 第一次切换采用人工确认后的手动部署。
- 稳定后再开启 `file` → `main` 自动部署。
- 部署脚本不能依赖开发者本机未记录的全局工具。

是否使用 GitHub Actions 自动推送 `dist` 到 `main`，在 Phase 1 中结合仓库权限和 Pages 设置确认。

## 13. 分阶段实施顺序

### V2.0 / Phase 0：迁移基线与功能分支

目标：锁定迁移边界，建立可比较的旧站基线。

工作项：

- [x] 建立总体实施文档。
- [x] 确认 V2.0 可以只做迁移，不要求新增用户功能。
- [x] 确认 TOC 保留能力但重写实现。
- [x] 确认 V2.0 核心能力矩阵。
- [x] 导出现有公开路由清单。
- [ ] 保存首页、文章页、Archive、About 的桌面与移动端截图。
- [x] 记录现有 SEO 元数据和构建命令。
- [x] 从 `file` 创建 Astro V2.0 迁移功能分支 `codex/astro-v2-migration`。

退出标准：迁移范围、旧路由、视觉参考和功能分支齐全。

### V2.0 / Phase 1：Astro 工程与基础设施

目标：建立不会影响现有 Hexo 的独立 Astro 工程。

工作项：

- [x] 创建 `site/` Astro 工程。
- [x] 配置 TypeScript 严格模式和基础脚本。
- [x] 定义站内语义颜色变量，暂不依赖 ThemeFoundry。
- [x] 建立 `BaseLayout`、全局样式和本地构建预览能力。
- [x] 增加基础 CI，只验证 Astro，不发布 `main`。

退出标准：空站可以稳定安装、检查、构建和预览。

### V2.0 / Phase 2：内容迁移与路由

目标：所有现有文章可由 Astro 读取并生成稳定页面。

工作项：

- [x] 定义 Content Collection Schema。
- [x] 将现有 22 篇文章作为 Astro 单一内容源接入。
- [x] 迁移图片并验证相对图片引用可以构建。
- [x] 实现旧文章路径生成。
- [x] 建立内容 Schema、构建产物和关键路由检查。
- [x] 对比新旧文章数量和路由集合。

退出标准：文章数量一致、构建无内容错误、旧核心地址可访问。

### V2.0 / Phase 3：核心页面与能力对齐

目标：在 Astro 中恢复完整浏览和阅读路径，不复制旧框架实现。

工作项：

- [x] Header、导航、Footer。
- [x] 首页文章列表并保留每页 10 篇分页。
- [x] PostLayout、Banner、元数据、标签、上下篇。
- [x] Archive 基础页面和现有标签筛选能力。
- [x] About 页面和 404 页面。
- [x] 从 Markdown Heading 数据重新设计并实现 TOC。
- [x] 完成 TOC 桌面侧栏、移动端折叠、键盘原生操作和无 JavaScript 基线。

退出标准：用户可以从首页完整浏览、筛选并阅读全部内容，TOC 达到新的验收标准。

### V2.0 / Phase 4：现有体验与平台能力

目标：补齐迁移上线所需的既有体验，不引入后续版本的大型扩展。

工作项：

- [x] 建立覆盖现有文章的基础 Markdown 样式。
- [x] 通过全量构建验证现有特殊 Markdown/HTML 内容。
- [x] 使用站内颜色变量恢复 Light/Dark、系统偏好和首屏防闪烁。
- [x] Giscus 全新接入和 Light/Dark 同步。
- [x] Open Graph、Canonical 和文章级 Description。
- [ ] 评估 RSS、Sitemap 是否作为迁移基线补齐。

退出标准：现有核心能力矩阵全部通过，不依赖 ThemeFoundry 即可上线。

### V2.0 / Phase 5：质量验证与切换

目标：证明 Astro V2.0 可以安全替换现有线上网站。

工作项：

- [x] 全量构建、类型、路由和内部链接检查。
- [ ] 桌面/移动端 Light/Dark 截图检查。
- [ ] Safari、Chrome 基础兼容验证。
- [ ] 键盘操作、焦点和颜色对比度检查。
- [ ] GitHub Pages 路径和 404 行为检查。
- [ ] 与旧站进行功能矩阵对照。
- [ ] 记录切换前 `main` Commit，建立回滚点。
- [ ] 手动构建并首次发布 Astro 产物到 `main`。
- [ ] 观察稳定期，稳定后再启用自动部署。

退出标准：线上 Astro V2.0 稳定，现有能力得到保证，回滚方案经过确认。

### V2.1：Archive 改造与搜索

目标：完成迁移后的第一项用户可见扩展。

工作项：

- [ ] 重新设计 Archive 信息层级和响应式界面。
- [ ] 明确搜索范围：标题、摘要、标签、分类和正文。
- [ ] 设计搜索索引、匹配规则、排序、空状态和高亮策略。
- [ ] 保留年份浏览和标签筛选，并与搜索状态协调。
- [ ] 验证无 JavaScript 基线和移动端输入体验。

退出标准：用户可以在 Archive 中快速浏览、筛选和搜索文章。

### V2.2：自定义 Markdown 阅读系统

目标：在稳定的 Astro 内容基础上重新设计文章阅读体验。

工作项：

- [ ] 确认正文、标题和代码字体。
- [ ] 固化统一字号、行高、内容宽度和间距尺度。
- [ ] 改造标题、引用、列表、代码块、表格、图片和链接样式。
- [ ] 评估 Callout、代码标题、脚注等自定义能力。
- [ ] 检查中文字体体积、中英文混排和跨平台回退。

退出标准：阅读系统形成独立、统一、可长期维护的 `prose` 规范。

### V2.3：ThemeFoundry 主题系统

目标：在不改变排版尺寸的前提下，将站内颜色变量切换到 ThemeFoundry 数据源。

工作项：

- [ ] 确认默认主题和多主题范围。
- [ ] 确认 Submodule、固定下载或其他版本接入方式。
- [ ] 实现 ThemeFoundry Adapter 和 Contract 校验。
- [ ] 将 ThemeFoundry Token 映射到 V2.0 预留的语义颜色变量。
- [ ] 验证 Light/Dark、Giscus、代码块和阅读颜色。
- [ ] 决定是否提供公开主题选择器。

退出标准：ThemeFoundry 成为颜色单一事实来源，主题变化不影响 Markdown 布局。

### 稳定期清理

目标：在各版本稳定后减少长期维护负担。

工作项：

- [ ] 决定 Hexo `server/` 的归档或删除时间。
- [ ] 更新 README 和写作/部署说明。
- [ ] 整理旧分支和废弃脚本。
- [ ] 评估搜索以外的下一批扩展能力。

退出标准：仓库只保留仍有用途的实现和明确文档。

## 14. 验收标准

### 14.1 构建

- 全新克隆后可按 README 完成安装和构建。
- 不依赖本机全局 Hexo 或未声明工具。
- 内容 Schema、类型检查和生产构建全部通过。
- V2.0 在不读取 ThemeFoundry 的情况下可以重复产生一致结果。
- V2.3 接入后，相同源码和固定 ThemeFoundry 版本可以重复产生一致结果。

### 14.2 内容

- 文章数量、发布日期、标题、标签和分类正确。
- 文章图片无缺失。
- 代码块、列表、表格、引用、`details` 等内容正常。
- 重要旧链接继续可用或有兼容页面。

### 14.3 视觉与交互

- Light/Dark 切换无明显闪烁。
- 主题切换不改变 Markdown 字号、行高或布局尺寸。
- 桌面和手机均具有稳定阅读宽度。
- 导航、Archive、TOC 和评论支持键盘操作。
- TOC 不复用旧实现，并通过长标题、中文锚点、重复标题和移动端检查。
- 禁用 JavaScript 时，文章正文和基础导航仍可使用。

### 14.4 部署

- `file` 保持源码与资源分支职责。
- `main` 只包含可部署静态产物。
- 部署失败不会破坏当前线上版本。
- 可以通过明确的旧 `main` Commit 快速回滚。

## 15. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| ThemeFoundry 设计阻塞 Astro 迁移 | V2.0 延期 | V2.0 只预留颜色接口，V2.3 再正式接入 |
| ThemeFoundry `main` 变化导致颜色漂移 | V2.3 后线上视觉不可重复 | 固定 Tag/Commit，主动升级 |
| 中文 Web Font 体积过大 | 首屏慢、字体闪烁 | WOFF2、子集化、`font-display`、可靠回退栈 |
| Astro 与 Hexo Slug 编码不同 | 旧链接失效 | 保存 `legacyPath`，构建期对比路由 |
| Markdown 渲染差异 | 文章格式变化 | 对特殊 HTML、代码块、图片做全量检查 |
| 新旧工程并存时间过长 | 内容可能双写 | 明确内容冻结/同步策略和切换时间点 |
| 自动部署误覆盖 `main` | 线上中断 | 首次手动部署、构建门禁、保留回滚 Commit |
| 需求持续增加导致无法上线 | V2.0 长期停留开发状态 | 固定迁移范围，其余进入 V2.1 以后 |

## 16. 回滚方案

切换前：

- Hexo 保持原样可构建。
- 记录线上 `main` 的最后一个 Hexo Commit。
- Astro 只在本地或 CI Preview 中验证。

切换后如果发现阻塞问题：

1. 停止 Astro 自动部署。
2. 将已记录的 Hexo 静态产物重新发布到 `main`。
3. 在 `file` 或 Astro 功能分支修复问题。
4. 重新完成 V2.0 / Phase 5 验证后再次切换。

回滚只操作部署产物，不回退或覆盖 `file` 中的文章和源码历史。

## 17. 待确认事项

以下问题不阻塞本文档建立，但应在对应阶段开始前确认：

- [ ] V2.0 核心能力矩阵的最终范围。
- [ ] 首页是否继续每页 10 篇分页。
- [ ] 是否保留独立的 `/tags/`、`/categories/`、`/archives/` 页面。
- [ ] TOC 在移动端采用抽屉还是正文顶部折叠区。
- [ ] 新站对旧 Hux 视觉的保留程度。
- [ ] 首次上线是否同时包含 RSS 和 Sitemap。
- [ ] `site/` 是否作为最终长期目录名称。
- [ ] V2.1 Archive 搜索是否包含正文全文。
- [ ] V2.2 Markdown 正文字体最终选择。
- [ ] V2.3 默认 ThemeFoundry 主题和多主题范围。
- [ ] V2.3 使用 Submodule、固定下载还是其他接入方式。

## 18. 后续版本 Backlog

以下能力先记录，不进入 V2 首次上线关键路径：

- V2.1 Archive 新界面与搜索。
- V2.2 自定义 Markdown 和字体。
- V2.3 ThemeFoundry 及可选的多主题选择器。
- 阅读进度。
- 图片自动优化和响应式图片。
- 文章系列与相关推荐。
- 自动生成社交分享图。
- 更完整的可访问性和性能持续监控。
- ThemeFoundry 主题预览页。

## 19. 决策记录

| 日期 | 决策 | 状态 |
|---|---|---|
| 2026-07-10 | `file` 是源码/资源分支，`main` 是部署产物分支 | 已确认 |
| 2026-07-10 | V2 使用 Astro，并按大版本升级管理 | 已确认 |
| 2026-07-10 | ThemeFoundry 是网站主题颜色来源且允许持续修改 | 已确认 |
| 2026-07-10 | Markdown 字体、字号、行高统一配置，不随颜色主题变化 | 已确认 |
| 2026-07-10 | Giscus 不需要迁移历史评论 | 已确认 |
| 2026-07-10 | 采用分阶段实施并允许后续持续补充需求 | 已确认 |
| 2026-07-10 | V2.0 只做 Astro 迁移与能力对齐，可以不带来新功能 | 已确认 |
| 2026-07-10 | TOC 保留能力但不迁移旧实现，在 V2.0 中重写 | 已确认 |
| 2026-07-10 | 扩展顺序为 Archive 搜索 → 自定义 Markdown → ThemeFoundry | 已确认 |
| 2026-07-10 | ThemeFoundry 完整接入不阻塞 V2.0 | 已确认 |

## 20. 下一步

本文档确认后，下一步进入 V2.0 / Phase 0：

1. 从 `file` 创建 `codex/astro-v2-migration` 功能分支。
2. 导出现有路由、页面截图和核心能力矩阵。
3. 确认 `site/` 目录后创建不依赖 ThemeFoundry 的 Astro 工程骨架。

Archive 搜索、Markdown 字体与 ThemeFoundry 接入分别在 V2.1、V2.2、V2.3 开始前设计，不再作为启动 Astro 迁移的前置条件。
