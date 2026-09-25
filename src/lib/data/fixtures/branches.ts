/**
 * Mock detail for the Branches screen. The list itself comes from `core.branches`; this adds the
 * per-branch story: fix/telemetry-schema carries the #214 fix (contract rename + backfill), main is
 * protected, dev/gareth-sandbox can never be merged. feat/qc-trend-alerts lives on incident #209.
 */
import type { Layer } from '../types'

export type CheckState = 'pass' | 'fail' | 'pending'

export interface MergeCheck {
  state: CheckState
  label: string
  detail?: string
  /** Mono spans in the detail, e.g. `do_pct` → `do_sat_pct` */
  detailMono?: [string, string]
  progress?: { done: number; total: number }
}

export interface TableChange {
  table: string
  layer: Layer
  rows: string
  diff?: Array<{ kind: 'del' | 'add'; text: string }>
}

export interface Commit {
  id: string
  message: string
  who: string
  ago: string
}

export interface BranchGraph {
  base: string
  commits: string[]
  /** commits on main since the fork */
  behind: number
  mergeable: boolean
}

export interface BranchDetail {
  name: string
  from?: string
  created?: string
  by?: string
  resolves?: string
  summary?: string
  checks: MergeCheck[]
  tableChanges: TableChange[]
  commits: Commit[]
  graph: BranchGraph
  merge: 'ready' | 'protected' | 'sandbox' | 'empty'
  mergeFacts?: string
}

export const branchDetails: Record<string, BranchDetail> = {
  main: {
    name: 'main',
    summary: 'Head of production · protected · merges need a signed approval',
    checks: [],
    tableChanges: [],
    commits: [
      { id: '8f3c21a', message: 'Load plate reads · 14 tables', who: 'dagster', ago: '22 min ago' },
      { id: '3e91b07', message: 'Merge feat/elisa-4pl-curves', who: 'Sam R.', ago: '5 h ago' },
      { id: 'c42e9b0', message: 'Tag release/BR-2026-118', who: 'Sam R.', ago: 'Mon 18:02' },
    ],
    graph: { base: '8f3c21a', commits: [], behind: 0, mergeable: false },
    merge: 'protected',
  },
  'fix/telemetry-schema': {
    name: 'fix/telemetry-schema',
    from: 'main@8f3c21a',
    created: '22 min ago',
    by: 'Gareth',
    resolves: '214',
    checks: [
      { state: 'pass', label: 'Schema contract updated', detailMono: ['do_pct', 'do_sat_pct'] },
      { state: 'pass', label: 'Backfill complete', detail: '184,212 rows from the 07:26 watermark' },
      { state: 'pass', label: 'No conflicting commits on main', detail: 'Fast-forward possible' },
      { state: 'pending', label: 'Downstream audits', progress: { done: 31, total: 41 } },
    ],
    tableChanges: [
      {
        table: 'bronze.bioreactor_telemetry',
        layer: 'bronze',
        rows: '+184 k rows',
        diff: [
          { kind: 'del', text: '− do_pct       double' },
          { kind: 'add', text: '+ do_sat_pct   double' },
        ],
      },
      { table: 'silver.bioreactor_runs_1min', layer: 'silver', rows: '+8.8 k rows' },
    ],
    commits: [
      { id: '5b7f311', message: 'Backfill telemetry from 07:26 watermark', who: 'dagster', ago: '9 min ago' },
      { id: 'a1c9e02', message: 'Rename DO column in telemetry contract', who: 'Gareth', ago: '18 min ago' },
    ],
    graph: { base: '8f3c21a', commits: ['a1c9e02', '5b7f311'], behind: 0, mergeable: true },
    merge: 'ready',
    mergeFacts: '2 commits · 2 tables changed · resolves #214',
  },
  'dev/gareth-sandbox': {
    name: 'dev/gareth-sandbox',
    from: 'main@b4d8e61',
    created: '9 d ago',
    by: 'Gareth',
    summary: 'Sandbox · can never be merged into main',
    checks: [
      { state: 'fail', label: 'Sandbox branches can’t be merged', detail: 'Copy the work to a fix/ or feat/ branch instead' },
      { state: 'fail', label: '41 commits behind main', detail: 'Last synced 9 d ago' },
    ],
    tableChanges: [
      { table: 'silver.cpp_trends_v2', layer: 'silver', rows: '+310 k rows' },
      { table: 'gold.process_capability', layer: 'gold', rows: '+1.1 k rows' },
    ],
    commits: [
      { id: '0d11a7e', message: 'Try rolling 6 h window for CPP trends', who: 'Gareth', ago: '9 d ago' },
      { id: '9a2f4c8', message: 'Scratch copy of cpp_trends', who: 'Gareth', ago: '10 d ago' },
    ],
    graph: { base: 'b4d8e61', commits: ['9a2f4c8', '0d11a7e'], behind: 41, mergeable: false },
    merge: 'sandbox',
  },
}

export function emptyBranchDetail(name: string, from: string): BranchDetail {
  return {
    name,
    from,
    created: 'just now',
    by: 'Gareth',
    checks: [],
    tableChanges: [],
    commits: [],
    graph: { base: from.split('@')[1] ?? '8f3c21a', commits: [], behind: 0, mergeable: false },
    merge: 'empty',
  }
}

export const branchStartPoints = [
  { value: 'main', ref: 'main', commit: '8f3c21a' },
  { value: 'fix/telemetry-schema', ref: 'fix/telemetry-schema', commit: '5b7f311' },
  { value: 'release/BR-2026-118', ref: 'release/BR-2026-118', commit: 'c42e9b0' },
  { value: 'release/BR-2026-117', ref: 'release/BR-2026-117', commit: '71d0a3e' },
] as const
