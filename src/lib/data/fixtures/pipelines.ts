/**
 * Mock data for the Pipelines area: all 104 Dagster jobs (the at-scale list), per-run detail
 * for the job page, and the 24 h run timeline. Same story as core.ts: the process-historian
 * rename broke the three bioreactor loads (#214), the LIMS API is slow (#207).
 * The 8 core jobs keep their core.ts numbers; everything else is derived here.
 */
import type { Job, RunCode } from '../types'
import * as core from './core'

const runs = (s: string) => s.split('') as RunCode[]

export type ScaleStatus = 'failing' | 'slow' | 'paused' | 'ok'
export type Team = 'Data platform' | 'QC Analytics' | 'Process Dev' | 'Assay Dev'
export type SourceName = 'Process historian' | 'LIMS' | 'Plate readers' | 'Env sensors' | 'ERP · MES' | 'Internal'

export interface ScaleJob {
  name: string
  domain: string
  source: SourceName
  team: Team
  /** Person or team shown in the Owner column */
  owner: string
  status: ScaleStatus
  reason?: string
  runs: RunCode[] // last 24, oldest → newest
  last: string // "6 min"
  sched: string // "every 15 min"
  kind: string
  incidentId?: string
  mine?: boolean
  release?: boolean
  /** Order in the pinned "Needs attention" list */
  pin?: number
}

export interface DomainGroup {
  name: string
  note: string
  rate: string
  owner: string
}

export const pipelineSummary = {
  jobs: 104,
  runs24h: '2,412',
  successRate: '97.9%',
  failing: 3,
  slow: 7,
  paused: 2,
  healthy: 92,
}

/** Domain groups in display order, with the design's notes and 24 h success rates. */
export const domainGroups: DomainGroup[] = [
  { name: 'Bioreactor', note: 'Plus 3 failing, above', rate: '99.6%', owner: 'Process Dev · Data platform' },
  { name: 'QC & LIMS', note: 'Plus 4 slow, above', rate: '99.9%', owner: 'QC Analytics' },
  { name: 'Assay', note: 'All healthy', rate: '100%', owner: 'Assay Dev' },
  { name: 'Environmental monitoring', note: 'Plus 1 slow, above', rate: '100%', owner: 'Data platform' },
  { name: 'Maintenance', note: 'Plus 1 slow, above', rate: '100%', owner: 'Data platform' },
  { name: 'ERP & supply', note: 'Plus 1 slow, 1 paused', rate: '99.8%', owner: 'Data platform' },
  { name: 'Reporting', note: 'Plus 1 paused', rate: '100%', owner: 'QC Analytics' },
]

const domainSource: Record<string, SourceName> = {
  Bioreactor: 'Process historian',
  'QC & LIMS': 'LIMS',
  Assay: 'Plate readers',
  'Environmental monitoring': 'Env sensors',
  Maintenance: 'Internal',
  'ERP & supply': 'ERP · MES',
  Reporting: 'Internal',
}

const domainTeam: Record<string, Team> = {
  Bioreactor: 'Process Dev',
  'QC & LIMS': 'QC Analytics',
  Assay: 'Assay Dev',
  'Environmental monitoring': 'Data platform',
  Maintenance: 'Data platform',
  'ERP & supply': 'Data platform',
  Reporting: 'QC Analytics',
}

