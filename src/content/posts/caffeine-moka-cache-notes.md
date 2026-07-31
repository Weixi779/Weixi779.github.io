---
title: 「iOS」现代缓存体系探索
slug: caffeine-moka-cache-notes
publishedAt: "2026-07-24 14:00:00"
summary: "顺着咖啡系缓存谱系走一遭: 从惊喜到碰壁, 再到自己动手写 Swift 库时的收敛."
tags: [缓存, 架构, 技术演进]
category: "iOS"
toc: true
math: false
draft: false
---

## 从网络图片开始

近期在看网络图片相关设计, 发现 iOS 端、甚至整个 Swift 生态, 在「存储 / 缓存」这边的支撑都偏少. TTL、TTI 这类策略, 往往还得去 Kingfisher 里找影子——而它本身只是跟存储沾一点边. 连一个公认标杆级的通用缓存库都没有. 我很疑惑, 于是顺着这条线找下去. 第一个登场的, 是 Rust 的 Moka.

## 撞上咖啡谱系

顺着 Moka 看下去: Rust、高性能、并发设计、链式 API, 每一个 tag 都戳中我. 再顺着族谱上溯, 碰到 Java 的 Caffeine, 这才真正认识 TinyLFU. AI 也不让我一上来就啃源码, 而是先去读 TinyLFU 论文, 把思路摸清, 再看工程上怎么落地.

看完 paper 才发现, 自己之前是纯小白——或者说, 在 iOS 生态里这些名词根本没露过面, 连想都没想过, 冰山一角都算不上. 唯一跟论文沾边的记忆, 还是第一次读就误解了 ARC... 这才补上淘汰 (Eviction)、过期 (Expiration) 这些基本概念, 也看到这篇工作的位置, 以及排在前面的一长串结构与策略: 2Q、SLRU、ARC、LIRS、SIEVE、S3-FIFO、Zipf…… 名词一股脑挤进来, 第一反应是茫然, 紧接着却是兴奋——学得越多, 越能摸到自己的无知.

这篇文章不会细讲论文推导, 只想记下它们的位置, 以及对我后面选择的影响. TinyLFU 给缓存多叠了一层概念——**准入 (Admission)**. 很多缓存会被「只来一次」的流量冲坏, 于是它自己维护热度, 用 Admission 决定 Reject 还是 Accept; 真正有热度的才进主缓存, 热度还会随时间消退. 读到这里我却卡住了: 那第二次访问岂不是铁定 miss? 真正落地的往往是 **W-TinyLFU**: 先划一小块区域做首次接待, 再配上 Main 里的 SLRU, 整套才完整.

兴高采烈想拿来做磁盘缓存时, 又撞上墙: 我想把热度也持久化, 可频率结构基本是 hash / sketch, 跨进程很难继承同一份热度. 论文里的衰减, 在「进程一死热度清零」的前提下, 意义就薄了很多. 也才明白, 咖啡族谱为何多长在后端语言上——它们首先是为**内存缓存**设计的. 客户端侧, 几乎看不到同级的标杆库.

于是陷入死胡同: 难道调研路径本身就偏了?

iOS 遇事不决, 习惯是抄 Android 或前端. 只好再开一轮.

## 先把 LRU 的老账摊开

后来又读到 S3-FIFO. 现代缓存整体在往「更简单」靠, 论文也点到了我一直隐隐在意的几件事. 在展开 SIEVE / S3-FIFO 之前, 先把 LRU 的老问题摊开.

### 链表就够烦了

