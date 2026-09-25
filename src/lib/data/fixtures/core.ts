/**
 * Mock data for the prod lakehouse, 09:41 on a Thursday.
 * The story: a process-historian upgrade renamed `do_pct` → `do_sat_pct`, dlt's frozen
 * schema contract rejected three loads, and bronze.bioreactor_telemetry went stale (#214).
 * Keep numbers consistent across screens — they're referenced in several places.
 */
import type {
  ActivityItem,
  Asset,
  AuditEvent,
  Branch,
  Incident,
  Job,
  Kpis,
  LayerSummary,
  Member,
  ReleaseTag,
  RunCode,
  Service,
  ServiceAccount,
  Source,
  DayCode,
} from '../types'

const days = (s: string) => s.split('') as DayCode[]
const runs = (s: string) => s.split('') as RunCode[]

export const NOW_LABEL = '09:41'

export const incidents: Incident[] = [
  {
    id: '214',
    title: 'Stale table: bioreactor telemetry',
    headline: 'Stale table: bioreactor telemetry',
    kind: 'freshness',
    layer: 'bronze',
    severity: 'high',
    status: 'investigating',
    owner: 'Gareth',
    age: '52 min',
    assetId: 'bronze.bioreactor_telemetry',
  },
  {
    id: '211',
    title: 'Audit failed: silver.qc_results',
    headline: 'Potency results out of range',
    kind: 'audit',
    layer: 'silver',
    severity: 'high',
    status: 'in-progress',
    owner: 'QC Analytics',
    age: '5 h',
    assetId: 'silver.qc_results',
  },
  {
    id: '213',
    title: 'Schema drift: elisa_plate_reads',
    headline: 'New column in plate reader export',
    kind: 'schema',
    layer: 'bronze',
    severity: 'medium',
    status: 'triage',
    owner: 'Assay Dev',
    age: '1 h',
    assetId: 'bronze.elisa_plate_reads',
  },
  {
    id: '209',
    title: 'Merge conflict on main',
    headline: "Branch can't merge: qc_results changed on both sides",
    kind: 'catalog',
    layer: 'catalog',
    severity: 'medium',
    status: 'blocked',
    owner: 'QC Analytics',
    age: '1 d',
    assetId: 'silver.qc_results',
  },
  {
    id: '207',
    title: 'Slow load: LIMS extract',
    headline: 'LIMS extract is almost 3× slower',
    kind: 'performance',
    layer: 'bronze',
    severity: 'low',
    status: 'monitoring',
    owner: 'Gareth',
    age: '3 d',
    assetId: 'bronze.lims_samples',
  },
  {
    id: '205',
    title: 'Snapshot expiry overdue',
    headline: 'Snapshot expiry overdue',
    kind: 'maintenance',
    layer: 'silver',
    severity: 'low',
    status: 'resolved',
    owner: 'Gareth',
    age: '2 d',
    resolvedIn: 'Resolved in 1 h 10 m',
    resolvedAgo: '2 d',
  },
  {
    id: '202',
    title: 'Postgres catalog lag',
    headline: 'Postgres catalog lag',
    kind: 'performance',
    layer: 'catalog',
    severity: 'medium',
    status: 'resolved',
    owner: 'Gareth',
    age: '4 d',
    resolvedIn: 'Resolved in 42 min',
    resolvedAgo: '4 d',
  },
  {
    id: '198',
    title: 'Duplicate batch_ids in qc_results',
    headline: 'Duplicate batch_ids in qc_results',
    kind: 'audit',
    layer: 'silver',
    severity: 'high',
    status: 'resolved',
    owner: 'QC Analytics',
    age: '5 d',
    resolvedIn: 'Resolved in 3 h 12 m',
    resolvedAgo: '5 d',
    assetId: 'silver.qc_results',
  },
]

export const openIncidents = incidents.filter((i) => i.status !== 'resolved')

