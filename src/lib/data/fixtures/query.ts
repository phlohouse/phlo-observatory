/**
 * Mock data for the Query workspace: the catalog tree, saved queries, the two open query tabs
 * and the result of the DO-trend query for run BR-2026-121 (the #214 story — rows stop at 07:26
 * because bronze.bioreactor_telemetry is 2 h 14 m behind).
 */
import type { Layer } from '../types'

export interface CatalogColumn {
  name: string
  type: string
}

export interface CatalogTable {
  name: string
  stale?: boolean
  columns: CatalogColumn[]
}

export interface CatalogLayer {
  layer: Layer
  count: number
  tables: CatalogTable[]
}

export interface SavedQuery {
  id: string
  name: string
  starred?: boolean
}

export interface QueryTabDef {
  id: string
  name: string
  sql: string
}

export interface ResultRow {
  minute: string
  vessel: string
  ph: string
  doPct: string
  temp: string
  n: number
}

const c = (name: string, type: string): CatalogColumn => ({ name, type })

export const catalog: CatalogLayer[] = [
  {
    layer: 'bronze',
    count: 52,
    tables: [
      {
        name: 'bioreactor_telemetry',
        stale: true,
        columns: [
          c('ts', 'timestamptz'),
          c('vessel_id', 'string'),
          c('run_id', 'string'),
          c('ph', 'double'),
          c('do_pct', 'double'),
          c('temp_c', 'double'),
          c('agitation_rpm', 'double'),
        ],
      },
      {
        name: 'elisa_plate_reads',
        columns: [c('read_at', 'timestamptz'), c('plate_id', 'string'), c('well', 'string'), c('od_450', 'double'), c('reader_id', 'string')],
      },
      {
        name: 'erp_batches',
        columns: [c('batch_id', 'string'), c('product', 'string'), c('status', 'string'), c('updated_at', 'timestamptz')],
      },
      {
        name: 'lims_samples',
        columns: [c('sample_id', 'string'), c('batch_id', 'string'), c('test_code', 'string'), c('received_at', 'timestamptz')],
      },
    ],
  },
  {
    layer: 'silver',
    count: 61,
    tables: [
      {
        name: 'bioreactor_runs_1min',
        columns: [c('minute', 'timestamptz'), c('run_id', 'string'), c('ph', 'double'), c('do_pct', 'double'), c('temp_c', 'double')],
      },
      {
        name: 'qc_results',
        columns: [c('result_id', 'string'), c('batch_id', 'string'), c('test_code', 'string'), c('value', 'double'), c('unit', 'string')],
      },
      {
        name: 'elisa_results',
        columns: [c('plate_id', 'string'), c('sample_id', 'string'), c('conc_ng_ml', 'double'), c('curve_fit', 'string')],
      },
      {
        name: 'sample_lineage',
        columns: [c('sample_id', 'string'), c('parent_id', 'string'), c('batch_id', 'string')],
      },
    ],
  },
  {
    layer: 'gold',
    count: 35,
    tables: [
      {
        name: 'batch_release_metrics',
        columns: [c('batch_id', 'string'), c('release_ready', 'boolean'), c('open_deviations', 'int'), c('updated_at', 'timestamptz')],
      },
      {
        name: 'cpp_trends',
        columns: [c('run_id', 'string'), c('parameter', 'string'), c('hour', 'timestamptz'), c('mean', 'double'), c('sd', 'double')],
      },
      {
        name: 'qc_release_dashboard',
        columns: [c('batch_id', 'string'), c('tests_passed', 'int'), c('tests_total', 'int')],
      },
    ],
  },
]

export const savedQueries: SavedQuery[] = [
  { id: 'do-trend', name: 'DO trend by run', starred: true },
  { id: 'dupes', name: 'Duplicate result check' },
  { id: 'release', name: 'Batch release readiness' },
  { id: 'audit-7d', name: 'Audit failures · last 7 d' },
]

export const doTrendSql = `-- Dissolved oxygen per minute for one run
SELECT
  date_trunc('minute', ts)  AS minute,
  vessel_id,
  round(avg(ph), 2)          AS ph,
  round(avg(do_pct), 1)      AS do_pct,
  round(avg(temp_c), 2)      AS temp_c,
  count(*)                   AS n
FROM bronze.bioreactor_telemetry
WHERE vessel_id = 'BR-V03' AND run_id = 'BR-2026-121'
  AND ts >= now() - INTERVAL 6 HOUR
GROUP BY ALL
ORDER BY minute DESC
LIMIT 500;`

