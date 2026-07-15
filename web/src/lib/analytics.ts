const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.muxvo.com';
const DEVICE_ID_KEY = 'muxvo_device_id';
const ATTRIBUTION_KEY = 'muxvo_attribution';

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * First-touch acquisition attribution.
 *
 * On first module load of a session we capture the UTM params from the landing
 * URL plus the referring document, and persist them for the whole session. The
 * capture is write-once (never overwritten) so a later in-site navigation that
 * drops the UTM query does not erase where the visitor originally came from.
 * Every tracked event then carries these fields, so downstream events such as
 * `web:download_click` inherit the original source.
 */
function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return; // preserve first touch

    const params = new URLSearchParams(window.location.search);
    const attribution: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
      const value = params.get(key);
      if (value) attribution[key] = value;
    }
    if (document.referrer) attribution.referrer = document.referrer;

    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* sessionStorage unavailable (private mode / SSR) — skip */
  }
}

function getAttribution(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

captureAttribution();

export function track(metric: string, metadata?: Record<string, unknown>): void {
  // Attribution is the base; caller-supplied metadata takes precedence.
  const merged = { ...getAttribution(), ...(metadata ?? {}) };
  fetch(`${API_BASE}/analytics/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': getDeviceId(),
    },
    body: JSON.stringify({ metric, metadata: merged }),
  }).catch(() => {});
}