export const assets: Asset[] = [
  { id: 'bronze.bioreactor_telemetry', layer: 'bronze', health: 'stale', lag: '134 m / 60 m', lastMaterialized: '2 h 14 m ago', rows: '1.21 B', size: '842 GB', owner: 'Gareth', days: days('gggggar'), tag: { tone: 'bad', label: '#214', incidentId: '214' } },
  { id: 'silver.bioreactor_runs_1min', layer: 'silver', health: 'stale', lag: '131 m / 60 m', lastMaterialized: '2 h 11 m ago', rows: '48.2 M', size: '36 GB', owner: 'Gareth', days: days('gggggar') },
  { id: 'silver.feed_events', layer: 'silver', health: 'stale', lag: '129 m / 60 m', lastMaterialized: '2 h 9 m ago', rows: '2.1 M', size: '1.4 GB', owner: 'Process Dev', days: days('ggggggr') },
  { id: 'silver.run_summaries', layer: 'silver', health: 'stale', lag: '126 m / 120 m', lastMaterialized: '2 h 6 m ago', rows: '18.4 k', size: '22 MB', owner: 'Process Dev', days: days('ggggggr') },
  { id: 'gold.batch_release_metrics', layer: 'gold', health: 'stale', lag: '118 m / 90 m', lastMaterialized: '1 h 58 m ago', rows: '6.2 k', size: '9 MB', owner: 'QC Analytics', days: days('gggaggr') },
  { id: 'gold.cpp_trends', layer: 'gold', health: 'stale', lag: '117 m / 90 m', lastMaterialized: '1 h 57 m ago', rows: '310 k', size: '140 MB', owner: 'QC Analytics', days: days('ggggggr') },
  { id: 'gold.process_capability', layer: 'gold', health: 'stale', lag: '1 d 2 h / 1 d', lastMaterialized: '1 d 2 h ago', rows: '1.1 k', size: '2 MB', owner: 'QC Analytics', days: days('gggggga') },
  { id: 'bronze.elisa_plate_reads', layer: 'bronze', health: 'warn', lag: '8 m / 30 m', lastMaterialized: '8 m ago', rows: '96.0 M', size: '58 GB', owner: 'Assay Dev', days: days('gggggga'), tag: { tone: 'warn', label: '#213', incidentId: '213' } },
  { id: 'silver.qc_results', layer: 'silver', health: 'warn', lag: '19 m / 60 m', lastMaterialized: '19 m ago', rows: '4.8 M', size: '3.1 GB', owner: 'QC Analytics', days: days('ggaggga'), tag: { tone: 'bad', label: '#211', incidentId: '211' } },
  { id: 'bronze.lims_samples', layer: 'bronze', health: 'warn', lag: '41 m / 60 m', lastMaterialized: '41 m ago', rows: '12.7 M', size: '7.9 GB', owner: 'Gareth', days: days('gaagaaa'), tag: { tone: 'info', label: '#207', incidentId: '207' } },
  { id: 'silver.elisa_results', layer: 'silver', health: 'warn', lag: '9 m / 60 m', lastMaterialized: '9 m ago', rows: '31.5 M', size: '11 GB', owner: 'Assay Dev', days: days('ggggggg'), tag: { tone: 'info', label: 'compaction due' } },
  { id: 'bronze.erp_batches', layer: 'bronze', health: 'ok', lag: '14 m / 60 m', lastMaterialized: '14 m ago', rows: '88.1 k', size: '40 MB', owner: 'Gareth', days: days('ggggggg') },
  { id: 'silver.sample_lineage', layer: 'silver', health: 'ok', lag: '16 m / 60 m', lastMaterialized: '16 m ago', rows: '12.6 M', size: '2.2 GB', owner: 'QC Analytics', days: days('ggggggg') },
  { id: 'gold.qc_release_dashboard', layer: 'gold', health: 'ok', lag: '22 m / 90 m', lastMaterialized: '22 m ago', rows: '4.4 k', size: '6 MB', owner: 'QC Analytics', days: days('ggggggg') },
]

export const assetTotals = { all: 148, attention: 11, bronze: 52, silver: 61, gold: 35 }