export const savedSql: Record<string, string> = {
  'do-trend': doTrendSql,
  dupes: `-- Result rows that appear more than once
SELECT batch_id, test_code, count(*) AS copies
FROM silver.qc_results
GROUP BY ALL
HAVING count(*) > 1
ORDER BY copies DESC;`,
  release: `-- Batches waiting on release
SELECT batch_id, tests_passed, tests_total, open_deviations
FROM gold.batch_release_metrics
WHERE NOT release_ready
ORDER BY updated_at DESC;`,
  'audit-7d': `-- Audit failures in the last 7 days
SELECT model, audit, failed_at, rows_failing
FROM phlo.audit_results
WHERE status = 'fail' AND failed_at >= now() - INTERVAL 7 DAY
ORDER BY failed_at DESC;`,
}

export const openTabs: QueryTabDef[] = [
  { id: 'do-trend', name: 'DO trend · BR-2026-121', sql: doTrendSql },
  { id: 'dupes', name: 'Duplicate result check', sql: savedSql.dupes! },
]

/* ---------- The DO-trend result: 360 minutes, newest first ---------- */
const headPh = [7.02, 7.03, 7.02, 7.01, 7.02, 7.03, 7.03, 7.02, 7.01, 7.02, 7.02, 7.03, 7.02]
const headDo = [41.8, 41.9, 42.1, 42.0, 42.2, 42.3, 42.2, 42.4, 42.5, 42.4, 42.6, 42.7, 42.6]
const headTemp = [36.98, 36.97, 36.98, 36.99, 36.98, 36.97, 36.98, 36.98, 36.99, 36.98, 36.97, 36.98, 36.98]

function minuteLabel(minutesBefore0726: number) {
  const total = 7 * 60 + 26 - minutesBefore0726
  const h = Math.floor(total / 60)
  const m = total % 60
  return `2026-09-24 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const doTrendRows: ResultRow[] = Array.from({ length: 360 }, (_, i) => {
  let ph: number
  let dO: number
  let temp: number
  if (i < headPh.length) {
    ph = headPh[i]!
    dO = headDo[i]!
    temp = headTemp[i]!
  } else {
    // Older minutes: DO drifts from ~48% down to ~42.6%, with the feed bump around 04:30.
    const k = 360 - i
    let base = 48 - (k / 6) * 0.1
    const feed = Math.abs(i - 176)
    if (feed < 24) base += (1 - feed / 24) * 4.4
    dO = base + Math.sin(i * 1.7) * 0.3
    ph = 7.02 + Math.round(Math.sin(i * 0.9)) * 0.01
    temp = 36.98 + Math.round(Math.sin(i * 1.3)) * 0.01
  }
  return { minute: minuteLabel(i), vessel: 'BR-V03', ph: ph.toFixed(2), doPct: dO.toFixed(1), temp: temp.toFixed(2), n: 6 }
})

export const doTrendStats = {
  rows: 360,
  time: '1.4 s',
  read: '212 MB',
  files: '4 of 1,642 files',
  ref: 'main@8f3c21a',
  snapshot: '7702…0447',
  newest: '07:26',
  behind: '2 h 14 m',
}

export const doTrendPlan = `PROJECTION  minute, vessel_id, ph, do_pct, temp_c, n
└─ ORDER BY  minute DESC · LIMIT 500
   └─ HASH_GROUP_BY  groups: 360
      └─ FILTER  run_id = 'BR-2026-121'
         └─ ICEBERG_SCAN  bronze.bioreactor_telemetry
               ref         main @ 8f3c21a
               snapshot    7702914853210447
               partitions  day(ts) in [2026-09-24] · vessel_id = 'BR-V03'
               files       4 of 1,642 read · 1,638 pruned
               bytes       212 MB of 842 GB
               rows        2,160 scanned → 2,160 kept`

/** 61 points (every 6 min) for the chart, oldest first — same curve as the design. */
export const doTrendChart: number[] = Array.from({ length: 61 }, (_, k) => {
  let base = 48 - k * 0.1
  if (k >= 28 && k <= 34) base += (4 - Math.abs(31 - k)) * 1.1
  if (k < 60) base += Math.sin(k * 1.7) * 0.35
  return base
})

export const refs = ['main', 'fix/telemetry-schema', 'feat/qc-trend-alerts', 'release/BR-2026-118'] as const
export const engines = ['DuckDB', 'Trino', 'Spark SQL'] as const