/** The 12 jobs that need attention, exactly as the design lists them. */
type AttentionSpec = [ScaleStatus, string, string, string, string, string, string, Team, string?]
const attentionSpecs: AttentionSpec[] = [
  ['failing', 'ingest_bioreactor', 'Bioreactor', 'Failing ×3 · schema contract', 'sssssssssssssssskkkkkfff', '6 min', 'Gareth', 'Data platform', '214'],
  ['failing', 'ingest_bioreactor_offgas', 'Bioreactor', 'Failing ×3 · schema contract', 'sssssssssssssssskkkkkfff', '8 min', 'Process Dev', 'Process Dev', '214'],
  ['failing', 'ingest_bioreactor_feeds', 'Bioreactor', 'Failing ×2 · schema contract', 'ssssssssssssssssskkkkkff', '11 min', 'Process Dev', 'Process Dev', '214'],
  ['slow', 'ingest_lims', 'QC & LIMS', '11 m vs 3 m usual · LIMS API latency', 'sssssssssssssssswwwwwwww', '14 min', 'Gareth', 'Data platform', '207'],
  ['slow', 'ingest_lims_results', 'QC & LIMS', '8 m vs 2 m usual · LIMS API latency', 'ssssssssssssssssswwwwwww', '14 min', 'QC Analytics', 'QC Analytics', '207'],
  ['slow', 'transform_silver_qc', 'QC & LIMS', 'Waiting on ingest_lims', 'ssssssssssssssssswwwwwww', '9 min', 'QC Analytics', 'QC Analytics'],
  ['slow', 'transform_gold_release', 'QC & LIMS', 'Waiting on transform_silver_qc', 'sssssssssssssssssswwwwww', '4 min', 'QC Analytics', 'QC Analytics'],
  ['slow', 'ingest_env_monitoring', 'Environmental monitoring', '2.4× usual · 3 new sensors added', 'ssssssssssssssswwwwwwwww', '2 min', 'Data platform', 'Data platform'],
  ['slow', 'ingest_cold_chain_temps', 'ERP & supply', 'Queued behind maintenance at 02:00', 'sssssssswsssssssssssssss', '20 min', 'Data platform', 'Data platform'],
  ['slow', 'iceberg_compact_bronze', 'Maintenance', '48 m vs 20 m · 412 small files', 'wwwwwwwwwwwwwwwwwwwwwwww', '8 h', 'Data platform', 'Data platform'],
  ['paused', 'ingest_legacy_mes', 'ERP & supply', 'Paused by Rui P. · system retiring', 'pppppppppppppppppppppppp', '6 d', 'Data platform', 'Data platform'],
  ['paused', 'report_batch_pdf', 'Reporting', 'Paused by Chris T. · template change', 'ssssssssssssssssspppppppp', '9 h', 'QC Analytics', 'QC Analytics'],
]

