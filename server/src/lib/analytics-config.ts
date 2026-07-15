/**
 * Shared analytics aggregation constants.
 *
 * Consumed by the /admin/analytics endpoints and the seed script. Every value
 * here is a compile-time constant (never user input), so the helpers that
 * splice them into SQL fragments are safe from injection.
 */

/**
 * Minutes credited per heartbeat event, keyed by metric name.
 *   session.heartbeat — legacy Electron app emits one every 30 minutes
 *   app.heartbeat     — new muxvo2 (Swift) app emits one every 10 minutes
 */
export const HEARTBEAT_WEIGHTS: Record<string, number> = {
  'session.heartbeat': 30,
  'app.heartbeat': 10,
};

/** The heartbeat metric names (derived from HEARTBEAT_WEIGHTS). */
export const HEARTBEAT_METRICS: string[] = Object.keys(HEARTBEAT_WEIGHTS);

/** Metrics that mark a device's activation (default for the acquisition funnel). */
export const DEFAULT_ACTIVATION_METRICS = ['app.first_launch'];

/**
 * SQL predicate matching an error event. Legacy events use `error.*` prefixes
 * (error.ipc / error.terminal / error.action) while muxvo2 emits a single
 * `app.error` metric.
 */
export const ERROR_METRICS_SQL = `(metric = 'app.error' OR metric LIKE 'error.%')`;

/** Default ordered steps for the auto-update funnel. */
export const UPDATE_FUNNEL_STEPS = [
  'update.prompted',
  'update.downloaded',
  'update.applied',
];

/**
 * Build a `CASE ... END` expression converting heartbeat rows into minutes via
 * HEARTBEAT_WEIGHTS. `col` is the metric column reference (default `metric`).
 */
export function heartbeatMinutesSql(col = 'metric'): string {
  const whens = Object.entries(HEARTBEAT_WEIGHTS)
    .map(([metric, minutes]) => `WHEN '${metric}' THEN ${minutes}`)
    .join(' ');
  return `CASE ${col} ${whens} ELSE 0 END`;
}

/** Comma-separated quoted heartbeat metric list for an `IN (...)` clause. */
export function heartbeatMetricsInSql(): string {
  return HEARTBEAT_METRICS.map((m) => `'${m}'`).join(', ');
}
