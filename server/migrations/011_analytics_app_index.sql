-- Up

-- Speeds up the /admin/analytics endpoints that filter/group by the app
-- dimension (legacy vs muxvo2) stored in metadata->>'app', scoped by date.
CREATE INDEX IF NOT EXISTS idx_ae_app_date
  ON analytics_events (((metadata->>'app')), date);

-- Down

DROP INDEX IF EXISTS idx_ae_app_date;
