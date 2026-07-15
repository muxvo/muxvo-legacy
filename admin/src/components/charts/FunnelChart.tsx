// ---------------------------------------------------------------------------
// Horizontal funnel: one bar per step (width ∝ value) with the step-to-step
// conversion rate shown between bars.
// ---------------------------------------------------------------------------

export interface FunnelStep {
  label: string;
  value: number;
  /** Conversion % relative to the previous step (server-computed). */
  rate?: number;
  /** Optional secondary figure, e.g. raw click count. */
  detail?: string;
}

export function FunnelChart({
  steps,
  valueLabel = '设备',
}: {
  steps: FunnelStep[];
  valueLabel?: string;
}) {
  if (steps.length === 0) {
    return <p className="text-gray-500 text-sm">暂无数据 No data.</p>;
  }
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <div key={s.label}>
          {i > 0 && (
            <div className="flex items-center gap-2 py-1 pl-2 text-xs text-gray-500">
              <span className="text-cyan-400">↓ {s.rate ?? 0}%</span>
              <span className="text-gray-600">转化 conversion</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-sm text-gray-400 text-right">{s.label}</div>
            <div className="flex-1 bg-gray-800 rounded-md overflow-hidden">
              <div
                className="h-8 bg-amber-400/70 rounded-md flex items-center px-3 min-w-[2.5rem] transition-all"
                style={{ width: `${Math.max((s.value / max) * 100, 4)}%` }}
              >
                <span className="text-sm font-semibold text-gray-950">{s.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-32 shrink-0 text-xs text-gray-500">
              {valueLabel}{s.detail ? ` · ${s.detail}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
