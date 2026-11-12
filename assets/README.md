# 制作原稿

这里保存生成网站资源所需的原始文件，不会随站点发布。

- `fonts/`：页脚字体的 TTF 原文件，由 `npm run fonts:update` 生成
  `public/fonts/` 下的 WOFF2。来源与许可见[字体说明](../public/fonts/SOURCES.md)。
- `images/`：需要留存的图片原稿，导出方式见[图片说明](images/README.md)。

供页面直接使用的成品放在 `public/`；文章交互组件使用的数据放在对应的
`src/features/article-demos/` 子目录。
