// Created by weixi on 2026/11/09.
import { useId, useState } from 'react';
import data from './parade-benchmark.json';
import './parade-benchmark.css';

export default function ParadeBenchmark() {
  const id = useId();
  const [size, setSize] = useState(100);
  const [scenario, setScenario] = useState('update-fixed5');
  const selected = data.scenarios.find(item => item.id === scenario)!;
  const rows = data.engines.map(engine => ({
    ...engine,
    ...data.measurements.find(row => row.n === size && row.scenario === scenario && row.engine === engine.id)!,
  }));
  // Zero-based, shared within a comparison; include the full three-run range.
  const maximum = Math.ceil(Math.max(...rows.map(row => row.high)) * 10) / 10;
  const percent = (ms: number) => `${ms / maximum * 100}%`;

  return <section className="parade-benchmark" aria-label="完整更新耗时对比">
    <div className="parade-benchmark__eyebrow">2026.11.09 · 同一轮复测</div>
    <div className="parade-benchmark__heading">从准备数据，到更新与布局完成</div>
    <div className="parade-benchmark__sizes" role="group" aria-label="数据规模">
      {[100, 1000, 10000].map(n => <button key={n} type="button" aria-pressed={n === size}
        onClick={() => setSize(n)}>{n.toLocaleString('en-US')} 项</button>)}
    </div>
    <div className="parade-benchmark__select">
      <label htmlFor={`${id}-scenario`}>更新场景</label>
      <select id={`${id}-scenario`} value={scenario} onChange={event => setScenario(event.target.value)}>
        {data.scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>
    <div aria-live="polite" aria-atomic="true">
      <p className="parade-benchmark__scenario">{selected.note}</p>
      <div className="parade-benchmark__axis" aria-hidden="true"><span>0</span><span>{maximum.toFixed(1)} ms</span></div>
      <ul className="parade-benchmark__rows">
        {rows.map((row, index) => <li key={row.id} className={`parade-benchmark__row parade-benchmark__row--${index}`}>
          <div className="parade-benchmark__label"><span>{row.label}</span><strong>{row.ms.toFixed(3)} ms</strong></div>
          <div className="parade-benchmark__track" aria-hidden="true"
            title={`三轮中位数范围：${row.low.toFixed(3)}–${row.high.toFixed(3)} ms`}>
            <span className="parade-benchmark__bar" style={{ width: percent(row.ms) }} />
            <span className="parade-benchmark__range" style={{ left: percent(row.low), width: percent(row.high - row.low) }} />
          </div>
          {row.selectionFailures > 0 && <p className="parade-benchmark__state">选中状态未保留：{row.selectionFailures}/{row.samples} 次；耗时之外也有行为差异。</p>}
        </li>)}
      </ul>
      <details className="parade-benchmark__details">
        <summary>查看本组波动与可见 Cell 保留情况</summary>
        {rows.map(row => <p key={row.id}><strong>{row.label}</strong>：三轮范围 {row.low.toFixed(3)}–{row.high.toFixed(3)} ms；
          同身份、更新前后均可见的 Cell 保留数中位数 {row.reusedCells}/{row.comparedCells}。</p>)}
        <p>Cell 检查在计时外进行，只检查实际可见对象。</p>
      </details>
    </div>
    <p className="parade-benchmark__caption">横条越短，耗时越少。细线为三轮中位数的范围，不是置信区间。每组刻度随数据调整，从零开始。</p>
    <p className="parade-benchmark__caption">模拟器、无动画、简单 Cell。四条路径共享展示适配；不含业务捕获、外层排队与屏幕呈现。系统后台为 completion 入口实验。</p>
    <a className="parade-benchmark__source" href="/benchmarks/parade-2026-11-09/unified-rounds1-4/README.md">全部 31 个场景与复现记录</a>
  </section>;
}