/** Healthy jobs per domain: [name, schedule, team override?, runs override?] */
type HealthySpec = [string, string, Team?, string?]
const healthySpecs: Record<string, HealthySpec[]> = {
  Bioreactor: [
    ['ingest_bioreactor_alarms', 'every 5 min'],
    ['ingest_bioreactor_setpoints', 'every 15 min'],
    ['ingest_bioreactor_batch_meta', 'hourly'],
    ['ingest_harvest_log', 'hourly'],
    ['ingest_seed_train', 'every 30 min'],
    ['ingest_bioreactor_ph_probes', 'every 15 min'],
    ['ingest_bioreactor_gas_flows', 'every 15 min'],
    ['transform_bioreactor_1min', 'on upstream', undefined, 'sssssssssssssssssssskkkk'],
    ['transform_run_summaries', 'on upstream', undefined, 'sssssssssssssssssssskkkk'],
    ['transform_feed_events', 'on upstream', undefined, 'sssssssssssssssssssskkkk'],
    ['gold_cpp_trends', 'every 2 h', undefined, 'ssssssssssssssssssssskkk'],
  ],
  'QC & LIMS': [
    ['ingest_lims_methods', 'daily 01:00'],
    ['ingest_lims_instruments', 'hourly'],
    ['transform_silver_sample_lineage', 'on upstream'],
    ['audits_qc', 'hourly at :30'],
    ['ingest_coa_documents', 'hourly'],
    ['ingest_sample_lineage', 'hourly'],
    ['transform_silver', 'on upstream'],
    ['ingest_lims_specs', 'daily 01:15'],
    ['ingest_lims_stability', 'hourly', 'Process Dev'],
    ['ingest_lims_deviations', 'hourly', 'Process Dev'],
    ['ingest_lims_users', 'daily 00:30', 'Process Dev'],
    ['transform_silver_stability', 'on upstream', 'Process Dev'],
    ['transform_silver_deviations', 'on upstream', 'Process Dev'],
    ['audits_stability', 'daily 02:15', 'Process Dev'],
    ['audits_sample_lineage', 'hourly at :45'],
    ['ingest_capa_records', 'hourly'],
    ['ingest_oos_investigations', 'hourly'],
    ['ingest_lims_micro', 'every 30 min', 'Process Dev'],
  ],
  Assay: [
    ['ingest_plate_readers', 'every 10 min'],
    ['ingest_elisa_plate_maps', 'every 10 min'],
    ['transform_silver_elisa_results', 'on upstream'],
    ['transform_gold_assay_potency', 'on upstream'],
    ['ingest_hplc_runs', 'every 15 min'],
    ['ingest_qpcr_runs', 'every 15 min'],
    ['ingest_flow_cytometry', 'every 30 min'],
    ['ingest_cell_counts', 'every 15 min'],
    ['ingest_bioassay_plates', 'every 10 min'],
    ['ingest_elisa_standards', 'daily 00:15'],
    ['transform_silver_hplc_peaks', 'on upstream'],
    ['transform_silver_qpcr', 'on upstream'],
    ['transform_silver_cell_counts', 'on upstream'],
    ['transform_elisa_4pl_curves', 'on upstream'],
    ['transform_gold_assay_trends', 'hourly'],
    ['audits_assay', 'hourly at :20'],
    ['ingest_spectro_reads', 'every 15 min'],
    ['ingest_osmolality', 'every 30 min'],
  ],
  'Environmental monitoring': [
    ['ingest_env_particles', 'every 5 min'],
    ['ingest_env_pressure', 'every 5 min'],
    ['ingest_env_humidity', 'every 5 min'],
    ['transform_silver_env_excursions', 'on upstream'],
    ['ingest_cleanroom_doors', 'every 15 min'],
    ['ingest_env_temperature', 'every 5 min'],
    ['ingest_env_co2', 'every 5 min'],
    ['ingest_water_system_toc', 'every 15 min'],
    ['ingest_water_conductivity', 'every 15 min'],
    ['ingest_compressed_gases', 'every 30 min'],
    ['ingest_freezer_temps', 'every 5 min'],
    ['ingest_incubator_temps', 'every 5 min'],
    ['transform_env_excursions', 'on upstream'],
    ['transform_gold_env_trends', 'hourly'],
    ['audits_env_limits', 'hourly at :10'],
  ],
  Maintenance: [
    ['iceberg_maintenance', 'daily 02:00'],
    ['iceberg_expire_snapshots', 'daily 03:00'],
    ['iceberg_compact_silver', 'daily 02:30'],
    ['iceberg_compact_gold', 'daily 02:45'],
    ['nessie_gc', 'weekly'],
    ['iceberg_rewrite_manifests', 'daily 03:15'],
    ['iceberg_remove_orphans', 'weekly'],
    ['nessie_branch_cleanup', 'daily 04:00'],
    ['postgres_vacuum', 'daily 03:30'],
    ['catalog_backup', 'daily 01:00'],
    ['object_store_lifecycle', 'daily 05:00'],
  ],
  'ERP & supply': [
    ['ingest_erp', 'hourly'],
    ['ingest_erp_materials', 'hourly'],
    ['ingest_supplier_lots', 'every 30 min'],
    ['transform_silver_inventory', 'on upstream', 'Process Dev'],
    ['ingest_po_lines', 'hourly'],
    ['ingest_erp_batches', 'hourly'],
    ['ingest_mes_batch_records', 'every 30 min'],
  ],
  Reporting: [
    ['report_qc_release_dashboard', 'every 15 min'],
    ['report_cpp_weekly', 'weekly', 'Process Dev'],
    ['report_deviation_summary', 'daily 06:00'],
    ['report_audit_trail_export', 'daily 05:00'],
    ['report_env_monthly', 'monthly'],
    ['transform_gold', 'on upstream'],
    ['report_batch_genealogy', 'hourly'],
    ['report_stability_trends', 'daily 06:30'],
    ['report_yield_summary', 'daily 07:00', 'Process Dev'],
    ['report_oee_weekly', 'weekly', 'Process Dev'],
    ['report_capa_status', 'daily 07:30'],
    ['report_kpi_monthly', 'monthly'],
  ],
}

const releaseJobs = new Set([
  'ingest_bioreactor', 'ingest_bioreactor_offgas', 'ingest_bioreactor_feeds', 'transform_bioreactor_1min',
  'transform_run_summaries', 'gold_cpp_trends', 'ingest_lims', 'ingest_lims_results', 'transform_silver_qc',
  'transform_gold_release', 'audits_qc', 'transform_silver', 'ingest_coa_documents', 'transform_gold_assay_potency',
  'ingest_erp_batches', 'report_qc_release_dashboard', 'transform_gold',
])

/** Stable small hash, so derived numbers don't change between renders. */
export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function kindOf(name: string) {
  if (name.startsWith('ingest_')) return 'Ingest · dlt'
  if (name.startsWith('transform_') || name.startsWith('gold_')) return 'Transform · dbt'
  if (name.startsWith('audits_')) return 'Audits'
  if (name.startsWith('report_')) return 'Report'
  if (name === 'iceberg_maintenance') return 'Compaction · expiry'
  return 'Maintenance'
}

