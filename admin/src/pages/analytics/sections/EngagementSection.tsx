import { useState } from 'react';
import { LineChart } from '../../../components/charts/LineChart';
import { CohortTable } from '../../../components/charts/CohortTable';
import { StatCard } from '../../../components/charts/StatCard';
import { Panel, AsyncBlock } from '../Panel';
import { useResource, qstr } from '../useAnalyticsData';
import type {
  ActiveResponse,
  NewVsReturningResponse,
  RetentionResponse,
  UsageDurationResponse,
  AppScope,
} from '../types';

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(minutes)}m`;
}

const GRAN_LABEL: Record<string, string> = { day: 'DAU', week: 'WAU', month: 'MAU' };

/** Toggle button group matching the existing pill style. */
function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={
            value === o.value
              ? 'px-3 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-xs'
              : 'px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs hover:border-gray-600 transition-colors'
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Compact stacked columns (new vs returning) over the selected date range. */
function StackedBars({ data }: { data: { date: string; new_users: number; returning_users: number }[] }) {
  if (data.length === 0) return <p className="text-gray-500 text-sm">暂无数据 No data.</p>;
  const max = Math.max(...data.map((d) => d.new_users + d.returning_users), 1);
  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber-400/80 inline-block" />新增 New</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-400/70 inline-block" />回流 Returning</span>
      </div>
      <div className="flex items-end gap-[2px] h-40">
        {data.map((d) => {
          const total = d.new_users + d.returning_users;
          const h = (total / max) * 100;
          const newPct = total > 0 ? (d.new_users / total) * 100 : 0;
          return (
            <div
              key={d.date}
              className="flex-1 min-w-[2px] h-full flex flex-col justify-end"
              title={`${d.date}  新增 ${d.new_users} · 回流 ${d.returning_users}`}
            >
              <div className="w-full rounded-sm overflow-hidden" style={{ height: `${h}%` }}>
                <div className="bg-amber-400/80" style={{ height: `${newPct}%` }} />
                <div className="bg-emerald-400/70" style={{ height: `${100 - newPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EngagementSection({ from, to, app }: { from: string; to: string; app: AppScope }) {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [retGranularity, setRetGranularity] = useState<'week' | 'month'>('week');

  const active = useResource<ActiveResponse>(
    `/admin/analytics/active${qstr({ from, to, app, granularity })}`,
  );
  const nvr = useResource<NewVsReturningResponse>(
    `/admin/analytics/new-vs-returning${qstr({ from, to, app })}`,
  );
  const retention = useResource<RetentionResponse>(
    `/admin/analytics/retention${qstr({ app, granularity: retGranularity })}`,
  );
  const usage = useResource<UsageDurationResponse>(
    `/admin/analytics/usage-duration${qstr({ from, to, app })}`,
  );

  const activeData = active.data?.data ?? [];
  const usageData = usage.data?.data ?? [];

  return (
    <>
      <Panel
        title="活跃用户 Active Users"
        right={
          <Toggle
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: 'day', label: 'Daily' },
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
            ]}
          />
        }
      >
        <AsyncBlock loading={active.loading} error={active.error} empty={activeData.length === 0}>
          <LineChart
            data={activeData.map((d) => ({
              date: d.date,
              lines: [{ value: d.active, color: '#fbbf24', label: GRAN_LABEL[granularity] }],
            }))}
            height={200}
          />
        </AsyncBlock>
      </Panel>

      <Panel title="新增 vs 回流 New vs Returning">
        <AsyncBlock loading={nvr.loading} error={nvr.error} empty={(nvr.data?.data ?? []).length === 0}>
          <StackedBars data={nvr.data?.data ?? []} />
        </AsyncBlock>
      </Panel>

      <Panel
        title="留存 Retention"
        right={
          <Toggle
            value={retGranularity}
            onChange={setRetGranularity}
            options={[
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
            ]}
          />
        }
      >
        <AsyncBlock loading={retention.loading} error={retention.error}>
          <div className="grid grid-cols-3 gap-5 mb-6">
            {(['D1', 'D7', 'D30'] as const).map((period) => {
              const r = retention.data?.rates[period];
              return (
                <StatCard
                  key={period}
                  label={`${period} ${period === 'D1' ? '次日留存' : period === 'D7' ? '七日留存' : '月留存'}`}
                  value={r ? `${r.rate}%` : '-'}
                  accent="text-cyan-400"
                  sub={r ? `${r.retained}/${r.total} devices` : undefined}
                />
              );
            })}
          </div>
          {retention.data && retention.data.cohorts.length > 0 && (
            <CohortTable cohorts={retention.data.cohorts} granularity={retention.data.granularity} />
          )}
        </AsyncBlock>
      </Panel>

      <Panel title="使用时长 Usage Duration">
        <AsyncBlock loading={usage.loading} error={usage.error} empty={usageData.length === 0}>
          <LineChart
            data={usageData.map((d) => ({
              date: d.date,
              lines: [{ value: d.avg_minutes, color: '#22d3ee', label: 'Avg min' }],
            }))}
            height={160}
            formatValue={(v) => formatDuration(v)}
          />
        </AsyncBlock>
        <p className="text-xs text-gray-500 mt-3">
          基于心跳估算（老版 30min/新版 10min 粒度），非实测会话时长；「全部」维度下混合两种权重。
        </p>
      </Panel>
    </>
  );
}
