import type { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';
import { authenticateAdmin } from '../middleware/admin.js';
import {
  DEFAULT_ACTIVATION_METRICS,
  ERROR_METRICS_SQL,
  HEARTBEAT_METRICS,
  heartbeatMetricsInSql,
  heartbeatMinutesSql,
} from '../lib/analytics-config.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type AppScope = 'all' | 'legacy' | 'muxvo2';

/**
 * Row-level SQL predicate (without a leading AND) restricting analytics_events
 * rows to the requested app scope.
 *   legacy  — old Electron app: no `app` metadata key and not a web: event
 *   muxvo2  — new Swift app: metadata.app = 'muxvo2'
 *   all     — union of both apps; web: events stay out (an anonymous site
 *             visitor is not an active device — web traffic is reported by the
 *             Growth endpoints, which query web: metrics directly)
 */
export function appFilterSql(app: AppScope): string {
  if (app === 'legacy') return `metric NOT LIKE 'web:%' AND metadata->>'app' IS NULL`;
  if (app === 'muxvo2') return `metadata->>'app' = 'muxvo2'`;
  return `metric NOT LIKE 'web:%'`;
}

/** appFilterSql wrapped as ` AND (...)`, or '' when the predicate is empty. */
export function andApp(app: AppScope): string {
  const f = appFilterSql(app);
  return f ? ` AND (${f})` : '';
}

/**
 * Device-level scope predicate for retention (which pivots on the `devices`
 * table). muxvo2 = the device has at least one muxvo2 event; legacy = it has
 * none. `deviceCol` is the qualified device_id column to correlate against.
 */
function deviceAppFilterSql(app: AppScope, deviceCol: string): string {
  if (app === 'muxvo2') {
    return `EXISTS (SELECT 1 FROM analytics_events ae2 WHERE ae2.device_id = ${deviceCol} AND ae2.metadata->>'app' = 'muxvo2')`;
  }
  if (app === 'legacy') {
    return `NOT EXISTS (SELECT 1 FROM analytics_events ae2 WHERE ae2.device_id = ${deviceCol} AND ae2.metadata->>'app' = 'muxvo2')`;
  }
  return '';
}

function defaultFrom(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Split a comma-separated query param into a trimmed, non-empty list. */
function csv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Query-string schemas
// ---------------------------------------------------------------------------

const APP_PROP = {
  type: 'string' as const,
  enum: ['all', 'legacy', 'muxvo2'] as const,
  default: 'all',
};

const DATE_PROPS = {
  from: { type: 'string' as const },
  to: { type: 'string' as const },
};

/** Build route options carrying a querystring schema with `additionalProperties: false`. */
function qs(props: Record<string, unknown>) {
  return {
    schema: {
      querystring: {
        type: 'object' as const,
        properties: props,
        additionalProperties: false,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Admin analytics routes plugin (mounted at prefix /admin/analytics)
// ---------------------------------------------------------------------------

export const adminAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  // Every route in this plugin requires an admin bearer token.
  app.addHook('preHandler', authenticateAdmin);

  // =========================================================================
  // GET /dau — Daily active users (device + registered)
  //   Kept `source` (web|app|all) for backward compatibility.
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope; source?: 'web' | 'app' | 'all' };
  }>('/dau', qs({ ...DATE_PROPS, app: APP_PROP, source: { type: 'string', enum: ['web', 'app', 'all'] } }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all', source } = request.query;

    let sql = `SELECT date,
                 COUNT(DISTINCT device_id) AS dau,
                 COUNT(DISTINCT user_id)   AS registered_users
               FROM analytics_events
               WHERE date >= $1 AND date <= $2`;
    // source=web asks for site-visitor rows, which every app scope now
    // excludes — honor it by skipping the app filter instead of AND-ing
    // the two into an always-empty predicate.
    if (source === 'web') sql += ` AND metric LIKE 'web:%'`;
    else {
      sql += andApp(scope);
      if (source === 'app') sql += ` AND metric NOT LIKE 'web:%'`;
    }
    sql += ` GROUP BY date ORDER BY date`;

    const result = await query<{ date: string; dau: string; registered_users: string }>(
      sql, [from, to],
    );

    return {
      from, to, app: scope,
      data: result.rows.map((r) => ({
        date: r.date,
        dau: Number(r.dau),
        registered_users: Number(r.registered_users),
      })),
    };
  });

  // =========================================================================
  // GET /active — DAU / WAU / MAU via date_trunc buckets
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope; granularity?: 'day' | 'week' | 'month' };
  }>('/active', qs({ ...DATE_PROPS, app: APP_PROP, granularity: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' } }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all', granularity = 'day' } = request.query;

    const sql = `SELECT DATE_TRUNC($3, date)::date AS bucket,
                        COUNT(DISTINCT device_id) AS active
                 FROM analytics_events
                 WHERE date >= $1 AND date <= $2${andApp(scope)}
                 GROUP BY bucket ORDER BY bucket`;

    const result = await query<{ bucket: string; active: string }>(sql, [from, to, granularity]);

    return {
      from, to, app: scope, granularity,
      data: result.rows.map((r) => ({ date: r.bucket, active: Number(r.active) })),
    };
  });

  // =========================================================================
  // GET /new-vs-returning — daily split of new vs returning active devices
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope };
  }>('/new-vs-returning', qs({ ...DATE_PROPS, app: APP_PROP }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all' } = request.query;

    // first_date is each device's all-time first active day (not clamped to the
    // window) so a device active before `from` counts as returning inside it.
    const sql = `WITH first_seen AS (
        SELECT device_id, MIN(date) AS first_date
        FROM analytics_events
        WHERE TRUE${andApp(scope)}
        GROUP BY device_id
      ),
      active AS (
        SELECT DISTINCT date, device_id
        FROM analytics_events
        WHERE date >= $1 AND date <= $2${andApp(scope)}
      )
      SELECT a.date,
             COUNT(*) FILTER (WHERE a.date = f.first_date) AS new_users,
             COUNT(*) FILTER (WHERE a.date > f.first_date) AS returning_users
      FROM active a
      JOIN first_seen f ON f.device_id = a.device_id
      GROUP BY a.date ORDER BY a.date`;

    const result = await query<{ date: string; new_users: string; returning_users: string }>(
      sql, [from, to],
    );

    return {
      from, to, app: scope,
      data: result.rows.map((r) => ({
        date: r.date,
        new_users: Number(r.new_users),
        returning_users: Number(r.returning_users),
      })),
    };
  });

  // =========================================================================
  // GET /acquisition-funnel — web visit → download click → activation
  //   Cross-end funnel: stages come from different device populations, so the
  //   ratios are aggregate (NOT per-device joins). See `note` in the response.
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; activation?: string };
  }>('/acquisition-funnel', qs({ ...DATE_PROPS, activation: { type: 'string' } }), async (request) => {
    const { from = defaultFrom(), to = today() } = request.query;
    const activation = csv(request.query.activation);
    const activationMetrics = activation.length > 0 ? activation : DEFAULT_ACTIVATION_METRICS;

    const result = await query<{
      visitors: string;
      download_devices: string;
      download_clicks: string;
      activations: string;
    }>(
      `SELECT
         (SELECT COUNT(DISTINCT device_id) FROM analytics_events
            WHERE date >= $1 AND date <= $2 AND metric = 'web:page_view') AS visitors,
         (SELECT COUNT(DISTINCT device_id) FROM analytics_events
            WHERE date >= $1 AND date <= $2 AND metric = 'web:download_click') AS download_devices,
         (SELECT COALESCE(SUM(value), 0) FROM analytics_events
            WHERE date >= $1 AND date <= $2 AND metric = 'web:download_click') AS download_clicks,
         (SELECT COUNT(DISTINCT device_id) FROM analytics_events
            WHERE date >= $1 AND date <= $2 AND metric = ANY($3)) AS activations`,
      [from, to, activationMetrics],
    );

    const r = result.rows[0];
    const visitors = Number(r.visitors);
    const downloadDevices = Number(r.download_devices);
    const activations = Number(r.activations);
    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

    return {
      from, to,
      activationMetrics,
      stages: [
        { key: 'visitors', label: '官网访客', devices: visitors, rate: 100 },
        { key: 'download_click', label: '下载点击', devices: downloadDevices, clicks: Number(r.download_clicks), rate: pct(downloadDevices, visitors) },
        { key: 'activation', label: '激活', devices: activations, rate: pct(activations, downloadDevices) },
      ],
      note: '下载完成不可测（静态直链），漏斗以下载点击为准；官网访客与 app 设备无法跨端关联，各段比率为聚合口径而非同设备转化。',
    };
  });

  // =========================================================================
  // GET /referrers — top acquisition sources (utm_source or referrer domain)
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; limit?: number };
  }>('/referrers', qs({ ...DATE_PROPS, limit: { type: 'integer', minimum: 1, maximum: 200, default: 20 } }), async (request) => {
    const { from = defaultFrom(), to = today(), limit = 20 } = request.query;

    const sql = `SELECT
        COALESCE(
          NULLIF(metadata->>'utm_source', ''),
          NULLIF(regexp_replace(metadata->>'referrer', '^https?://([^/]+).*$', '\\1'), ''),
          '(direct)'
        ) AS source,
        COUNT(*) AS views,
        COUNT(DISTINCT device_id) AS devices
      FROM analytics_events
      WHERE date >= $1 AND date <= $2 AND metric = 'web:page_view'
      GROUP BY source
      ORDER BY views DESC
      LIMIT $3`;

    const result = await query<{ source: string; views: string; devices: string }>(
      sql, [from, to, limit],
    );

    return {
      from, to, limit,
      data: result.rows.map((r) => ({
        source: r.source,
        views: Number(r.views),
        devices: Number(r.devices),
      })),
    };
  });

  // =========================================================================
  // GET /metric-breakdown — per-metric usage (total, devices, per-device)
  //   `exclude` (CSV) defaults to the heartbeat metrics (noise).
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope; exclude?: string };
  }>('/metric-breakdown', qs({ ...DATE_PROPS, app: APP_PROP, exclude: { type: 'string' } }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all' } = request.query;
    const exclude = request.query.exclude !== undefined ? csv(request.query.exclude) : HEARTBEAT_METRICS;

    const sql = `SELECT metric,
                        SUM(value) AS total,
                        COUNT(DISTINCT device_id) AS devices
                 FROM analytics_events
                 WHERE date >= $1 AND date <= $2${andApp(scope)}
                   AND metric <> ALL($3)
                 GROUP BY metric
                 ORDER BY total DESC`;

    const result = await query<{ metric: string; total: string; devices: string }>(
      sql, [from, to, exclude],
    );

    return {
      from, to, app: scope, excluded: exclude,
      data: result.rows.map((r) => {
        const total = Number(r.total);
        const devices = Number(r.devices);
        return {
          metric: r.metric,
          total,
          devices,
          per_device: devices > 0 ? Math.round((total / devices) * 100) / 100 : 0,
        };
      }),
    };
  });

  // =========================================================================
  // GET /events — daily totals for one or more metrics (trend lines)
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope; metric?: string; metrics?: string };
  }>('/events', qs({ ...DATE_PROPS, app: APP_PROP, metric: { type: 'string' }, metrics: { type: 'string' } }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all', metric } = request.query;
    const metrics = csv(request.query.metrics);

    let sql = `SELECT date, metric, SUM(value) AS total
               FROM analytics_events
               WHERE date >= $1 AND date <= $2`;
    const params: unknown[] = [from, to];
    sql += andApp(scope);

    if (metrics.length > 0) {
      sql += ` AND metric = ANY($${params.length + 1})`;
      params.push(metrics);
    } else if (metric) {
      sql += ` AND metric = $${params.length + 1}`;
      params.push(metric);
    }

    sql += ` GROUP BY date, metric ORDER BY date, metric`;

    const result = await query<{ date: string; metric: string; total: string }>(sql, params);

    return {
      from, to, app: scope,
      data: result.rows.map((r) => ({ date: r.date, metric: r.metric, total: Number(r.total) })),
    };
  });

  // =========================================================================
  // GET /usage-duration — minutes/day from weighted heartbeats
  //   session.heartbeat = 30 min, app.heartbeat = 10 min (HEARTBEAT_WEIGHTS).
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope };
  }>('/usage-duration', qs({ ...DATE_PROPS, app: APP_PROP }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all' } = request.query;

    const sql = `SELECT date,
                        COUNT(DISTINCT device_id)::text AS active_devices,
                        ROUND(AVG(weighted))::text AS avg_minutes,
                        SUM(weighted)::text AS total_minutes
                 FROM (
                   SELECT date, device_id,
                          SUM(${heartbeatMinutesSql()}) AS weighted
                   FROM analytics_events
                   WHERE metric IN (${heartbeatMetricsInSql()})
                     AND date >= $1 AND date <= $2${andApp(scope)}
                   GROUP BY date, device_id
                 ) sub
                 GROUP BY date ORDER BY date`;

    const result = await query<{
      date: string; active_devices: string; avg_minutes: string; total_minutes: string;
    }>(sql, [from, to]);

    return {
      from, to, app: scope,
      data: result.rows.map((r) => ({
        date: r.date,
        active_devices: Number(r.active_devices),
        avg_minutes: Number(r.avg_minutes),
        total_minutes: Number(r.total_minutes),
      })),
    };
  });

  // =========================================================================
  // GET /versions — distinct device counts by app / version / os
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string };
  }>('/versions', qs({ ...DATE_PROPS }), async (request) => {
    const { from = defaultFrom(), to = today() } = request.query;
    const range: [string, string] = [from, to];

    const [byApp, byVersion, byOs] = await Promise.all([
      query<{ legacy: string; muxvo2: string }>(
        `SELECT
           COUNT(DISTINCT device_id) FILTER (WHERE metadata->>'app' IS NULL AND metric NOT LIKE 'web:%') AS legacy,
           COUNT(DISTINCT device_id) FILTER (WHERE metadata->>'app' = 'muxvo2') AS muxvo2
         FROM analytics_events
         WHERE date >= $1 AND date <= $2`,
        range,
      ),
      query<{ version: string; devices: string }>(
        `SELECT metadata->>'v' AS version, COUNT(DISTINCT device_id) AS devices
         FROM analytics_events
         WHERE date >= $1 AND date <= $2
           AND metadata->>'app' = 'muxvo2' AND metadata->>'v' IS NOT NULL
         GROUP BY version ORDER BY devices DESC`,
        range,
      ),
      query<{ os: string; devices: string }>(
        `SELECT metadata->>'os' AS os, COUNT(DISTINCT device_id) AS devices
         FROM analytics_events
         WHERE date >= $1 AND date <= $2
           AND metadata->>'app' = 'muxvo2' AND metadata->>'os' IS NOT NULL
         GROUP BY os ORDER BY devices DESC`,
        range,
      ),
    ]);

    return {
      from, to,
      by_app: {
        legacy: Number(byApp.rows[0]?.legacy ?? 0),
        muxvo2: Number(byApp.rows[0]?.muxvo2 ?? 0),
      },
      by_version: byVersion.rows.map((r) => ({ version: r.version, devices: Number(r.devices) })),
      by_os: byOs.rows.map((r) => ({ os: r.os, devices: Number(r.devices) })),
    };
  });

  // =========================================================================
  // GET /errors — top error metrics with impacted devices + common code
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope; limit?: number };
  }>('/errors', qs({ ...DATE_PROPS, app: APP_PROP, limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all', limit = 20 } = request.query;

    const sql = `SELECT metric,
                        COUNT(*) AS occurrences,
                        COUNT(DISTINCT device_id) AS devices,
                        mode() WITHIN GROUP (
                          ORDER BY COALESCE(metadata->>'code', metadata->>'domain', 'unknown')
                        ) AS common_code
                 FROM analytics_events
                 WHERE ${ERROR_METRICS_SQL}
                   AND date >= $1 AND date <= $2${andApp(scope)}
                 GROUP BY metric
                 ORDER BY occurrences DESC
                 LIMIT $3`;

    const result = await query<{
      metric: string; occurrences: string; devices: string; common_code: string;
    }>(sql, [from, to, limit]);

    return {
      from, to, app: scope,
      data: result.rows.map((r) => ({
        metric: r.metric,
        occurrences: Number(r.occurrences),
        devices: Number(r.devices),
        common_code: r.common_code,
      })),
    };
  });

  // =========================================================================
  // GET /churn — churned (inactive) device stats, from the `devices` table
  // =========================================================================

  app.get<{
    Querystring: { app?: AppScope };
  }>('/churn', qs({ app: APP_PROP }), async (request) => {
    const { app: scope = 'all' } = request.query;
    const filter = deviceAppFilterSql(scope, 'devices.device_id');
    const scopeWhere = filter ? ` AND ${filter}` : '';

    // Each window uses its OWN eligible denominator: a device can only "churn"
    // at N days if it has existed at least N days. Sharing the 7d denominator
    // pulls too-young devices into the 14/30d rates and systematically
    // under-reports them (churn_30d was ~2x low).
    const result = await query<{
      churn_7d: string; elig_7d: string;
      churn_14d: string; elig_14d: string;
      churn_30d: string; elig_30d: string;
      total_devices: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE last_seen_at < NOW() - INTERVAL '7 days')::text AS churn_7d,
         COUNT(*) FILTER (WHERE first_seen_at < NOW() - INTERVAL '7 days')::text AS elig_7d,
         COUNT(*) FILTER (WHERE last_seen_at < NOW() - INTERVAL '14 days')::text AS churn_14d,
         COUNT(*) FILTER (WHERE first_seen_at < NOW() - INTERVAL '14 days')::text AS elig_14d,
         COUNT(*) FILTER (WHERE last_seen_at < NOW() - INTERVAL '30 days')::text AS churn_30d,
         COUNT(*) FILTER (WHERE first_seen_at < NOW() - INTERVAL '30 days')::text AS elig_30d,
         COUNT(*)::text AS total_devices
       FROM devices
       WHERE TRUE${scopeWhere}`,
    );

    const row = result.rows[0];
    const win = (count: string, eligible: string) => {
      const c = Number(count);
      const e = Number(eligible);
      return { count: c, eligible: e, rate: e > 0 ? Math.round((c / e) * 1000) / 10 : 0 };
    };

    return {
      app: scope,
      total_devices: Number(row.total_devices),
      churn_7d: win(row.churn_7d, row.elig_7d),
      churn_14d: win(row.churn_14d, row.elig_14d),
      churn_30d: win(row.churn_30d, row.elig_30d),
    };
  });

  // =========================================================================
  // GET /funnel?steps=a,b,c — generic ordered funnel (distinct devices/step)
  // =========================================================================

  app.get<{
    Querystring: { from?: string; to?: string; app?: AppScope; steps?: string };
  }>('/funnel', qs({ ...DATE_PROPS, app: APP_PROP, steps: { type: 'string' } }), async (request) => {
    const { from = defaultFrom(), to = today(), app: scope = 'all' } = request.query;
    const steps = csv(request.query.steps);

    if (steps.length === 0) {
      return { from, to, app: scope, steps: [], data: [] };
    }

    const result = await query<{ metric: string; devices: string }>(
      `SELECT metric, COUNT(DISTINCT device_id) AS devices
       FROM analytics_events
       WHERE metric = ANY($3) AND date >= $1 AND date <= $2${andApp(scope)}
       GROUP BY metric`,
      [from, to, steps],
    );

    const counts = new Map(result.rows.map((r) => [r.metric, Number(r.devices)]));
    const first = counts.get(steps[0]) ?? 0;
    let prev = 0;

    const data = steps.map((metric, i) => {
      const devices = counts.get(metric) ?? 0;
      const fromPrev = i === 0 ? 100 : prev > 0 ? Math.round((devices / prev) * 1000) / 10 : 0;
      const fromFirst = first > 0 ? Math.round((devices / first) * 1000) / 10 : 0;
      prev = devices;
      return { metric, devices, rate_from_prev: fromPrev, rate_from_first: fromFirst };
    });

    return { from, to, app: scope, steps, data };
  });

  // =========================================================================
  // GET /retention — D1/D7/D30 rates + cohort matrix (pivots on `devices`)
  // =========================================================================

  app.get<{
    Querystring: { app?: AppScope; granularity?: 'week' | 'month' };
  }>('/retention', qs({ app: APP_PROP, granularity: { type: 'string', enum: ['week', 'month'], default: 'week' } }), async (request) => {
    const { app: scope = 'all', granularity = 'week' } = request.query;
    const ndFilter = deviceAppFilterSql(scope, 'devices.device_id');
    const ndWhere = ndFilter ? ` AND ${ndFilter}` : '';

    // --- a) Overall retention (D1 / D7 / D30), devices first seen in 60 days ---
    const retentionResult = await query<{ period: string; total_new: string; retained: string }>(
      `WITH new_devices AS (
        SELECT device_id, DATE(first_seen_at) AS first_date
        FROM devices
        WHERE first_seen_at >= NOW() - INTERVAL '60 days'${ndWhere}
      ),
      retention_check AS (
        SELECT
          nd.device_id,
          nd.first_date,
          CASE WHEN EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.device_id = nd.device_id AND ae.date = nd.first_date + 1) THEN 1 ELSE 0 END AS d1,
          CASE WHEN EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.device_id = nd.device_id AND ae.date = nd.first_date + 7) THEN 1 ELSE 0 END AS d7,
          CASE WHEN EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.device_id = nd.device_id AND ae.date = nd.first_date + 30) THEN 1 ELSE 0 END AS d30
        FROM new_devices nd
        WHERE nd.first_date <= CURRENT_DATE - 1
      )
      SELECT 'D1' AS period, COUNT(*)::text AS total_new, SUM(d1)::text AS retained FROM retention_check WHERE first_date <= CURRENT_DATE - 1
      UNION ALL
      SELECT 'D7', COUNT(*)::text, SUM(d7)::text FROM retention_check WHERE first_date <= CURRENT_DATE - 7
      UNION ALL
      SELECT 'D30', COUNT(*)::text, SUM(d30)::text FROM retention_check WHERE first_date <= CURRENT_DATE - 30`,
    );

    const rates: Record<string, { total: number; retained: number; rate: number }> = {};
    for (const row of retentionResult.rows) {
      const total = Number(row.total_new);
      const retained = Number(row.retained);
      rates[row.period] = {
        total,
        retained,
        rate: total > 0 ? Math.round((retained / total) * 1000) / 10 : 0,
      };
    }

    // --- b) Cohort matrix ---
    const truncFn = granularity === 'week' ? `DATE_TRUNC('week', first_seen_at)` : `DATE_TRUNC('month', first_seen_at)`;
    const intervalUnit = granularity === 'week' ? 'weeks' : 'months';
    const maxPeriods = granularity === 'week' ? 12 : 6;

    const cohortResult = await query<{
      cohort: string; cohort_size: string; period_offset: string; active_count: string;
    }>(
      `WITH cohorts AS (
        SELECT device_id, ${truncFn}::date AS cohort
        FROM devices
        WHERE first_seen_at >= NOW() - INTERVAL '${maxPeriods} ${intervalUnit}'${ndWhere}
      ),
      cohort_sizes AS (
        SELECT cohort, COUNT(DISTINCT device_id) AS cohort_size FROM cohorts GROUP BY cohort
      ),
      periods AS (
        SELECT generate_series(0, ${maxPeriods - 1}) AS period_offset
      ),
      activity AS (
        SELECT c.cohort, p.period_offset, COUNT(DISTINCT ae.device_id) AS active_count
        FROM cohorts c
        CROSS JOIN periods p
        JOIN analytics_events ae ON ae.device_id = c.device_id
          AND ae.date >= (c.cohort + (p.period_offset || ' ${intervalUnit}')::interval)::date
          AND ae.date < (c.cohort + ((p.period_offset + 1) || ' ${intervalUnit}')::interval)::date
        GROUP BY c.cohort, p.period_offset
      )
      SELECT cs.cohort::text, cs.cohort_size::text, p.period_offset::text,
             COALESCE(a.active_count, 0)::text AS active_count
      FROM cohort_sizes cs
      CROSS JOIN periods p
      LEFT JOIN activity a ON a.cohort = cs.cohort AND a.period_offset = p.period_offset
      ORDER BY cs.cohort, p.period_offset`,
    );

    const cohortMap = new Map<string, { size: number; retention: number[] }>();
    for (const row of cohortResult.rows) {
      if (!cohortMap.has(row.cohort)) {
        cohortMap.set(row.cohort, { size: Number(row.cohort_size), retention: [] });
      }
      const entry = cohortMap.get(row.cohort)!;
      const activeCount = Number(row.active_count);
      entry.retention.push(entry.size > 0 ? Math.round((activeCount / entry.size) * 1000) / 10 : 0);
    }

    const cohorts = Array.from(cohortMap.entries()).map(([cohort, data]) => ({
      cohort,
      size: data.size,
      retention: data.retention,
    }));

    return { app: scope, rates, cohorts, granularity };
  });
};
