import { useState } from 'react';
import { GrowthSection } from './sections/GrowthSection';
import { EngagementSection } from './sections/EngagementSection';
import { FeatureSection } from './sections/FeatureSection';
import { QualitySection } from './sections/QualitySection';
import type { AppScope } from './types';

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDateISO(d);
}

const today = formatDateISO(new Date());
const defaultFrom = daysAgo(30);

type Preset = 'today' | 7 | 30 | 90;

const APP_TABS: { value: AppScope; label: string }[] = [
  { value: 'all', label: '全部 All' },
  { value: 'legacy', label: '老版 Legacy' },
  { value: 'muxvo2', label: '新版 muxvo2' },
];

export function Analytics() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [activePreset, setActivePreset] = useState<Preset | null>(30);
  const [app, setApp] = useState<AppScope>('all');

  function applyPreset(preset: Preset) {
    setActivePreset(preset);
    if (preset === 'today') {
      setFrom(today);
      setTo(today);
    } else {
      setFrom(daysAgo(preset));
      setTo(today);
    }
  }

  function handleFromChange(value: string) {
    setActivePreset(null);
    setFrom(value);
  }
  function handleToChange(value: string) {
    setActivePreset(null);
    setTo(value);
  }

  const presetBtn = (preset: Preset, label: string) => (
    <button
      key={preset}
      onClick={() => applyPreset(preset)}
      className={
        activePreset === preset
          ? 'px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm'
          : 'px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors'
      }
    >
      {label}
    </button>
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Analytics 分析</h1>

      {/* App dimension tabs */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {APP_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setApp(tab.value)}
            className={
              app === tab.value
                ? 'px-4 py-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm font-medium'
                : 'px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-6">
        来源维度作用于「参与度 / 功能 / 质量」区；「增长」区为官网访问数据，不受该维度影响。
      </p>

      {/* Date range selector */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <input
          type="date"
          value={from}
          onChange={(e) => handleFromChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
        />
        <span className="text-gray-500 text-sm">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => handleToChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
        />
        <div className="flex gap-2 ml-2">
          {presetBtn('today', 'Today')}
          {presetBtn(7, 'Last 7 days')}
          {presetBtn(30, 'Last 30 days')}
          {presetBtn(90, 'Last 90 days')}
        </div>
      </div>

      {/* Sections */}
      <SectionHeader title="增长 Growth" note="官网获客（不受来源维度影响）" />
      <GrowthSection from={from} to={to} />

      <SectionHeader title="参与度 Engagement" />
      <EngagementSection from={from} to={to} app={app} />

      <SectionHeader title="功能 Feature" />
      <FeatureSection from={from} to={to} app={app} />

      <SectionHeader title="质量 Quality" />
      <QualitySection from={from} to={to} app={app} />
    </div>
  );
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-3 mt-4 mb-4 border-b border-gray-800 pb-2">
      <h2 className="text-xl font-bold text-gray-200">{title}</h2>
      {note && <span className="text-xs text-gray-500">{note}</span>}
    </div>
  );
}
