---
title: "「iOS」解构与重组：AI 时代下的 WICompress 2.0"
slug: wicompress-2-architecture-ai
publishedAt: "2026-08-02 12:00:00"
summary: "从 204 行的图片压缩工具到 WICompress 2.0，也重新理解人在 AI 编程中的位置。"
tags: [架构, 图像处理, AI, 技术演进]
category: "iOS"
toc: true
math: false
draft: false
lang: zh-CN
translationKey: wicompress-2-architecture-ai
---

> **补记：** 这篇文章完成后，又用 `Improve Codebase Architecture` Skill 对 WICompress 2.0 做了一次独立回看。它从 Deep Module、Deletion Test、Locality 与 Ownership 出发，基本验证了本文的研究与重构方向。它没有指导这次重构，这也不是一次事后的因果改写；恰恰是这次对照，让我确认这些判断不只属于 WICompress，也促成了自己的 [`does-it-still-make-sense`](https://github.com/Weixi779/skills/tree/main/skills/does-it-still-make-sense) Skill：不是让 Agent 永远拿着扫把寻找问题，而是在我觉得屋子也许该收拾时，主动停下来重新问一次——现在的架构，仍然说得通吗？

## 之前

WICompress[^1] 不是从一张架构图里诞生的，而是从一个很具体的问题里长出来的。

iPhone 拍摄的图片通常已经是压缩效率很高的 HEIC。如果业务上传不支持 HEIC，直接把它重新编码成 JPEG，最终文件反而可能比原图更大。明明执行了一次「压缩」，得到的却是一张更大的图片，这就是最初想解决的问题。

当时的我从自己最熟悉的 `UIImage` 出发，先使用它已有的 resize 与编码能力，只有遇到 `UIImage` 无法回答的问题时才继续下探到 `ImageIO`。这条路线谈不上漂亮，但符合一个刚开始理解图片处理的 iOS 开发者的知识生长路径：先从已经会用的东西开始，再一点点向外修路。

最早的 WICompress 也确实很小。`v0.2.2` 的生产 Swift 代码只有 4 个文件、204 行。它能处理真实业务问题，有一些测试，也足够让我愿意把它一直留在那里。

如果故事停在这里，大概也不会有这篇文章。

## 飓风袭来

后来有一次准备技术分享，我把这个已经放了很久的库重新交给 AI 审视。这件事在《旁观者》[^2]里曾经提到过：AI 不需要重走我的学习路径，它可以直接站在 `ImageIO` 上，从图片数据究竟能够做什么反向推导这个库还可以拥有什么。

输入为什么一定是 `UIImage`？它本来可以是 `Data`，也可以是文件 `URL`。

格式、方向、metadata、color space 为什么散落在不同路径里？它们本来都可以在编码数据的边界被统一检查。

缩放与质量为什么只能写死在一起？图片尺寸、输出格式、Alpha、画布与最终字节数，本来就是不同维度的问题。

甚至还有 HDR、动图、渐进式解码、增量 Session。一个以前从来没有认真看过的世界，几个小时里全部摊在了面前。

起初是惊讶，后来则越来越能感受到自己的渺小。聊得越深入，越能发现过去的知识边界有多窄。

> 「AI 描述了一个很诱人的能力。」
>
> 「这个东西很厉害，能实现吗？」
>
> 「能。」

然后，它为每一个阶段都创造了一个类型。

一个需求开始生长，`Policy`、`Resolver`、`ExecutionPlan`、`Executor` 也跟着一个接一个出现。这些名字看起来都很专业，每一个单独拿出来也都能解释，可它们并不是从稳定职责里自然长出来的。更多时候，它们只是给不熟悉底层 API 的自己一种安全感：名字已经足够像架构了，那么代码大概也能够继续写下去。

代码量也从 `v1.0.0` 的 780 行，一路增长到 `v1.4.0` 的 2,979 行。

| 版本 | 生产文件 | 物理行数 |
| --- | ---: | ---: |
| `v0.2.2` | 4 | 204 |
| `v1.0.0` | 14 | 780 |
| `v1.2.1` | 15 | 1,122 |
| `v1.4.0` | 27 | 2,979 |

本文涉及的生产代码行数，均统计对应提交 `Sources/` 下 Swift 文件的物理行数，不包含 Tests、Example、benchmark 与文档。

代码变多本身没有问题。真正的问题是，我已经无法再用一条清晰的链路解释它为什么会变成这样。

## 两条路，挤进一个答案

正式开始 2.0 时，我也没有立即找到答案。

第一步是让 AI 把现有能力全部列出来。我们得到了一张很长的表：resize、quality、target bytes、format、Alpha、crop、metadata、color space、passthrough、file URL……每一项都很准确，但这张表只能证明这些能力或历史行为确实存在，并没有告诉我们哪些仍属于 2.0，更没有告诉我们它们应该怎样组合。

我开始反过来追问：抛开已有的类型与 Policy，调用者来到这个库时，究竟想完成什么？

这时才发现，`v1.4.0` 看起来只有一套压缩流程，实际上已经存在两种完全不同的需求。

第一种是 Process。调用者知道自己想要什么：是否裁切、目标尺寸、压缩质量、输出格式、metadata 与 color space。库只需要把这些确定的要求执行下去。

第二种是 Target。调用者只知道最终文件必须小于 500 KB，至于应该降低多少质量、缩小多少尺寸、尝试多少次，都需要库在内部搜索。

当这两种意图重新画回已有代码时，第一张架构图终于出现了。

![WICompress 1.4：Process 与 Target 被挤进同一套 Policy Pipeline](/images/wicompress-v1-pipeline.svg)

图画出来后才发现，当时从未真正把它们当成两条流程。Target 会先经过 Validator 与 Resolver，再被翻译成旧的 `WICompressOptions`；无法翻译的 `fill`、`exactCanvas`、placement 等能力，又继续塞进 `WIWritePlan`。最后两条路都要穿过同一个 `WritePlanResolver` 与 `ImageEncoder`。

结果是几个文件不断吸收不属于自己的职责：

| 文件 | `v1.4.0` 行数 |
| --- | ---: |
| `WICompressionSolver.swift` | 537 |
| `WIImageEncoder.swift` | 451 |
| `WIWritePlanResolver.swift` | 385 |

三个文件占了整个生产库的 46.1%。`Solver` 同时搜索质量、尺寸与 PNG 候选；`Encoder` 不只编码，还负责 decode、thumbnail、resize、crop、canvas、Alpha、方向、metadata 与 color space；`WritePlanResolver` 则要解释所有 Policy，决定返回原图、source copy 还是重新渲染。

更难受的是那些从 UI 世界借来的词。`fit`、`fill`、`fitInside`、`alignment`，单独看都不是错误的概念，但 WICompress 不是图片展示库。我作为作者第二次回头时，已经很难在不读代码的情况下解释它们各自意味着什么，更别说第一次接触这个库的开发者。

不是添加新需求有错，而是整个系统已经失去了能够继续扩张的语言。

这张图依然没有告诉我 2.0 应该长成什么样，但它结束了第一次重新开始：在经过思考、能力表格与一轮又一轮没有头绪的分类之后，我们终于能够准确指出问题——两条不同的路，被挤进了同一个答案。

知道问题并不等于已经找到解法。第一轮修改依然只是把代码移动到更多 Target 与文件夹里：ImageIO 被抽了出来，Raster 被抽了出来，Process 也有了自己的类型，可旧的 Resolver、Plan、Solver 与 Encoder 一个都没有真正消失。

## 只是移动了位置

![WICompress 2.0 施工期：新模块出现了，旧执行所有者仍然存在](/images/wicompress-transition-pipeline.svg)

这张图取自请求级 `ImagePipeline` 刚刚出现的中间阶段。当时已经有新的 `WIImageIO` 与 `WIImageRaster`，也已经开始谈 Domain 与 Pipeline，但执行流程仍然需要 `ProcessResolver`、`TargetResolver`、`OutputResolver`、`ExecutionPlan` 与 `CompressionSolver` 接力。

新 Pipeline 没有替代旧所有者，只是加入了它们。

这个节点有 41 个生产文件、4,056 行代码。`WIImageIO.Source` 有 589 行，`ImagePipeline` 有 430 行，`CompressionSolver` 有 431 行。整个施工期的生产代码一度达到 4,856 行，文件数最高达到 49 个。

一些逻辑文件也曾在不同阶段长到接近或者超过 500 行。下面是它们各自的历史峰值，并非来自同一个提交：

| 文件 | 历史峰值 |
| --- | ---: |
| `WIImageIO.swift` | 798 |
| `WICompressionSolver.swift` | 673 |
| `ImagePipeline+Target.swift` | 615 |
| `Source.swift` | 589 |
| `ImagePipeline.swift` | 495 |
| `WIImageEncoder.swift` | 487 |

但文件长度还不是最重要的问题。一个 800 行的文件可以只是尚未完成整理，一个 100 行的类型也可能完全没有存在的必要。真正让我不舒服的是，这张图里到处都是「解释者」：一个对象先解释请求，得到一个 Plan；另一个对象再解释 Plan，决定由谁执行；最后又需要一个 Executor 把前面的解释重新接起来。

我们把文件分开了，却没有减少任何人的认知负担。

## 推翻过去

真正的转折不是再设计一版更完整的架构，而是开始反过来追问每一个名字。

`Inspector` 为什么存在？如果 inspect 只是一个动作，那么它应该直接返回 `Descriptor`。

`Source` 为什么要被每个子函数认识？如果 decode 只需要编码数据，render 只需要 `CGImage` 与几何事实，那么它们就不应该被一个业务 Container 污染。

`Resolver`、`ExecutionPlan`、`Executor` 又分别减少了什么压力？如果它们只是把一个 switch 从这里搬到那里，那么类型数量增加了，但事情没有变少。

对我而言：程序员最重要的勇气，就是推翻过去。

于是我们不再想怎样保住已有类型，而是重新确认这个库真正面对的需求。

### Process 与 Target

Process 与 Target 最终被明确拆成两条入口。

Process 接受确定意图。`WIImageResizing` 只需要完成 `PixelSize → PixelSize`，调用者可以使用 Luban，也可以实现自己的尺寸算法；crop、output、metadata 与 color space 都是明确输入，Pipeline 不再猜测 UI 语义。

Target 接受硬性字节上限。它对应的是真实生产场景：分享 SDK、附件上传、接口字段只允许固定大小。调用者给出 `maxBytes`，库在内部搜索质量与尺寸；成功结果必须满足这个上限，无法满足时则明确失败。

```swift
let processed = try await WICompressor.process(imageData)

let target = try WICompressionTarget(maxBytes: 500_000)
let constrained = try await WICompressor.compress(imageData, to: target)
```

两条流程共用 `WIImageOutput` 与最终执行能力，但不再假装拥有同一套 Policy。

### ImageIO 与 Rendering

当压缩业务被分开后，底层边界也开始变得清晰。

ImageIO 负责 encoded data 的 inspection、decode、thumbnail、transcode 与 encode。`WIImageRendering` 基于 Core Graphics 完成 crop、resize、canvas、背景、Alpha 与 color space conversion。`CGImage` 是两个模块之间的交换值，而不是新的业务中心。

`WIImageIO` 当然不是一个大而全的 ImageIO framework。它没有准备接住动图、渐进式解码和 HDR 的全部世界，那也从来不是 WICompress 的核心目标。但在静态图片这条链路上，它已经把 `CGImageSource`、`CGImageDestination`、属性字典与 finalize 收进了一套足够自然的 API。

```swift
let encoded = try ImageReader(imageData)
    .thumbnail(options: .init(maximumPixelSize: 1_200))
    .encode(
        as: .jpeg,
        options: .init(compressionQuality: 0.75)
    )
```

至少在静态图片这条边界上，这套 API 已经达到了我希望的可读性：状态转换明确，ImageIO 细节也没有重新散回高层业务。有些大型图片库拥有更完整的动画、缓存与渐进式能力，但对 ImageIO 的使用依然散落在 processor、serializer 或 helper 里；WIImageIO 做得更少，也因此有机会把这条静态图片链路说得更清楚。

曾经一直想要的 Chain API，也只在这里保留了下来。不是因为链式调用看起来优雅，而是 `ImageReader → ImageFrame → encoded Data` 确实对应真实的状态变化。高层压缩 API 依然保持普通 terminal，因为把所有参数排成一条链，并不会降低开发者理解 Domain 的成本。

Rendering 则暂时保持 package-only。它已经能够稳定完成单张图片渲染，但还没有形成值得独立公开的 API。能够封装，不代表必须公开；这也是 2.0 开始学会克制的地方。

删除旧 Policy Pipeline 的那个提交，是整个施工期的阶段性低点：生产源码从峰值 4,856 行回落到 3,880 行，净减少 976 行。它们不是因为把大文件机械拆小而消失的，而是因为旧路径与重复执行所有者真正被删除了。

但 `3,880` 并不是 2.0 的终点。随后建立共享 Domain、发布 `WIImageIO` 的 Reader / Frame API、补齐选择性 metadata、重建 Rendering、分离 TargetSearch，并加入 Luban 2 与异步入口，生产代码又随着真实能力增长起来。

## 只留一个编排者

![WICompress 2.0：能力仍然完整，但执行流程只剩一个编排者](/images/wicompress-v2-pipeline.svg)

最终的结构反而很朴素。

`WIImageProcess` 与 `WICompressionTarget` 描述两种公开意图。请求进入 `ImagePipeline` 后，原始输入、Descriptor、working image 与候选搜索都只存在于这一次请求里。Pipeline 是唯一理解完整流程的人。

ImageIO 只提供 inspection、decode、transcode 与 encode；Rendering 只执行像素绘制；`TargetSearch` 只维护 Target 的反馈搜索状态。它们接受自己真正需要的输入，返回一个确定结果，不认识外层 Container，也不试图理解完整压缩业务。

`v2.0.0` 最终有 40 个生产 Swift 文件、4,713 行代码。它比阶段性低点多了 833 行，也比 `v1.4.0` 更大；最大文件 `ImagePipeline.swift` 仍然有 474 行，但已经没有超过 500 行的文件。

代码量没有回到 204 行，也不应该回去。一个真实存在的能力，本来就需要真实存在的代码。Target benchmark、Example、中英文 DocC、迁移指南与架构文档则位于这份生产代码统计之外，它们让这个小库逐渐拥有了完整的工程边界。

变化不在于代码变少，而在于现在打开任何一个模块，都能够知道它为什么存在。

## AI 时代的作者

这次重构当然离不开 AI。

它帮我重新学习 ImageIO 与 Core Graphics，阅读 Nuke[^3]、Kingfisher[^4]、SDWebImage[^5]、Signal[^6] 等项目，比较 Android 与 Web 的尺寸 API，检查 Swift 6.2 并发语义，编写测试、benchmark、文档与迁移指南。大量实现由它快速完成，Review 也不再只发生一次：一个 Agent 写代码，另一个 Agent 从错误语义、内存生命周期、平台构建与公开 API 上继续挑战它。

这套工作流把一个人的产能推到了过去很难想象的位置。

但 AI 同样擅长另一件事：为每一种可能性补出一个完整方案。只要继续追问，总能再得到一个 Service、Protocol、Registry 或可扩展插槽。每一个方案都说得通，甚至大部分真的能够工作。

问题在于，Proposal 不是 Requirement。能够实现，也不代表有资格进入作品。

如果没有人不断追问「它服务谁」「它拥有什么状态」「它减少了哪条旧路径」「我们现在真的需要吗」，AI 会很自然地把可能性铺满。架构会越来越完整，作品却可能越来越不像自己的东西。

所以这次经历不能简单总结成「AI 负责增加，人类负责删除」。AI 也提出过许多最终留下的好设计，人也会作出错误判断。真正的区别在于，最终必须有人认领边界：为什么 Process 与 Target 分开，为什么 Pipeline 不公开，为什么 Rendering 暂不发布，为什么不做动图，为什么 2.0 选择 Swift 6.2，又为什么有些历史能力宁愿不再兼容。

这些决定没有哪一个是靠多写一个类型自动得到的。

大重构也并不是某一天灵光乍现后的全部重写。ImageIO、Rendering、Domain、Pipeline、Target Search，都是在一轮又一轮很小的修改里逐渐找到位置。每次只删除一段重复所有权，跑完测试，提交，再重新看整张图。下午的自己继续 challenge 上午的自己，直到图里再没有一个连作者都解释不清的名字。

AI 加快了实现，但作者仍然要为最后留下的形状负责。

## 2.0

2026 年 8 月 2 日，WICompress 2.0 正式发布[^7]。

它现在是一个 UIKit / AppKit-free 的 Swift 6.2 图片处理与压缩库，支持 Apple 各个平台；对外提供明确的 Process 与 Target 两条流程，也把 `WIImageIO` 作为独立 product 交给真正需要底层图片能力的人。Example、benchmark、中英文 DocC、迁移指南与架构文档也终于成为发布的一部分。

它当然不是图片世界的完整答案。动图、渐进式解码、完整 HDR 处理还在边界之外，Target 算法也仍然有继续 benchmark 与优化的空间。但这些内容不需要为了证明 2.0 完整而提前进入代码。有一天真实需求到来，再重新理解、重新选择即可。

写《旁观者》[^2]时，我困惑的是，当探索与实现被 AI 大幅压缩之后，作者还剩下什么。WICompress 2.0 没有让时间重新变慢，但它让我确认了一件更实际的事：AI 可以快速给出很多答案，最终留下哪一个，仍然需要作者判断。

这一次，我没有只做一个旁观者。

[^1]: [WICompress](https://github.com/Weixi779/WICompress)

[^2]: [《旁观者》](https://weixi779.github.io/posts/observer/)

[^3]: [Nuke](https://github.com/kean/Nuke)

[^4]: [Kingfisher](https://github.com/onevcat/Kingfisher)

[^5]: [SDWebImage](https://github.com/SDWebImage/SDWebImage)

[^6]: [Signal-iOS](https://github.com/signalapp/Signal-iOS)

[^7]: [WICompress 2.0 Release](https://github.com/Weixi779/WICompress/releases/tag/v2.0.0)
