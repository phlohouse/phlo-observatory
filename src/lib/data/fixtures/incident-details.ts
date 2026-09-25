/**
 * Mock detail data for the non-freshness incident pages (#213, #211, #209, #207).
 * Text fields may mark table / column names with `backticks` (rendered monospace) and
 * incident numbers as #NNN (rendered as links).
 */
import type { Tone } from '@/lib/data/types'

export type DetailActivity =
  | { kind: 'event'; tone: Tone; meta: string; text?: string; log?: string; ring?: boolean }
  | { kind: 'comment'; initials: string; name: string; when: string; avatarTone?: 'dark' | 'teal'; text: string }

export interface DetailStat {
  label: string
  value: string
  sub?: string
  tone?: 'bad' | 'warn' | 'ok'
}

/* ---------- #213 Schema drift ---------- */
export type SchemaDecision = 'accept' | 'hold' | 'reject'

export const incident213 = {
  summary:
    'The plate reader export started sending a `dilution_factor` column. The contract lets new columns in but flags them, so data is still loading. Someone needs to decide whether to keep it.',
  source: 'Plate readers',
  contract: { mode: 'evolve', note: 'new columns allowed, flagged' },
  owner: { initials: 'JK', name: 'Jo K. · Assay Dev' },
  firstSeen: 'Today 08:38 · 1 h ago',
  stats: [
    { label: 'Loads with it', value: '4 of 4' },
    { label: 'Empty values', value: '0%' },
    { label: 'Data blocked', value: 'No · still loading', tone: 'ok' },
    { label: 'Read downstream', value: 'Not yet' },
  ] satisfies DetailStat[],
  column: {
    name: 'dilution_factor',
    type: 'double · nullable',
    values: ['1', '2', '4', '8', '16', '32'],
    rows: '3,072 across 4 loads',
  },
  options: [
    {
      value: 'accept',
      title: 'Accept into the contract',
      hint: 'Adds the column on a fix branch. Silver models can start using it after merge.',
      cta: 'Create branch and accept',
      result: 'Branch `fix/elisa-dilution-factor` created with `dilution_factor` added to the contract. Silver models can use it once the branch is merged.',
    },
    {
      value: 'hold',
      title: 'Keep it in bronze only',
      hint: 'Stored but hidden from silver. Revisit later without losing data.',
      cta: 'Keep in bronze',
      result: '`dilution_factor` is kept in `bronze.elisa_plate_reads` and hidden from silver. You can revisit this later without losing data.',
    },
    {
      value: 'reject',
      title: 'Reject loads that include it',
      hint: 'Freezes the contract. Loads fail until the export changes back.',
      cta: 'Freeze contract',
      result: 'Contract frozen. The next load that includes `dilution_factor` will fail until the export changes back.',
    },
  ] satisfies Array<{ value: SchemaDecision; title: string; hint: string; cta: string; result: string }>,
  defaultNote: 'Expected after plate reader firmware 4.2. Needed for 4PL fitting.',
  activity: [
    { kind: 'event', tone: 'warn', meta: '08:38', text: 'New column detected on load 1 of 4' },
    { kind: 'event', tone: 'neutral', meta: '08:39', text: 'Assigned to Jo K. (table owner)' },
    {
      kind: 'comment',
      initials: 'JK',
      name: 'Jo K.',
      when: '09:05',
      avatarTone: 'teal',
      text: 'Plate reader firmware 4.2 went live this morning. The new column is expected. We want it for 4PL curve fitting.',
    },
  ] satisfies DetailActivity[],
}

/* ---------- #211 Audit failed ---------- */
const potency = ['38.2', '41.7', '164.9', '36.5', '171.3', '44.0', '158.6', '39.8']

export const incident211 = {
  summary:
    '37 potency results failed the range check this morning. The audit is blocking, so batch BR-2026-119 is held back from batch release. Other batches are flowing normally.',
  audit: 'range(potency_pct, 50, 150)',
  assignee: { initials: 'JK', name: 'Jo K. · Assay Dev' },
  team: 'QC Analytics',
  stats: [
    { label: 'Rows failing', value: '37 of 4,812', tone: 'bad' },
    { label: 'Held back', value: '1 batch' },
    { label: 'First failed', value: '04:31 · 5 h ago' },
    { label: 'Other batches', value: 'Flowing', tone: 'ok' },
  ] satisfies DetailStat[],
  totalFailing: 37,
  rows: potency.map((pot, i) => ({
    sampleId: `S-88${412 + Math.floor(i / 2)}`,
    batchId: 'BR-2026-119',
    plateId: 'P-4471',
    testCode: 'POT-ELISA',
    rep: (i % 2) + 1,
    potency: pot,
    curveR2: '0.912',
  })),
  breakdown: [
    { label: 'Plate', pct: 100, value: 'P-4471', tone: 'bad' as const },
    { label: 'Batch', pct: 100, value: '1 of 6', tone: 'bad' as const },
    { label: 'Analyst run', pct: 100, value: '04:10', tone: 'bad' as const },
    { label: 'Curve fit R²', pct: 91, value: '0.912', tone: 'warn' as const, threshold: 98 },
  ],
  explanation:
    "Every failing row is on plate P-4471, and that plate's standard curve fit (R² 0.912) is below the 0.98 the assay needs. The results aren't wrong so much as unusable. This looks like a lab issue, not a pipeline one.",
  activity: [
    { kind: 'event', tone: 'bad', meta: '04:31', text: 'Audit failed · BR-2026-119 held' },
    { kind: 'event', tone: 'neutral', meta: '07:58', text: 'Sam R. (QA) notified, since it touches batch release' },
    {
      kind: 'comment',
      initials: 'JK',
      name: 'Jo K.',
      when: '08:40',
      avatarTone: 'teal',
      text: 'All from one plate. The standard curve on P-4471 looks off. Checking with the lab before we exclude anything.',
    },
  ] satisfies DetailActivity[],
}

