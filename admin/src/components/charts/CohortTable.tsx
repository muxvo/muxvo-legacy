// ---------------------------------------------------------------------------
// Cohort retention matrix. Extracted verbatim from the original Analytics page.
// ---------------------------------------------------------------------------

export interface CohortItem {
  cohort: string;
  size: number;
  retention: number[];
}

export function CohortTable({
  cohorts,
  granularity,
}: {
  cohorts: CohortItem[];
  granularity: 'week' | 'month';
}) {
  const maxPeriods = cohorts.reduce((max, c) => Math.max(max, c.retention.length), 0);
  const periodLabel = granularity === 'week' ? 'W' : 'M';

  function retentionColor(rate: number): string {
    if (rate >= 50) return 'bg-cyan-400/40 text-cyan-300';
    if (rate >= 30) return 'bg-cyan-400/25 text-cyan-300';
    if (rate >= 15) return 'bg-cyan-400/15 text-gray-300';
    if (rate > 0) return 'bg-cyan-400/5 text-gray-400';
    return 'text-gray-600';
  }

  function formatCohort(dateStr: string): string {
    return dateStr.slice(0, 10);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left text-gray-500 uppercase py-2 pr-3 sticky left-0 bg-gray-900">Cohort</th>
            <th className="text-right text-gray-500 uppercase py-2 px-2">Size</th>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <th key={i} className="text-center text-gray-500 uppercase py-2 px-2 min-w-[50px]">
                {periodLabel}{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort} className="border-b border-gray-800 last:border-0">
              <td className="py-1.5 pr-3 text-gray-300 whitespace-nowrap sticky left-0 bg-gray-900">
                {formatCohort(c.cohort)}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-400">{c.size}</td>
              {c.retention.map((rate, i) => (
                <td key={i} className={`py-1.5 px-2 text-center rounded ${retentionColor(rate)}`}>
                  {rate > 0 ? `${rate}%` : '-'}
                </td>
              ))}
              {Array.from({ length: maxPeriods - c.retention.length }, (_, i) => (
                <td key={`pad-${i}`} className="py-1.5 px-2" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
