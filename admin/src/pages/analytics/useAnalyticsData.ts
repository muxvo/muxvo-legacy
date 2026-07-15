import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// ---------------------------------------------------------------------------
// Per-section data fetching. Each section builds a request path from the global
// filters and gets its own independent loading/error state, so one slow or
// failing endpoint never blocks the rest of the dashboard.
// ---------------------------------------------------------------------------

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

/**
 * Fetch `path` and re-fetch whenever it changes. Pass `null` to stay idle
 * (e.g. when a required parameter is not ready yet).
 */
export function useResource<T>(path: string | null): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ data: null, loading: path != null, error: '' });

  useEffect(() => {
    if (path == null) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ data: s.data, loading: true, error: '' }));
    apiFetch<T>(path)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

/** Encode a query object into a `?a=b&c=d` string (skips empty values). */
export function qstr(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
