import { useState } from 'react';

// ---------------------------------------------------------------------------
// SVG line chart (supports multiple series, hover tooltip, click-to-select).
// Extracted verbatim from the original Analytics page so every section can
// share one implementation.
// ---------------------------------------------------------------------------

export interface LineChartPoint {
  date: string;
  lines: { value: number; color: string; label: string }[];
}

export function LineChart({
  data,
  height = 200,
  formatValue,
  onSelectDate,
  selectedDate,
}: {
  data: LineChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const W = 800;
  const H = height;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const lineCount = data[0].lines.length;
  const allValues = data.flatMap((d) => d.lines.map((l) => l.value));
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  function x(i: number) {
    return padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  }
  function y(v: number) {
    return padT + chartH - ((v - minVal) / range) * chartH;
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (range * i) / 4;
    return { val: Math.round(val), py: y(val) };
  });

  const labelStep = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data
    .map((d, i) => ({ label: d.date.slice(5), px: x(i), i }))
    .filter((_, i) => i % labelStep === 0 || i === data.length - 1);

  const paths = Array.from({ length: lineCount }, (_, li) => {
    const points = data.map((d, i) => `${x(i)},${y(d.lines[li].value)}`).join(' ');
    return { points, color: data[0].lines[li].color, label: data[0].lines[li].label };
  });

  const fmt = formatValue || ((v: number) => String(Math.round(v)));

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-3 text-xs text-gray-400">
        {paths.map((p) => (
          <div key={p.label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: p.color }} />
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: `${height}px` }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Grid lines */}
        {yTicks.map((t) => (
          <g key={t.val}>
            <line x1={padL} y1={t.py} x2={W - padR} y2={t.py} stroke="#374151" strokeWidth={0.5} />
            <text x={padL - 8} y={t.py + 4} textAnchor="end" fill="#6b7280" fontSize={11}>
              {t.val}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((l) => (
          <text key={l.i} x={l.px} y={H - 8} textAnchor="middle" fill="#6b7280" fontSize={11}>
            {l.label}
          </text>
        ))}

        {/* Lines */}
        {paths.map((p) => (
          <polyline
            key={p.label}
            points={p.points}
            fill="none"
            stroke={p.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}

        {/* Selected date vertical line */}
        {selectedDate && (() => {
          const si = data.findIndex((d) => d.date === selectedDate);
          if (si < 0) return null;
          return <line x1={x(si)} y1={padT} x2={x(si)} y2={padT + chartH} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 2" />;
        })()}

        {/* Hover areas */}
        {data.map((d, i) => {
          const colW = data.length === 1 ? chartW : chartW / (data.length - 1);
          return (
            <rect
              key={d.date}
              x={x(i) - colW / 2}
              y={padT}
              width={colW}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => onSelectDate?.(d.date)}
              style={{ cursor: onSelectDate ? 'pointer' : 'default' }}
            />
          );
        })}

        {/* Hover dots and tooltip */}
        {hoverIndex !== null && (() => {
          const d = data[hoverIndex];
          const tx = x(hoverIndex);
          return (
            <g>
              <line x1={tx} y1={padT} x2={tx} y2={padT + chartH} stroke="#4b5563" strokeWidth={1} />
              {d.lines.map((l, li) => (
                <circle key={li} cx={tx} cy={y(l.value)} r={4} fill={l.color} stroke="#111827" strokeWidth={2} />
              ))}
              <rect
                x={Math.min(tx + 8, W - padR - 150)}
                y={padT}
                width={140}
                height={16 + d.lines.length * 16}
                rx={4}
                fill="#1f2937"
                stroke="#374151"
              />
              <text x={Math.min(tx + 16, W - padR - 142)} y={padT + 14} fill="#9ca3af" fontSize={11}>
                {d.date}
              </text>
              {d.lines.map((l, li) => (
                <text
                  key={li}
                  x={Math.min(tx + 16, W - padR - 142)}
                  y={padT + 30 + li * 16}
                  fill={l.color}
                  fontSize={12}
                  fontWeight="bold"
                >
                  {l.label}: {fmt(l.value)}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