/** Minutes between runs for a schedule label. */
export function intervalOf(sched: string) {
  const m = /every (\d+) (min|h)/.exec(sched)
  if (m) return Number(m[1]) * (m[2] === 'h' ? 60 : 1)
  if (sched.startsWith('hourly') || sched === 'on upstream') return 60
  if (sched.startsWith('daily')) return 1440
  if (sched === 'weekly') return 10080
  if (sched === 'monthly') return 43200
  return 60
}

function lastFor(name: string, sched: string) {
  const every = intervalOf(sched)
  const h = hash(name)
  if (every < 60) return `${(h % every) + 1} min`
  if (every === 60) return `${(h % 55) + 3} min`
  if (every === 1440) {
    const t = /(\d\d):(\d\d)/.exec(sched)
    const hrs = t ? (9 * 60 + 41 - (Number(t[1]) * 60 + Number(t[2])) + 1440) % 1440 : 420
    return `${Math.floor(hrs / 60)} h`
  }
  return `${(h % 5) + 1} d`
}

function build(): ScaleJob[] {
  const out: ScaleJob[] = []
  for (const g of domainGroups) {
    for (const a of attentionSpecs.filter((x) => x[2] === g.name)) {
      const [status, name, domain, reason, r, last, owner, team, incidentId] = a
      const coreJob = core.jobs.find((j) => j.name === name)
      out.push({
        name, domain, source: domainSource[domain]!, team, owner, status, reason, runs: runs(r), last,
        sched: coreJob ? schedFromCron(coreJob.cron) : name === 'iceberg_compact_bronze' ? 'daily 02:00' : name === 'ingest_legacy_mes' ? 'hourly' : name === 'report_batch_pdf' ? 'daily 06:00' : name.startsWith('transform_') ? 'on upstream' : name === 'ingest_env_monitoring' ? 'every 5 min' : name === 'ingest_bioreactor_offgas' ? 'every 15 min' : name === 'ingest_bioreactor_feeds' ? 'hourly' : 'every 30 min',
        kind: kindOf(name), incidentId, pin: attentionSpecs.indexOf(a),
      })
    }
    for (const [name, sched, teamOverride, r] of healthySpecs[g.name] ?? []) {
      const coreJob = core.jobs.find((j) => j.name === name)
      const team = teamOverride ?? domainTeam[g.name]!
      out.push({
        name, domain: g.name, source: domainSource[g.name]!, team, owner: team, status: 'ok',
        runs: coreJob ? coreJob.runs : runs(r ?? 's'.repeat(24)),
        last: coreJob ? coreJob.lastRun.replace(/ ago$/, '') : lastFor(name, sched),
        sched, kind: coreJob?.kind ?? kindOf(name),
      })
    }
  }
  for (const j of out) {
    j.mine = j.team === 'Data platform' && (j.domain !== 'ERP & supply' || j.name === 'ingest_cold_chain_temps')
    j.release = releaseJobs.has(j.name)
  }
  return out
}

function schedFromCron(cron: string) {
  const every = /^\*\/(\d+) \* \* \* \*$/.exec(cron)
  if (every) return `every ${every[1]} min`
  if (cron === '0 * * * *') return 'hourly'
  if (cron === '30 * * * *') return 'hourly at :30'
  const daily = /^(\d+) (\d+) \* \* \*$/.exec(cron)
  if (daily) return `daily ${daily[2]!.padStart(2, '0')}:${daily[1]!.padStart(2, '0')}`
  return cron
}

export function cronFromSched(sched: string) {
  const every = /every (\d+) min/.exec(sched)
  if (every) return `*/${every[1]} * * * *`
  const everyH = /every (\d+) h/.exec(sched)
  if (everyH) return `0 */${everyH[1]} * * *`
  const at = /hourly at :(\d\d)/.exec(sched)
  if (at) return `${Number(at[1])} * * * *`
  if (sched === 'hourly') return '0 * * * *'
  const daily = /daily (\d\d):(\d\d)/.exec(sched)
  if (daily) return `${Number(daily[2])} ${Number(daily[1])} * * *`
  if (sched === 'weekly') return '0 4 * * 0'
  if (sched === 'monthly') return '0 5 1 * *'
  return 'on upstream'
}

export const scaleJobs: ScaleJob[] = build()

/* ------------------------------------------------------------------ */
/* Job detail: one record per run of the last 24                       */
/* ------------------------------------------------------------------ */

export type StepState = 'ok' | 'slow' | 'failed' | 'skipped'
export interface RunStep {
  name: string
  state: StepState
  /** Position on the run's own time axis, 0–100 */
  start: number
  width: number
  duration: string
}
export interface RunDetail {
  index: number
  id: string
  code: RunCode
  ago: string
  duration: string
  trigger: string
  steps: RunStep[]
  error?: string
  note?: string
  failedStep?: string
}

