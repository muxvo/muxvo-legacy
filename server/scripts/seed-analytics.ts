import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { pool } from '../src/db/index.js';

// ---------------------------------------------------------------------------
// Local-only analytics seed.
//
// Generates 60 days of realistic three-source data (legacy Electron devices,
// new muxvo2 Swift devices, and anonymous website visitors) plus an admin
// login, then prints the expected aggregate numbers for manual verification.
//
// Safety: refuses to run against anything other than a localhost database.
// All rows it creates use a `seed-` device_id prefix so a re-run is idempotent
// and never touches real data.
//   Run:  npx tsx scripts/seed-analytics.ts
// ---------------------------------------------------------------------------

function assertLocalDb(): void {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    console.error(
      `[seed] Refusing to run: DATABASE_URL host must be localhost/127.0.0.1 (got "${host || '<unparseable>'}").`,
    );
    process.exit(1);
  }
}

// --- Deterministic RNG so the printed expectations are reproducible ---------
let _seed = 20260715;
function rnd(): number {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;

// --- Time helpers -----------------------------------------------------------
const DAYS = 60;
const today = new Date();
today.setHours(0, 0, 0, 0);
/** ISO date (YYYY-MM-DD) for day index i (0 = oldest, DAYS-1 = today). */
function dayStr(i: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - (DAYS - 1 - i));
  return d.toISOString().slice(0, 10);
}
/** Timestamp at ~noon of day index i. */
function tsAt(i: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - (DAYS - 1 - i));
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// --- Event accumulator ------------------------------------------------------
type Row = [string, string, string | null, string, number, string]; // date, device, user, metric, value, metadata json
const rows: Row[] = [];
const MUXVO2_META_BASE = { app: 'muxvo2' as const };

function ev(date: string, device: string, metric: string, value = 1, metadata: Record<string, unknown> = {}): void {
  rows.push([date, device, null, metric, value, JSON.stringify(metadata)]);
}

// --- Metric pools -----------------------------------------------------------
const LEGACY_FEATURES = ['screen.view', 'terminal.create', 'terminal.close', 'chat.open', 'chat.search', 'chat.resume', 'skill.select', 'file.preview', 'theme.switch'] as const;
const LEGACY_ERRORS = ['error.ipc', 'error.terminal', 'error.action'] as const;
const MUXVO2_FEATURES = ['term.created', 'term.closed', 'term.minimized', 'window.opened', 'panel.opened', 'console.created', 'chat.searched', 'files.file_opened', 'skills.opened', 'settings.theme_changed'] as const;
const ERROR_DOMAINS = ['terminal', 'ipc', 'render', 'network'] as const;
const ERROR_CODES = ['E_PTY', 'E_TIMEOUT', 'E_DECODE', 'E_SPAWN'] as const;
const REFERRERS = [
  { referrer: 'https://news.ycombinator.com/item?id=1', utm: undefined },
  { referrer: 'https://www.google.com/search?q=muxvo', utm: undefined },
  { referrer: 'https://twitter.com/i/web/status/1', utm: 'twitter' },
  { referrer: 'https://www.reddit.com/r/macapps/', utm: undefined },
  { referrer: '', utm: 'newsletter' },
  { referrer: 'https://github.com/muxvo/muxvo', utm: undefined },
  { referrer: '', utm: undefined }, // direct
] as const;
const ARCHES = ['arm64', 'x64'] as const;

// --- Device activity model --------------------------------------------------
interface AppDevice {
  id: string;
  firstDay: number;
  lastDay: number;
  activeDays: number[];
}

/** Build a device with a decaying activity curve; returns its active day list. */
function buildActivity(firstDay: number, bouncer: boolean): { active: number[]; last: number } {
  const decay = bouncer ? 0.6 : 0.96;
  const p0 = 0.78;
  const active = [firstDay];
  let last = firstDay;
  for (let d = firstDay + 1; d < DAYS; d++) {
    if (chance(p0 * Math.pow(decay, d - firstDay))) {
      active.push(d);
      last = d;
    }
  }
  return { active, last };
}

// ---------------------------------------------------------------------------
// Generate LEGACY devices (~30)
// ---------------------------------------------------------------------------
const legacyDevices: AppDevice[] = [];
const N_LEGACY = 30;
for (let n = 0; n < N_LEGACY; n++) {
  const id = `seed-legacy-${String(n).padStart(3, '0')}`;
  const firstDay = ri(0, 55);
  const { active, last } = buildActivity(firstDay, chance(0.3));
  legacyDevices.push({ id, firstDay, lastDay: last, activeDays: active });

  for (const day of active) {
    const date = dayStr(day);
    ev(date, id, 'session.start');
    // 1..8 heartbeats/day (each worth 30 min)
    const beats = ri(1, 8);
    for (let b = 0; b < beats; b++) ev(date, id, 'session.heartbeat');
    // a couple of feature events
    for (let f = 0; f < ri(1, 4); f++) ev(date, id, pick(LEGACY_FEATURES));
    if (chance(0.08)) ev(date, id, pick(LEGACY_ERRORS), 1, { code: pick(ERROR_CODES) });
    ev(date, id, 'session.end');
  }
}