/** The 8 core Dagster jobs (the non-scale Pipelines view). */
export const jobs: Job[] = [
  { name: 'ingest_bioreactor', kind: 'Ingest · dlt', domain: 'Bioreactor', status: 'failing', statusLabel: 'Failing', reason: 'Failing ×3 · schema contract', cron: '*/15 * * * *', next: 'next in 9 min', runs: runs('sssssssssssssssskkkkkfff'), avg: '1 m 20 s', owner: 'Gareth', lastRun: '6 min ago', incidentId: '214' },
  { name: 'ingest_lims', kind: 'Ingest · dlt', domain: 'QC & LIMS', status: 'slow', statusLabel: 'Slow', reason: '11 m vs 3 m usual · LIMS API latency', cron: '0 * * * *', next: 'next in 6 min', runs: runs('sssssssssssssssswwwwwwww'), avg: '11 m 04 s', owner: 'Gareth', lastRun: '14 min ago', incidentId: '207' },
  { name: 'ingest_plate_readers', kind: 'Ingest · dlt', domain: 'Assay', status: 'ok', statusLabel: 'Healthy', cron: '*/10 * * * *', next: 'next in 2 min', runs: runs('ssssssssssssssssssssssss'), avg: '48 s', owner: 'Assay Dev', lastRun: '8 min ago' },
  { name: 'ingest_erp', kind: 'Ingest · dlt', domain: 'ERP & supply', status: 'ok', statusLabel: 'Healthy', cron: '0 * * * *', next: 'next in 6 min', runs: runs('ssssssssssssssssssssssss'), avg: '1 m 02 s', owner: 'Data platform', lastRun: '14 min ago' },
  { name: 'transform_silver', kind: 'Transform · dbt', domain: 'QC & LIMS', status: 'slow', statusLabel: 'Partial', cron: 'on upstream', next: 'sensor', runs: runs('sssssssssssssssssssssskk'), avg: '3 m 41 s', owner: 'QC Analytics', lastRun: '19 min ago' },
  { name: 'transform_gold', kind: 'Transform · dbt', domain: 'Reporting', status: 'waiting', statusLabel: 'Waiting on upstream', cron: 'on upstream', next: 'sensor', runs: runs('ssssssssssssssssssssskkk'), avg: '2 m 15 s', owner: 'QC Analytics', lastRun: '1 h 58 min ago' },
  { name: 'audits_qc', kind: 'Audits', domain: 'QC & LIMS', status: 'slow', statusLabel: '1 failing', cron: '30 * * * *', next: 'next in 36 min', runs: runs('ssssssssssssssssssssfsss'), avg: '54 s', owner: 'QC Analytics', lastRun: '11 min ago', incidentId: '211' },
  { name: 'iceberg_maintenance', kind: 'Compaction · expiry', domain: 'Maintenance', status: 'ok', statusLabel: 'Healthy', cron: '0 2 * * *', next: 'next at 02:00', runs: runs('ssssssssssssssssssssssss'), avg: '14 m 30 s', owner: 'Data platform', lastRun: '7 h ago' },
]

export const services: Service[] = [
  { name: 'Dagster', state: 'up' },
  { name: 'Nessie catalog', state: 'up' },
  { name: 'Postgres', state: 'up' },
  { name: 'Object store', state: 'slow', detail: 'p95 1.8 s' },
]

export const kpis: Kpis = {
  freshness: { pct: '95.3%', fresh: 141, total: 148 },
  runs: { total: 312, failed: 4, successRate: '98.7%', median: '3 m 12 s' },
  audits: { passing: 425, total: 431, failingModels: 2 },
  incidents: { open: 5, high: 2, oldest: '3 d ago' },
}

export const sources: Source[] = [
  { name: 'Process historian', tone: 'bad', lag: '2 h late' },
  { name: 'LIMS', tone: 'warn', lag: 'slow' },
  { name: 'Plate readers', tone: 'ok', lag: '8 min' },
  { name: 'ERP batches', tone: 'ok', lag: '14 min' },
]

export const layers: LayerSummary[] = [
  { layer: 'bronze', tables: 52, stale: 3, note: '1.6 TB · 41 k snapshots', size: '1.6 TB', description: 'raw, append-only' },
  { layer: 'silver', tables: 61, stale: 2, note: '1 audit failing · 620 GB', size: '620 GB', description: 'cleaned, conformed' },
  { layer: 'gold', tables: 35, stale: 2, note: 'feeds batch release · 180 GB', size: '180 GB', description: 'business-ready' },
]

/** Runs per hour for the last 24 h, oldest first. */
export const runsByHour = {
  ok: [13, 12, 14, 11, 13, 15, 12, 14, 13, 12, 11, 13, 14, 12, 13, 15, 14, 12, 13, 12, 11, 13, 12, 14],
  failed: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
  labels: ['10:00 yesterday', '16:00', '22:00', '04:00', 'now'],
}

export const recentActivity: ActivityItem[] = [
  { tone: 'bad', text: '#214 Freshness SLA breached on `bronze.bioreactor_telemetry`', ago: '52 min ago', href: '/incidents/214' },
  { tone: 'branch', text: 'Branch `fix/telemetry-schema` created by Gareth', ago: '22 min ago', href: '/branches' },
  { tone: 'warn', text: '#213 New column `dilution_factor` in plate reader export', ago: '1 h ago', href: '/incidents/213' },
  { tone: 'ok', text: 'Compaction finished on `silver.elisa_results` · 412 → 18 files', ago: '2 h ago' },
  { tone: 'ok', text: '`feat/elisa-4pl-curves` merged into main', ago: '5 h ago' },
]