export interface JobDetail {
  job: Job & { sched: string; target: string; source: string; team: string; domain: string }
  incident?: { id: string; title: string }
  runs: RunDetail[]
  siblings: ScaleJob[]
}

const stepNames: Record<string, string[]> = {
  'Ingest · dlt': ['extract', 'normalize', 'load', 'materialize'],
  'Transform · dbt': ['compile', 'run', 'test', 'materialize'],
  Audits: ['collect', 'check', 'record', 'notify'],
  Report: ['query', 'render', 'publish', 'notify'],
  'Compaction · expiry': ['plan', 'rewrite', 'expire', 'commit'],
  Maintenance: ['plan', 'rewrite', 'expire', 'commit'],
}
const stepShare = [0.62, 0.14, 0.18, 0.06]

const targets: Record<string, string> = {
  ingest_bioreactor: 'bronze.bioreactor_telemetry',
  ingest_lims: 'bronze.lims_samples',
  ingest_plate_readers: 'bronze.elisa_plate_reads',
  ingest_erp: 'bronze.erp_batches',
  transform_silver: 'silver · 61 models',
  transform_gold: 'gold · 35 models',
  audits_qc: 'silver.qc_results',
  iceberg_maintenance: 'All 148 tables',
  transform_silver_qc: 'silver.qc_results',
  transform_gold_release: 'gold.batch_release_metrics',
  transform_bioreactor_1min: 'silver.bioreactor_runs_1min',
  transform_run_summaries: 'silver.run_summaries',
  transform_feed_events: 'silver.feed_events',
  gold_cpp_trends: 'gold.cpp_trends',
  report_qc_release_dashboard: 'gold.qc_release_dashboard',
  iceberg_compact_bronze: 'bronze · 52 tables',
  iceberg_compact_silver: 'silver · 61 tables',
  iceberg_compact_gold: 'gold · 35 tables',
}

function targetOf(name: string) {
  if (targets[name]) return targets[name]
  if (name.startsWith('ingest_')) return `bronze.${name.slice(7)}`
  if (name.startsWith('transform_silver_')) return `silver.${name.slice(17)}`
  if (name.startsWith('transform_gold_')) return `gold.${name.slice(15)}`
  if (name.startsWith('transform_')) return `silver.${name.slice(10)}`
  if (name.startsWith('gold_')) return `gold.${name.slice(5)}`
  if (name.startsWith('audits_')) return `${name.slice(7)} audits`
  if (name.startsWith('report_')) return `gold.${name.slice(7)}`
  return 'Catalog'
}

export function parseDuration(s: string) {
  let t = 0
  const m = /(\d+) m/.exec(s)
  const sec = /(\d+) s/.exec(s)
  const h = /(\d+) h/.exec(s)
  if (h) t += Number(h[1]) * 3600
  if (m) t += Number(m[1]) * 60
  if (sec) t += Number(sec[1])
  return t
}

export function fmtDuration(sec: number) {
  sec = Math.max(1, Math.round(sec))
  if (sec < 60) return `${sec} s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m} m ${String(s).padStart(2, '0')} s`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} m`
}

function fmtAgo(min: number) {
  if (min < 60) return `${min} min ago`
  if (min < 1440) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m ? `${h} h ${m} min ago` : `${h} h ago`
  }
  return `${Math.round(min / 1440)} d ago`
}

function parseAgoMin(last: string) {
  const d = /(\d+) d/.exec(last)
  const h = /(\d+) h/.exec(last)
  const m = /(\d+) min/.exec(last)
  return (d ? Number(d[1]) * 1440 : 0) + (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}

const baseAvg: Record<string, number> = {
  'Ingest · dlt': 46,
  'Transform · dbt': 131,
  Audits: 52,
  Report: 88,
  'Compaction · expiry': 870,
  Maintenance: 640,
}

function runId(name: string, i: number) {
  return (hash(`${name}#${i}`) & 0xfffffff).toString(16).padStart(7, '0')
}

