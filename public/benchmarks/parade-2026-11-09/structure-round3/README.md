# 结构更新拆解：同样一次 move，时间花在哪里

2026-11-09。全部实现修改位于临时副本；Parade 生产源码、默认实现、文章未修改。生产基线 `dedfb5907f54890b3e0b11da99610e933cea5508`。本轮 profile 基线是上一轮已使用 LIS 的临时版本，不是生产默认版本。

## 实验版本

| 版本 | 相对变化 |
| --- | --- |
| profile | 上一轮 LIS 临时版，补充分阶段计时。 |
| noReplay | 只移除旧执行计划的批次回放检查。用于隔离成本，不能当作安全优化建议。输入检查和 Diff 结果检查仍在。 |
| directUI | 相对 profile，仅在无动画时，结构批次完成后直接处理内容和布局，不再开内容批次。 |
| compact | 相对 profile，Section 身份与顺序不变时，直接生成整数 Item 批次并逐项回放校验；避开后台 Presenter、对象快照与对象执行计划往返。 |
| compactUI | compact 加 directUI。 |
| reuseIndex | compactUI 加最终内容安装时复用已经建立的位置索引。每个结构阶段仍更新索引；初次／恢复 reload 也重建。 |
| lean | reuseIndex 加 Section 纯重排的整数回放路径；无动画内容处理后立即 layoutIfNeeded，保证 DataSource 返回前完成同步布局。复杂 Section 增删／跨新删 Section 迁移仍用原分阶段规划器。 |

这些路径只用于内置算法。外部自定义算法仍使用原来的完整计划和校验；对外 API、Hashable 身份、Presenter 类型擦除边界不变。noReplay 只是对照，不进入最终候选。

## 一万项左旋：逐项消融

以下六行来自第一轮独立进程，各组 3 次预热、10 次正式样本的中位数。用于定位机制，不将小于进程波动的差异宣称为稳定收益。

| 版本 | 完整更新 ms | UIKit 批次数 | Item move 次数 |
| --- | --- | --- | --- |
| profile | 38.236 | 2 | 1 |
| noReplay | 34.440 | 2 | 1 |
| directUI | 38.818 | 1 | 1 |
| compact | 20.063 | 2 | 1 |
| compactUI | 19.977 | 1 | 1 |
| reuseIndex | 19.102 | 1 | 1 |

少一次批次 API 并没有解决主要差距。旧内容阶段重新遍历全部 Item 建位置索引，即使不包在批次里也仍要付出这笔成本。整数计划保留回放检查，却省掉了大量对象转换和重复遍历。

## 同口径复测

100／1,000／10,000 项，九种场景，profile 与 lean 各三轮独立进程。表格取三轮组内中位数的中位数；系统与 ListKit 取 lean 同进程的三个对照，不跨版本挑最低值。每次样本打乱后端顺序，每个规模交错运行实验版本。