export const branches: Branch[] = [
  { name: 'main', kind: 'main', owner: 'Head of production', head: '8f3c21a', ahead: 0, behind: 0, status: { tone: 'neutral', label: 'protected' }, note: 'Head of production · updated 22 min ago' },
  { name: 'fix/telemetry-schema', kind: 'fix', owner: 'Gareth', head: '5b7f311', ahead: 2, behind: 0, status: { tone: 'ok', label: '3 of 4 checks' }, note: 'Gareth · 2 ahead · 0 behind · #214', incidentId: '214' },
  { name: 'feat/qc-trend-alerts', kind: 'feat', owner: 'QC Analytics', head: 'c19e7b2', ahead: 5, behind: 3, status: { tone: 'bad', label: 'conflict' }, note: 'QC Analytics · 5 ahead · 3 behind · #209', incidentId: '209' },
  { name: 'dev/gareth-sandbox', kind: 'dev', owner: 'Gareth', head: '0d11a7e', ahead: 14, behind: 41, status: { tone: 'neutral', label: 'idle 9 d' }, note: 'Gareth · 14 ahead · 41 behind' },
]

export const releaseTags: ReleaseTag[] = [
  { name: 'release/BR-2026-118', commit: 'c42e9b0' },
  { name: 'release/BR-2026-117', commit: '71d0a3e' },
]

export const members: Member[] = [
  { initials: 'GP', name: 'Gareth', note: 'You', team: 'Data platform', role: 'Admin, Approver', canSign: 'yes', lastActive: 'Now', you: true },
  { initials: 'SR', name: 'Sam R.', team: 'QA', role: 'Approver', canSign: 'yes', lastActive: '12 min ago' },
  { initials: 'AM', name: 'Alex M.', team: 'Process Dev', role: 'Engineer', canSign: 'no', lastActive: '1 h ago' },
  { initials: 'JK', name: 'Jo K.', team: 'Assay Dev', role: 'Engineer', canSign: 'no', lastActive: '3 h ago' },
  { initials: 'RP', name: 'Rui P.', team: 'Data platform', role: 'Engineer', canSign: 'no', lastActive: 'Yesterday' },
  { initials: 'CT', name: 'Chris T.', team: 'QC Analytics', role: 'Viewer', canSign: 'no', lastActive: '2 d ago' },
  { initials: 'LW', name: 'Lee W.', team: 'QA', role: 'Approver', canSign: 'setup', lastActive: '5 d ago' },
  { initials: '··', name: '[Invited person]', note: 'Invite sent 2 d ago', team: 'QC Analytics', role: 'Viewer', canSign: 'no', lastActive: 'Pending' },
]

export const serviceAccounts: ServiceAccount[] = [
  { name: 'dagster', allowed: 'Write to branches, open incidents', key: 'Rotated 21 d ago' },
  { name: 'dlt-loader', allowed: 'Write bronze tables on branches', key: 'Expires in 12 d', keyTone: 'warn' },
  { name: 'bi-readonly', allowed: 'Read gold tables on main', key: 'Rotated 64 d ago' },
]

export const auditEvents: AuditEvent[] = [
  { id: 'a9e4d10', time: '09:48', day: 'Today', actor: 'Gareth', actorKind: 'Person', action: 'Merged branch into main', object: 'fix/telemetry-schema → main · a9e4d10', signature: { tone: 'ok', label: 'Approved' } },
  { id: 'b21c0e4', time: '09:42', day: 'Today', actor: 'Gareth', actorKind: 'Person', action: 'Resolved incident #214', object: 'bronze.bioreactor_telemetry' },
  { id: 'c7d02a1', time: '09:32', day: 'Today', actor: 'dagster', actorKind: 'Service', action: 'Committed snapshot', object: 'bronze.bioreactor_telemetry @ fix/telemetry-schema' },
  { id: 'd33f9b8', time: '09:23', day: 'Today', actor: 'Gareth', actorKind: 'Person', action: 'Changed schema contract', object: 'sources/historian.py · do_pct → do_sat_pct' },
  { id: 'e01a6c2', time: '09:19', day: 'Today', actor: 'Gareth', actorKind: 'Person', action: 'Created branch', object: 'fix/telemetry-schema from main@8f3c21a' },
  { id: 'f5b8e70', time: '18:02', day: 'Mon', actor: 'Sam R.', actorKind: 'QA', action: 'Created release tag', object: 'release/BR-2026-118 → c42e9b0', signature: { tone: 'ok', label: 'Approved' } },
  { id: '0a9c4d3', time: '17:40', day: 'Mon', actor: 'Gareth', actorKind: 'Person', action: 'Reviewed release tag', object: 'release/BR-2026-118', signature: { tone: 'ok', label: 'Reviewed' } },
  { id: '1be27f5', time: '11:40', day: 'Mon', actor: 'Gareth', actorKind: 'Person', action: 'Changed setting', object: 'Snapshot expiry 5 → 7 days' },
  { id: '2c6d8a9', time: '09:15', day: 'Mon', actor: 'transform_silver', actorKind: 'Service', action: 'Direct write to main', object: 'silver.qc_results · protected ref', signature: { tone: 'bad', label: 'Blocked' } },
]
