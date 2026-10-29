// Created by weixi on 2026/10/28.
export interface TimelineEntry {
  date: string;
  kind: string;
  title: string;
  body: string;
  links: [string, string][];
}
// Month precision is intentional: these boundaries come from the resume, not exact days.
const month = (year: number, month: number) => year + (month - 1) / 12;
export const entries: Record<string, TimelineEntry> = {
  university: { date: '2018.09 — 2022.06', kind: '大学', title: '大学', body: '天津科技大学，物联网工程。大学期间开始学习编程。学习、比赛和网球的经历，先一起留在这一段。', links: [['2021 再见', 'year-2021-afterword'], ['甚至没有机会告别', 'year-2022-afterword'], ['掉队', 'falling-behind'], ['做点什么', 'momentum']] },
  first: { date: '2021.11 — 2024.11', kind: '工作 · 天津', title: '第一份工作', body: '2021 年 11 月 1 日入职云账户。从校招实习开始，先后参与 Flutter 音视频、7850、碰爪 iOS13 和碰爪 iOS17 四个项目。其中 7850 分两段参与。', links: [['三年阶段总结', 'developer-journey-year-3']] },
  gap: { date: '2024.11 — 2025.04', kind: '一段经历', title: '离开之后', body: '离开第一家公司，准备算法与求职。', links: [] },
  beijing: { date: '2025.05 — 2026.04', kind: '工作 · 北京', title: '北京 · 乐天', body: '在乐天参与 Rakuten AI iOS 客户端从零开始的建设。', links: [['第四年的后日谈', 'developer-journey-year-4'], ['日本出差随笔', 'japan-business-trip-notes']] },
  shanghai: { date: '2026.04 — 至今', kind: '工作 · 上海', title: '上海 · 小宇宙', body: '来到上海，在小宇宙从事 iOS 开发与存量工程改造。', links: [['旁观者', 'observer']] },
  flutter: { date: '2021.11 — 2022.02', kind: '第一份工作 · 项目 1 / 4', title: 'Flutter 音视频', body: '第一份工作最初参与的音视频项目，使用 Flutter 与 Dart。', links: [] },
  unity: { date: '2022.03 — 2022.11 / 2023.12 — 2024.06', kind: '第一份工作 · 项目 2 / 4', title: '7850 · Unity2D', body: '使用 Unity2D 与 Lua。先后在两个时间段参与，是同一个项目，中间转去参与 iOS 原生项目。', links: [['沙盒建造：相机控制', 'unity-sandbox-building-camera-control'], ['沙盒建造：命令模式', 'unity-sandbox-building-command-pattern'], ['沙盒建造：状态模式', 'unity-sandbox-building-state-pattern'], ['沙盒建造：搜索算法', 'unity-sandbox-building-search-algorithms']] },
  ios13: { date: '2022.11 — 2023.11', kind: '第一份工作 · 项目 3 / 4', title: '碰爪 · iOS13', body: '参与既有 iOS 客户端开发，以及 Objective-C 工程的 Swift 迁移。', links: [] },
  ios17: { date: '2024.06 — 2024.11', kind: '第一份工作 · 项目 4 / 4', title: '碰爪 · iOS17', body: '参与新的 iOS 客户端建设，使用 Swift、SwiftUI 与 UIKit，并接入 Unity。', links: [] },
};
export const categories: Record<string, string> = {
  university: 'life', first: 'life', gap: 'life', beijing: 'life', shanghai: 'life',
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
  { id: 'flutter', entry: 'flutter', start: month(2021, 11), end: month(2022, 2), row: 2, parent: 'first' },
  { id: 'unity-1', entry: 'unity', start: month(2022, 3), end: month(2022, 11), row: 3, parent: 'first', date: '2022.03 — 2022.11' },
  { id: 'ios13', entry: 'ios13', start: month(2022, 11), end: month(2023, 11), row: 2, parent: 'first' },
  { id: 'unity-2', entry: 'unity', start: month(2023, 12), end: month(2024, 6), row: 3, parent: 'first', date: '2023.12 — 2024.06' },
  { id: 'ios17', entry: 'ios17', start: month(2024, 6), end: month(2024, 11), row: 2, parent: 'first' },
];