| 项数 | 场景 | 上轮 LIS 临时版 | 本轮 lean | 系统主线程 | 系统后台 | ListKit |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | 内容相同的新快照 | 0.833 | 0.751 | 1.086 | 1.214 | 0.788 |
| 100 | 追加 50% | 1.780 | 1.199 | 1.243 | 1.278 | 1.345 |
| 100 | 更新 5 项 | 0.996 | 1.062 | 1.422 | 1.758 | 1.556 |
| 100 | 更新 50% | 1.049 | 0.948 | 1.928 | 1.823 | 1.289 |
| 100 | 左旋一项 | 1.847 | 1.455 | 1.349 | 1.489 | 1.458 |
| 100 | 随机打乱 | 3.014 | 1.931 | 3.014 | 3.283 | 2.553 |
| 100 | 混合固定 5 项 | 2.577 | 2.117 | 2.097 | 2.471 | 2.173 |
| 100 | Section 左旋 | 2.770 | 2.195 | 2.575 | 2.407 | 2.005 |
| 100 | 跨 Section 移动并更新 5% | 1.838 | 1.465 | 1.572 | 1.336 | 1.066 |
| 1000 | 内容相同的新快照 | 2.755 | 2.454 | 2.890 | 2.936 | 2.297 |
| 1000 | 追加 50% | 8.220 | 4.223 | 5.285 | 5.355 | 4.961 |
| 1000 | 更新 5 项 | 2.196 | 2.588 | 3.152 | 2.823 | 2.686 |
| 1000 | 更新 50% | 2.698 | 2.844 | 3.943 | 3.919 | 3.374 |
| 1000 | 左旋一项 | 5.903 | 2.999 | 3.160 | 2.661 | 2.783 |
| 1000 | 随机打乱 | 7.905 | 5.123 | 7.174 | 7.228 | 5.091 |
| 1000 | 混合固定 5 项 | 6.496 | 3.493 | 4.010 | 4.114 | 3.648 |
| 1000 | Section 左旋 | 6.265 | 3.418 | 4.439 | 4.231 | 3.236 |
| 1000 | 跨 Section 移动并更新 5% | 6.367 | 3.710 | 4.582 | 4.621 | 4.175 |
| 10000 | 内容相同的新快照 | 15.998 | 14.302 | 16.403 | 16.359 | 14.622 |
| 10000 | 追加 50% | 56.762 | 27.986 | 31.429 | 31.187 | 29.111 |
| 10000 | 更新 5 项 | 16.620 | 14.872 | 16.833 | 17.012 | 15.984 |
| 10000 | 更新 50% | 17.453 | 15.939 | 21.544 | 21.671 | 18.679 |
| 10000 | 左旋一项 | 38.032 | 18.582 | 17.167 | 17.405 | 18.197 |
| 10000 | 随机打乱 | 59.948 | 35.968 | 66.661 | 65.049 | 35.481 |
| 10000 | 混合固定 5 项 | 39.141 | 19.271 | 18.161 | 18.472 | 20.172 |
| 10000 | Section 左旋 | 36.755 | 17.537 | 21.360 | 21.472 | 15.585 |
| 10000 | 跨 Section 移动并更新 5% | 39.494 | 19.031 | 20.562 | 20.591 | 18.279 |

单位均为毫秒。相近数值只表示本实验中相近，不表示统计上显著胜出；100 项尤其容易受固定 UIKit 成本和宿主机调度影响。

## 一万项左旋：内部计时

以下是三轮中位数。worker 内各小项互不嵌套；workerWaitMs 是等待后台整段的墙钟区间，不能再与这些小项相加。indexInstallMs 已包含在 structureApplyMs／contentApplyMs 内，也不能重复相加。各项分别取中位数，和不保证严格等于总耗时。未列出的时间还包括捕获目标／注册准备、调度、释放临时对象和最后调用层布局等。

| 步骤 | profile ms | lean ms |
| --- | --- | --- |
| 主线程建立源位置与整数输入 | 6.909 | 7.005 |
| 整数 Diff | 1.581 | 1.570 |
| 后台重新包装 Presenter | 0.953 | 0.000 |
| 后台构造两份完整快照／检查身份／建表 | 4.090 | 0.000 |
| 后台再建两份位置索引 | 3.506 | 0.000 |
| 差异操作合法性检查 | 2.254 | 0.000 |
| 生成对象批次 | 1.417 | 0.000 |
| 对象批次回放检查 | 3.736 | 0.000 |
| 后台计算随后丢弃的内容计划 | 1.618 | 0.000 |
| 对象计划转回整数 | 0.130 | 0.000 |
| 整数操作回放检查 | 0.000 | 0.032 |
| 主线程还原展示引用与实际内容计划 | 3.304 | 3.311 |
| 结构批次：含索引安装与 UIKit 完成等待 | 2.125 | 1.803 |
| 内容／布局阶段（lean 含同步布局收尾） | 1.716 | 0.262 |
| 其中：DataSource 位置索引安装 | 3.023 | 1.520 |

