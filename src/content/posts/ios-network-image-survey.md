---
title: 「iOS」一次略有遗憾的网络图片调研
slug: ios-network-image-survey
publishedAt: "2026-08-10 15:03:40"
summary: "本想在三家里选出下一个网络图片库，后来从缓存、合并走到展示，每一层都只得到一半答案。"
tags: [架构, 图片, 缓存, 技术演进]
category: "iOS"
toc: true
math: false
draft: false
---

## 背景

作为被梦想喂大的一代, 入行时总容易憧憬那些名字很响的库. RxSwift, Moya, TCA, Nuke, 都曾长期停在浏览器标签栏的前列; 以前点开那些仓库, 多半是上下滑两下, 就觉得自己又强了一点. Nuke 在我这边挂得尤其久, 像一桩一直想做却总轮不到的事: 现在自己也给社区递过补丁, 也在仓库里磨过自己的东西, 再翻别人的库时目光就不太一样了. 这次正好撞上项目里网络图片这摊不得不收拾的旧账, 便想借机把 SDWebImage, Kingfisher, Nuke 的设计重新走一遍.

真正往下走以后, 这次调研却很快离开了「下一个库该选谁」这个问题. 从缓存开始, 到请求与处理的合并, 再到最后的展示层, 每往下一层, 都会撞见另一个看似早已解决、实际仍有分歧的问题. 有些第一眼喜欢的设计, 读完源码以后反而不再喜欢; 有些原本没有抱太高期待的实现, 跑完数据却必须重新评价.

先从存储开始. 这是最早追下去的一条线, 也是最独立的一条线.

## 存储

### 初见

Nuke 把三种缓存机制摆在了眼前: 

* `ImageCache`: 一级缓存，留解码后的图片，大部分是内存。
* `DataCache`: 二级缓存，存储图片请求的二进制数据，大部分是磁盘。
* `URLCache`: 同样是二级缓存，走系统的 HTTP 缓存，更简单，内存磁盘均可设置，但是有解码成本。