// ---------------------------------------------------------------------------
// Generate MUXVO2 devices (~20)
// ---------------------------------------------------------------------------
const muxvo2Devices: (AppDevice & { version: string; os: string })[] = [];
const N_MUXVO2 = 20;
for (let n = 0; n < N_MUXVO2; n++) {
  const id = `seed-muxvo2-${String(n).padStart(3, '0')}`;
  const firstDay = ri(0, 55);
  const version = n % 2 === 0 ? '0.9.0' : '1.0.0';
  const os = chance(0.8) ? 'macOS 15.5' : 'macOS 14.6';
  const meta = { ...MUXVO2_META_BASE, v: version, os };
  const { active, last } = buildActivity(firstDay, chance(0.25));
  muxvo2Devices.push({ id, firstDay, lastDay: last, activeDays: active, version, os });

  active.forEach((day, idx) => {
    const date = dayStr(day);
    if (idx === 0) {
      ev(date, id, 'app.first_launch', 1, meta);
      ev(date, id, 'onboarding.welcome_shown', 1, meta);
      ev(date, id, 'onboarding.tour_ended', 1, { ...meta, outcome: chance(0.7) ? 'completed' : 'skipped', step: ri(1, 4) });
    }
    ev(date, id, 'app.launch', 1, meta);
    const beats = ri(2, 12); // each worth 10 min
    for (let b = 0; b < beats; b++) ev(date, id, 'app.heartbeat', 1, meta);
    for (let f = 0; f < ri(1, 5); f++) {
      const m = pick(MUXVO2_FEATURES);
      const extra: Record<string, unknown> = m === 'panel.opened' ? { panel: pick(['files', 'chat', 'skills']) }
        : m === 'term.created' ? { source: pick(['button', 'shortcut', 'menu']) } : {};
      ev(date, id, m, 1, { ...meta, ...extra });
    }
    if (chance(0.12)) ev(date, id, 'app.error', 1, { ...meta, domain: pick(ERROR_DOMAINS), code: pick(ERROR_CODES) });
    ev(date, id, 'app.quit', ri(3, 180), meta);
  });
}

// Update funnel (clear step decay): 15 prompted → 10 downloaded → 7 applied
let promptedCount = 0, downloadedCount = 0, appliedCount = 0;
muxvo2Devices.forEach((dev, n) => {
  const meta = { ...MUXVO2_META_BASE, v: dev.version, os: dev.os };
  const day = dev.activeDays[Math.min(dev.activeDays.length - 1, ri(0, dev.activeDays.length - 1))];
  const date = dayStr(day);
  if (n < 15) { ev(date, dev.id, 'update.prompted', 1, { ...meta, version: '1.0.0', stage: 'prompt' }); promptedCount++; }
  if (n < 10) { ev(date, dev.id, 'update.downloaded', 1, { ...meta, version: '1.0.0' }); downloadedCount++; }
  if (n < 7) {
    ev(date, dev.id, 'update.applied', 1, { ...meta, from_version: '0.9.0' }); appliedCount++;
    ev(date, dev.id, 'update.choice', 1, { ...meta, stage: 'prompt', choice: 'install' });
  }
});

