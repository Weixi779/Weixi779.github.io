// Created by weixi on 2026/10/19.
import { useId, useState } from 'react';
import './reuse-timeline.css';

const stages = [
  { title: '首次显示', before: ['创建视图与约束', '生成标题图片', '绑定内容'], after: ['创建视图与约束', '生成并保留标题图片', '绑定内容'], note: '第一次显示仍然需要准备资源。复用不会让首次工作消失。' },
  { title: '离开屏幕，准备复用', before: ['取消旧请求与订阅', '移除内部视图', '清空静态文字'], after: ['取消旧请求与订阅', '保留视图与约束', '等待新内容覆盖'], note: '取消请求、解绑行为仍然必要；视图和约束可以留下来。' },
  { title: '再次显示相同内容', before: ['重建视图与约束', '再次生成标题图片', '重新赋值'], after: ['复用现有视图', '复用有效标题图片', '绑定当前内容与行为'], note: '内容和显示环境未变时，可以避免重复准备；交互仍需绑定当前对象。' },
  { title: '主题发生变化', before: ['重新生成标题图片', '更新展示'], after: ['使旧图片失效', '重新生成标题图片', '更新展示'], note: '复用有条件：主题、文字或显示倍率变化时，应重新生成对应内容。' },
];

export default function ReuseTimeline() {
  const [step, setStep] = useState(0);
  const id = useId();
  const stage = stages[step];
  return (
    <section className="reuse-demo" aria-label="视图复用交互示意">
      <div className="reuse-demo__eyebrow">交互示意 · 非实测 Trace</div>
      <div className="reuse-demo__heading">同一份内容，再次出现时发生了什么？</div>
      <label htmlFor={id}>步骤 {step + 1} / {stages.length} · {stage.title}</label>
      <input id={id} type="range" min="0" max={stages.length - 1} step="1" value={step}
        aria-valuetext={stage.title} onChange={(event) => setStep(Number(event.target.value))} />
      <div className="reuse-demo__steps">
        {stages.map((item, index) => <button key={item.title} type="button" aria-pressed={index === step}
          onClick={() => setStep(index)}>{index + 1}. {item.title}</button>)}
      </div>
      <div aria-live="polite">
        <div className="reuse-demo__comparison">
          <div><strong>每次重新准备</strong><ol>{stage.before.map(text => <li key={text}>{text}</li>)}</ol></div>
          <div><strong>按生命周期复用</strong><ol>{stage.after.map(text => <li key={text}>{text}</li>)}</ol></div>
        </div>
        <p className="reuse-demo__note">{stage.note}</p>
      </div>
      <small>拖动滑块，或点击步骤。这里仅解释执行顺序，不表示耗时或性能提升比例。</small>
    </section>
  );
}