但它并没有把三层一起打开：默认的 [`withURLCache`](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Pipeline/ImagePipeline%2BConfiguration.swift#L183-L230) 使用 HTTP Disk Cache，换成 `withDataCache` 时，反而会主动关掉 `URLCache`。可惜项目里的 CDN 过期时间是 1 年，打开基本就又是磁盘缓存，所以没的选，还是得走传统的内存+硬盘。

真正让我停下来的是: Nuke 的内存 `ImageCache` 有一份全局 TTL, 磁盘 `DataCache` 主要靠容量与 LRU, 却都没有一对清楚的 TTL 与 TTI.

TTL 已经有了, TTI 难道不该也是一个很简单的需求吗?

带着这个问题继续往下翻，翻阅了三家的源码，事实大致可以收在一张表里：

| 维度 | SDWebImage 5.21.7[^1] | Kingfisher 8.11.0[^2] | Nuke 13.0.6[^3] |
| --- | --- | --- | --- |
| Memory | `SDMemoryCache`, `NSCache`; 存 Image; cost / count; 无时间过期 | `MemoryStorage.Backend`, `NSCache`; 存 Image; cost / count; per-entry expiration | `ImageCache`, 自有实现; 存 `ImageContainer`; cost / count; 全局 TTL |
| Disk | `SDDiskCache`, File; 存 Data; age / size sweep | `DiskStorage.Backend`, File; 存 Data; expiration / size cleanup | `DataCache`, File; 存 Data; Access-date LRU sweep; 异步写入 |
| 默认 Disk 文件名散列 | MD5, `CC_MD5`; 保留原扩展名 | SHA-256; `CryptoKit`, 旧系统回退 `CC_SHA256` | SHA-1, `CryptoKit.Insecure.SHA1`; 可替换 `FilenameGenerator` |
| TTL / TTI | Memory: 无; Disk: 一份 `maxDiskAge` + 一种日期依据; TTL-like / TTI-like 二选一 | Memory / Disk: per-entry `StorageExpiration` + `ExpirationExtending`; 仍是一份过期时间, 不是双时钟 | Memory: 全局 TTL, 访问不续期; Disk: 无时间过期 |
| 容量超限 | Memory: `NSCache` limits; Disk: cleanup 后降到 50% | Memory: `NSCache` limits; Disk: cleanup 后降到 50% | Memory: 同步 trim 到 limit; Disk: sweep 后降到 70% |
| 写入准入 | 无显式准入; Disk 可先写到超限 | 无容量准入; Disk 只回传成功 / 失败 | Memory 单项 cost 默认达到总 limit 的 10% 即静默拒绝; Disk 入队即返回 |
| 单次 Load | 可换 Cache、指定 query / store 层级; 不改过期 | 可换 Cache、指定层级; 可改 Memory / Disk 的过期与续期 | 可关 Memory / Disk 读写、绕过或只读 Cache; 不改过期 |
| 替换入口 | 完整 `SDImageCache` 协议; Memory / Disk 也可换 Class | 只接受具体的 `ImageCache`; 类可继承, 两个 Backend 为 final | `ImageCaching` / `DataCaching` 协议注入 |
| 直接可见 | 来源; Disk count / size | 来源、写入结果; Memory cost、Disk size; clean 通知 | 来源; Memory count / cost; Disk count / size |
| 统一统计: hit / miss、耗时、rejection、eviction reason、residency | 无 | 无 | 无 |


### 三家的答案

SDWebImage 不是没有 TTL 或 TTI, 而是只有一份 `maxDiskAge` 与一种日期依据. 两者只能二选一, 过期依赖 sweep, 容量超限后则直接清到一半. 对我来说, 这和完整的 TTL / TTI 语义仍然不是一回事.

Kingfisher 是三家中过期语义最完整的一个. `StorageExpiration` 描述何时过期, `ExpirationExtending` 描述访问以后是否续期. 但一次 Load 仍然可以覆盖 entry 的过期时间与续期方式. Cache 已经有了默认策略, Request 为什么还需要重新决定一遍?

> 我请求一次网络图片, 跟缓存有什么关系? 我只期望拿到一张图片.

一个 entry 能活多久, 命中后是否续期, 应该由装配好的 Cache 回答. Request 再来决定一遍, 说得好听是灵活, 说难听一点, 就是责任外泄. 更何况, Kingfisher 的 Manager 接受的还是一个具体 `ImageCache`. 

Nuke 的答案正好相反. 它的内存 Cache 会在写入时限制单个 entry, 超限后收回到准确水位, 查询时也立即判断过期; `ImageCaching` 与 `DataCaching` 两个协议又可以直接塞回 `ImagePipeline.Configuration`. 这至少证明了严格控制容量与查询时判断过期并不是什么过度设计. 可它的磁盘 Cache 没有 TTL / TTI, 协议也薄到无法回答一次写入最后是 accepted、rejected 还是 failed, 更量不到真实的写盘耗时.

三家都想对了一部分, 却没有一家完整覆盖我对缓存的期待. 如果真要研究一套缓存, 至少得知道有没有命中、读写花了多久、谁被拒绝、为什么被淘汰, 以及数据究竟住了多久. 至于一次 miss 之后的 network、decode 与 process 成本, 应该由 Pipeline 记录, 再由装配层把两段连起来, 而不是反过来让 Cache 认识 Network 和 Decoder.

走到这里, 我已经不太想再给 `ImageRequest` 增加 cache option. 无缓存、普通缓存、不按时间自动过期的磁盘缓存, 本来就是几套不同的执行环境. 更自然的做法, 是由装配层准备多条 `ImagePipeline`, 再分别处理 Request:

> Request 决定想拿到什么, ImagePipeline 决定用怎样的一套系统得到它.

### 离开网络图片

到这里, 我暂时离开了网络图片. LRU 已经存在了几十年, 今天的缓存研究不可能只剩半水位与几个过期参数. 顺着这个疑问, 我找到了 Moka、Caffeine, 后来又写下 [Latte](https://github.com/Weixi779/Latte), 用 benchmark 验证自己的猜想. 完整过程已经留在[《现代缓存体系探索》](/posts/caffeine-moka-cache-notes/)里; 等我再次回到网络图片时, 手里已经有了一套更明确的判断标准, 问题也来到了 Cache 之后: 如果二十个调用者同时要同一张图, 到底应该发生几次网络请求、几次 decode、几次 process?

## 合并发生在哪里

最开始, 我以为这只是一个请求合并问题.

二十个 `UIImageView` 同时请求同一个 URL, SDWebImage、Kingfisher、Nuke 都只发出一次请求, 最后也都只留下一个 `CGImage`. 到这里三家没有区别, 甚至让我怀疑自己是不是想多了: 一个存在了这么久的问题, 大家当然早就解决了.

但网络请求结束以后呢?

真实的网络图片很少止步于拿到 Data. 后面还有 decode、resize、圆角或更多处理. 如果二十个调用者需要完全相同的结果, 这些工作也应该跟着网络请求一起合并吗?

我写了一个独立的 [NetworkImageBenchmark](https://github.com/Weixi779/NetworkImageBenchmark)[^4], 用本地 HTTP Server 记录真实请求次数, 再给三家原本的 Processor 套上一层 probe. 于是一次 load 被拆成了几层可以分别观察的事实: Server 看见了几次请求, resize 与 suffix 各执行几次, 最终又留下几个不同的 `CGImage`.

| 场景 | SDWebImage | Kingfisher | Nuke |
| --- | --- | --- | --- |
| 同 URL, 无额外处理 | 1 HTTP, 1 Image | 1 HTTP, 1 Image | 1 HTTP, 1 Image |
| 同一条 resize + round 链 | 1 HTTP, 20/20 次处理, 20 Images | 1 HTTP, 1/1 次处理, 1 Image | 1 HTTP, 1/1 次处理, 1 Image |
| 一半 resize, 一半 resize + round | 1 HTTP, 20/10 次处理, 20 Images | 1 HTTP, 2/1 次处理, 2 Images | 1 HTTP, 1/1 次处理, 2 Images |
| 边界实验: 第一批进入 round 后, 第二批再加入 | 2 HTTP, 20/20 次处理, 20 Images | 2 HTTP, 2/2 次处理, 2 Images | 1 HTTP, 1/1 次处理, 1 Image |

### 请求合并之后

第一轮带处理链的结果有些出乎意料. SDWebImage 合并了下载, 却没有继续合并下载之后的处理. 同一份 Data 回来以后, 二十个调用者各自走了一次 resize 与 round, 最后得到二十个 `CGImage`.

我原本以为 Kingfisher 在这里的表现也不会太好, 结果它和 Nuke 都只执行了一次完整处理链. 二十个调用者不只是共享一次下载, 还共享同一个处理结果.

所以问题不再是「有没有请求合并」, 而是一次共享工作的边界到底画在哪里. SDWebImage 画在 Downloader; Kingfisher 与 Nuke 则至少把相同的处理链也收了进去.

### 相同, 还不够

于是我又把条件改了一点: 同一个 URL, 前十个调用者只需要 resize, 后十个还要再加 round.

这一次 Kingfisher 执行了两次 resize、一次 round. 两条完整处理链各自能够合并, 但它们共同的 resize 前缀不会再共享. Nuke 只执行一次 resize 与一次 round: resize 的结果先被两条路径共同使用, round 只为真正需要它的那一半继续工作.

换句话说, Kingfisher 识别的是「两条处理链是否相同」; Nuke 还能继续识别「两条不同的处理链共享了哪些工作」.

这个区别已经不太像一个简单的 downloader optimization 了. Nuke 合并的是 Pipeline 里可以被复用的 Work, Request 只是这些 Work 的消费者.

### 一个边界实验

最后我又构造了一个更极端的场景: 第一批已经完成下载与 resize, 正停在被 benchmark 阻塞的 round 里, 此时第二批才请求完全相同的处理结果.

SDWebImage 与 Kingfisher 都重新发起了一次 HTTP 请求; Nuke 仍然只有一次请求、一次 resize 与一次 round. 它没有保留已经结束的 resize Task, 只是完整的 `resize → round` Task 尚未完成, 第二批可以直接成为它的新订阅者. 等 round 结束, 这份 Task 也会立即回收.

这未必能为日常业务省下多少工作, 人为阻塞以后也没有比较耗时的意义. 它更像一束用来照边界的光: Nuke 合并的是一项仍在进行的完整图片任务, 完成后便立即回收; SDWebImage 与 Kingfisher 的共享窗口则更早结束.

回头看, Nuke 的实现无疑更完整. 但完整是不是就等于必要, 仍然是另一个问题. 业务里究竟有多少不同处理链会共享前缀? 如果答案接近于零, 这套设计可能只是没有被用上的正确; 如果图片处理足够重、消费端足够多, 它省下的又不只是一个漂亮的抽象.

至少这次数据让我改掉了两个先入为主的判断: SDWebImage 不是不会合并请求, Kingfisher 的处理合并也比我想象中好得多. 而 Nuke 真正拉开差距的地方, 不是把同一个 URL 合成一次, 而是把一次图片加载拆成了可以分别复用、也可以继续组合的工作.

## 展示

### 为什么还要写一次 if/else

展示层的调研不是从源码开始的, 而是从 API 开始的.

站在使用者的角度, 我只是想用一个 URL 拿到一张图片. 但在 Nuke 与 Kingfisher 里加入动图以后, 事情都会多出一个分支: 静态图交给默认的 Image, 动图再换一套 View 或 Renderer. 不是不能做, 甚至文档已经把步骤写得很清楚; 只是格式判断最后还是落到了使用者手里.

这让我有些不解. GIF、APNG 或 Animated WebP 并不是一次图片加载的异常情况, 为什么调用者要先知道 URL 后面到底藏着什么?

再去看 Web 与 Android, 答案反而朴素得多. Web 仍然是同一个 `<img>`; Android 的 `Drawable` 既可以是一张静态图, 也可以是会播放的 `AnimatedImageDrawable`.[^5] 它们的具体实现并不适合直接搬到 iOS, 却提醒了我一件事:

> 动图应该是图片的一种, 而不是图片加载完成以后再补的一条特殊通道.

### 没想到是 SDWebImage

顺着这个标准回头看, 最让我意外的反而是 SDWebImage.

前面的缓存与处理合并里, 我对它一直没有太高评价; 但到了展示层, `SDAnimatedImageView` 却是一个可以直接替换 `UIImageView` 的 View. 传入普通 `UIImage`, 它就按静态图展示; 传入符合 `SDAnimatedImage` 的结果, 它便建立播放器. 网络加载仍然使用同一组 `sd_setImage` API, 调用者不需要先把格式拆开.[^6]

它未必在每一个性能维度上都做得最好, 但至少把能力交完整了. 也是在这里, 我第一次觉得自己一直不太喜欢的 SDWebImage, 确实把一个问题想在了前面.

Kingfisher 为动图准备了 `AnimatedImageView` 与 `KFAnimatedImage`, 能力同样完整, 只是静态与动态仍然是两个公开入口. Nuke 的情况则更让人遗憾: `ImageContainer` 明明是一个很好的名字, 里面也保留了图片类型、首帧与动图原始 Data, 默认的 Presentation 却没有继续消费这些信息. 最后仍然要从 Container 里取出类型, 写下那段 `if container.type == .gif`.[^7]

Container 已经知道答案, 使用者却还要再问一次.

### 让 Container 走到最后

项目中的封装便从这里开始. 我也设计了一份 `ImageContainer`, 但不再让业务判断它装的是静态图还是动图. 对外只有一次加载; 结果进入展示层以后, Renderer 再决定直接显示 Platform Image, 还是建立一段动画播放.

UIKit 里, 动画由 `CADisplayLink` 推进; SwiftUI 里, 同一份帧时间线交给 `TimelineView`. 两边的实现方式不同, 但边界相同: Pipeline 负责得到 Container, Presentation 负责理解 Container.

这也意味着加载完成并不是展示层的终点. 动图什么时候开始、离开屏幕后要不要暂停、Cell 复用时怎样释放帧缓存, 都属于这一次展示自己的生命周期. 如果这些问题留给每一个业务 View, 那么统一的 `ImageContainer` 最后仍然只是换了名字的 `if/else`.

### 谁还有权修改这个 View

统一入口以后, 另一个问题很快出现了. 同一个 View 可能刚请求 A, 紧接着又请求 B. A 被取消, 不代表它的 completion 永远不会到达; 如果旧结果晚一步写回, View 仍然会闪回上一张图. 动图还会多一层麻烦: 旧的加载结束了, 旧播放器与排队中的帧也必须一起失去展示权.

这里最简单的办法不是继续相信 cancel, 而是给每次展示一份自增 ID 或 token. 新请求出现时替换当前 token; completion 回来以后, 只有仍然持有当前 token 的结果才能修改 View. reset 与 reuse 也会让旧 token 立即失效.

> Cancel 负责尽量停止工作, token 决定结果还有没有资格被展示.

这段逻辑并不复杂, 却把 View、Request 与播放器的关系说清楚了. Pipeline 里的物理工作可以继续被多个消费者共享; 但落到某一个 View 上, 当前只有一次展示请求拥有最终写入权. 图片是静态还是动态, 不应该改变这条规则.

## 理想之后

我原以为, 把三家的实现读完, 剩下的只是把自己认同的答案重新写一遍. 后来才发现, 知道哪里不满意, 和把每一处都做到满意, 是两件完全不同的事.

在一个足够窄、也足够熟悉的边界里, 把一个库写到自己心里的九十分, 并没有想象中困难. 但网络图片不是一个库. Cache、Network、Decode、Presentation, 每一部分都有自己的历史、边界与失败方式. 最后的八十分, 要求它们每一个都至少达到八十分.

这比写出一个九十分难得多.

Iris 便是在这段调研里慢慢出现的.[^8] 前面几章里我认为更合理的答案, 最后大多被放到了那里. 但「放进去」和「做好了」仍然不是一回事. 它现在处于 `0.1.0-beta.1`, 有些边界已经落成代码, 有些能力刚刚能用, 还有不少地方只是完成了一个让我愿意继续往下走的第一版.

| 调研留下的标准 | Iris 目前做到哪里 |
| --- | --- |
| Cache 策略属于装配完成的 Pipeline, Request 只描述想得到什么 | Store、Key 与 Cache facade 的注入边界已经落地; 默认 Memory / Disk Store 与统一观测仍未提供 |
| Network、Decode 与完整 Load 是不同的共享工作 | 四个独立 WorkPool 已经分别承接 Cache-only Load、Network-capable Load、Network 与 Decode; Processor 尚未进入首个 beta |
| 静态图与动图应该交付同一种结果 | `ImageContainer` 已经统一 poster 与 animation source; 默认 Presentation 展示即时图片, 可选 Animation Renderer 接管播放 |
| View 只接受当前展示请求的结果 | UIKit 与 SwiftUI 都已经使用 Load Token 隔离迟到结果, Renderer 与 Player 也拥有独立的 reset / active 生命周期 |

这张表与其说是功能列表, 不如说是目前完成度的边界. Cache 还没有一套可以直接使用的默认存储; Processor、Progress、Profiler 与公开事件流都还不存在; Retry、placeholder、transition 和自动 View 尺寸测量也没有进入首个 beta. 即使已经落地的动画播放, 也还需要更多真实项目去验证它的内存、可见性与复用行为.

所以 Iris 现在不是生产级答案, 这篇文章也没办法用它证明谁已经属于下一个时代. 我当然不介意有一天它真的走到那里, 但那不是一个仓库名字、几份设计文档或一篇文章可以提前宣布的事情.

目前能确定的只是: 读过这些实现, 跑过这些数据以后, 我对一套网络图片库应该怎样工作有了自己的判断; 然后试着把这些判断放进同一个地方. 它们有些已经经得起测试, 有些还在等待现实来挑战, 有些也可能只是我又一次想得太简单.

也许等 Iris 再往前走一段, 我还会回来重写这篇文章. 到那时, 今天留下的结论可能变得更完整, 也可能再次被推翻.

目前, 它还在往前跑.

## 脚注

[^1]: SDWebImage 5.21.7 源码: [`SDMemoryCache`](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDMemoryCache.h#L12-L83)、[`SDDiskCache`](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDDiskCache.m#L151-L235)、[MD5 文件名](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDDiskCache.m#L356-L377)、[`SDImageCacheConfig`](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDImageCacheConfig.h#L89-L151)、[Load Context](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDWebImageDefine.h#L256-L385) 与 [`SDImageCache`](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDImageCache.h).

[^2]: Kingfisher 8.11.0 源码: [`MemoryStorage.Backend`](https://github.com/onevcat/Kingfisher/blob/410984bf301f4fa224fe56277b3f8672cc465c79/Sources/Cache/MemoryStorage.swift#L42-L101)、[`DiskStorage.Backend`](https://github.com/onevcat/Kingfisher/blob/410984bf301f4fa224fe56277b3f8672cc465c79/Sources/Cache/DiskStorage.swift#L42-L79)、[SHA-256 文件名](https://github.com/onevcat/Kingfisher/blob/410984bf301f4fa224fe56277b3f8672cc465c79/Sources/Utility/String%2BSHA256.swift#L29-L47)、[`StorageExpiration`](https://github.com/onevcat/Kingfisher/blob/410984bf301f4fa224fe56277b3f8672cc465c79/Sources/Cache/Storage.swift#L35-L93)、[Load Options](https://github.com/onevcat/Kingfisher/blob/410984bf301f4fa224fe56277b3f8672cc465c79/Sources/General/KingfisherOptionsInfo.swift#L47-L111) 与 [`ImageCache`](https://github.com/onevcat/Kingfisher/blob/410984bf301f4fa224fe56277b3f8672cc465c79/Sources/Cache/ImageCache.swift#L145-L198).

[^3]: Nuke 13.0.6 源码: [`ImageCache`](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Caching/ImageCache.swift#L12-L70)、[`DataCache`](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Caching/DataCache.swift#L10-L51)、[SHA-1 文件名](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Internal/Extensions.swift#L7-L28)、[写入准入](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Caching/Cache.swift#L128-L143)、[`ImageRequest.Options`](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/ImageRequest.swift#L303-L340)、[`ImageCaching`](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Caching/ImageCaching.swift#L7-L16) 与 [`DataCaching`](https://github.com/kean/Nuke/blob/63a8fcbd6621340a2410bc3e9575ac97058615f4/Sources/Nuke/Caching/DataCaching.swift#L7-L26).

[^4]: 测试设备为 iPhone / iOS 26.5, 每轮 20 个调用者, 关闭 Library Memory / Disk Cache, 由本地 HTTP Server 统计请求与响应字节. Processor probe 记录的是 benchmark 包装的 resize / suffix 调用次数; `CGImage` 数量只表示最终对象身份, 两者都不能直接当作 decode 次数.

[^5]: Web 对 animated image 仍使用同一个 [`img` element](https://html.spec.whatwg.org/multipage/rendering.html#images-3); Android 的 [`ImageDecoder`](https://developer.android.com/reference/android/graphics/ImageDecoder) 会把静态图片解码为普通 `Drawable`, 把 Animated GIF / WebP 解码为 [`AnimatedImageDrawable`](https://developer.android.com/reference/android/graphics/drawable/AnimatedImageDrawable.html). 这里借用的是统一的图片入口与可承载动画的结果类型, 不是它们具体的播放实现.

[^6]: SDWebImage 5.21.7 的 [`SDAnimatedImageView`](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDAnimatedImageView.h#L17-L30) 明确被定义为 `UIImageView` 的 drop-in replacement: 普通 `UIImage` 走静态展示, `SDAnimatedImage` 走动画播放器; [`WebCache`](https://github.com/SDWebImage/SDWebImage/blob/2de3a496eaf6df9a1312862adcfd54acd73c39c0/SDWebImage/Core/SDAnimatedImageView%2BWebCache.h#L15-L67) 仍提供相同的 URL 加载入口.

[^7]: Nuke 12 将 `LazyImage` 的底层展示改为 `SwiftUI.Image`, 以对齐 `AsyncImage` 的布局与 SwiftUI 行为, 同时移除了 NukeUI 内嵌的 Gifu 播放实现; Nuke 11 以前曾直接提供这项能力. Nuke Core 并没有放弃 GIF: Decoder 仍会产生首帧并把原始 Data 留在 `ImageContainer`, 只是 [Migration Guide](https://github.com/kean/Nuke/blob/12.0.0/Documentation/Migrations/Nuke%2012%20Migration%20Guide.md#animated-images) 要求调用者根据 `container.type` 自行选择展示 View. 参见 [Nuke 12 Changelog](https://github.com/kean/Nuke/blob/12.0.0/CHANGELOG.md#nukeui-20) 与当前的 [GIF 文档](https://github.com/kean/Nuke/blob/13.0.6/Documentation/Nuke.docc/Customization/ImageFormats/supported-image-formats.md#gif).

[^8]: [Iris](https://github.com/Weixi779/Iris) 当前处于 `0.1.0-beta.1`. Core、Cache、Presentation 与 Animation 的产品边界及首个 beta 的明确非目标以仓库 README 与对应设计文档为准; 这里描述的是写作时的实现状态, 后续版本仍可能发生 source-breaking 调整.

