import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Overview stat card. Extracted from the repeated card markup on the original
// Analytics page (gray-900 panel + gray-500 label + big accent value).
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  accent = 'text-white',
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  accent?: string;
  sub?: ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      {sub != null && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
