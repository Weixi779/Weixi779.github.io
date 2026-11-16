# 前四轮优化的整合临时版

2026-11-09。以第四轮 `indexed` 临时 Package 为行为参考，收拢前四轮优化；第五轮的 Section 原位替换不加入。生产 Parade 基线为 `dedfb5907f54890b3e0b11da99610e933cea5508`，源码、默认装配及文章均未修改。

## 实现边界

调用链保持为：

1. 原有 `CollectionOrchestrator` 的单消费者从已应用快照捕获下一版展示。
2. 快照校验身份唯一性，并保留校验时已生成的位置表。
3. 主线程把身份与内容差异投影为不可变整数／布尔值。
4. 内置路径用 LIS 生成变化，生成至多一个混合结构批次，并在整数层重放校验。无结构变化时跳过结构计划。
5. 主线程把计划映射回实际 Presenter；结构阶段仍保留存活项的旧内容，结构完成后再安装目标内容。
6. 无动画内容更新直接调用对应 UIKit API，并完成同步布局；动画路径等待批次完成。补充视图、可见行为刷新、Section 生命周期与提交串行继续由原有代码负责。

后台只接收 Sendable 计算值。达到 1,000 项时后台规划的阈值沿用第四轮，目的是固定对照条件，不是本轮新调优的生产建议。任意自定义算法仍接收原协议的完整输入，并走原来的分阶段规划、结果验证、重放与错误恢复路径。

## 这次清理了什么

- 去掉 `SpikeTimings`、`StructureProfile` 和库内计时插桩。计时只存在于 benchmark 的目标准备／apply／同步布局外层，不再汇报推算的主线程 CPU 时间。
- 删除已无实际调用的 `WorkerPresenter`、对象快照捕获函数和 `PreparedSectionedDiff` 过渡包装。
- 把三个重复的整数批次构造合成一处，按输入选择 Item、Section 或混合重放；保留这些校验，不引入关闭校验开关。
- 将规划、结构操作、内容操作和数据安装分开，移除临时的 `preservingPositions` 状态开关与重复内容执行代码。
- 分阶段规划器只负责它的算法输入与执行计划；内置优化路径单独负责整数计划，不再在旧规划器中重复选择 LIS。
- 删除早期遗留的 `SectionedDiff` 索引重用辅助重载，公开算法文件恢复与生产版逐字一致。
- 初始／恢复安装也使用快照已验证的位置表。自定义算法中间批次仍建立自己的位置表，内容阶段沿用结构阶段的位置。

`CollectionOrchestrator`、默认装配入口、原生适配、SectionStore、CollectionViewBridge、AnyCellPresenter 与公开 SectionedDiff 文件均与生产版逐字一致。其余既有源文件的 public/open 声明文本一致；这是源码检查，不是二进制 ABI 审计。没有给调用方增加 Sendable 约束。

只保留两个有明确契约的执行入口：内置算法的整数计划，以及任意自定义算法原有的分阶段计划。没有把前几轮每个实验版本都作为策略开关留下来。

## 验证

最终 Swift 6 Package 的 164 项测试、14 个 suite 通过。包含小排列最少移动检查、独立分阶段重放、错误计划拒绝、随机复杂变化、连续 300 次真实 UIKit 更新、动画／无动画内容时序、选中状态、Cell 替换、自适应布局、补充视图、FIFO 和 Section 生命周期。

相对第四轮测试，只有内部入口调整：独立重放直接接收 `SectionedChanges`；LIS 左／右旋测试直接构造真实内置整数计划，再交给独立重放验证。移动次数等断言没有放宽。第一次整合测试因仍从旧规划入口检查 LIS 出现两条移动次数断言失败，调整入口后通过；初次失败日志也保留。最终又删除了无调用的旧算法重载，并对最终源码重新跑完整测试。

库测试和 benchmark 使用的库源码逐文件一致，源码及最终二进制哈希见 `validation.json`、`clean/environment.json`。生产基线的库／测试补丁均通过 `git apply --check`，没有实际应用到生产仓库。

## 统一 benchmark