## 哪些检查和中间数据仍然需要

输入身份唯一性仍在 CollectionSnapshot 捕获边界检查；改变内容的判断仍由实际 Presenter 完成。整数输入只携带身份 token 与内容变化标记，后台没有访问 UI 或传递非 Sendable Presenter。

整数回放保留坐标范围、操作起点／终点冲突、保留项顺序和最终身份检查。它不是把最终数组当作正确答案直接返回：先从旧数据应用删除／插入／移动，再逐项与目标身份比较。相同 Section 内及现存 Section 之间的 Item 更新不需要先重新构造两份对象快照。Section 纯重排同样可以在整数层验证。

结构执行时仍安装对应阶段的数据；内容阶段才换成目标 Presenter，因此移动与内容变化的阶段顺序未改变。内容阶段不再重建位置索引，是因为此时 Section／Item 的身份与位置已经由上一结构阶段建立；无结构变化时，位置原本就没有变化。

复杂 Section 增删仍保留旧中间快照与分阶段策略。本实验没有证明这些阶段数不可减少。实际探针中，操作日志确认系统把新 Section 与跨组移动放在同一个结构批次，随后另有内容批次；这说明将这两个结构操作拆开不是 UIKit 的普遍硬性要求；若继续合并，要验证混合操作和状态保留，不能直接将本次简单结构路径扩大。

## ListKit 能否直接成为默认实现

使用 Iron-Ham/Lists `221e1513f2786a4e5e836c9b76092c3bd6e61575` 的原始六个 ListKit 源文件，独立优化编译。MIT 许可允许复用、修改与分发，需保留版权和许可文本。来源：https://github.com/Iron-Ham/Lists/blob/main/LICENSE 。

其 SectionedDiff 仅对存活 Section 的 Item 序列作比较，并在这些存活 Section 之间关联跨组移动。新建或删除 Section 涉及的 Item 会落到 Section／Item 增删路径。下面不是只读源码的推测：实际打开 UICollectionView，先选中 A，再移动并修改 A，检查操作、最终内容、Cell 对象及选中项。每种组合为一次功能探针，不作为性能数据。

| 场景 | 后端 | 批次 | Item move | 最终选中 ID | 原可见 Cell 是否同一对象 |
| --- | --- | --- | --- | --- | --- |
| to-new-section | Current-staged | 2 | 1 | A | {'A': True, 'B': True} |
| to-new-section | Current-Apple-adapter | 2 | 1 | A | {'A': True, 'B': True} |
| to-new-section | Current-Apple-background | 2 | 1 | A | {'A': True, 'B': True} |
| to-new-section | Current-ListKit | 1 | 0 | 无 | {'A': True, 'B': True} |
| from-deleted-section | Current-staged | 2 | 1 | A | {'A': True, 'B': True} |
| from-deleted-section | Current-Apple-adapter | 2 | 1 | A | {'A': True, 'B': True} |
| from-deleted-section | Current-Apple-background | 2 | 1 | A | {'A': True, 'B': True} |
| from-deleted-section | Current-ListKit | 1 | 0 | 无 | {'A': True, 'B': True} |
| between-existing | Current-staged | 1 | 1 | A | {'A': True, 'B': True} |
| between-existing | Current-Apple-adapter | 2 | 1 | A | {'A': True, 'B': True} |
| between-existing | Current-Apple-background | 2 | 1 | A | {'A': True, 'B': True} |
| between-existing | Current-ListKit | 1 | 1 | A | {'A': True, 'B': True} |
| section-reorder-and-transfer | Current-staged | 2 | 1 | A | {'A': True, 'B': True, 'C': True} |
| section-reorder-and-transfer | Current-Apple-adapter | 2 | 2 | A | {'A': True, 'B': True, 'C': True} |
| section-reorder-and-transfer | Current-Apple-background | 2 | 2 | A | {'A': True, 'B': True, 'C': True} |
| section-reorder-and-transfer | Current-ListKit | 1 | 1 | A | {'A': True, 'B': True, 'C': True} |
| replace-section-endpoints | Current-staged | 3 | 3 | A | {'A': True, 'B': True, 'C': True, 'D': True} |
| replace-section-endpoints | Current-Apple-adapter | 2 | 3 | A | {'A': True, 'B': True, 'C': True, 'D': True} |
| replace-section-endpoints | Current-Apple-background | 2 | 3 | A | {'A': True, 'B': True, 'C': True, 'D': True} |
| replace-section-endpoints | Current-ListKit | 1 | 0 | 无 | {'A': False, 'B': False, 'C': True, 'D': True} |

