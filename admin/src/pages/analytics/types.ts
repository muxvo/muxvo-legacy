// ---------------------------------------------------------------------------
// Shared types for the analytics dashboard (mirror the /admin/analytics API).
// ---------------------------------------------------------------------------

export type AppScope = 'all' | 'legacy' | 'muxvo2';

export interface Filters {
  from: string;
  to: string;
  app: AppScope;
}

// --- Engagement -------------------------------------------------------------

export interface ActivePoint {
  date: string;
  active: number;
}
export interface ActiveResponse {
  granularity: 'day' | 'week' | 'month';
  data: ActivePoint[];
}

export interface NewVsReturningItem {
  date: string;
  new_users: number;
  returning_users: number;
}
export interface NewVsReturningResponse {
  data: NewVsReturningItem[];
}

export interface UsageDurationItem {
  date: string;
  active_devices: number;
  avg_minutes: number;
  total_minutes: number;
}
export interface UsageDurationResponse {
  data: UsageDurationItem[];
}

export interface RetentionRate {
  total: number;
  retained: number;
  rate: number;
}
export interface CohortItem {
  cohort: string;
  size: number;
  retention: number[];
}
export interface RetentionResponse {
  rates: Record<string, RetentionRate>;
  cohorts: CohortItem[];
  granularity: 'week' | 'month';
}

// --- Growth -----------------------------------------------------------------

export interface FunnelStageItem {
  key: string;
  label: string;
  devices: number;
  rate: number;
  clicks?: number;
}
export interface AcquisitionFunnelResponse {
  stages: FunnelStageItem[];
  activationMetrics: string[];
  note: string;
}

export interface ReferrerItem {
  source: string;
  views: number;
  devices: number;
}
export interface ReferrersResponse {
  data: ReferrerItem[];
}

// --- Feature ----------------------------------------------------------------

export interface MetricBreakdownItem {
  metric: string;
  total: number;
  devices: number;
  per_device: number;
}
export interface MetricBreakdownResponse {
  data: MetricBreakdownItem[];
}

export interface EventItem {
  date: string;
  metric: string;
  total: number;
}
export interface EventsResponse {
  data: EventItem[];
}

// --- Quality ----------------------------------------------------------------

export interface VersionsResponse {
  by_app: { legacy: number; muxvo2: number };
  by_version: { version: string; devices: number }[];
  by_os: { os: string; devices: number }[];
}

export interface ErrorItem {
  metric: string;
  occurrences: number;
  devices: number;
  common_code: string;
}
export interface ErrorsResponse {
  data: ErrorItem[];
}

export interface FunnelStepItem {
  metric: string;
  devices: number;
  rate_from_prev: number;
  rate_from_first: number;
}
export interface FunnelResponse {
  steps: string[];
  data: FunnelStepItem[];
}