function deriveRun(j: ScaleJob, avgSec: number, i: number): RunDetail {
  const code = j.runs[i]!
  const names = stepNames[j.kind] ?? stepNames['Ingest · dlt']!
  const every = intervalOf(j.sched)
  const agoMin = parseAgoMin(j.last) + (j.runs.length - 1 - i) * every
  const trigger = j.sched === 'on upstream' ? 'Sensor · on upstream' : `Schedule · ${j.sched}`
  const jitter = 0.9 + (hash(`${j.name}:${i}`) % 20) / 100
  const base: RunDetail = {
    index: i,
    id: runId(j.name, i),
    code,
    ago: fmtAgo(agoMin),
    duration: '—',
    trigger,
    steps: [],
  }
  const skippedSteps = (from: number, start = 0): RunStep[] =>
    names.slice(from).map((n) => ({ name: n, state: 'skipped', start, width: 0, duration: 'skipped' }))

  if (code === 'p' || code === 'n') {
    return { ...base, ago: '—', trigger: 'Schedule paused', steps: skippedSteps(0), note: j.reason ?? 'No run in this slot.' }
  }
  if (code === 'k') {
    const upstreamMaint = j.domain === 'Bioreactor'
    return {
      ...base,
      duration: '0 s',
      steps: skippedSteps(0),
      note: upstreamMaint
        ? 'Skipped: the process historian was in planned maintenance (07:30–09:00), so there was nothing new to read.'
        : 'Skipped: upstream had no new data since the last run.',
    }
  }
  const slowFactor = code === 'w' ? slowMultiplier(j) : 1
  const total = avgSec * jitter * slowFactor
  if (code === 'f') {
    // Fails in the second step after a normal first step.
    const first = total * 0.88
    const second = total * 0.06
    const failedStep = names[1]!
    const table = targetOf(j.name).replace(/^bronze\./, '')
    const schemaFail = j.incidentId === '214'
    return {
      ...base,
      duration: fmtDuration(first + second),
      failedStep,
      steps: [
        { name: names[0]!, state: 'ok', start: 0, width: 88, duration: fmtDuration(first) },
        { name: failedStep, state: 'failed', start: 88, width: 6, duration: fmtDuration(second) },
        ...skippedSteps(2, 94),
      ],
      error: schemaFail
        ? `DataValidationError: In schema "bioreactor"\ntable "${table}": column\n"do_sat_pct" is not allowed.\nContract mode for columns is "freeze".`
        : j.name === 'audits_qc'
          ? 'AuditFailed: potency_pct_in_range\n3 rows in silver.qc_results outside\n80–125 % (batches BR-2026-121, -122).'
          : `RuntimeError: step "${failedStep}" exited with code 1.`,
      note: schemaFail
        ? 'This run failed the same way as the others since maintenance ended. Nothing was written to the Iceberg table, so it is safe to re-run once the contract is patched.'
        : j.name === 'audits_qc'
          ? 'The audit blocked the write, so silver.qc_results was not published from this run. Tracked in #211.'
          : 'Nothing was committed, so it is safe to re-run.',
    }
  }
  let at = 0
  const steps: RunStep[] = names.map((n, k) => {
    const w = stepShare[k]! * 100
    const s: RunStep = {
      name: n,
      state: code === 'w' && k === 0 ? 'slow' : 'ok',
      start: at,
      width: w,
      duration: fmtDuration(total * stepShare[k]!),
    }
    at += w
    return s
  })
  return {
    ...base,
    duration: fmtDuration(total),
    steps,
    note: code === 'w' ? `Slower than usual${j.reason ? `: ${j.reason.replace(/^[^·]*· /, '')}` : ''}. It still finished and committed.` : undefined,
  }
}

function slowMultiplier(j: ScaleJob) {
  const m = /(\d+) m vs (\d+) m/.exec(j.reason ?? '')
  if (m) return Number(m[1]) / Number(m[2])
  const x = /([\d.]+)× usual/.exec(j.reason ?? '')
  if (x) return Number(x[1])
  return 2.3
}