同一个最终二进制覆盖 31 个场景、100／1,000／10,000 项、四个后端、三轮独立进程；每组 3 次预热、10 次正式样本，总计 11,160 个正式样本。另有三个规模共 372 个结果预检样本，不计入正式统计。进程内随机场景与后端顺序，每次使用新建 host。

- 一般更新 22 类：无内容变化的新快照；追加、删除、更新、混合操作各自固定 5 项及 5%／25%／50%；左旋、右旋、随机打乱；Section 左旋；已有 Section 跨组移动并更新。
- 复杂 Section 9 类：新建后移入 1 项／5%；删除后迁出；替换一个 Section；已有组迁移；Section 重排与迁移；Section 增删／重排／迁移混合；全部 Section 替换；短 ID 左旋对照。
- 后端：整理后临时 Staged、现有原生适配、原生后台 completion 实验、原始 Iron-Ham/Lists `221e1513f2786a4e5e836c9b76092c3bd6e61575`。

所有后端共享目标 Presenter 捕获、注册和视图桥接。计时包含目标准备、等待 DataSource apply 完成、最终同步布局；不含初始数据安装、业务 SectionController 捕获、外层 Orchestrator 排队、host 在计时后的 previous 快照替换。

环境：iPhone 18 Pro／iOS 27.0 模拟器，M4 Max，Xcode 27.1，320×480 视口，36 高 Label Cell，FlowLayout，无动画、无预取。初始化后 flush 并等待 30 ms，均在计时外。库与 harness 使用 `-O -whole-module-optimization -swift-version 5` 单模块编译；ListKit 六个原始源文件独立优化编译。另用真实 Package 的 Swift 6 模式测试。

原生后台入口使用同一串行队列，并等待每次 completion；它是运行时性能实验，当前 SDK 的 MainActor 注解矛盾没有解决。ListKit 使用精确批次路径（`animatingDifferences: true`，UIView 全局关闭动画），避免 `apply(false)` 走 reloadData。每个正式样本断言计时期间 reloadData 为零。

每次更新核对全部身份与数量、可见正文和选中身份；计时外还比较更新前后同时可见的同身份 Cell 对象。不同后端的状态语义差异单独记录，不用内容正确替代状态检查。全量 Section 替换仍产生与 Item 数量相同的 move，作为第五轮未接入的运行证据。

## 阅读与复现

- `comparison.md`：同一最终版本的完整对比表及状态／操作统计。
- `summary.json`／`summary.csv`：完整精度与每轮中位数。
- `validation.json`：边界、测试、源码一致性与样本数检查。
- `patches/library.patch`／`tests.patch`：相对生产基线的最终临时修改。
- `patches/cleanup-from-round4.patch`：本轮相对第四轮的整理差异。
- `reproduction.zip`：可独立构建的 clean-package、bench 源码、原始样本、日志、工具脚本和许可证。无需依赖前四轮目录。

解压后先运行 `python3 ListKit/build.py`，再运行 `python3 clean/build.py`。使用已启动的 iPhone 18 Pro，运行 `python3 run.py clean 100,1000,10000 0` 预检，再运行 `python3 run.py clean 100,1000,10000 1,2,3`。runner 会跳过已有完成结果；重新采样前将原有 `clean/unified-*.json` 移到别处保留。运行 `python3 summarize.py` 与 `python3 report.py` 生成统计和表格。Package 测试用 `python3 test.py clean`；已有结果包需要换名保留后再运行。

`verify.py` 为当前工作区的审计脚本，需要原生产 checkout 才能校验补丁和默认入口；benchmark 与 Package 构建不依赖它。

## 限制

模拟器、固定视口和关闭动画的相对耗时不代表真机 CPU／帧时间、滚动卡顿或真实首页表现。未测峰值内存、持续提交压力下的动画表现和所有支持的 OS。快照索引复用以保留字典换取少建索引，内存成本尚未量化。单模块优化也不能替代消费方独立模块构建下的复测。

百项差异需结合三轮波动看待；表中领先不等于统计显著。此次没有调整默认实现，也没有把测试范围之外的语义宣称为已验证。
