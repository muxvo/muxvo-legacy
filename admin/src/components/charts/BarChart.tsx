// ---------------------------------------------------------------------------
// Horizontal bar chart for distributions (referrers, versions, OS ...).
// ---------------------------------------------------------------------------

export interface BarDatum {
  label: string;
  value: number;
  /** Optional secondary figure shown after the value (e.g. device count). */
  detail?: string;
}

export function BarChart({
  data,
  color = 'bg-amber-400/70',
  formatValue,
  emptyLabel = '暂无数据 No data.',
}: {
  data: BarDatum[];
  color?: string;
  formatValue?: (v: number) => string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-sm">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-32 shrink-0 text-sm text-gray-400 text-right truncate" title={d.label}>
            {d.label}
          </div>
          <div className="flex-1 bg-gray-800 rounded-md overflow-hidden">
            <div
              className={`h-6 ${color} rounded-md`}
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%` }}
            />
          </div>
          <div className="w-28 shrink-0 text-xs text-gray-400">
            {fmt(d.value)}{d.detail ? ` · ${d.detail}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
