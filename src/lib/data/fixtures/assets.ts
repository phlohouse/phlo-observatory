/**
 * Mock detail for the Assets area. bronze.bioreactor_telemetry carries the full story from the
 * design (#214: `do_pct` renamed upstream, loads rejected, table stale). Every other table gets
 * plausible detail derived from its own fields in `core.ts`, so no asset page is ever empty.
 */
import type { Asset, Layer, Tone } from '../types'
import { assets, jobs } from './core'

/* ---------- Types ---------- */
export interface AssetColumn {
  name: string
  type: string
  nullable: boolean
  note?: string
  /** Renamed on a work branch, not yet on main. */
  renamedTo?: string
}

export type RunBarState = 'ok' | 'skip' | 'fail'
export interface RunBar {
  value: number
  state: RunBarState
}

/** One character per load: p = passed, w = warned, f = failed, k = skipped */
export interface AssetAudit {
  name: string
  kind: string
  result: string
  failing: boolean
  history: string
  blocks: string
}

export interface SchemaVersion {
  version: string
  ref?: { tone: Tone; label: string }
  when: string
  /** Backticks mark mono spans. */
  change: string
  note: string
  current?: boolean
}

export interface SchemaDiffLine {
  kind: ' ' | '+' | '-'
  name: string
  type: string
  extra?: string
}

export interface CodeUsage {
  file: string
  where: string
  status: { tone: Tone; label: string }
}

export type LineageTone = 'source' | 'job' | 'self' | 'bad' | 'ok' | 'warn'
export interface LineageNode {
  id: string
  sub: string
  name: string
  tone: LineageTone
  subBad?: boolean
  href?: string
}
export interface LineageColumn {
  heading: string
  wide?: boolean
  nodes: LineageNode[]
}

export interface Snapshot {
  id: string
  when: string
  op: string
  rows: string
  files: string
  ref: string
  refKind: 'main' | 'fix' | 'tag'
  by: string
}

export interface MaterializeMode {
  value: 'latest' | 'backfill' | 'full'
  title: string
  hint: string
  estimate: { rows: string; runs: string; time: string; cost: string; cta: string }
}

export interface AssetDetail {
  description: string
  format: string
  source: string
  job: string
  sla: string
  files: string
  sortOrder: string
  contract: string
  columns: AssetColumn[]
  runs: RunBar[]
  audits: AssetAudit[]
  /** Up to four audits shown on the Overview side panel. */
  overviewAudits: AssetAudit[]
  downstream: Array<{ id: string; layer: Layer }>
  downstreamMore?: string
  /** Work branch this asset is being fixed on, if any. */
  workBranch?: string
  schema: {
    versions: SchemaVersion[]
    count: number
    diffTitle: string
    diffNote: string
    diffBadge?: { tone: Tone; label: string }
    diff: SchemaDiffLine[]
    usagesTitle: string
    usages: CodeUsage[]
  }
  lineage: { columns: LineageColumn[]; edges: Array<[string, string]>; label: string }
  columnUse: Array<[string, string]>
  reports: Array<{ name: string; status: { tone?: Tone; label: string } }>
  snapshotStats: Array<{ label: string; value: string; tone?: 'bad' | 'warn' | 'ok' }>
  snapshots: Snapshot[]
  timeTravelId: string
  data: {
    filters: Array<{ column: string; label: string; value?: string }>
    branches: string[]
    rows: string[][]
    shown: string
    asOf: string
    newest?: { tone: 'warn' | 'muted'; text: string }
  }
  materialize: {
    via: string
    modes: MaterializeMode[]
    rebuild?: string
  }
  addAudit: {
    dryRun: string
    footer: string
  }
}

/* ---------- Per-table facts ---------- */
type Facts = { description: string; source?: string; upstream: string[]; columns: Array<[string, string, boolean, string?]> }

const c = (name: string, type: string, nullable = false, note?: string): [string, string, boolean, string?] => [name, type, nullable, note]

