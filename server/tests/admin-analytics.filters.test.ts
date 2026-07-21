import { describe, expect, it } from 'vitest';
import { andApp, appFilterSql } from '../src/routes/admin-analytics.js';

// Regression guard for the app-scope predicates. The 'all' scope used to be an
// empty predicate, which let anonymous web: page-view devices inflate
// DAU/WAU/MAU, new-vs-returning and metric-breakdown on the dashboard's
// default tab (real app DAU was 3-6 devices vs 2-12 site visitors a day).

describe('appFilterSql', () => {
  it('all excludes web: events (site visitors are not active devices)', () => {
    expect(appFilterSql('all')).toBe(`metric NOT LIKE 'web:%'`);
  });

  it('legacy = no app key and not a web: event', () => {
    expect(appFilterSql('legacy')).toBe(
      `metric NOT LIKE 'web:%' AND metadata->>'app' IS NULL`,
    );
  });

  it('muxvo2 = tagged rows only', () => {
    expect(appFilterSql('muxvo2')).toBe(`metadata->>'app' = 'muxvo2'`);
  });
});

describe('andApp', () => {
  it('wraps every scope in AND (...) — no scope is a no-op anymore', () => {
    expect(andApp('all')).toBe(` AND (metric NOT LIKE 'web:%')`);
    expect(andApp('legacy')).toBe(
      ` AND (metric NOT LIKE 'web:%' AND metadata->>'app' IS NULL)`,
    );
    expect(andApp('muxvo2')).toBe(` AND (metadata->>'app' = 'muxvo2')`);
  });
});