/* ---------- #209 Merge conflict ---------- */
export type ConflictPick = 'main' | 'branch' | 'both'
export interface CodeLine {
  change?: 'add' | 'del'
  text: string
}
export interface MergeConflict {
  id: string
  column: string
  kind: string
  mainRef: string
  main: CodeLine[]
  branch: CodeLine[]
  result: Record<ConflictPick, { lines: CodeLine[]; note: string }>
}

export const incident209 = {
  summary:
    "`feat/qc-trend-alerts` changes the schema of `silver.qc_results`. Main changed the same table after the branch was made, so Nessie won't merge until someone picks what the table should look like.",
  branch: 'feat/qc-trend-alerts',
  aheadBehind: '5 ahead · 3 behind',
  into: 'main',
  table: 'silver.qc_results',
  owner: { initials: 'MN', name: 'QC Analytics' },
  opened: 'Yesterday 09:12 · 1 d ago',
  mainHead: '8f3c21a',
  branchHead: 'c19e7b2',
  stats: [
    { label: 'Tables in conflict', value: '1', tone: 'bad' },
    { label: 'Commits behind', value: '3' },
    { label: 'Downstream waiting', value: '2 gold models' },
    { label: 'Blocked since', value: '1 d', tone: 'warn' },
  ] satisfies DetailStat[],
  initialPicks: { f9: 'both', pot: null } as Record<string, ConflictPick | null>,
  conflicts: [
    {
      id: 'f9',
      column: 'New column, field 9',
      kind: 'Added on both sides',
      mainRef: '6a0d9f4',
      main: [{ change: 'add', text: '+ curve_r2 double' }],
      branch: [{ change: 'add', text: '+ trend_flag string' }],
      result: {
        main: {
          lines: [{ change: 'add', text: '+ curve_r2 double' }],
          note: 'trend_flag is dropped, so the 2 gold trend models on the branch will not build.',
        },
        branch: {
          lines: [
            { change: 'del', text: '− curve_r2 double' },
            { change: 'add', text: '+ trend_flag string' },
          ],
          note: 'Removes curve_r2 from main. The #211 investigation reads it.',
        },
        both: {
          lines: [
            { change: 'add', text: '+ curve_r2 double' },
            { change: 'add', text: '+ trend_flag string' },
          ],
          note: 'curve_r2 keeps field 9 and trend_flag moves to field 10. Nothing downstream breaks.',
        },
      },
    },
    {
      id: 'pot',
      column: 'potency_pct',
      kind: 'Changed on both sides',
      mainRef: '6a0d9f4',
      main: [{ text: 'decimal(6,2)' }, { change: 'add', text: '+ doc "% of ref. std"' }],
      branch: [
        { change: 'del', text: '− decimal(6,2)' },
        { change: 'add', text: '+ decimal(8,2)' },
      ],
      result: {
        main: {
          lines: [{ text: 'decimal(6,2)' }, { change: 'add', text: '+ doc "% of ref. std"' }],
          note: 'Keeps 6 digits. The trend models on the branch expect decimal(8,2) and would need a cast.',
        },
        branch: {
          lines: [{ change: 'add', text: '+ decimal(8,2)' }],
          note: 'Widens the column but drops the description main added.',
        },
        both: {
          lines: [
            { change: 'add', text: '+ decimal(8,2)' },
            { change: 'add', text: '+ doc "% of ref. std"' },
          ],
          note: 'Widening decimal precision is a safe Iceberg change. Existing rows keep their values.',
        },
      },
    },
  ] satisfies MergeConflict[],
  cleanModels: ['gold.qc_potency_trend', 'gold.qc_trend_alerts'],
  activity: [
    {
      kind: 'event',
      tone: 'bad',
      meta: 'Merge blocked · 1 d ago',
      text: 'Nessie refused to merge `feat/qc-trend-alerts` into `main`.',
      log: 'Conflict on key silver.qc_results\n  main                  6a0d9f4\n  feat/qc-trend-alerts  c19e7b2',
    },
    { kind: 'event', tone: 'warn', ring: true, meta: 'Status set to Blocked · 1 d ago' },
    {
      kind: 'event',
      tone: 'neutral',
      meta: 'Fact · 1 d ago',
      text: 'Main has 3 new commits since the branch was made at `41be7d2`. One of them, `6a0d9f4`, added `curve_r2` to the table.',
    },
    {
      kind: 'comment',
      initials: 'JK',
      name: 'Jo K.',
      when: '3 h ago',
      avatarTone: 'teal',
      text: "Please don't drop `curve_r2`. The #211 investigation uses it to spot bad plate curves.",
    },
    {
      kind: 'comment',
      initials: 'MN',
      name: 'Maya N.',
      when: '2 h ago',
      text: "We need both columns. `trend_flag` is what the alerts read. I'll keep both and ask for sign-off.",
    },
  ] satisfies DetailActivity[],
}