探针采用 reuseIndex 临时版；lean 的追加变化仅涉及纯 Section 重排快径与同步布局收尾。新建／删除 Section 的三种探针中，ListKit 最终内容均正确，但选中 A 的状态丢失；系统主线程、系统后台和临时 staged 保留 A。两个已有 Section 之间迁移时四者都保留。某些 delete＋insert 后碰巧复用了同一 Cell 对象，并不等于移动语义被保留，选中状态是这里更直接的区别。

因此可以复用它的算法或执行思路，但原封不动替换默认后端会改变现有行为。LIS、稳定序列短路、整数计算、直接内容更新值得吸收；原有强类型 API 和 Section 业务边界不需要随底层替换一起推翻。系统在同一探针也保留了状态，不能据此声称只有自研才能做到。

## 验证与范围

✔ Test run with 162 tests in 14 suites passed after 19.277 seconds.

沿用上一轮 159 项测试，本轮新增三项：500 组 Section 不变但内容／增删／跨组移动混合的随机输入、错误整数计划的拒绝、五个 Section 的 120 种排列。每个优化计划仍另外交给原对象批次验证器核验；原有 0…7 项排列、复杂 Section 增删与 UIKit 测试仍运行。没有再调整既有测试断言。

所有正式样本核验数量、每个 Item 身份与可见 Cell 内容，要求计时期间 reloadData 次数为零。原生后台调用仍为 completion API 的运行时实验，沿用上一轮串行队列和线程断言；SDK 的 MainActor 注解矛盾没有被本次解决。

同一 iPhone 18 Pro／iOS 27.0 模拟器，M4 Max 宿主机，Xcode 27.1。320×480、36 高 label Cell、FlowLayout；无动画、关闭预取；每样本初始布局 flush 后等 30 ms 才计时。总耗时含目标捕获、注册、规划、apply 等待和最终布局；不含业务 SectionController 捕获与 Orchestrator 排队。ListKit 强制精确更新路径，避免其 apply(false) 使用 reloadData。

这是模拟器中固定无动画场景的相对比较，不是实际设备的 CPU／帧时间结论。动画路径保留原内容批次，虽然既有动画功能测试通过，但未声称有同等性能收益。未测真实首页、持续滚动、峰值内存、所有 OS 或真实设备上的完成时机。

## 复现

reproduction.zip 包含各版本完整 benchmark 源码、未经修改的 ListKit 模块、许可证、原始样本、日志、源码／二进制哈希、构建运行脚本，以及最终临时包的源码与测试。先运行 ListKit/build.py，再构建目标版本的 build.py；run.py 的参数为版本列表、规模列表和轮次列表，例如：`python3 run.py profile,lean 100,1000,10000 1,2,3`。模拟器须存在名为 iPhone 18 Pro 的已启动设备，脚本通过名称查询 UDID。

patches/ 保存最终临时实现和测试相对生产基线的差异；前两轮优化也包含其中，不应将整份补丁误认为本轮新增。summary.json 保留各轮中位数，summary.csv 便于后续制图。