const facts: Record<string, Facts> = {
  'bronze.bioreactor_telemetry': {
    description:
      'Raw 10-second process readings from the bioreactor historian, loaded by dlt every 15 minutes. Append-only; one row per vessel per reading.',
    source: 'Process historian',
    upstream: [],
    columns: [
      c('ts', 'timestamptz', false, 'Partition: day(ts)'),
      c('vessel_id', 'string', false, 'Partition: identity'),
      c('run_id', 'string', false, 'Joins to ERP batch'),
      c('ph', 'double', true),
      c('do_pct', 'double', true),
      c('temp_c', 'double', true),
      c('agitation_rpm', 'double', true),
      c('_dlt_load_id', 'string', false, 'Load lineage'),
    ],
  },
  'bronze.elisa_plate_reads': {
    description: 'Raw optical-density reads from the ELISA plate readers, one row per well per read. Loaded by dlt every 10 minutes.',
    source: 'Plate readers',
    upstream: [],
    columns: [
      c('read_ts', 'timestamptz', false, 'Partition: day(read_ts)'),
      c('plate_id', 'string', false, 'Partition: identity'),
      c('well', 'string'),
      c('assay', 'string'),
      c('od_450', 'double', true),
      c('od_570', 'double', true),
      c('reader_id', 'string'),
      c('_dlt_load_id', 'string', false, 'Load lineage'),
    ],
  },
  'bronze.lims_samples': {
    description: 'Sample registrations and status changes pulled from the LIMS API every hour. Append-only change log.',
    source: 'LIMS',
    upstream: [],
    columns: [
      c('sample_id', 'string', false, 'Partition: bucket(16)'),
      c('batch_id', 'string', false, 'Joins to ERP batch'),
      c('sample_type', 'string'),
      c('collected_at', 'timestamptz', false, 'Partition: day(collected_at)'),
      c('status', 'string'),
      c('lims_updated_at', 'timestamptz'),
      c('_dlt_load_id', 'string', false, 'Load lineage'),
    ],
  },
  'bronze.erp_batches': {
    description: 'Batch records from the ERP: product, site, planned and actual start. Loaded hourly by dlt.',
    source: 'ERP batches',
    upstream: [],
    columns: [
      c('batch_id', 'string', false, 'Primary key'),
      c('product_code', 'string'),
      c('site', 'string'),
      c('planned_start', 'timestamptz', true),
      c('actual_start', 'timestamptz', true, 'Partition: month(actual_start)'),
      c('status', 'string'),
      c('_dlt_load_id', 'string', false, 'Load lineage'),
    ],
  },
  'silver.bioreactor_runs_1min': {
    description: 'Telemetry rolled up to one row per vessel per minute, with run and batch attached. Rebuilt by dbt after each load.',
    upstream: ['bronze.bioreactor_telemetry'],
    columns: [
      c('minute', 'timestamptz', false, 'Partition: day(minute)'),
      c('vessel_id', 'string'),
      c('run_id', 'string'),
      c('ph_avg', 'double', true),
      c('do_avg', 'double', true),
      c('temp_avg', 'double', true),
      c('rpm_avg', 'double', true),
    ],
  },
  'silver.feed_events': {
    description: 'Feed additions detected from dissolved-oxygen and weight signals, one row per event.',
    upstream: ['bronze.bioreactor_telemetry'],
    columns: [
      c('event_ts', 'timestamptz', false, 'Partition: day(event_ts)'),
      c('run_id', 'string'),
      c('vessel_id', 'string'),
      c('feed_type', 'string'),
      c('volume_ml', 'double', true),
      c('trigger', 'string', true),
    ],
  },
  'silver.run_summaries': {
    description: 'One row per bioreactor run: start, end and the headline process values used by release and trending.',
    upstream: ['bronze.bioreactor_telemetry'],
    columns: [
      c('run_id', 'string', false, 'Primary key'),
      c('batch_id', 'string'),
      c('vessel_id', 'string'),
      c('started_at', 'timestamptz'),
      c('ended_at', 'timestamptz', true),
      c('min_do', 'double', true),
      c('mean_ph', 'double', true),
      c('peak_temp', 'double', true),
    ],
  },
  'silver.qc_results': {
    description: 'Cleaned QC test results joined to their sample and batch, with the specification limits for each assay.',
    upstream: ['bronze.lims_samples'],
    columns: [
      c('batch_id', 'string'),
      c('sample_id', 'string'),
      c('assay', 'string'),
      c('result', 'double', true),
      c('unit', 'string'),
      c('spec_min', 'double', true),
      c('spec_max', 'double', true),
      c('status', 'string'),
      c('tested_at', 'timestamptz', false, 'Partition: day(tested_at)'),
    ],
  },
  'silver.elisa_results': {
    description: 'Concentrations fitted from ELISA plate reads with a 4PL curve, one row per sample per assay.',
    upstream: ['bronze.elisa_plate_reads'],
    columns: [
      c('plate_id', 'string'),
      c('sample_id', 'string'),
      c('assay', 'string'),
      c('concentration', 'double', true),
      c('cv_pct', 'double', true),
      c('curve_fit', 'string'),
      c('read_ts', 'timestamptz', false, 'Partition: day(read_ts)'),
    ],
  },
  'silver.sample_lineage': {
    description: 'Parent–child links between samples, aliquots and batches, from LIMS and ERP.',
    upstream: ['bronze.lims_samples', 'bronze.erp_batches'],
    columns: [
      c('sample_id', 'string', false, 'Primary key'),
      c('batch_id', 'string'),
      c('parent_sample_id', 'string', true),
      c('derived_at', 'timestamptz'),
      c('source_system', 'string'),
    ],
  },
  'gold.batch_release_metrics': {
    description: 'Everything QA needs to release a batch: process summary, feed history and QC results, one row per batch.',
    upstream: ['silver.bioreactor_runs_1min', 'silver.feed_events', 'silver.qc_results'],
    columns: [
      c('batch_id', 'string', false, 'Primary key'),
      c('product_code', 'string'),
      c('potency_pct', 'double', true),
      c('purity_pct', 'double', true),
      c('yield_g', 'double', true),
      c('release_status', 'string'),
      c('computed_at', 'timestamptz'),
    ],
  },
  'gold.cpp_trends': {
    description: 'Critical process parameters per batch with rolling mean and spread, for the CPP trend report.',
    upstream: ['silver.bioreactor_runs_1min'],
    columns: [
      c('batch_id', 'string'),
      c('parameter', 'string'),
      c('mean', 'double', true),
      c('sd', 'double', true),
      c('window_batches', 'int'),
      c('computed_at', 'timestamptz'),
    ],
  },
  'gold.process_capability': {
    description: 'Cpk and Ppk per critical parameter over the last 30 batches. Rebuilt once a day.',
    upstream: ['silver.run_summaries'],
    columns: [
      c('parameter', 'string', false, 'Primary key'),
      c('cpk', 'double', true),
      c('ppk', 'double', true),
      c('n_batches', 'int'),
      c('window_start', 'date'),
      c('window_end', 'date'),
    ],
  },
  'gold.qc_release_dashboard': {
    description: 'QC status per open batch for the release dashboard: results in, deviations open, ready to release.',
    upstream: ['silver.qc_results', 'silver.sample_lineage'],
    columns: [
      c('batch_id', 'string', false, 'Primary key'),
      c('qc_status', 'string'),
      c('open_deviations', 'int'),
      c('last_result_at', 'timestamptz', true),
      c('released_at', 'timestamptz', true),
    ],
  },
}