// ---------------------------------------------------------------------------
// Generate WEB visitors (~200) — device ids NOT inserted into `devices`
// ---------------------------------------------------------------------------
const N_WEB = 200;
let downloadClickDevices = 0;
let downloadClickTotal = 0;
const webVisitorDays = new Set<string>();
for (let n = 0; n < N_WEB; n++) {
  const id = `seed-web-${String(n).padStart(4, '0')}`;
  const ref = pick(REFERRERS);
  const views = ri(1, 4);
  let firstViewDay = -1;
  for (let v = 0; v < views; v++) {
    const day = ri(0, DAYS - 1);
    if (firstViewDay < 0) firstViewDay = day;
    const date = dayStr(day);
    webVisitorDays.add(`${date}|${id}`);
    const meta: Record<string, unknown> = { path: pick(['/', '/download', '/pricing', '/docs']), referrer: ref.referrer };
    if (ref.utm) meta.utm_source = ref.utm;
    ev(date, id, 'web:page_view', 1, meta);
  }
  // ~40% click download
  if (chance(0.4)) {
    const clicks = ri(1, 2);
    downloadClickDevices++;
    downloadClickTotal += clicks;
    for (let c = 0; c < clicks; c++) {
      ev(dayStr(firstViewDay < 0 ? ri(0, DAYS - 1) : firstViewDay), id, 'web:download_click', 1, {
        arch: pick(ARCHES), position: pick(['hero', 'nav', 'footer']),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------
async function bulkInsertEvents(): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = slice.map((r, j) => {
      const b = j * 6;
      values.push(r[0], r[1], r[2], r[3], r[4], r[5]);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}::jsonb)`;
    });
    await pool.query(
      `INSERT INTO analytics_events (date, device_id, user_id, metric, value, metadata) VALUES ${tuples.join(', ')}`,
      values,
    );
  }
}

async function insertDevices(): Promise<void> {
  const all = [
    ...legacyDevices.map((d) => ({ ...d, platform: 'darwin', arch: pick(ARCHES), os: pick(['13.6', '14.5', '15.5']), version: '3.4.0' })),
    ...muxvo2Devices.map((d) => ({ ...d, platform: 'darwin', arch: pick(ARCHES), os: d.os.replace('macOS ', ''), version: d.version })),
  ];
  for (const d of all) {
    await pool.query(
      `INSERT INTO devices (device_id, name, platform, arch, os_version, app_version, hostname, status, first_seen_at, last_seen_at)
       VALUES ($1, $2, 'darwin', $3, $4, $5, $6, 'active', $7, $8)
       ON CONFLICT (device_id) DO UPDATE
         SET first_seen_at = EXCLUDED.first_seen_at, last_seen_at = EXCLUDED.last_seen_at, app_version = EXCLUDED.app_version`,
      [d.id, `Mac (${d.id})`, d.arch, d.os, d.version, `host-${d.id}`, tsAt(d.firstDay), tsAt(d.lastDay)],
    );
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function ensureAdmin(): Promise<{ email: string; password: string }> {
  const email = 'admin@muxvo.com';
  const password = 'admin1234';
  await pool.query(
    `INSERT INTO users (display_name, email, role, status, password_hash)
     VALUES ('Seed Admin', $1, 'admin', 'active', $2)
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin', status = 'active', password_hash = EXCLUDED.password_hash`,
    [email, hashPassword(password)],
  );
  return { email, password };
}

// --- Expectations -----------------------------------------------------------
function computeExpectations() {
  const isMuxvo2 = (meta: string) => meta.includes('"app":"muxvo2"');
  const dauLegacy: Record<string, Set<string>> = {};
  const dauMuxvo2: Record<string, Set<string>> = {};
  const versions: Record<string, Set<string>> = {};
  for (const [date, device, , metric, , meta] of rows) {
    if (metric.startsWith('web:')) continue;
    if (isMuxvo2(meta)) {
      (dauMuxvo2[date] ??= new Set()).add(device);
      const m = /"v":"([^"]+)"/.exec(meta);
      if (m) (versions[m[1]] ??= new Set()).add(device);
    } else {
      (dauLegacy[date] ??= new Set()).add(device);
    }
  }
  const range = (r: Record<string, Set<string>>) => {
    const sizes = Object.values(r).map((s) => s.size);
    return sizes.length ? `${Math.min(...sizes)}..${Math.max(...sizes)}` : '0';
  };
  return {
    totalEvents: rows.length,
    legacyDevices: legacyDevices.length,
    muxvo2Devices: muxvo2Devices.length,
    webDevices: N_WEB,
    dauLegacyRange: range(dauLegacy),
    dauMuxvo2Range: range(dauMuxvo2),
    versionDist: Object.fromEntries(Object.entries(versions).map(([v, s]) => [v, s.size])),
    downloadClickDevices,
    downloadClickTotal,
    funnel: { prompted: promptedCount, downloaded: downloadedCount, applied: appliedCount },
  };
}

async function main(): Promise<void> {
  assertLocalDb();
  console.log('[seed] clearing previous seed rows (device_id LIKE seed-%) ...');
  await pool.query(`DELETE FROM analytics_events WHERE device_id LIKE 'seed-%'`);
  await pool.query(`DELETE FROM devices WHERE device_id LIKE 'seed-%'`);

  console.log(`[seed] inserting ${rows.length} analytics events ...`);
  await bulkInsertEvents();
  console.log(`[seed] inserting ${legacyDevices.length + muxvo2Devices.length} devices ...`);
  await insertDevices();
  const admin = await ensureAdmin();

  const exp = computeExpectations();
  console.log('\n========== EXPECTED NUMBERS (manual verification) ==========');
  console.log(`total events inserted     : ${exp.totalEvents}`);
  console.log(`legacy app devices        : ${exp.legacyDevices}`);
  console.log(`muxvo2 app devices        : ${exp.muxvo2Devices}  (distinct app.first_launch = ${exp.muxvo2Devices})`);
  console.log(`web visitor devices       : ${exp.webDevices}`);
  console.log(`DAU range (legacy)        : ${exp.dauLegacyRange}`);
  console.log(`DAU range (muxvo2)        : ${exp.dauMuxvo2Range}`);
  console.log(`version distribution      : ${JSON.stringify(exp.versionDist)}`);
  console.log(`acquisition funnel        : visitors=${exp.webDevices} → download_click_devices=${exp.downloadClickDevices} (clicks=${exp.downloadClickTotal}) → activations=${exp.muxvo2Devices}`);
  console.log(`update funnel             : prompted=${exp.funnel.prompted} → downloaded=${exp.funnel.downloaded} → applied=${exp.funnel.applied}`);
  console.log(`error events              : from app.error (muxvo2) + error.* (legacy)`);
  console.log(`admin login               : ${admin.email} / ${admin.password}`);
  console.log('============================================================\n');

  await pool.end();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await pool.end();
  process.exit(1);
});
