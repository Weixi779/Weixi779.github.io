# Astro V2 文章 Slug 对照表

> 文档状态：Implemented
> 目标路由：`/posts/{slug}/`
> 旧路由处理：保留静态跳转页，不直接删除
> 最后更新：2026-07-10

## 1. 命名规则

- 公开路由与 Markdown 文件名、中文标题和发布日期解耦。
- Slug 只使用小写英文、数字和连字符，必须匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。
- 优先使用文章中真正的技术关键词或作品名，不自动转拼音。
- 同一系列使用统一前缀，如 `unity-sandbox-building-*` 和 `developer-journey-year-*`。
- Slug 一旦发布就视为永久标识；后续修改标题或文件名不应修改 Slug。
- 新文章必须显式填写 `slug`，缺失、重复或格式错误时构建失败。

Frontmatter 示例：

```yaml
title: 「iOS」谈谈iOS图片压缩
slug: ios-image-compression
```

## 2. iOS 与技术文章

| 日期 | 文章 | 建议 Slug |
|---|---|---|
| 2023-06-18 | 「iOS」关于 CTMediator 杂谈 | `ios-ctmediator-notes` |
| 2024-01-24 | 「iOS」浅谈 Swift 模型解析 | `swift-model-decoding` |
| 2024-03-04 | 「iOS」震动与系统声音 | `ios-haptics-system-sounds` |
| 2024-03-07 | 「iOS」浅谈图片压缩 | `image-compression-fundamentals` |
| 2024-07-29 | 「iOS」自定义 TabView | `swiftui-custom-tabview` |
| 2024-08-13 | 「iOS」聊聊 Swift `class` 与 `struct` | `swift-class-vs-struct` |
| 2024-08-18 | 「iOS」SwiftUI 自定义 TextField | `swiftui-custom-textfield` |
| 2025-03-04 | 「iOS」谈谈 iOS 图片压缩 | `ios-image-compression` |
| 2025-09-06 | 「iOS」聊聊 Markdown 中的 LaTeX | `markdown-latex-rendering-ios` |
| 2026-01-05 | 「iOS」网络层工程范式迁移 | `ios-network-layer-evolution` |
| 2026-01-09 | 「iOS」日志系统设计 | `ios-logging-system-design` |

## 3. Unity 沙盒建造系列

| 日期 | 文章 | 建议 Slug |
|---|---|---|
| 2024-04-14 | 「Unity」沙盒建造游戏设计 (1) - 相机控制 | `unity-sandbox-building-camera-control` |
| 2024-04-22 | 「Unity」沙盒建造游戏设计 (2) - 命令模式 | `unity-sandbox-building-command-pattern` |
| 2024-04-27 | 「Unity」沙盒建造游戏设计 (3) - 状态模式 | `unity-sandbox-building-state-pattern` |
| 2024-05-04 | 「Unity」沙盒建造游戏设计 (4) - 搜索算法 | `unity-sandbox-building-search-algorithms` |

## 4. 后日谈与极客随笔

| 日期 | 文章 | 建议 Slug |
|---|---|---|
| 2024-04-06 | 「极客」Quest 3 与旁路由 | `quest-3-bypass-router` |
| 2024-04-21 | 「后日谈」尼尔：机械纪元 | `nier-automata` |
| 2024-07-15 | 「后日谈」三年阶段总结 | `developer-journey-year-3` |
| 2025-01-12 | 「后日谈」赛博朋克 2077 | `cyberpunk-2077` |
| 2025-08-04 | 「后日谈」日本出差随笔 | `japan-business-trip-notes` |
| 2026-03-29 | 「后日谈」在 AI 浪潮与现实引力之间：第四年的后日谈 | `developer-journey-year-4` |
| 2026-07-04 | 随笔（马男、博德之门与近期生活） | `bojack-baldurs-gate-notes` |

## 5. 新路由示例

```text
/posts/ios-image-compression/
/posts/swiftui-custom-tabview/
/posts/unity-sandbox-building-command-pattern/
/posts/developer-journey-year-4/
```

## 6. 旧路由兼容方案

迁移时每篇文章同时生成：

1. `/posts/{slug}/` 作为唯一正式文章页和 canonical URL。
2. 现有 `/:year/:month/:day/:legacy-slug/` 作为静态跳转页。
3. 旧页面使用 canonical、`meta refresh` 和可点击备用链接指向新路由。
4. 首页、Archive、上一篇/下一篇和 Sitemap 只输出新路由。
5. 构建检查需要同时验证 Slug 唯一性、新文章页和所有旧路由跳转页。

GitHub Pages 是纯静态托管，无法配置服务端 `301`，因此使用每篇旧路由对应一个静态跳转页的方式。

## 7. 实施结果

- 已采用 `/posts/{slug}/` 作为唯一正式文章路由。
- 22 篇 Markdown 已全部写入显式 Slug。
- 旧中文路由已改为指向新路由的静态跳转页。
- 构建验证会检查 Slug 格式与唯一性、22 个正式文章页、22 个旧路由跳转页和全站内部链接。
