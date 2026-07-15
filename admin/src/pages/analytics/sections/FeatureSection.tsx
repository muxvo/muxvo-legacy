import { useState } from 'react';
import { LineChart } from '../../../components/charts/LineChart';
import type { LineChartPoint } from '../../../components/charts/LineChart';
import { Panel, AsyncBlock } from '../Panel';
import { useResource, qstr } from '../useAnalyticsData';
import type { MetricBreakdownResponse, EventsResponse, AppScope } from '../types';

const PALETTE = ['#fbbf24', '#34d399', '#22d3ee', '#f472b6', '#a78bfa', '#f87171'];

export function FeatureSection({ from, to, app }: { from: string; to: string; app: AppScope }) {
  const [selected, setSelected] = useState<string[]>([]);

  const breakdown = useResource<MetricBreakdownResponse>(
    `/admin/analytics/metric-breakdown${qstr({ from, to, app })}`,
  );
  const events = useResource<EventsResponse>(
    selected.length > 0
      ? `/admin/analytics/events${qstr({ from, to, app, metrics: selected.join(',') })}`
      : null,
  );

  const rows = breakdown.data?.data ?? [];

  function toggle(metric: string) {
    setSelected((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric],
    );
  }

  // Pivot events (date, metric, total) into per-date multi-line points.
  const trend: LineChartPoint[] = (() => {
    const evData = events.data?.data ?? [];
    if (selected.length === 0 || evData.length === 0) return [];
    const dates = Array.from(new Set(evData.map((e) => e.date))).sort();
    const byKey = new Map(evData.map((e) => [`${e.date}|${e.metric}`, e.total]));
    return dates.map((date) => ({
      date,
      lines: selected.map((metric, i) => ({
        value: byKey.get(`${date}|${metric}`) ?? 0,
        color: PALETTE[i % PALETTE.length],
        label: metric,
      })),
    }));
  })();

  return (
    <Panel title="功能使用 Feature Usage">
      {selected.length > 0 && (
        <div className="mb-6">
          <AsyncBlock loading={events.loading} error={events.error} empty={trend.length === 0}>
            <LineChart data={trend} height={200} />
          </AsyncBlock>
          <p className="text-xs text-gray-500 mt-2">点击下表事件名叠加/移除趋势线（已选 {selected.length}）</p>
        </div>
      )}

      <AsyncBlock loading={breakdown.loading} error={breakdown.error} empty={rows.length === 0}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 text-xs uppercase py-2 pr-4">Event 事件</th>
              <th className="text-right text-gray-500 text-xs uppercase py-2 px-4">Total 总量</th>
              <th className="text-right text-gray-500 text-xs uppercase py-2 px-4">Devices 设备</th>
              <th className="text-right text-gray-500 text-xs uppercase py-2 pl-4">Per Device 次/设备</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSel = selected.includes(row.metric);
              const idx = selected.indexOf(row.metric);
              return (
                <tr
                  key={row.metric}
                  onClick={() => toggle(row.metric)}
                  className={`border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800/50 transition-colors ${isSel ? 'bg-gray-800/40' : ''}`}
                >
                  <td className="py-2 pr-4 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: isSel ? PALETTE[idx % PALETTE.length] : '#374151' }}
                      />
                      {row.metric}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-sm text-right text-gray-300">{row.total.toLocaleString()}</td>
                  <td className="py-2 px-4 text-sm text-right text-gray-400">{row.devices.toLocaleString()}</td>
                  <td className="py-2 pl-4 text-sm text-right text-gray-400">{row.per_device.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AsyncBlock>
    </Panel>
  );
}