export function jobDetail(name: string): JobDetail | undefined {
  const sj = scaleJobs.find((j) => j.name === name)
  const cj = core.jobs.find((j) => j.name === name)
  if (!sj) return undefined
  const s = sj
  const usual = /vs (\d+) m usual|vs (\d+) m/.exec(s.reason ?? '')
  const avgSec = usual
    ? Number(usual[1] ?? usual[2]) * 60
    : cj
      ? parseDuration(cj.avg)
      : (baseAvg[s.kind] ?? 60)
  const statusLabel: Record<ScaleStatus, string> = { failing: 'Failing', slow: 'Slow', paused: 'Paused', ok: 'Healthy' }
  const job: JobDetail['job'] = {
    name,
    kind: cj?.kind ?? s.kind,
    domain: s.domain,
    status: cj?.status ?? (s.status === 'failing' ? 'failing' : s.status === 'slow' ? 'slow' : s.status === 'paused' ? 'paused' : 'ok'),
    statusLabel: cj?.statusLabel ?? statusLabel[s.status],
    reason: cj?.reason ?? s.reason,
    cron: cj?.cron ?? cronFromSched(s.sched),
    next: cj?.next ?? nextFor(s),
    runs: cj?.runs ?? s.runs,
    avg: cj?.avg ?? fmtDuration(avgSec),
    owner: cj?.owner ?? s.owner,
    lastRun: cj?.lastRun ?? `${s.last} ago`,
    incidentId: cj?.incidentId ?? s.incidentId,
    sched: s.sched,
    target: targetOf(name),
    source: s.source,
    team: s.team,
  }
  const withRuns: ScaleJob = { ...s, runs: job.runs, incidentId: job.incidentId }
  const detailRuns = job.runs.map((_, i) => deriveRun(withRuns, avgSec, i))

  // The latest bioreactor failure is the one in the design, word for word.
  if (name === 'ingest_bioreactor') {
    const last = detailRuns[detailRuns.length - 1]!
    Object.assign(last, {
      id: 'e7d8c01',
      ago: '6 min ago',
      duration: '1 m 16 s',
      trigger: 'Schedule · every 15 min',
      steps: [
        { name: 'extract', state: 'ok', start: 0, width: 88, duration: '1 m 07 s' },
        { name: 'normalize', state: 'failed', start: 88, width: 6, duration: '5 s' },
        { name: 'load', state: 'skipped', start: 94, width: 0, duration: 'skipped' },
        { name: 'materialize', state: 'skipped', start: 94, width: 0, duration: 'skipped' },
      ],
      error:
        'DataValidationError: In schema "bioreactor"\ntable "bioreactor_telemetry": column\n"do_sat_pct" is not allowed.\nContract mode for columns is "freeze".',
      note: "The two runs before this one failed the same way. Nothing was written to the Iceberg table, so it's safe to re-run once the contract is patched.",
    } satisfies Partial<RunDetail>)
  }

  const inc = job.incidentId ? core.incidents.find((i) => i.id === job.incidentId) : undefined
  const order: Record<ScaleStatus, number> = { failing: 0, slow: 1, paused: 2, ok: 3 }
  const siblings = scaleJobs
    .filter((j) => j.domain === s.domain)
    .sort((a, b) => order[a.status] - order[b.status])
  return { job, incident: inc ? { id: inc.id, title: inc.title } : undefined, runs: detailRuns, siblings }
}

function nextFor(j: ScaleJob) {
  if (j.status === 'paused') return 'paused'
  if (j.sched === 'on upstream') return 'sensor'
  const every = intervalOf(j.sched)
  const t = /(\d\d:\d\d)/.exec(j.sched)
  if (t) return `next at ${t[1]}`
  if (every >= 10080) return every === 10080 ? 'next on Sunday' : 'next on the 1st'
  const since = parseAgoMin(j.last)
  return `next in ${Math.max(1, every - since)} min`
}

/* ------------------------------------------------------------------ */
/* Run timeline: 48 half-hour cells, 10:00 yesterday → now (09:41)      */
/* ------------------------------------------------------------------ */

/** '' = nothing, 'm' = planned maintenance, 'i' = incident */
export type EventCode = '' | 'm' | 'i'
export interface TimelineRow {
  name: string
  status: ScaleStatus
  cells: RunCode[]
}
export interface TimelineGroup {
  name: string
  meta: string
  folded: boolean
  rows: TimelineRow[]
  /** Healthy jobs not drawn when the group is open */
  more?: number
}

interface CellSpec {
  every?: number
  offset?: number
  at?: number[]
  slowFrom?: number
  skip?: [number, number]
  fail?: number
  slowAt?: number[]
  paused?: number
}

function cells(spec: CellSpec): RunCode[] {
  const out: RunCode[] = []
  for (let i = 0; i < 48; i++) {
    let ch: RunCode = 'n'
    if (spec.every && i % spec.every === (spec.offset ?? 0)) ch = 's'
    if (spec.at?.includes(i)) ch = 's'
    if (spec.slowFrom !== undefined && i >= spec.slowFrom && ch === 's') ch = 'w'
    if (spec.skip && i >= spec.skip[0] && i <= spec.skip[1] && ch !== 'n') ch = 'k'
    if (spec.fail !== undefined && i >= spec.fail) ch = 'f'
    if (spec.slowAt?.includes(i)) ch = 'w'
    if (spec.paused !== undefined && i >= spec.paused) ch = 'p'
    out.push(ch)
  }
  return out
}

