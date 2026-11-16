// Created by weixi on 2026/11/09.
// Derive the article's small chart payload from the archived uniform run.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const source = new URL('public/benchmarks/parade-2026-11-09/unified-rounds1-4/summary.json', root);
const target = new URL('src/features/article-demos/parade/parade-benchmark.json', root);
const scenarios = [
  { id: 'update-fixed5', label: '修改 5 条正文', note: '身份与顺序不变，只修改五项内容。' },
  { id: 'append-fixed5', label: '追加 5 项', note: '在列表末尾追加五项，已有项保持不变。' },
  { id: 'mixed-fixed5', label: '增删改移混合', note: '固定五项的增删与内容变化，并伴随顺序调整。' },
  { id: 'update-pct50', label: '修改一半内容', note: '身份与顺序不变，修改一半内容。' },
  { id: 'rotate-left-1', label: '左旋一项', note: '把第一项移到末尾，其余项保持相对顺序。' },
  { id: 'shuffle', label: '随机打乱', note: '保留身份与内容，只随机调整顺序。' },
  { id: 'new-section-move1', label: '新建 Section，移入一项', note: '新建 Section，迁入一项并更新其内容。' },
  { id: 'section-churn', label: 'Section 增删与跨组迁移', note: 'Section 增删、重排与 Item 跨组迁移同时发生。' },
  { id: 'replace-all-sections', label: '全部 Section 替换', note: 'Section 身份全部更换，保留并更新原有 Item。' },
];
const engines = [
  { id: 'Current-staged', label: '自研 DataSource' },
  { id: 'Current-Apple-adapter', label: '系统主线程' },
  { id: 'Current-Apple-background', label: '系统后台实验' },
  { id: 'Current-ListKit', label: 'ListKit' },
];
const rows = JSON.parse(readFileSync(source, 'utf8'));
const measurements = [];
for (const n of [100, 1000, 10000]) {
  for (const scenario of scenarios) {
    for (const engine of engines) {
      const matches = rows.filter(row => row.n === n && row.scenario === scenario.id && row.engine === engine.id);
      assert.equal(matches.length, 1, `${n}/${scenario.id}/${engine.id}`);
      const row = matches[0];
      assert.equal(row.variant, 'clean');
      assert.equal(row.runs, 3);
      assert.equal(row.samples, 30);
      const times = row.runMedians.map(run => run.totalMs);
      measurements.push({
        n, scenario: scenario.id, engine: engine.id,
        ms: row.totalMs, low: Math.min(...times), high: Math.max(...times),
        selectionFailures: row.selectionFailures, samples: row.samples,
        comparedCells: row.comparedCells, reusedCells: row.reusedCells,
      });
    }
  }
}
const output = `${JSON.stringify({ scenarios, engines, measurements }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  assert.equal(readFileSync(target, 'utf8'), output, 'Regenerate article data from the archived benchmark.');
  console.log(`Verified ${measurements.length} chart measurements against the archived run.`);
} else {
  writeFileSync(target, output);
  console.log(`Generated ${measurements.length} chart measurements.`);
}