const reportsByGold: Record<string, { name: string; status: { tone?: Tone; label: string } }> = {
  'gold.batch_release_metrics': { name: 'Batch release review', status: { tone: 'bad', label: 'QA notified' } },
  'gold.cpp_trends': { name: 'CPP trend report', status: { label: 'next run 12:00' } },
  'gold.process_capability': { name: 'Process capability (Cpk)', status: { label: 'daily' } },
  'gold.qc_release_dashboard': { name: 'QC release dashboard', status: { label: 'live' } },
}

/* ---------- Helpers ---------- */
const byId = (id: string) => assets.find((a) => a.id === id)
const shortName = (id: string) => id.split('.').slice(1).join('.')
const lagNow = (a: Asset) => a.lag.split(' / ')[0]!
const lagTarget = (a: Asset) => a.lag.split(' / ')[1] ?? '60 m'
const minutes = (s: string) => s.replace(/(\d) m$/, '$1 min').replace(/(\d) m /, '$1 min ')
const downstreamOf = (id: string) => Object.entries(facts).filter(([, f]) => f.upstream.includes(id)).map(([k]) => k)

function seeded(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}
const hex = (rnd: () => number, n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join('')

function jobFor(a: Asset) {
  if (a.layer === 'silver') return 'transform_silver'
  if (a.layer === 'gold') return 'transform_gold'
  return { 'bronze.elisa_plate_reads': 'ingest_plate_readers', 'bronze.lims_samples': 'ingest_lims', 'bronze.erp_batches': 'ingest_erp' }[a.id] ?? 'ingest_bioreactor'
}

function sampleValue(name: string, type: string, i: number, rnd: () => number): string {
  const mm = String(26 - Math.floor(i / 6)).padStart(2, '0')
  const ss = String((50 - (i % 6) * 10 + 60) % 60).padStart(2, '0')
  if (type === 'timestamptz') return `2026-09-24 07:${mm}:${ss}`
  if (type === 'date') return i % 2 ? '2026-08-24' : '2026-09-23'
  if (type === 'int') return String(Math.floor(rnd() * 30) + 1)
  if (type === 'double') return (rnd() * 100).toFixed(2)
  const known: Record<string, string[]> = {
    vessel_id: ['BR-V03', 'BR-V01', 'BR-V04'],
    run_id: ['BR-2026-121', 'BR-2026-120'],
    batch_id: ['BR-2026-121', 'BR-2026-120', 'BR-2026-119'],
    sample_id: ['S-091842', 'S-091843', 'S-091851'],
    plate_id: ['P-2291', 'P-2292'],
    assay: ['potency', 'purity', 'hcp'],
    status: ['complete', 'in review', 'pending'],
    qc_status: ['results in', 'waiting on 2', 'ready'],
    release_status: ['on hold', 'ready', 'released'],
    unit: ['%', 'ng/mL'],
    product_code: ['MAB-07', 'MAB-11'],
    site: ['Cambridge', 'Stevenage'],
    feed_type: ['glucose', 'feed B'],
    parameter: ['ph', 'do', 'temp_c'],
    curve_fit: ['4PL', '4PL'],
    well: ['A1', 'A2', 'B1', 'B2'],
    reader_id: ['PR-02', 'PR-03'],
    source_system: ['LIMS', 'ERP'],
    sample_type: ['in-process', 'release', 'stability'],
    trigger: ['do_drop', 'schedule'],
    _dlt_load_id: ['1727162811.4031'],
  }
  const list = known[name]
  if (list) return list[i % list.length]!
  return `${name.split('_')[0]!.toUpperCase()}-${1000 + i}`
}

/* ---------- Derived detail for any table ---------- */
function derive(a: Asset): AssetDetail {
  const f = facts[a.id] ?? { description: `${a.layer[0]!.toUpperCase() + a.layer.slice(1)} table owned by ${a.owner}.`, upstream: [], columns: [c('id', 'string'), c('updated_at', 'timestamptz', true)] }
  const rnd = seeded(a.id)
  const job = jobFor(a)
  const jobInfo = jobs.find((j) => j.name === job)
  const stale = a.health === 'stale'
  const columns: AssetColumn[] = f.columns.map(([name, type, nullable, note]) => ({ name, type, nullable, note }))
  const key = columns.slice(0, 2).map((x) => x.name)
  const sla = minutes(lagTarget(a)).replace(/^1 d$/, '1 day')

  // Rows per run: 48 runs, the newest on the right.
  const base = 40 + Math.floor(rnd() * 60)
  const runs: RunBar[] = Array.from({ length: 48 }, (_, i) => {
    const jitter = base * (0.92 + rnd() * 0.16)
    if (stale && i >= 43) return { value: base, state: 'skip' as const }
    if (a.health === 'warn' && i % 13 === 7) return { value: jitter * 0.6, state: 'ok' as const }
    return { value: jitter, state: 'ok' as const }
  })

  // Audits
  const hist = (bad: boolean, warn: boolean) =>
    bad ? 'p'.repeat(15) + 'f'.repeat(5) : warn ? 'pppppwppppppwppppwpp' : stale ? 'p'.repeat(17) + 'kkk' : 'p'.repeat(20)
  const audits: AssetAudit[] = [
    { name: `not_null(${key.join(', ')})`, kind: 'Not null', result: 'Passed', failing: false, history: hist(false, false), blocks: 'Downstream' },
    { name: `unique(${key.join(', ')})`, kind: 'Unique', result: 'Passed', failing: false, history: hist(false, false), blocks: 'Downstream' },
    { name: 'row_count within 3σ', kind: 'Volume', result: 'Passed', failing: false, history: hist(false, a.health === 'warn'), blocks: 'Warn only' },
  ]
  if (a.id === 'silver.qc_results') {
    audits.push({ name: 'range(result, 90, 110)', kind: 'Range · potency', result: 'Failing · 3 rows', failing: true, history: 'p'.repeat(16) + 'ffff', blocks: 'Downstream' })
  }
  if (a.id === 'bronze.elisa_plate_reads') {
    audits.push({ name: 'columns match contract', kind: 'Schema', result: 'Warning · 1 new column', failing: false, history: 'p'.repeat(19) + 'w', blocks: 'Opens incident' })
  }
  audits.push({
    name: `freshness < ${sla}`,
    kind: 'Freshness',
    result: stale ? `Failing · ${minutes(lagNow(a))}` : 'Passed',
    failing: stale,
    history: hist(stale, a.id === 'bronze.lims_samples'),
    blocks: 'Opens incident',
  })
  const failing = audits.filter((x) => x.failing)
  const overviewAudits = [...audits.filter((x) => !x.failing).slice(0, 4 - Math.min(failing.length, 2)), ...failing.slice(0, 2)]

  // Downstream (two levels)
  const down1 = downstreamOf(a.id)
  const down2 = [...new Set(down1.flatMap(downstreamOf))].filter((d) => !down1.includes(d))
  const layerOf = (id: string) => (byId(id)?.layer ?? (id.split('.')[0] as Layer))
  const countBy = (ids: string[]) => {
    const n: Partial<Record<Layer, number>> = {}
    ids.forEach((id) => (n[layerOf(id)] = (n[layerOf(id)] ?? 0) + 1))
    return (Object.entries(n) as Array<[Layer, number]>).map(([l, k]) => `${k} ${l}`).join(' and ')
  }

  // Lineage
  const node = (id: string): LineageNode => {
    const t = byId(id)
    const s = t?.health === 'stale'
    return {
      id,
      sub: t ? `${s ? 'stale' : t.health === 'warn' ? 'at risk' : 'fresh'} · ${minutes(lagNow(t))}` : id.split('.')[0]!,
      name: shortName(id),
      tone: s ? 'bad' : t?.health === 'warn' ? 'warn' : 'ok',
      subBad: s,
      href: `/assets/${id}`,
    }
  }
  const lcols: LineageColumn[] = []
  const edges: Array<[string, string]> = []
  const jobBad = jobInfo?.status === 'failing'
  const jobNode: LineageNode = { id: `job:${job}`, sub: `Dagster job · ${jobInfo ? jobInfo.statusLabel.toLowerCase() : 'healthy'}`, name: job, tone: 'job', subBad: jobBad, href: `/pipelines/${job}` }
  const self: LineageNode = { id: a.id, sub: `${a.layer} · ${stale ? minutes(lagNow(a)).replace(' min', ' m') : 'fresh'}`, name: shortName(a.id), tone: 'self', subBad: stale }
  if (a.layer === 'bronze') {
    lcols.push({ heading: 'Source', nodes: [{ id: 'src', sub: 'dlt source', name: f.source ?? 'Source', tone: 'source' }] })
    edges.push(['src', jobNode.id])
  } else {
    lcols.push({ heading: 'Upstream', wide: true, nodes: f.upstream.map(node) })
    f.upstream.forEach((u) => edges.push([u, jobNode.id]))
  }
  lcols.push({ heading: 'Job', nodes: [jobNode] })
  edges.push([jobNode.id, a.id])
  lcols.push({ heading: 'This table', nodes: [self] })
  if (down1.length) {
    const l1 = layerOf(down1[0]!)
    lcols.push({ heading: l1 === a.layer ? 'Downstream' : l1, wide: true, nodes: down1.map(node) })
    down1.forEach((d) => edges.push([a.id, d]))
  }
  if (down2.length) {
    lcols.push({ heading: layerOf(down2[0]!), wide: true, nodes: down2.map(node) })
    down1.forEach((d) => downstreamOf(d).forEach((g) => down2.includes(g) && edges.push([d, g])))
  }
  const staleDown = [...down1, ...down2].filter((d) => byId(d)?.health === 'stale').length
  const lineageLabel =
    `${a.layer === 'bronze' ? f.source : f.upstream.map(shortName).join(', ')} feeds ${job}, which writes this table.` +
    (down1.length ? ` This table feeds ${countBy(down1)} table${down1.length > 1 ? 's' : ''}${down2.length ? `, which feed ${countBy(down2)}` : ''}.` : ' Nothing reads from it yet.') +
    (staleDown ? ` ${staleDown} downstream table${staleDown > 1 ? 's are' : ' is'} stale.` : '')

  // Reports
  const golds = [...down1, ...down2, ...(a.layer === 'gold' ? [a.id] : [])].filter((g) => reportsByGold[g])
  const reports = golds.map((g) => {
    const r = reportsByGold[g]!
    const t = byId(g)
    return t?.health === 'stale' || g !== 'gold.batch_release_metrics' ? r : { ...r, status: { label: 'on time' } }
  })

  // Column use
  const columnUse: Array<[string, string]> = columns
    .filter((x) => !x.name.startsWith('_'))
    .slice(0, 4)
    .map((x, i) => [x.name, down1.length === 0 ? 'not read downstream' : i < 2 ? `all ${down1.length} downstream table${down1.length > 1 ? 's' : ''}` : i === 3 ? 'not read downstream' : shortName(down1[0]!)])

  // Schema history
  const added = [...columns].reverse().find((x) => !x.name.startsWith('_') && x.nullable) ?? columns[columns.length - 1]!
  const tsCol = columns.find((x) => x.type === 'timestamptz')
  const versions: SchemaVersion[] = [
    { version: 'v3', ref: { tone: 'neutral', label: 'main' }, when: '14 Aug', change: `Add \`${added.name}\``, note: `${a.owner} · additive`, current: true },
    { version: 'v2', when: '2 Apr', change: tsCol ? `Partition by day(\`${tsCol.name}\`)` : `Sort by \`${columns[0]!.name}\``, note: `${a.owner} · ${tsCol ? 'partition spec change' : 'sort order change'}` },
    { version: 'v1', when: 'Nov 2025', change: 'Table created, initial columns', note: a.owner },
  ]
  let diffBadge: { tone: Tone; label: string } | undefined = { tone: 'ok', label: 'Additive · safe for readers' }
  const diff: SchemaDiffLine[] = columns.map((x) =>
    x.name === added.name
      ? { kind: '+', name: x.name, type: x.type, extra: 'new, nullable' }
      : { kind: ' ', name: x.name, type: x.type, extra: x.nullable ? undefined : 'not null' },
  )
  let diffTitle = 'v2 → v3'
  let usagesTitle = `Downstream code that reads ${added.name}`
  let usages: CodeUsage[] = down1.slice(0, 3).map((d, i) => ({
    file: `models/${layerOf(d)}/${shortName(d)}.sql`,
    where: `line ${12 + i * 7} · ${added.name}`,
    status: { tone: 'neutral', label: 'unaffected' },
  }))
  if (a.id === 'bronze.elisa_plate_reads') {
    versions.unshift({
      version: 'v4',
      ref: { tone: 'warn', label: 'held by contract' },
      when: '1 h ago',
      change: 'Export added `dilution_factor`',
      note: 'Plate reader firmware · waiting on triage (#213)',
      current: true,
    })
    versions[1]!.current = false
    diffTitle = 'v3 → v4'
    diffBadge = { tone: 'warn', label: 'Not applied · contract is freeze' }
    diff.forEach((d) => d.kind === '+' && ((d.kind = ' '), (d.extra = undefined)))
    diff.splice(diff.length - 1, 0, { kind: '+', name: 'dilution_factor', type: 'double', extra: 'in export, not in table' })
    usagesTitle = 'Downstream code that would read dilution_factor'
    usages = [{ file: 'models/silver/elisa_results.sql', where: 'line 41 · concentration × dilution', status: { tone: 'warn', label: 'needs update' } }]
  }

  // Snapshots
  const dayOld = a.lastMaterialized.includes(' d ')
  const whens = dayOld ? [a.lastMaterialized, 'Tue 07:38', 'Mon 07:41'] : [a.lastMaterialized, '08:10 today', '07:10 today']
  const perRun = Math.round(base * 97 + rnd() * 400)
  const fmt = (n: number) => n.toLocaleString('en-GB')
  const snapshots: Snapshot[] = [
    ...whens.map((w, i) => ({
      id: hex(rnd, 12),
      when: w,
      op: a.layer === 'bronze' ? 'append' : 'overwrite · dbt',
      rows: `+${fmt(Math.round(perRun * (0.94 + i * 0.03)))}`,
      files: String(2 + Math.floor(rnd() * 20)),
      ref: 'main',
      refKind: 'main' as const,
      by: 'dagster',
    })),
    { id: hex(rnd, 12), when: '02:14 today', op: 'replace · compaction', rows: '0', files: `−${40 + Math.floor(rnd() * 120)}`, ref: 'main', refKind: 'main', by: 'iceberg_maintenance' },
    { id: hex(rnd, 12), when: 'Mon 18:02', op: 'append', rows: `+${fmt(perRun)}`, files: String(3 + Math.floor(rnd() * 20)), ref: 'release/BR-2026-118', refKind: 'tag', by: 'dagster' },
  ]
  const tt = String(Math.floor(rnd() * 9e15) + 1e15)

  // Sample data
  const sample = Array.from({ length: 13 }, (_, i) => [String(i + 1), ...columns.map((x) => sampleValue(x.name, x.type, i, rnd))])

  const pinned = 3
  const watermark = a.lastMaterialized.includes(' d ') ? 'yesterday 07:39' : '09:22'
  const upstreamFrom = a.layer === 'bronze' ? `the ${f.source ?? 'source'}` : 'its upstream tables'

  return {
    description: f.description,
    format: 'Iceberg v2',
    source: a.layer === 'bronze' ? `${f.source} · dlt` : `dbt model · ${f.upstream.length} upstream`,
    job,
    sla,
    files: `${a.size} · ${fmt(20 + Math.floor(rnd() * 900))} files`,
    sortOrder: key.join(', '),
    contract: a.layer === 'bronze' ? 'freeze' : 'evolve',
    columns,
    runs,
    audits,
    overviewAudits,
    downstream: down1.map((id) => ({ id, layer: layerOf(id) })),
    downstreamMore: down2.length ? `+ ${countBy(down2)} table${down2.length > 1 ? 's' : ''} through these` : undefined,
    schema: {
      versions,
      count: versions.length,
      diffTitle,
      diffNote: 'Compared with main',
      diffBadge,
      diff,
      usagesTitle,
      usages,
    },
    lineage: { columns: lcols, edges, label: lineageLabel },
    columnUse,
    reports,
    snapshotStats: [
      { label: 'Snapshots kept', value: fmt(Math.round(40 + rnd() * 900)) },
      { label: 'Oldest', value: '7 days' },
      { label: 'Pinned by release tags', value: String(pinned) },
      { label: 'Last on main', value: a.lastMaterialized.replace(/ m ago$/, ' min ago'), tone: stale ? 'bad' : undefined },
    ],
    snapshots,
    timeTravelId: tt,
    data: {
      filters: tsCol ? [{ column: tsCol.name, label: 'last 1 hour of data' }] : [],
      branches: ['main'],
      rows: sample,
      shown: `Showing 13 of ${fmt(Math.round(perRun / 20))} matching rows · ${a.rows} in table`,
      asOf: `${tt.slice(0, 4)}…${tt.slice(-4)}`,
      newest: stale ? { tone: 'warn', text: `Newest row ${a.lastMaterialized} · no loads since` } : { tone: 'muted', text: `Newest row ${a.lastMaterialized}` },
    },
    materialize: {
      via: job,
      rebuild: down1.length + down2.length ? `Also rebuild what depends on it: ${countBy([...down1, ...down2])} table${down1.length + down2.length > 1 ? 's' : ''}` : undefined,
      modes: [
        {
          value: 'latest',
          title: 'Next increment only',
          hint: `Picks up from the last watermark (${watermark}). One run.`,
          estimate: { rows: fmt(perRun).replace(/,\d{3}$/, ' k'), runs: '1', time: '1 min', cost: 'Small', cta: 'Run now' },
        },
        {
          value: 'backfill',
          title: 'Backfill a time range',
          hint: `Reloads a window from ${upstreamFrom}, split into hourly partitions.`,
          estimate: { rows: `${Math.round((perRun * 10) / 1000)} k`, runs: '10', time: '6 min', cost: 'Small', cta: 'Start backfill' },
        },
        {
          value: 'full',
          title: 'Full refresh',
          hint: `Drops and reloads the whole table from ${upstreamFrom}. Rarely needed.`,
          estimate: { rows: a.rows, runs: a.layer === 'bronze' ? '120' : '1', time: a.layer === 'gold' ? '4 min' : '2 h', cost: a.layer === 'gold' ? 'Small' : 'Large', cta: 'Start full refresh' },
        },
      ],
    },
    addAudit: {
      dryRun: `Dry run on the last 7 days of \`main\`: **0 of ${fmt(perRun * 7 * 4)} rows** would fail.`,
      footer: 'Added on a new branch, not `main`',
    },
  }
}

/* ---------- bronze.bioreactor_telemetry: the full story ---------- */
function bioreactor(a: Asset): AssetDetail {
  const d = derive(a)
  const bars: RunBar[] = [
    18.9, 19.1, 18.7, 19.4, 18.8, 19.0, 19.3, 18.6, 18.9, 19.2, 19.0, 18.8, 19.5, 19.1, 18.7, 18.9, 19.2, 19.0, 18.6, 19.3, 19.1,
    18.8, 19.0, 19.4, 18.9, 19.2, 18.7, 19.0, 19.1, 18.8, 19.3, 18.9, 19.0, 19.2, 18.7, 19.1, 19.0, 18.9, 19.3, 18.8,
  ].map((v) => ({ value: v, state: 'ok' as const }))
  for (let i = 0; i < 5; i++) bars.push({ value: 18.9, state: 'skip' })
  for (let i = 0; i < 3; i++) bars.push({ value: 2.2, state: 'fail' })

  const columns: AssetColumn[] = [
    { name: 'ts', type: 'timestamptz', nullable: false, note: 'Partition: day(ts)' },
    { name: 'vessel_id', type: 'string', nullable: false, note: 'Partition: identity' },
    { name: 'run_id', type: 'string', nullable: false, note: 'Joins to ERP batch' },
    { name: 'ph', type: 'double', nullable: true },
    { name: 'do_pct', type: 'double', nullable: true, renamedTo: 'do_sat_pct' },
    { name: 'temp_c', type: 'double', nullable: true },
    { name: 'agitation_rpm', type: 'double', nullable: true },
    { name: '_dlt_load_id', type: 'string', nullable: false, note: 'Load lineage' },
  ]

  const P17 = 'p'.repeat(17) + 'kkk'
  const audits: AssetAudit[] = [
    { name: 'not_null(ts, run_id)', kind: 'Not null', result: 'Passed', failing: false, history: P17, blocks: 'Downstream' },
    { name: 'unique(vessel_id, ts)', kind: 'Unique', result: 'Passed', failing: false, history: P17, blocks: 'Downstream' },
    { name: 'range(ph, 6.0, 8.0)', kind: 'Range', result: 'Passed', failing: false, history: 'ppppppppppwppppppkkk', blocks: 'Warn only' },
    { name: 'range(temp_c, 30, 40)', kind: 'Range', result: 'Passed', failing: false, history: P17, blocks: 'Warn only' },
    { name: 'accepted(vessel_id)', kind: 'Accepted values', result: 'Passed', failing: false, history: P17, blocks: 'Downstream' },
    { name: 'row_count within 3σ', kind: 'Volume', result: 'Passed', failing: false, history: P17, blocks: 'Warn only' },
    { name: 'freshness < 60 min', kind: 'Freshness', result: 'Failing · 134 min', failing: true, history: 'p'.repeat(15) + 'fffff', blocks: 'Opens incident' },
  ]

  const rows: string[][] = []
  for (let s = 0; s < 13; s++) {
    let sec = 50 - s * 10
    let mm = 26
    while (sec < 0) {
      sec += 60
      mm -= 1
    }
    rows.push([
      String(s + 1),
      `2026-09-24 07:${mm}:${sec < 10 ? '0' + sec : sec}`,
      'BR-V03',
      'BR-2026-121',
      (7.02 + (((s * 7) % 3) - 1) * 0.01).toFixed(2),
      (41.8 + s * 0.05 + ((s * 5) % 3) * 0.1).toFixed(1),
      (36.98 + (((s * 3) % 3) - 1) * 0.01).toFixed(2),
      (120 + ((s * 11) % 5) * 0.5).toFixed(1),
      '1727162811.4031',
    ])
  }

  return {
    ...d,
    sla: '60 min',
    files: '842 GB · 1,642 files',
    sortOrder: 'vessel_id, ts',
    contract: 'freeze',
    columns,
    runs: bars,
    audits,
    overviewAudits: [audits[0]!, audits[1]!, audits[2]!, audits[6]!],
    workBranch: 'fix/telemetry-schema',
    schema: {
      count: 7,
      versions: [
        { version: 'v7', ref: { tone: 'branch', label: 'fix/telemetry-schema' }, when: '18 min ago', change: 'Rename `do_pct` → `do_sat_pct`', note: 'Gareth · not yet on main', current: true },
        { version: 'v6', ref: { tone: 'neutral', label: 'main' }, when: '12 Jun', change: 'Add `agitation_rpm`', note: 'Gareth · additive' },
        { version: 'v5', when: '2 Apr', change: 'Partition by `vessel_id` as well as day', note: 'Gareth · partition spec change' },
        { version: 'v4', when: '18 Feb', change: 'Widen `ts` to timestamptz', note: 'Gareth · type promotion' },
        { version: 'v1–v3', when: 'Nov 2025', change: 'Table created, initial columns', note: 'Gareth' },
      ],
      diffTitle: 'v6 → v7',
      diffNote: 'Compared with main',
      diffBadge: { tone: 'warn', label: 'Breaking for readers of do_pct' },
      diff: [
        { kind: ' ', name: 'ts', type: 'timestamptz', extra: 'not null' },
        { kind: ' ', name: 'vessel_id', type: 'string', extra: 'not null' },
        { kind: ' ', name: 'run_id', type: 'string', extra: 'not null' },
        { kind: ' ', name: 'ph', type: 'double' },
        { kind: '-', name: 'do_pct', type: 'double' },
        { kind: '+', name: 'do_sat_pct', type: 'double', extra: 'field id 5 kept · rename only' },
        { kind: ' ', name: 'temp_c', type: 'double' },
        { kind: ' ', name: 'agitation_rpm', type: 'double' },
        { kind: ' ', name: '_dlt_load_id', type: 'string', extra: 'not null' },
      ],
      usagesTitle: 'Downstream code that reads do_pct',
      usages: [
        { file: 'models/silver/bioreactor_runs_1min.sql', where: 'line 14 · avg(do_pct)', status: { tone: 'ok', label: 'updated on branch' } },
        { file: 'models/silver/feed_events.sql', where: 'line 31 · do_pct < 30', status: { tone: 'ok', label: 'updated on branch' } },
        { file: 'models/silver/run_summaries.sql', where: 'line 22 · min(do_pct)', status: { tone: 'warn', label: 'needs update' } },
      ],
    },
    columnUse: [
      ['ts, vessel_id', 'all 3 silver tables'],
      ['do_pct', '3 models · renamed on fix branch'],
      ['ph, temp_c', 'runs_1min, run_summaries'],
      ['agitation_rpm', 'not read downstream'],
    ],
    reports: [
      { name: 'Batch release review', status: { tone: 'bad', label: 'QA notified' } },
      { name: 'CPP trend report', status: { label: 'next run 12:00' } },
      { name: 'Process capability (Cpk)', status: { label: 'daily' } },
    ],
    snapshotStats: [
      { label: 'Snapshots kept', value: '2,918' },
      { label: 'Oldest', value: '7 days' },
      { label: 'Pinned by release tags', value: '3' },
      { label: 'Last on main', value: '2 h 14 min ago', tone: 'bad' },
    ],
    snapshots: [
      { id: '5b7f3118a09e', when: '9 min ago', op: 'append', rows: '+184,212', files: '212', ref: 'fix/telemetry-schema', refKind: 'fix', by: 'dagster' },
      { id: 'a1c9e02d44f1', when: '18 min ago', op: 'schema update', rows: '—', files: '0', ref: 'fix/telemetry-schema', refKind: 'fix', by: 'Gareth' },
      { id: '77029148532b', when: '2 h 14 m ago', op: 'append', rows: '+18,904', files: '22', ref: 'main', refKind: 'main', by: 'dagster' },
      { id: '6618d03e7c50', when: '2 h 29 m ago', op: 'append', rows: '+19,122', files: '23', ref: 'main', refKind: 'main', by: 'dagster' },
      { id: '55210fa9b1d7', when: '2 h 44 m ago', op: 'append', rows: '+18,877', files: '22', ref: 'main', refKind: 'main', by: 'dagster' },
      { id: '3e0b77c2f914', when: '02:14 today', op: 'replace · compaction', rows: '0', files: '−188', ref: 'main', refKind: 'main', by: 'iceberg_maintenance' },
      { id: 'c42e9b0a61e3', when: 'Mon 18:02', op: 'append', rows: '+20,417', files: '24', ref: 'release/BR-2026-118', refKind: 'tag', by: 'dagster' },
    ],
    timeTravelId: '7702914853210447',
    data: {
      filters: [
        { column: 'vessel_id', label: '=', value: 'BR-V03' },
        { column: 'ts', label: 'last 1 hour of data' },
      ],
      branches: ['main', 'fix/telemetry-schema'],
      rows,
      shown: 'Showing 13 of 360 matching rows · 1.21 B in table',
      asOf: '7702…0447',
      newest: { tone: 'warn', text: 'Newest row 07:26:50 · no loads since' },
    },
    materialize: {
      via: 'ingest_bioreactor',
      rebuild: 'Also rebuild what depends on it: 3 silver and 3 gold tables',
      modes: [
        { value: 'latest', title: 'Next increment only', hint: 'Picks up from the last watermark (07:26). One run.', estimate: { rows: '19 k', runs: '1', time: '1 min', cost: 'Small', cta: 'Run now' } },
        { value: 'backfill', title: 'Backfill a time range', hint: 'Reloads a window from the source, split into 15-minute partitions.', estimate: { rows: '184 k', runs: '10', time: '6 min', cost: 'Small', cta: 'Start backfill' } },
        { value: 'full', title: 'Full refresh', hint: 'Drops and reloads the whole table from the historian. Rarely needed.', estimate: { rows: '1.21 B', runs: '312', time: '5 h', cost: 'Large', cta: 'Start full refresh' } },
      ],
    },
    addAudit: {
      dryRun: 'Dry run on the last 7 days of `fix/telemetry-schema`: **0 of 362,880 rows** would fail.',
      footer: 'Added to the fix branch, not `main`',
    },
  }
}

export function assetDetail(a: Asset): AssetDetail {
  return a.id === 'bronze.bioreactor_telemetry' ? bioreactor(a) : derive(a)
}

/** Backfill window default: from the last good load to now. */
export const materializeWindow: Record<string, { from: string; to: string }> = {
  'bronze.bioreactor_telemetry': { from: '2026-09-24 07:26', to: 'now' },
}
