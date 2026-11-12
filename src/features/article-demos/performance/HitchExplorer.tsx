// Created by weixi on 2026/10/19.
import { useId, useState } from 'react';
import recordings from './performance-recordings.json';
import './reuse-timeline.css';

// Explicit editorial selection; do not filter other events by duration.
// Run 3 overlaps watch image processing, so these are not labelled unrelated work.
const excludedStarts: Record<number, number> = { 2: 0.887542, 4: 1.171779 };

const chart = { width: 720, height: 220, left: 48, right: 16, top: 14, bottom: 36, maxMs: 200 };

export default function HitchExplorer() {
  const id = useId();
  const [runIndex, setRunIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [start, setStart] = useState(0);
  const run = recordings[runIndex];
  const from = zoom ? Math.min(start, Math.max(0, run.seconds - 8)) : 0;
  const end = zoom ? Math.min(from + 8, run.seconds) : run.seconds;
  const excludedStart = excludedStarts[runIndex];
  const events = run.events.filter(event => event.start >= from && event.start < end
    && (showComplete || event.start !== excludedStart));
  const sum = events.reduce((total, event) => total + event.duration, 0);
  const maximum = Math.max(0, ...events.map(event => event.duration));
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const x = (seconds: number) => chart.left + (seconds - from) / (end - from) * plotWidth;
  const y = (ms: number) => chart.top + plotHeight * (1 - ms / chart.maxMs);

  return <section className="reuse-demo hitch-explorer" aria-label="实测卡顿分布">
    <div className="reuse-demo__eyebrow">实测数据 · Animation Hitches · 已脱敏</div>
    <div className="reuse-demo__heading">卡顿发生在什么时候，又持续了多久？</div>
    <div className="reuse-demo__steps">
      {recordings.map((item, index) => <button key={item.label} type="button" aria-pressed={index === runIndex}
        onClick={() => { setRunIndex(index); setStart(0); setShowComplete(false); }}>{index + 1}. {item.label}</button>)}
    </div>
    <div className="hitch-explorer__controls">
      <button type="button" className="hitch-explorer__zoom" aria-pressed={zoom}
        onClick={() => { setZoom(!zoom); setStart(0); }}>{zoom ? '返回整段录制' : '放大为 8 秒窗口'}</button>
      <span>录制长度 {run.seconds.toFixed(1)} 秒 · 每轮操作未严格对齐</span>
    </div>
    {excludedStart !== undefined && <div className="hitch-explorer__controls">
      <button type="button" className="hitch-explorer__zoom" aria-pressed={showComplete}
        onClick={() => setShowComplete(!showComplete)}>{showComplete ? '排除已标记事件' : '查看完整录制'}</button>
      <small>{showComplete ? '当前包含' : '当前排除'}开头 {excludedStart.toFixed(3)} 秒处的事件，图表与统计同步更新。</small>
    </div>}
    {zoom && <div>
      <label htmlFor={id}>移动选区：{from.toFixed(1)}–{end.toFixed(1)} 秒</label>
      <input id={id} type="range" min={0} max={Math.ceil(Math.max(0, run.seconds - 8) * 10) / 10} step={0.1} value={start}
        aria-valuetext={`${from.toFixed(1)} 至 ${end.toFixed(1)} 秒`}
        onChange={event => setStart(Number(event.target.value))} />
    </div>}
    <small>纵轴：卡顿延迟（ms） · 横轴：录制相对时间（s）</small>
    <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{`${run.label}：${from.toFixed(1)} 至 ${end.toFixed(1)} 秒的卡顿分布`}</title>
      <desc id={`${id}-desc`}>横轴为录制相对时间，纵轴为卡顿延迟，固定为零到二百毫秒。每根竖线代表一次卡顿，详细数值在下方列表中。</desc>
      {[0, 50, 100, 150, 200].map(ms => <g key={ms}>
        <line x1={chart.left} x2={chart.width - chart.right} y1={y(ms)} y2={y(ms)} className="hitch-explorer__grid" />
        <text x={chart.left - 8} y={y(ms) + 4} textAnchor="end">{ms}</text>
      </g>)}
      {[0, 1, 2, 3, 4].map(tick => {
        const time = from + (end - from) * tick / 4;
        return <text key={tick} x={x(time)} y={chart.height - 10} textAnchor="middle">{time.toFixed(1)}s</text>;
      })}
      {events.map((event, index) => <g key={index}>
        <title>{`${event.start.toFixed(3)} 秒：${event.duration.toFixed(2)} ms hitch`}</title>
        <line x1={x(event.start)} x2={x(event.start)} y1={y(0)} y2={y(event.duration)} className="hitch-explorer__event" />
        <circle cx={x(event.start)} cy={y(event.duration)} r={3} className="hitch-explorer__point" />
      </g>)}
    </svg>
    <div className="hitch-explorer__stats" aria-live="polite">
      <div><strong>{events.length}</strong><span>选区内卡顿次数</span></div>
      <div><strong>{sum.toFixed(1)} <small>ms</small></strong><span>选区内累计延迟</span></div>
      <div><strong>{maximum.toFixed(1)} <small>ms</small></strong><span>选区内最长延迟</span></div>
    </div>
    <details>
      <summary>查看选区内的 {events.length} 条事件</summary>
      {events.length ? <ol className="hitch-explorer__events">{events.map((event, index) =>
        <li key={index}>{event.start.toFixed(3)} s <span>{event.duration.toFixed(2)} ms</span></li>)}</ol>
        : <p>这个窗口没有记录到卡顿事件。</p>}
    </details>
    <small>竖线高度表示 hitch duration，并非函数执行时长。切换录制不表示两次手势或内容逐帧对应；这张图不能单独归因到某个函数。</small>
  </section>;
}
