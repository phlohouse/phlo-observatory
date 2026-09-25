/**
 * Mock data for the staging environment: a zero-copy branch of prod main taken at 02:10, plus the
 * changes waiting to be promoted. Several of them are the fixes for today's prod incidents
 * (#211, #213, #214), so the numbers line up with `core.ts`.
 */
import type { Promotion, StagingDiff } from '../types'

export const stagingKpis = {
  diffs: { count: 9, note: '3 jobs · 2 contracts · 2 audits · 2 configs' },
  runs: { total: 86, failed: 2, note: 'qc_potency_v2' },
  audits: { passing: 441, total: 443, note: '12 new audits, 10 passing' },
  copy: { at: '02:10', age: '7 h 31 m old', note: '1.8 TB · 3 columns masked' },
  versions: { prod: 'prod v1.41', staging: 'staging v1.42' },
}

export const stagingDiffs: StagingDiff[] = [
  { group: 'jobs', change: 'add', name: 'qc_potency_v2', detail: 'Recomputes potency with a curve-fit gate · replaces qc_potency', status: { tone: 'bad', label: '2 of 6 failed' } },
  { group: 'jobs', change: 'add', name: 'elisa_4pl_refit', detail: 'Refits standard curves nightly with 4-parameter logistic', status: { tone: 'ok', label: '6 of 6 ok' } },
  { group: 'jobs', change: 'add', name: 'lims_sample_backfill', detail: 'One-off: back-fills 2024 samples missing plate IDs', status: { tone: 'ok', label: 'Ran once' } },
  { group: 'contracts', change: 'change', name: 'bronze.elisa_plate_reads', detail: 'Adds dilution_factor (double) · same change as #213 in prod', status: { tone: 'warn', label: 'Needs sign-off' } },
  { group: 'contracts', change: 'change', name: 'silver.bioreactor_runs_1min', detail: 'Renames do_pct → do_sat_pct · fixes the cause of #214', status: { tone: 'ok', label: 'Approved' } },
  { group: 'audits', change: 'add', name: 'curve_r2 >= 0.98  on silver.qc_results', detail: 'Blocks bad standard curves before potency is used · would have caught #211', status: { tone: 'ok', label: 'Passing' } },
  { group: 'audits', change: 'change', name: 'range(potency_pct, 50, 150)', detail: 'Warn instead of block when only one plate fails', status: { tone: 'warn', label: 'Needs sign-off' } },
  { group: 'config', change: 'change', name: 'freshness: bronze.bioreactor_telemetry', detail: 'Pause SLA during historian maintenance windows', status: { tone: 'ok', label: 'Approved' } },
  { group: 'config', change: 'remove', name: 'schedule: legacy_lims_extract', detail: 'Removes the old hourly extract · replaced by dlt LIMS source', status: { tone: 'neutral', label: 'Draft' } },
]

export const stagingGroupTitles: Record<StagingDiff['group'], string> = {
  jobs: 'Jobs only in staging',
  contracts: 'Contract changes',
  audits: 'Audits changed',
  config: 'Config',
}

export const promotions: Promotion[] = [
  {
    title: 'Fix #214: telemetry column rename',
    who: 'Gareth · 2 changes',
    tone: 'ok',
    ready: true,
    checks: [
      { state: 'pass', label: 'Runs' },
      { state: 'pass', label: 'Audits' },
      { state: 'pass', label: 'Contract approved' },
    ],
  },
  {
    title: 'Curve-fit audit for QC results',
    who: 'Jo K. · 1 change',
    tone: 'ok',
    ready: true,
    checks: [
      { state: 'pass', label: 'Runs' },
      { state: 'pass', label: 'Audits' },
      { state: 'pass', label: 'QA reviewed' },
    ],
  },
  {
    title: 'qc_potency_v2',
    who: 'Jo K. · 2 changes',
    tone: 'bad',
    ready: false,
    why: 'Fix failing runs first',
    checks: [
      { state: 'fail', label: '2 runs failed' },
      { state: 'pass', label: 'Audits' },
      { state: 'warn', label: 'Bound change unsigned' },
    ],
  },
  {
    title: 'Plate reader dilution_factor',
    who: 'Assay Dev · 1 change',
    tone: 'warn',
    ready: false,
    why: 'Waiting on QA sign-off',
    checks: [
      { state: 'pass', label: 'Runs' },
      { state: 'pass', label: 'Audits' },
      { state: 'warn', label: 'Contract sign-off' },
    ],
  },
]

export const stagingSource = {
  source: 'main@a41f09c',
  schedule: 'Nightly at 02:10 · next in 16 h 29 m',
  masked: ['operator_name', 'analyst_email', 'donor_id'],
  writes: 'Stay in staging · re-sync wipes them',
}
