// Created by weixi on 2026/10/28.
export interface TimelineEntry {
  date: string;
  kind: string;
  title: string;
  body: string;
  links: [string, string, 'pending'?][];
  resources?: [string, string][];
}
// Month precision is intentional: these boundaries come from the resume, not exact days.
const month = (year: number, month: number) => year + (month - 1) / 12;
export const entries: Record<string, TimelineEntry> = {
  university: {
    date: '2018.09 — 2022.06', kind: '大学 · 天津 · 物联网工程', title: '天津科技大学',
    body: `大学这几年，贯穿始终的还是学习。从大一自己学 C，到后来接触 SwiftUI、做 App，也参加社团和比赛，学到的东西慢慢有了能拿在手里使用的样子。我喜欢这种感觉：写出来的东西，自己真的可以用。也花了不少时间学习算法、刷题，给自己打一些基本功。后来做数独，才把其中一些东西真正用进了自己的 App。

也尝试过嵌入式。PCB 本身挺有意思，但接线、焊接，以及出了问题以后从硬件到程序逐一排查，对我来说没有那么好玩。也可能当时学得还不够深入，只是相比之下，我更愿意把时间花在软件上。

数独是这段时间留下的一个作品，后来也成了毕业设计。从让算法解出一道题，到把它做成能玩的 App，中间遇到了不少只看教程时想不到的问题，也重写过。现在回头看，对当时的实现有很多不满意，依然想找时间重新做一遍，只是暂时排得靠后。

找工作的过程却很难受。从一开始敢去面试，到后来反复准备、等待、怀疑自己，那些时候的感受，留在了当时写下的文章里。大四上学期的十一月，我开始在云账户实习，论文就在工作和学习的交织中完成了。

还有网球。大学里有两年多，除了疫情没能回学校的那段时间，我把很多空闲都给了球场。从初学到打到 3.5，那是一件走在路上也会一直想着的事。后来不再打球，离开学校后也没有合适的球友，一件那么热爱的事，竟然就这样慢慢放下了。

但现在看到网球场，还是会很感动。也许有一天，还能重新回去打球。`,
    links: [['掉队', 'falling-behind'], ['做点什么', 'momentum'], ['2021 再见', 'year-2021-afterword'], ['毕业论文致谢', 'graduation-acknowledgements'], ['甚至没有机会告别', 'year-2022-afterword']],
    resources: [['项目源码 · SudokuLab', 'https://github.com/Weixi779/SudokuLab']],
  },
  first: {
    date: '2021.11 — 2024.11', kind: '工作', title: '天津 · 云账户',
    body: `2021 年 11 月，以应届实习生的身份加入天津的云账户，直到 2024 年 11 月离开。三年间先后参与 Flutter 音视频、Unity2D 项目 7850，以及碰爪的两代 iOS 客户端，经历了多次技术栈切换。

工作强度很高，季度绩效奖金也相当可观，是至今经济回报最多的一段工作经历。公司也愿意给学习留出时间，转向 Unity 开发前，团队有一到两个月专门接触新技术。刚从学校走出来，对做项目有很大的热情，大量精力就这样投入了学习、尝试和实际开发。

从完成具体任务，到逐渐独立承担功能，能处理的事情越来越多。但频繁切换技术栈，也让这些投入很难沿着同一个方向积累。每次都想认真学、做得更好，项目的需要却不断变化。到了准备换工作的时候，做过什么、擅长什么、接下来该找什么岗位，并不能自然连成一条清楚的线。最后一段 iOS 工程，才稍微弥补了这方面的缺口。

如今，Unity 的经历能帮助自己做游戏和其他项目；但在当时，它占用了很大一部分精力，也带来了职业方向上的困惑。后来的用途没有消除当年的难处，这两种感受一直都在。

项目主要围绕老板想做的东西展开，开发、设计和产品能决定方向的空间有限。立项时的设想，与真正投入人力、技术和时间之后的现实，往往存在距离；而老板的重点变化，又会改变接下来的安排。认真做过的东西未必能持续推进，有些项目后来也不再继续了。希望多承担责任、把东西做好，却无法决定这些投入最终走向哪里。

一起入职的应届生，也在这几年里从同学般的相处走向各自的生活，其中一些人至今仍有联系。回头看这三年，机会、收入、友情和疲惫都很具体。对公司的不满，与对其中一些人和事的珍惜，一直同时存在。`,
    links: [['三年阶段总结', 'developer-journey-year-3']],
  },
  gap: {
    date: '2024.11 — 2025.04', kind: '一段经历', title: '离开之后',
    body: `离职后，搬进家里一套空着的房子，开始独住。之前工作的积蓄，加上不用为住处发愁，让这段时间可以暂时不围着下一份工作打转。

每天的安排由自己决定。买菜、做饭、运动，也玩了不少游戏。尝试跑十公里，开始减肥，虽然当时的方法不算健康，但也开始认真留意自己的身体。父母偶尔过来，送些吃的，关心一下近况。

有时间以后，想做的事情其实很多。绘画、音乐，都是愿意慢慢投入的课题。会给自己安排上午做什么、下午做什么，遇到特别感兴趣的问题，也能花上一两天一直钻进去。有些课题太大，没有持续下来，但不用别人安排任务，也能把日子过得充实。

期间也面试了米哈游，一面通过，止步二面。那是很想抓住的一次机会，也成了至今很大的遗憾。当时的能力确实还有不足，之前频繁切换技术栈、难以深入积累的问题，也在求职时变得更加具体。

一个人住也会孤独，有些事情终究需要自己慢慢消化。但回头看，这仍是人生中最幸福的一段时间。那时还不知道下一份工作、下一座城市会带来什么，只觉得生活正在向好，未来还有很多值得期待的事。现在看来，那段时光大概率是我人生中最充满希望的一段时光了。`,
    links: [],
  },
  beijing: {
    date: '2025.05 — 2026.04', kind: '工作 · 北京', title: '北京 · Rakuten',
    body: `2025 年 5 月，来到北京，作为 Rakuten AI 的立项 iOS 工程师之一，参与客户端从零开始的建设。这是 iOS 技术成长最快的一段经历：从工程搭建、技术选型，到 AI Chat 核心链路，再到网络、存储、设计系统等基础能力，终于能围绕同一个项目持续深入。

复杂业务让许多原本抽象的概念有了具体用途。流式消息与本地数据怎样保持一致，依赖怎样组织，业务模型怎样划分，模块怎样拆分，以及整个 App 怎样启动，都需要在实际开发中逐步想清楚。恰逢 AI 快速发展的时期，调研、验证和实现想法的速度也明显加快了。

与其他 iOS 同事异地协作的这段时间，技术成长很快，独自承担的压力也越来越大。相处与合作中的孤独感，后来成为《回响》的一部分来处。

最终离开，主要有三个原因：

- **协作上的落差：** 开荒团队的能力参差不齐，不同岗位的交付与配合难以达到预期，反复沟通和补位消耗了不少精力。
- **产品前景不够清晰：** 对 App 投入了很大的热情，但活跃度很低，后续方向也难以看清。客户端做得更好，并不足以独自改变整个产品的表现。
- **最无法接受的，是后来的办公室政治：** 新的领导到来以后，迎合与内耗逐渐进入日常工作。前两点尚能接受，这一点却让继续留下失去了意义。不愿把精力花在这些周旋上，最终选择离开。

这段经历也让招聘的重要性变得具体。团队快速扩大，并不意味着能承担更多事情；招聘时没有把好的关，后来会变成交付、协作和维护中反复付出的成本。相比尽快把人招齐，更重要的是确认加入的人能否真正承担相应的工作。

北京这一年，也留下了技术之外的重要经历。初创团队与外企结合的工作方式、日本出差的见闻，以及共同赶工、错过末班车后走回酒店的夜晚，都留在了记忆里。离开时的信没有再解释那些不满，只写了感谢。决定离开的理由很清楚，那些值得记住的人和事，也同样真实。`,
    links: [['日本出差随笔', 'japan-business-trip-notes'], ['第四年的后日谈', 'developer-journey-year-4'], ['告别 Rakuten', 'farewell-rakuten'], ['回响', 'the-echo-that-never-came']],
  },
  shanghai: {
    date: '2026.04 — 至今', kind: '工作 · 上海', title: '上海 · 小宇宙',
    body: `来到上海，进入小宇宙，开始参与一个已有大量用户、积累了多年历史的产品。实际工作后，逐渐发现，产品的知名度与内部工程的成熟度，并不总是相称。

AI 的持续发展，也让我重新思考程序员与 AI 的关系：这个职业未来会变成什么样，而自己是否还愿意沿着这条路继续走下去。

工作之外，减重成了生活的一条主线，到现在已经瘦了三十斤。离家乡和熟悉的朋友更远，也有了重新思考生活的距离。有些关于热爱、关于自己究竟需要什么的问题，是离开原来的环境，再回头看时，才慢慢想清楚的。

开源和个人项目仍在继续。解决遇到的需求，把东西做成自己喜欢的样子，也把过程记录下来，留给以后回看的自己。这段生活还在发生，暂时写到这里。`,
    links: [['旁观者', 'observer'], ['删掉大量 Skill 以后', 'after-deleting-ai-skills'], ['热爱也有难以回答的问题', 'why-i-still-create'], ['回响', 'the-echo-that-never-came']],
  },
  wicompress: {
    date: '2024.10 — 至今', kind: '开源 · 图片处理', title: 'WICompress',
    body: `一个用于调整图片尺寸、转换格式和控制文件大小的 Swift 工具库，从真实业务里的图片压缩问题中逐渐整理而来。

从早期探索到后来的几次重构，几年间一直关注着这个问题。项目和文章留下了不同阶段的理解，也记录了 AI 参与之后，重新审视与选择答案的过程。`,
    links: [['浅谈图片压缩', 'image-compression-fundamentals'], ['谈谈 iOS 图片压缩', 'ios-image-compression'], ['旁观者', 'observer'], ['解构与重组：AI 时代下的 WICompress 2.0', 'wicompress-2-architecture-ai']],
    resources: [['WICompress · GitHub', 'https://github.com/Weixi779/WICompress']],
  },
  parade: {
    date: '2026.09 — 至今', kind: '开源 · 列表框架', title: 'Parade',
    body: `一个用于组织复杂列表页面的 UIKit 框架。把页面拆成能够独立管理内容、交互和更新的模块，让复杂页面的开发与维护更清楚。

从实际项目的问题出发，反复调整设计，再回到真实页面里验证。它承载了目前对 iOS 工程最深入的一次实践，也是现阶段最想留下的代表作之一。`,
    links: [['UICollectionView 能不能写得再 Swift 一点？', 'parade-third-answer', 'pending']],
    resources: [['Parade · GitHub', 'https://github.com/Weixi779/Parade']],
  },
  libraries: {
    date: '2025.12 — 至今', kind: '开源 · 基础工具', title: '基础库 · Moira / Latte / AudioHelm',
    body: `把开发中反复遇到的问题，整理成可以独立使用的工具。满足需要时就先留下，遇到新的问题，再继续调整。

Moira：组织网络请求、响应处理与重试，让应用更方便地使用 Swift 并发完成网络交互。

Latte：管理内存与文件缓存，探索不同淘汰策略在实际数据中的表现。

AudioHelm：协调播放、录音等功能对音频会话的使用，处理切换、中断与恢复时的可用状态。`,
    links: [['网络层工程范式迁移', 'ios-network-layer-evolution'], ['现代缓存体系探索', 'caffeine-moka-cache-notes']],
    resources: [['Moira · GitHub', 'https://github.com/Weixi779/Moira'], ['Latte · GitHub', 'https://github.com/Weixi779/Latte'], ['AudioHelm · GitHub', 'https://github.com/Weixi779/AudioHelm']],
  },
  flutter: { date: '2021.11 — 2022.02', kind: '云账户 · 项目 1 / 4', title: 'Flutter 音视频', body: '第一份工作最初参与的音视频项目，使用 Flutter 与 Dart。', links: [] },
  unity: { date: '2022.03 — 2022.11 / 2023.12 — 2024.06', kind: '云账户 · 项目 2 / 4', title: '7850 · Unity2D', body: '使用 Unity2D 与 Lua。先后在两个时间段参与，是同一个项目，中间转去参与 iOS 原生项目。', links: [['沙盒建造：相机控制', 'unity-sandbox-building-camera-control'], ['沙盒建造：命令模式', 'unity-sandbox-building-command-pattern'], ['沙盒建造：状态模式', 'unity-sandbox-building-state-pattern'], ['沙盒建造：搜索算法', 'unity-sandbox-building-search-algorithms']] },
  ios13: { date: '2022.11 — 2023.11', kind: '云账户 · 项目 3 / 4', title: '碰爪 · iOS13', body: '参与既有 iOS 客户端开发，以及 Objective-C 工程的 Swift 迁移。', links: [] },
  ios17: { date: '2024.06 — 2024.11', kind: '云账户 · 项目 4 / 4', title: '碰爪 · iOS17', body: '参与新的 iOS 客户端建设，使用 Swift、SwiftUI 与 UIKit，并接入 Unity。', links: [] },
};
export const categories: Record<string, string> = {
  university: 'life', first: 'life', gap: 'life', beijing: 'life', shanghai: 'life',
  wicompress: 'work', parade: 'work', libraries: 'work',
  flutter: 'work', unity: 'work', ios13: 'work', ios17: 'work',
};
export interface TimelinePeriod {
  id: string;
  entry: string;
  start: number;
  end: number | null;
  row: number;
  parent?: string;
  date?: string;
}
export const periods: TimelinePeriod[] = [
  { id: 'university', entry: 'university', start: month(2018, 9), end: month(2022, 6), row: 0 },
  { id: 'first', entry: 'first', start: month(2021, 11), end: month(2024, 11), row: 1 },
  { id: 'gap', entry: 'gap', start: month(2024, 11), end: month(2025, 4), row: 0 },
  { id: 'beijing', entry: 'beijing', start: month(2025, 5), end: month(2026, 4), row: 1 },
  { id: 'shanghai', entry: 'shanghai', start: month(2026, 4), end: null, row: 0 },
  { id: 'wicompress', entry: 'wicompress', start: month(2024, 10), end: null, row: 2 },
  { id: 'libraries', entry: 'libraries', start: month(2025, 12), end: null, row: 3 },
  { id: 'parade', entry: 'parade', start: month(2026, 9), end: null, row: 4 },
  { id: 'flutter', entry: 'flutter', start: month(2021, 11), end: month(2022, 2), row: 2, parent: 'first' },
  { id: 'unity-1', entry: 'unity', start: month(2022, 3), end: month(2022, 11), row: 3, parent: 'first', date: '2022.03 — 2022.11' },
  { id: 'ios13', entry: 'ios13', start: month(2022, 11), end: month(2023, 11), row: 2, parent: 'first' },
  { id: 'unity-2', entry: 'unity', start: month(2023, 12), end: month(2024, 6), row: 3, parent: 'first', date: '2023.12 — 2024.06' },
  { id: 'ios17', entry: 'ios17', start: month(2024, 6), end: month(2024, 11), row: 2, parent: 'first' },
];