经典教材里的 LRU, 几乎总是双向链表. 起初会被精妙设计震住, 后来更多是讨厌——面试考太多次了. 真动手写时也不舒服: 我更偏向现代 Swift 的取舍, 会去比 struct / class、要不要 weak、要不要再套一层 box. 脑测下来, 在 Swift 里把「引用节点式 LRU」写稳妥, 成本绝不小. 于是在自己的基础库 [Bedrock](https://github.com/Weixi779/Bedrock) 上做了一轮对比.

图比表更适合看趋势. 下面两张小多图汇总同一批结果 (横轴为容量, 系列为三种实现, 各子图独立纵轴刻度). 原始数据与复现见 [Bedrock · LRUCacheBenchmark](https://github.com/Weixi779/Bedrock/tree/main/Benchmarks/LRUCacheBenchmark).

![微基准延迟对比](/images/cache-bench-micro.svg)

![Twitter Cluster 延迟与命中率](/images/cache-bench-twitter.svg)

结论大致是: 索引驱动 LRU 在延迟上把引用节点实现和 `NSCache` 甩开一截, 热路径大约 7～8 倍的差距; 两组严格 LRU 命中率重合, `NSCache` 略高一点, 但语义并不是严格 LRU. 混合查询或插入路径上, `NSCache` 尤其难看. 这类吐槽在 C++、Rust 社区并不新鲜, Swift 这边却几乎没见水花.

### 每次 hit 都要搬家

每次 cache hit, 经典 LRU 都要 promotion——把对象挪到队列头部: 改链表、动元数据, 往往还得在锁里做完. 移动端压力通常没那么极端, 但在足够敏感的高并发场景, 这已经是拖累, 会顶住吞吐和多核扩展.

### 写盘顺序也不讨好

LRU 的淘汰顺序 (Eviction Order) 与写入顺序 (Insertion Order) 往往不一致. 落在 Flash Cache 上, 容易带来随机写、写放大、寿命问题. 所以大规模 Flash 场景, 更常倾向 FIFO 或 FIFO Reinsertion 一类更贴插入序的策略.

现代化的缓存, 基本都在围着这些问题转: **怎样让策略更简单, 而不是在策略上层层加码.**

## 简单化那一波: SIEVE 与 S3-FIFO

新时代里被反复提到的两个, 大体都冲着上面几件事来.

### SIEVE: 命中别再折腾链表

SIEVE 首先咬住的是**命中路径上的并发成本**. 相对 LRU, 大致两刀:

1. **命中不再 promotion.** 每个对象只记一位 `visited`. 命中时不搬链表, 只改本地 bool (很多实现里甚至是原子写). 热 key 反复命中, 也不会反复抢同一把改结构的锁.
2. **淘汰靠一只「手」扫队列.** 常见形态是一条按插入序维护的队列, 加一个 hand 指针. 满容要腾位时, 从 hand 当前位置看: `visited == true` 就清回 `false` (再给一次机会), hand 前移; `visited == false` 就淘汰. hand 会记住停在哪, **不是每次都从头盲扫**; 扫到头再绕回尾部.

插入也很克制: **新对象进队头**, `visited` 初始为 false. 被 hand 放过的对象**仍停在原位**, 不会像某些 FIFO-Reinsertion 那样再插回队头和新人混在一起. 论文侧常用 lazy promotion / quick demotion 概括这套直觉.

所以 SIEVE 并不是「更复杂的 LRU」, 更像 **FIFO + 一位访问标记 + 可移动的淘汰指针**: 元数据轻, 命中路径短, 却能在不少 trace 上打出像样的命中率——这也是它和 S3-FIFO 一起, 被归进「简单化」那一波的原因.

### S3-FIFO: 先试用, 再进主场

S3-FIFO 更直白: **FIFO 往往够用, 关键是别让只出现一次的对象把缓存洗穿.** 名字里三段, 大致是:

- **S (Small)**: 小试用区, 新人先来; 扫一眼就走的流量多半在这里被滤掉.
- **M (Main)**: 主缓存, 留下来的才是反复出现的对象.
- **G (Ghost)**: 只记刚被踢掉的 key, 不存数据; 减少「不该踢却踢了」的误伤.

和 LRU 比, 命中时同样不必每次大搬家, 整体更贴简单队列. 和 SIEVE 并读可以很粗地记: **SIEVE 是一条队列 + 一只手; S3-FIFO 是先试用、再进主区, 再加一点幽灵记忆.** 两者都把现代缓存往「简单结构」拉, 而不是继续堆更复杂的频率画像.

光说结构还不够——命中率上简单策略到底能不能打? 我在 [Latte · policy-hit-rate](https://github.com/Weixi779/Latte/tree/main/benchmarks/policy-hit-rate) 里, 把 LRU / SIEVE / SLRU / W-TinyLFU / S3-FIFO 放在同一条 Twitter 摘录上比过 (object 与 byte 两种容量语义). 图比表更适合看「随 footprint 怎么走」; 精确小数与复现见该 README.

![策略命中率对比](/images/cache-policy-hitrate.svg)

这条 trace 上的粗感觉: **S3-FIFO 在主对比点上整体更稳; SIEVE 全面好于 LRU, 实现却更轻; W-TinyLFU 不是处处第一**, 还吃 window 等旋钮. 当然这只是开发用摘录, 不能当成论文级全量复现——排名会随 workload 变.

## 自己动手写 Latte

论文看到 SIEVE / S3-FIFO, 命中率也跑过一轮之后, 故事并没有结束. 我真正想要的, 还是 Swift 里能用的东西——于是开始写 [Latte](https://github.com/Weixi779/Latte).

写的过程比读论文拧巴得多. 越写越觉得: 若一门心思在库里把 backend、淘汰、过期、存储全做成「可插拔拼装」, 很容易为了抽象而抽象. 外面已经有一套完整实现时, 更干净的做法往往是 **整段委托出去**, 库里只留最小协议边界. 后来对照 Chromium 那边的缓存分层, 反而更对得上: 公共边界讲清「缓存作为能力长什么样」, 具体状态机、容量、过期, 交给完整实现自己拥有. Latte 后面收敛成 `Caching` / `AsyncCaching` 两套行为协议, 再配内存与文件两套完整实现, 而不是再公开一套 `Policy + Backend` 积木——就是这条路上走出来的.

中间也踩过反向的坑: 几版下来越写越不对劲, 才被迫承认 **策略不该被外人随意拆开重组**. 下面单独说.

## 别为了好看硬拆零件

读咖啡谱系和 SIEVE / S3-FIFO 时, 很容易养成一种洁癖: 淘汰 (Eviction)、过期 (Expiration)、准入 (Admission) 概念上分得清清楚楚, 于是实现上也想抽成三个可插拔模块. 分析时这样拆没问题; **一旦在对外 API 上强行拆开, 又允许任意组合, 语义很容易互相打架.**

淘汰关心「满了谁走」, 过期关心「时间到了谁失效」, 看起来正交. 但真实缓存里, 它们共享同一份 residency、同一把锁或同一个 actor、同一次 insert 是否留下的决策. 你把关系画成三份独立 protocol, 使用者却可以配出「命中续期但不 touch 淘汰序」「过期了还占着容量名额」——理论上模块化, 实际上合同碎了.

所以我现在的倾向是: **概念上可以分, 实现上往往揉在一个完整 Cache 状态机里; 对外只承诺行为, 不承诺你能随意拆零件.** Latte 故意不暴露 `CachePolicy` / `Storage` / `Backend` 一类公共拼装类型, 就是怕「人为强加的干净关系」反过来破坏可用性.

## 水位比时钟更对味

另一条线, 是过期策略在客户端场景里到底有多必要.

服务端或机械盘时代, 常见做法是内存给得比较宽, 再靠 **TTL / TTI 自己滚动** 把冷数据清掉——时间像一条自动传送带. 但在移动端图片 / 展示缓存里, 磁盘预算往往不大, CDN 又经常是长缓存甚至一年; 本地真正缺的是 **热集合**, 不是「精确模拟 HTTP 的一年过期」.

若采用类似 S3-FIFO 这种以容量和试用为主的思路, 我反而更倾向: **把水位设得相对克制** (比如产品心理上能接受 500MB, 你就认真跑满 200MB), 让缓存长期处于「有进有出、始终偏热」的状态. 命中率可以维持在不错的区间, 却不必把 time-based 滚动当主逻辑.

这不是说 TTL / TTI 没用——可变资源、合规、账号隔离, 该有还是有. 只是对我这条线来说, **默认故事更想是 capacity-driven, 而不是 time-driven cache.** 时间可以当可选旋钮, 不该再当唯一教条.

## 没有仪表盘, 调研只是情绪

还有一点, 是写到后面才越来越硬的: **要调研策略、要对比实现, 必须有观测能力.**

没有 hit / miss / eviction / rejection 这些数, 你只能「我觉得更丝滑」; 有了统计, 才能说清这一版 admission 是不是把 one-hit 滤掉了, 容量是不是虚高, 换策略到底换来了什么. Latte 里把统计做成可选能力 (默认关, 打开才记账), 也是同一判断: 观测很重要, 但不该绑死主路径, 更不该假装没有统计也能把策略研究做完.

Bedrock 上的 LRU 实现对比、Latte 上的 policy-hit-rate, 本质上都是在给自己装仪表盘. 没有它们, 这篇文章后半段的「我觉得」会轻很多.

## 收一收

回看整条路径, 其实不复杂:

1. 从图片缓存的空虚感出发, 撞上咖啡谱系, 补上 Admission 这一课, 也撞上「热度难持久化」的墙.
2. 再看 SIEVE / S3-FIFO, 发现现代缓存在往简单结构走; 用命中实验确认简单策略并非玩具.
3. 自己写 Latte 时, 从「想拼一套万能 backend」收敛到「最小协议 + 完整实现拥有自己的状态机」.
4. 过期与淘汰不必为了好看硬拆; 客户端展示缓存更值得认真对待 **偏低的容量水位**, 而不是默认堆满 TTL / TTI.
5. 全程靠观测说话, 否则调研只是情绪.

落到 Swift / iOS, 我仍然不认为需要「移植一个 Caffeine」. 更现实的是: 把读论文时分得清的概念, 收成实现里揉得住的边界; 该简单的队列就简单, 该委托的存储就委托, 该量的数就量. 日子还得往前写代码——库会继续改, 判断先写在这里.

## 参考文献

**论文**

[TinyLFU](https://arxiv.org/pdf/1512.00727)

[S3-FIFO](https://yazhuozhang.com/assets/publication/sosp23-s3fifo.pdf)

[SIEVE (NSDI 2024)](https://www.usenix.org/system/files/nsdi24-zhang-yazhuo.pdf)

**服务端 / 通用缓存**

[Caffeine](https://github.com/ben-manes/caffeine)

[Moka](https://github.com/moka-rs/moka)

[Ristretto](https://github.com/dgraph-io/ristretto)

[cache2k](https://github.com/cache2k/cache2k)

[Guava Cache](https://github.com/google/guava)

[Pandora](https://github.com/joshgallantt/Pandora)

**策略与仿真**

[libCacheSim](https://github.com/1a1a11a/libCacheSim)

[SieveCache (Swift)](https://github.com/GratefulGuru/SieveCache)

**客户端 / 图片与本地缓存**

[Kingfisher](https://github.com/onevcat/Kingfisher)

[SDWebImage](https://github.com/SDWebImage/SDWebImage)

[YYCache](https://github.com/ibireme/YYCache)

[PINCache](https://github.com/pinterest/PINCache)

[Cache (hyperoslo)](https://github.com/hyperoslo/Cache)

[Glide](https://github.com/bumptech/glide)

[OkHttp](https://github.com/square/okhttp)

[Chromium Disk Cache 设计文档](https://www.chromium.org/developers/design-documents/network-stack/disk-cache/)

**自己写的**

[Latte](https://github.com/Weixi779/Latte)

[Latte · policy-hit-rate](https://github.com/Weixi779/Latte/tree/main/benchmarks/policy-hit-rate)

[Bedrock](https://github.com/Weixi779/Bedrock)

[Bedrock · LRUCacheBenchmark](https://github.com/Weixi779/Bedrock/tree/main/Benchmarks/LRUCacheBenchmark)
