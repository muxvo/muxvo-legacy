import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Shared panel wrapper + async state helper for analytics sections.
// ---------------------------------------------------------------------------

export function Panel({
  title,
  right,
  children,
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Render loading/error placeholders; otherwise render children. */
export function AsyncBlock({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading) return <p className="text-gray-500 text-sm">Loading…</p>;
  if (error) return <p className="text-red-400 text-sm">Error: {error}</p>;
  if (empty) return <p className="text-gray-500 text-sm">暂无数据 No data.</p>;
  return <>{children}</>;
}