/* ---------- #207 Slow load ---------- */
const runSecs = [228, 236, 219, 241, 230, 247, 225, 229, 238, 221, 244, 229, 233, 226, 240, 230, 612, 641, 666, 655, 672, 701, 689, 662]

export const incident207 = {
  summary:
    'Since 02:00 every run of `ingest_lims` has taken about 11 minutes instead of 4. Nothing is failing and data is still inside its freshness target, but 4 downstream jobs have slowed with it.',
  job: 'ingest_lims',
  jobCadence: 'hourly',
  source: 'LIMS API',
  owner: { initials: 'GP', name: 'Gareth' },
  opened: 'Mon 03:14 · 3 d ago',
  stats: [
    { label: 'Median duration', value: '11 m 04 s', sub: 'baseline 3 m 50 s', tone: 'warn' },
    { label: 'LIMS API p95', value: '1.8 s', sub: 'was 0.4 s', tone: 'warn' },
    { label: 'Freshness', value: '41 m / 60 m', sub: 'still within target', tone: 'ok' },
    { label: 'Jobs affected', value: '4', sub: 'slower, none failing' },
  ] satisfies DetailStat[],
  /** Oldest → newest, hourly from 10:00 yesterday. */
  runs: runSecs.map((secs, i) => ({ hour: (10 + i) % 24, secs, slow: i >= 16 })),
  baselineSecs: 230,
  axisMaxSecs: 900,
  chartLabel:
    'Duration of the last 24 ingest_lims runs. Runs up to 01:00 took about 3 m 50 s; every run from 02:00 took between 10 m 12 s and 11 m 41 s.',
  breakdown: [
    { label: 'Waiting on API', pct: 91, baseline: 18.5, value: '8 m 12 s', slow: true },
    { label: 'Parsing', pct: 17, baseline: 15.7, value: '1 m 31 s', slow: false },
    { label: 'Writing to Iceberg', pct: 15, baseline: 8.3, value: '1 m 21 s', slow: true },
  ],
  cause:
    "Most of the extra 7 minutes is spent waiting on the LIMS API. The extract fetches 280 pages of 500 rows, one after another, and each page now takes about 1.8 s instead of 0.4 s. Writing is also 36 s slower because the object store is running slow. Our code hasn't changed, so the vendor side is the likely cause. Fetching 2,000 rows per page would cut the requests to 70.",
  slowedJobs: [
    { name: 'ingest_lims', why: 'same API', from: '3 m 50 s', to: '11 m 02 s' },
    { name: 'ingest_lims_results', why: 'same API', from: '2 m 10 s', to: '6 m 40 s' },
    { name: 'transform_silver_qc', why: 'waits on both', from: '3 m 05 s', to: '4 m 20 s' },
    { name: 'transform_gold_release', why: 'waits on silver', from: '2 m 15 s', to: '3 m 02 s' },
  ],
  activity: [
    {
      kind: 'event',
      tone: 'warn',
      meta: 'Opened automatically · 3 d ago',
      text: '3 runs of `ingest_lims` took more than twice the usual time (6 to 7 min).',
    },
    { kind: 'event', tone: 'warn', ring: true, meta: 'Gareth set status to Monitoring · 3 d ago' },
    {
      kind: 'event',
      tone: 'warn',
      meta: 'Slow again · today 02:00',
      text: '8 runs in a row at 10 to 12 min. `ingest_lims_results` and two QC models slowed at the same time.',
    },
    {
      kind: 'event',
      tone: 'info',
      meta: 'Finding · today 08:15',
      text: "LIMS API p95 is 1.8 s, up from 0.4 s. Our code and row counts haven't changed.",
    },
    {
      kind: 'comment',
      initials: 'GP',
      name: 'Gareth',
      when: '25 min ago',
      text: "Asked the LIMS vendor about it. If the 10:00 run is still slow I'll raise the page size, which they say is fine up to 5,000.",
    },
  ] satisfies DetailActivity[],
}
