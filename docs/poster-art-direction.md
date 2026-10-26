# 文章 Poster 视觉规范

本文件记录本站已确认的创作方向，供 `$article-poster` 生成与审阅头图时读取。
它不是要求重画所有旧图的任务清单。当前用户要求优先；工程接口见
[Banner 图片配置](banner-images.md)，实际代码变化后应重新核对。

## 已确认的共同方向

- **每篇有自己的特色，统一视觉语言，不统一成一个模板。** Poster 要有文章的意象，但不必解释全部内容或塞进所有关键词。
- 初始偏好是平图、色块、有适量细节、弱光影。网站已有蒙层，图片本身不宜用强烈光影抢夺注意力。后续已接受摄影感、静物和屏摄；“所有图必须平涂”不是要求。
- 人生类文章保留写作当时的视角，不用后来的结果解释过去，也不要把不同文章都归结为孤独或悲伤。作者对意象的解释优先于模型联想。涉及个人表达时，先按项目要求读作者资料，再读文章。
- 图片要与真实 Banner 一起判断。标题和简介可以自然增长，不通过限制换行或截断文字来迁就图片。首页、文章页可以采用不同构图，但整体视觉语言应协调。
- 日间偏暖、夜间偏冷是站点主题倾向，不是要求把每张文章图分别染成暖色和冷色。文章自己的色彩与意象可以保留；同图配合两套蒙层也是已经采用的方案。
- **日夜双图逐篇决定。** 有必要时先确定一张的构图，再基于同一画面改变时间、光线或界面明暗；保持主体、机位、裁切和元素关系连续。

## 制作默认值，不是永久硬规则

- 横向构图，通常从约 16:9 开始。本轮多数成品是 1672 × 941；这个尺寸不是生成服务保证，也不是必须满足的固定值。
- 结合当前左文右图的布局，主体通常偏右，左侧相对安静；关键物体避开容易被蒙层淡去或手机裁掉的位置。没有规定“左侧必须空出某个百分比”。
- 插画可用平面色块、克制线条和纹理；屏摄可用轻微斜度、透视、边缘渐进虚焦及屏幕质感。按题材选，不叠加所有效果。
- 是否左右翻转取决于内容和实际页面。现有图有些需要，有些不需要；存在文字、方向性标志或物体时尤其不能机械翻转。
- 一张图能同时适应日夜就共用；不为形式上的统一自动生成两张。
- 默认不把文章标题、标签或标语画进图片，文字由页面负责。模拟界面和图形可以作为意象，但不承担真实技术说明的责任。

## 已确认案例与容易误读的地方

以下是各篇自己的决定，不推广为其他文章的构图要求。

| 文章／资源 | 确认的意象与呈现 | 不要误读为 |
| --- | --- | --- |
| 三年阶段总结：`developer-journey-year-3-day/night.webp` | 横向伏案书写，偏蓝冷光、平涂有细节；参考《蓦然回首》结尾工作的构图。初看不必觉得孤独，读完再看才有所体会。日夜双图。 | 泛泛的办公室、空椅子或过度悲伤；所有成长文章都用这个场景。 |
| 第四年：`developer-journey-year-4.webp` | 荒芜岩石舞台上的男性赤脚舞者，灰暗日式平图；少量土、脏脚底和手脚少量血渍。最终接受正面，主角是舞者。单图。 | 观众才是重点；执着背身、强套不自然的姿势或堆细节。 |
| 《旁观者》：`observer-bojack-v1.webp` | 参考《马男波杰克》第二季第三集结尾：年轻的 BoJack 与 Herb 站在片场浅水池里，面对蓝天白云布景，背后是真实晚霞。保留可辨认的角色与场景，重新构图为左文右图，人物偏右。明亮平图，日夜共用。 | 只剩普通蓝天白云；裁掉人物或真假天空的交界；刻意染暗来说明悲伤。此前的橘子与远去轿车方案已被此图替换。 |
| 网络层演进：`ios-network-layer-day/night.webp` | 只有 HTTP 抓包界面的屏幕内容，轻微斜拍透视，边缘明显虚焦。浅色和深色界面两张，构图一致。 | 清晰平直的截图；加桌面、键盘、房间来营造“程序员感”。 |
| 现代缓存体系：`caffeine-moka-cache.webp` | Moka、Caffeine、Latte 对应咖啡谱系：摩卡壶与拿铁静物，柔光、微虚背景、灰蓝色，主体偏右。单图。 | 必须画缓存算法、队列或代码；技术文章不能用静物。 |
| WICompress：`wicompress-2-architecture.webp` | 依赖／模块分组和连线表达解构与重组；灰蓝淡绿、轻斜拍、边缘虚焦。漂亮的概念图，不要求读懂或对应真实架构。中英文和日夜共用。 | 压缩前后对照图；把装饰连线声称为项目真实依赖关系。 |
| 网络图片调研：`ios-network-image-survey.webp` | 图片墙中混排清晰照片、模糊预览和少量空白占位，呈现正在加载。单图。 | 故障、损坏或悲伤；加入红叉、错误图标以强调不完整。 |