const row = (name: string, spec: CellSpec, status: ScaleStatus = 'ok'): TimelineRow => ({ name, status, cells: cells(spec) })

export const timeline = {
  axis: ['10:00', '16:00', '22:00', '04:00', 'now'],
  events: Array.from({ length: 48 }, (_, i): EventCode => (i >= 46 ? 'i' : (i >= 43 && i <= 45) || i === 32 ? 'm' : '')),
  eventNotes: [
    { code: 'm' as const, label: 'Planned maintenance 02:00 and 07:30–09:00' },
    { code: 'i' as const, label: 'Incident #214 from 09:00' },
  ],
  groups: [
    {
      name: 'Bioreactor', meta: '14 jobs · 3 failing', folded: false, rows: [
        row('ingest_bioreactor', { every: 1, skip: [43, 45], fail: 46 }, 'failing'),
        row('ingest_bioreactor_offgas', { every: 1, skip: [43, 45], fail: 46 }, 'failing'),
        row('ingest_bioreactor_feeds', { every: 2, skip: [43, 45], fail: 46 }, 'failing'),
        row('transform_bioreactor_1min', { every: 1, skip: [43, 47] }),
        row('transform_run_summaries', { every: 2, skip: [43, 47] }),
        row('gold_cpp_trends', { every: 4, offset: 2, skip: [43, 47] }),
      ],
    },
    {
      name: 'QC & LIMS', meta: '22 jobs · 4 slow', folded: false, rows: [
        row('ingest_lims', { every: 2, slowFrom: 32 }, 'slow'),
        row('ingest_lims_results', { every: 2, offset: 1, slowFrom: 33 }, 'slow'),
        row('transform_silver_qc', { every: 2, slowFrom: 33 }, 'slow'),
        row('transform_gold_release', { every: 4, offset: 1, slowFrom: 33 }, 'slow'),
        row('audits_qc', { every: 2, offset: 1 }),
        row('ingest_sample_lineage', { every: 2 }),
      ],
    },
    {
      name: 'Environmental monitoring', meta: '16 jobs · 1 slow', folded: false, rows: [
        row('ingest_env_monitoring', { every: 1, slowFrom: 30 }, 'slow'),
        row('ingest_env_particles', { every: 1 }),
        row('ingest_env_pressure', { every: 1 }),
        row('transform_env_excursions', { every: 2 }),
      ],
    },
    {
      name: 'Maintenance & ERP', meta: '21 jobs · 1 slow, 1 paused', folded: false, rows: [
        row('iceberg_compact_bronze', { at: [32], slowAt: [32] }, 'slow'),
        row('iceberg_expire_snapshots', { at: [32] }),
        row('ingest_cold_chain_temps', { every: 2, slowAt: [32, 33] }, 'slow'),
        row('ingest_erp_batches', { every: 2, offset: 1 }),
        row('ingest_legacy_mes', { every: 4, paused: 0 }, 'paused'),
      ],
    },
    {
      name: 'Assay · Reporting', meta: '31 jobs · all healthy, folded', folded: true, more: 25, rows: [
        row('ingest_plate_readers', { every: 1 }),
        row('ingest_elisa_plate_maps', { every: 1 }),
        row('ingest_hplc_runs', { every: 1 }),
        row('transform_silver_elisa_results', { every: 2 }),
        row('report_qc_release_dashboard', { every: 1 }),
        row('report_deviation_summary', { at: [40] }),
      ],
    },
  ] satisfies TimelineGroup[],
  patterns: [
    {
      tone: 'bad' as const,
      title: 'One cause, three failures',
      text: 'Every job reading the process historian skipped during maintenance (07:30–09:00), then failed once it came back. Linked to',
      incidentId: '214',
      after: '.',
    },
    {
      tone: 'warn' as const,
      title: 'LIMS slow since 02:00',
      text: "4 jobs downstream of the LIMS API slowed at the same time. Their own code didn't change, so the source is the likely cause (",
      incidentId: '207',
      after: ').',
    },
    {
      tone: 'branch' as const,
      title: '02:00 is crowded',
      text: 'Compaction and 6 nightly loads start together, and cold-chain temps queue behind them. Moving compaction to 03:30 would clear it.',
    },
    {
      tone: 'ok' as const,
      title: '92 jobs need nothing',
      text: 'They stay folded until something changes, so the page scales by problems, not by job count.',
    },
  ],
}