《删掉大量 Skill 以后》《热爱也有难以回答的问题》的原图意象已获认可。
当时选择先补齐 2026 年缺图，画风统一留待之后；这是一轮工作范围，不是以后按年份补图的规则。

## 提示词骨架

这是根据已认可做法整理的骨架，不是旧生成调用的逐字提示词。只填需要的部分，
已明确的场景不要再次“深化”成额外象征。

```text
Create a landscape editorial cover for [article / selected motif].
[Concrete subject, action, camera view and meaningful objects.]
[Medium appropriate to this article: restrained illustration / still life / photographed screen.]
Compose for the current banner: [subject placement and quieter headline area].
[Palette, diffuse light, restrained detail, or selective edge defocus as appropriate.]
Preserve [approved invariants]. Avoid [this article's rejected elements].
No article headline, category badge or watermark baked into the image.
```

双图编辑可以明确：

```text
Use the selected image as the edit target. Preserve its composition, viewpoint,
crop, objects, relative positions and focus distribution. Change only
[scene time / light / interface appearance] for [day or night].
Do not redesign or rearrange the scene.
```

## 接入和资源处理

`hero`、`heroNight`、`heroLayout` 的含义和缺图行为由 [Banner 配置文档](banner-images.md)
及当前实现决定，不能把某篇的具体 CSS 值推广到所有文章，更不要恢复按 slug 写死的特例。
没有头图时，目前使用紧凑纯文字 Banner；这是本次网站收尾已接受的实现，不需要为了填空强行造图。

部署资源放在 `public/images/`，原始大图留在部署目录之外。常见生成结果可以从
WebP quality 88 起试，这只是制作起点，不是统一画质标准。保留尺寸与构图，比较实际画面和体积；
已有 WebP 不反复有损转码。用户给的 SVG 或需要精确解释关系的正文图，不套这条位图流程。

至少看原图、桌面日夜、手机裁切和长文字下的实际效果。已授权接入就直接沿用现有配置；
只做画板时不修改网站。生成任务本身不代表提交或发布授权。

## 依据与复查入口

- 2026-10-25 与 [统一文章 poster 与 banner 规范](thread://01a17225-f447-7802-9431-40cca0811df2?hostId=local) 核对的交接，结合本网站设计会话中的要求整理。复查该会话时应通过 `read_thread` 获取内容。
- 已落地资源：`public/images/`；三年阶段总结提交 `d5270b9`，其余六篇提交 `35bfb33`。
- 该轮生成原图在作者本机的 `~/.codex/generated_images/01a17225-f447-7802-9431-40cca0811df2/`；这是历史出处，不是网站可引用的资源地址。
- 本地实拍画板在 `.ryugi/artifacts/artboard/` 下的 `verify-year3-banner`、`verify-year4-banner`、`verify-observer-banner`、`verify-network-banner`、`verify-cache-banner`、`verify-wicompress-banner`、`verify-image-wall-banner`。这些是历史验收证据，可能没有随 Git 发布。
