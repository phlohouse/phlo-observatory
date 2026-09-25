/**
 * Mock data for the incident screens: triage stats, the #214 investigation and the
 * post-mortems for the incidents resolved this week (#205, #202, #198).
 * Text fields use `backticks` for monospace names (rendered by RichText).
 * Numbers match fixtures/core.ts: 134 m lag, 6 stale downstream tables, runs a41f / 9c02 / e7d8.
 */
import type { Tone } from '../types'

/* ---------- Types (incident screens only) ---------- */

export interface TriageStats {
  ackMedian: string
  resolveMedian: string
  openedThisMonth: number
  vsLastMonth: string
  resolvedTotal: number
}

export interface CodeLine {
  n: number
  op: ' ' | '-' | '+'
  text: string
}

export interface CodeDiff {
  file: string
  badge: { tone: 'outline' | 'ok'; label: string }
  openHref?: string
  lines: CodeLine[]
}

export type ActivityEntry =
  | {
      kind: 'event'
      tone?: Tone
      /** Hollow ring (status changes) */
      ring?: boolean
      /** Branch icon instead of a dot */
      branch?: boolean
      meta: string
      text?: string
      href?: string
      diff?: CodeDiff
    }
  | { kind: 'comment'; initials: string; name: string; when: string; avatarTone?: 'dark' | 'teal'; text: string }

export type LineageTone = 'source' | 'origin-bad' | 'bad' | 'origin-fixed' | 'fresh' | 'neutral'

export interface LineageNode {
  id: string
  col: number
  /** Top edge of the 45px node */
  y: number
  label: string
  name: string
  tone: LineageTone
}

export interface LineageGraphData {
  columns: string[]
  height: number
  edgeTone: 'bad' | 'neutral'
  nodes: LineageNode[]
  edges: Array<[string, string]>
  ariaLabel: string
}

export interface RunRow {
  id?: string
  when: string
  job?: string
  duration: string
  status: { tone: Tone | 'outline'; label: string }
  detail: string
  muted?: boolean
}

export interface FollowUp {
  label: string
  who: string
  done: boolean
}

export interface ResolvedDetail {
  id: string
  summary: string
  facts: Array<{ key: string; value: string; mono?: boolean; href?: string; signed?: boolean }>
  stats: Array<{ label: string; value: string; tone?: 'ok' | 'bad' }>
  timeline: Array<{ time: string; tone: Tone; text: string }>
  postmortem: {
    author: { initials: string; name: string; tone?: 'dark' | 'teal' }
    reviewer: string
    when: string
    sections: Array<{ title: string; text: string }>
  }
  followUps: FollowUp[]
  activity: ActivityEntry[]
  runs: { title: string; window: string; job: string; rows: RunRow[] }
  lineage: { title: string; note: string; graph: LineageGraphData; outcome: string }
}

export interface OpenDetail214 {
  summary: string
  whatHappened: string
  reassurance: string
  lag: { now: number; sla: number; series: number[] }
  activity: ActivityEntry[]
  draftComment: string
  runs: { cadence: string; note: string; rows: RunRow[] }
  lineage: LineageGraphData
  consumers: Array<{ name: string; reads: string; status: { tone: Tone | 'outline'; label: string } }>
  snapshots: Array<
    | { kind: 'snapshot'; id: string; when: string; op: string; rows: string; rowsTone: 'ok' | 'muted' | 'plain'; ref: string; refTone: 'branch' | 'neutral' | 'warn' }
    | { kind: 'gap'; text: string }
  >
  timeTravel: string
}

/* ---------- List ---------- */

export const triage: TriageStats = {
  ackMedian: '6 min',
  resolveMedian: '3 h 40 min',
  openedThisMonth: 12,
  vsLastMonth: '↓ 5 vs August',
  resolvedTotal: 23,
}

/** Owner options for new incidents. */
export const owners = [
  { value: 'Gareth', initials: 'GP' },
  { value: 'QC Analytics', initials: 'QC' },
  { value: 'Assay Dev', initials: 'AD' },
  { value: 'Process Dev', initials: 'PD' },
  { value: 'Data platform', initials: 'DP' },
] as const

/* ---------- #214 ---------- */

export const incident214: OpenDetail214 = {
  summary:
    'The bronze telemetry table has missed its freshness SLA. Downstream QC and batch-release models are serving data from before the last successful load.',
  whatHappened:
    'The process historian was upgraded and renamed a column: `do_pct` is now `do_sat_pct`. Our dlt contract spotted the change and rejected the last 3 loads.',
  reassurance: 'Nothing bad was written. The table just stopped updating.',
  lag: {
    now: 134,
    sla: 60,
    // hourly lag in minutes, −24 h → −5 h, then the climb to now
    series: [12, 15, 11, 14, 18, 13, 12, 16, 14, 11, 13, 17, 15, 12, 14, 13, 16, 12, 15, 14, 38, 78, 112, 134],
  },
  activity: [
    {
      kind: 'event',
      tone: 'bad',
      meta: 'Problem detected · 52 min ago',
      text: 'Freshness SLA breached for `bronze.bioreactor_telemetry`. Six downstream assets are now stale, including `gold.batch_release_metrics`.',
    },
    { kind: 'event', ring: true, meta: 'Status updated to Investigating · 51 min ago' },
    {
      kind: 'event',
      tone: 'info',
      meta: 'Finding · 48 min ago',
      text: "dlt's frozen schema contract rejected the last three loads: the historian export renamed `do_pct` to `do_sat_pct`.",
      diff: {
        file: 'sources/historian.py',
        badge: { tone: 'outline', label: 'suggested fix' },
        openHref: '/branches',
        lines: [
          { n: 10, op: ' ', text: 'def telemetry(since=dlt.sources.incremental("ts")):' },
          { n: 11, op: '-', text: '    cols = ["ts", "run_id", "ph", "do_pct", "temp_c"]' },
          { n: 11, op: '+', text: '    cols = ["ts", "run_id", "ph", "do_sat_pct", "temp_c"]' },
          { n: 12, op: ' ', text: '    yield from historian.read(cols, since=since.last_value)' },
        ],
      },
    },
    {
      kind: 'event',
      tone: 'neutral',
      meta: 'Fact · 45 min ago',
      text: 'Runs `a41f`, `9c02` and `e7d8` of `ingest_bioreactor` failed at the normalize step. No partial writes reached the Iceberg table.',
    },
    {
      kind: 'event',
      branch: true,
      meta: 'Branch `fix/telemetry-schema` created from `main@8f3c21a` · 22 min ago',
      href: '/branches',
    },
    {
      kind: 'comment',
      initials: 'GP',
      name: 'Gareth',
      when: '12 min ago',
      text: "Patching the contract on the branch now. I'll backfill from the last good watermark and merge to main once the audits pass.",
    },
  ],
  draftComment: '@QC Analytics gold.batch_release_metrics will lag ~2 h until the merge lands.',
  runs: {
    cadence: 'every 15 min · last 12 runs',
    note: 'Planned historian maintenance ran from 07:30 to 09:00. Runs in that window were skipped because the source was unavailable, then failed once it came back with the new column name.',
    rows: [
      { id: 'e7d8c01', when: '6 min ago', duration: '1 m 16 s', status: { tone: 'bad', label: 'Failed' }, detail: 'normalize · contract violation' },
      { id: '9c02b77', when: '21 min ago', duration: '1 m 14 s', status: { tone: 'bad', label: 'Failed' }, detail: 'normalize · contract violation' },
      { id: 'a41f3d9', when: '36 min ago', duration: '1 m 18 s', status: { tone: 'bad', label: 'Failed' }, detail: 'normalize · contract violation' },
      { id: '71c0e4a', when: '51 min ago', duration: '3 s', status: { tone: 'outline', label: 'Skipped' }, detail: 'source unavailable' },
      { id: '+ 4 more', when: '1 h 6 m – 1 h 51 m ago', duration: '—', status: { tone: 'outline', label: 'Skipped' }, detail: 'source unavailable', muted: true },
      { id: 'b2d91f6', when: '2 h 14 m ago', duration: '1 m 09 s', status: { tone: 'ok', label: 'Succeeded' }, detail: '+18,904 rows' },
      { id: '0fe7a25', when: '2 h 29 m ago', duration: '1 m 11 s', status: { tone: 'ok', label: 'Succeeded' }, detail: '+19,122 rows' },
      { id: '5c33e18', when: '2 h 44 m ago', duration: '1 m 08 s', status: { tone: 'ok', label: 'Succeeded' }, detail: '+18,877 rows' },
    ],
  },
  lineage: {
    columns: ['Source', 'Bronze', 'Silver', 'Gold'],
    height: 290,
    edgeTone: 'bad',
    nodes: [
      { id: 'src', col: 0, y: 137, label: 'dlt source', name: 'Process historian', tone: 'source' },
      { id: 'tel', col: 1, y: 137, label: 'origin · 134 m', name: 'bioreactor_telemetry', tone: 'origin-bad' },
      { id: 'runs', col: 2, y: 47, label: 'stale · 131 m', name: 'bioreactor_runs_1min', tone: 'bad' },
      { id: 'feed', col: 2, y: 137, label: 'stale · 129 m', name: 'feed_events', tone: 'bad' },
      { id: 'sum', col: 2, y: 227, label: 'stale · 126 m', name: 'run_summaries', tone: 'bad' },
      { id: 'brm', col: 3, y: 47, label: 'stale · 118 m', name: 'batch_release_metrics', tone: 'bad' },
      { id: 'cpp', col: 3, y: 137, label: 'stale · 117 m', name: 'cpp_trends', tone: 'bad' },
      { id: 'cap', col: 3, y: 227, label: 'stale · 1 d 2 h', name: 'process_capability', tone: 'bad' },
    ],
    edges: [
      ['src', 'tel'],
      ['tel', 'runs'],
      ['tel', 'feed'],
      ['tel', 'sum'],
      ['runs', 'brm'],
      ['runs', 'cpp'],
      ['feed', 'brm'],
      ['sum', 'cap'],
    ],
    ariaLabel:
      'Lineage: process historian feeds bronze.bioreactor_telemetry, which feeds three silver tables and, through them, three gold tables. All six downstream tables are stale.',
  },
  consumers: [
    { name: 'Batch release review', reads: 'gold.batch_release_metrics', status: { tone: 'bad', label: 'QA notified' } },
    { name: 'CPP trend report', reads: 'gold.cpp_trends', status: { tone: 'outline', label: 'next run 12:00' } },
    { name: 'Process capability (Cpk)', reads: 'gold.process_capability', status: { tone: 'outline', label: 'daily' } },
  ],
  snapshots: [
    { kind: 'snapshot', id: '5b7f3118a09e', when: '9 min ago', op: 'append', rows: '+184,212', rowsTone: 'ok', ref: 'fix/telemetry-schema', refTone: 'branch' },
    { kind: 'snapshot', id: 'a1c9e02d44f1', when: '18 min ago', op: 'schema update', rows: '—', rowsTone: 'muted', ref: 'fix/telemetry-schema', refTone: 'branch' },
    { kind: 'gap', text: 'No commits on main for 2 h 14 min' },
    { kind: 'snapshot', id: '77029148532b', when: '2 h 14 m ago', op: 'append', rows: '+18,904', rowsTone: 'plain', ref: 'main', refTone: 'neutral' },
    { kind: 'snapshot', id: '6618d03e7c50', when: '2 h 29 m ago', op: 'append', rows: '+19,122', rowsTone: 'plain', ref: 'main', refTone: 'neutral' },
    { kind: 'snapshot', id: '55210fa9b1d7', when: '2 h 44 m ago', op: 'append', rows: '+18,877', rowsTone: 'plain', ref: 'main', refTone: 'neutral' },
    { kind: 'snapshot', id: 'c42e9b0a61e3', when: 'Mon 18:02', op: 'append', rows: '+20,417', rowsTone: 'plain', ref: 'release/BR-2026-118', refTone: 'warn' },
  ],
  timeTravel: "SELECT * FROM bronze.bioreactor_telemetry\nFOR VERSION AS OF 7702914853210447\nWHERE run_id = 'BR-2026-121';",
}

/* ---------- Resolved ---------- */

const r198: ResolvedDetail = {
  id: '198',
  summary:
    'An audit caught duplicate result rows in the silver QC table after the LIMS extract posted the same results twice.',
  facts: [
    { key: 'Asset', value: 'silver.qc_results', mono: true, href: '/assets/silver.qc_results' },
    { key: 'Caught by', value: 'unique(batch_id, test_code, rep)', mono: true },
    { key: 'Owner', value: 'QC Analytics' },
    { key: 'Resolved by', value: 'Sam R. · Friday 16:40' },
    { key: 'Fixed in', value: '3f81a2c', mono: true, href: '/settings/audit-log', signed: true },
  ],
  stats: [
    { label: 'Time to resolve', value: '3 h 12 min' },
    { label: 'Rows affected', value: '1,204' },
    { label: 'Batches touched', value: '3' },
    { label: 'Release impact', value: 'None · caught before review', tone: 'ok' },
  ],
  timeline: [
    { time: '13:28', tone: 'bad', text: 'Audit failed on `silver.qc_results`' },
    { time: '13:31', tone: 'warn', text: 'Downstream gold models paused' },
    { time: '14:05', tone: 'info', text: 'Root cause found: LIMS retry' },
    { time: '15:52', tone: 'branch', text: 'Dedup fix merged and signed' },
    { time: '16:40', tone: 'ok', text: 'Audits green, incident resolved' },
  ],
  postmortem: {
    author: { initials: 'SR', name: 'Sam R.', tone: 'teal' },
    reviewer: 'Gareth',
    when: 'Monday',
    sections: [
      {
        title: 'What happened',
        text: 'The LIMS API timed out mid-response on Friday afternoon. Our extract retried the page and dlt loaded both copies, so 1,204 result rows appeared twice in `bronze.lims_results` and then in `silver.qc_results`.',
      },
      {
        title: 'Impact',
        text: 'Three batches (BR-2026-114 to 116) showed doubled replicate counts for about three hours. Gold models were paused automatically, so nothing reached the batch release review.',
      },
      {
        title: 'Root cause',
        text: "The extract used a cursor on `updated_at` with no primary key, so a retried page wasn't recognised as a repeat. The uniqueness audit only ran at the silver layer.",
      },
      {
        title: 'Fix',
        text: 'Switched the dlt resource to merge on `result_id`, removed the duplicates on a branch, re-ran audits, and merged with a signed approval.',
      },
    ],
  },
  followUps: [
    { label: 'Merge on `result_id` for all LIMS resources', who: 'Gareth', done: true },
    { label: 'Add uniqueness audit at the bronze layer', who: 'QC Analytics', done: true },
    { label: 'Alert when the LIMS API retries more than 3 times in an hour', who: 'due Fri', done: false },
  ],
  activity: [
    {
      kind: 'event',
      tone: 'bad',
      meta: 'Problem detected · Fri 13:28',
      text: 'Audit `unique(batch_id, test_code, rep)` failed on `silver.qc_results`: 1,204 duplicate rows.',
    },
    { kind: 'event', ring: true, meta: 'Gold models paused automatically · 13:31' },
    { kind: 'event', tone: 'neutral', meta: 'Sam R. acknowledged · 13:34' },
    {
      kind: 'event',
      tone: 'info',
      meta: 'Finding · 14:05',
      text: 'The LIMS API timed out and the extract retried the same page. The resource appends with no key, so both copies landed.',
      diff: {
        file: 'sources/lims.py',
        badge: { tone: 'ok', label: 'merged' },
        lines: [
          { n: 18, op: ' ', text: '@dlt.resource(name="lims_results",' },
          { n: 19, op: '-', text: '    write_disposition="append")' },
          { n: 19, op: '+', text: '    write_disposition="merge", primary_key="result_id")' },
        ],
      },
    },
    { kind: 'event', branch: true, meta: '`fix/lims-dedup` signed and merged by Gareth (Approved) · 15:52' },
    {
      kind: 'comment',
      initials: 'SR',
      name: 'Sam R.',
      when: '16:38',
      avatarTone: 'teal',
      text: 'Checked BR-2026-114 to 116 against LIMS directly. Replicate counts match now. Resuming gold models.',
    },
    { kind: 'event', tone: 'ok', meta: 'Status set to Resolved by Sam R. · 16:40' },
  ],
  runs: {
    title: 'Runs during the incident',
    window: 'Fri 13:00 – 16:45',
    job: 'ingest_lims',
    rows: [
      { when: '13:00', job: 'ingest_lims', duration: '14 m 02 s', status: { tone: 'warn', label: 'Succeeded' }, detail: 'Page 7 retried after timeout · +2,408 rows' },
      { when: '13:20', job: 'transform_silver', duration: '3 m 40 s', status: { tone: 'ok', label: 'Succeeded' }, detail: 'Built qc_results from the duplicated load' },
      { when: '13:28', job: 'audits_qc', duration: '52 s', status: { tone: 'bad', label: 'Failed' }, detail: 'unique(batch_id, test_code, rep) · 1,204 rows' },
      { when: '13:31', job: 'transform_gold', duration: '—', status: { tone: 'neutral', label: 'Paused' }, detail: 'Held by failing upstream audit' },
      { when: '14:00', job: 'ingest_lims', duration: '11 m 10 s', status: { tone: 'ok', label: 'Succeeded' }, detail: 'No retries · +1,196 rows' },
      { when: '15:55', job: 'ingest_lims', duration: '6 m 41 s', status: { tone: 'ok', label: 'Succeeded' }, detail: 'Merge on result_id · 1,204 duplicates removed' },
      { when: '16:30', job: 'audits_qc', duration: '49 s', status: { tone: 'ok', label: 'Passed' }, detail: 'All 12 audits green' },
      { when: '16:42', job: 'transform_gold', duration: '2 m 18 s', status: { tone: 'ok', label: 'Succeeded' }, detail: 'Resumed · gold tables fresh' },
    ],
  },
  lineage: {
    title: 'What was affected',
    note: 'All back to fresh',
    outcome: 'Gold tables were paused before they read the bad data, so no duplicate results reached the batch release review.',
    graph: {
      columns: ['Source', 'Bronze', 'Silver', 'Gold'],
      height: 250,
      edgeTone: 'neutral',
      nodes: [
        { id: 'src', col: 0, y: 117, label: 'dlt · ingest_lims', name: 'LIMS API', tone: 'source' },
        { id: 'br', col: 1, y: 117, label: 'fresh · deduped', name: 'lims_results', tone: 'fresh' },
        { id: 'qc', col: 2, y: 117, label: 'origin · fixed', name: 'qc_results', tone: 'origin-fixed' },
        { id: 'brm', col: 3, y: 62, label: 'paused 3 h 11 m', name: 'batch_release_metrics', tone: 'neutral' },
        { id: 'dash', col: 3, y: 172, label: 'paused 3 h 11 m', name: 'qc_release_dashboard', tone: 'neutral' },
      ],
      edges: [
        ['src', 'br'],
        ['br', 'qc'],
        ['qc', 'brm'],
        ['qc', 'dash'],
      ],
      ariaLabel:
        'LIMS API feeds ingest_lims, which writes bronze.lims_results, which feeds silver.qc_results, the table with duplicates. It feeds two gold tables that were paused from 13:31 to 16:42.',
    },
  },
}

const r205: ResolvedDetail = {
  id: '205',
  summary:
    'Nightly snapshot expiry skipped three runs on the silver ELISA table, so old snapshots piled up and query planning slowed down.',
  facts: [
    { key: 'Asset', value: 'silver.elisa_results', mono: true, href: '/assets/silver.elisa_results' },
    { key: 'Caught by', value: 'snapshot_age < 7 d', mono: true },
    { key: 'Owner', value: 'Gareth' },
    { key: 'Resolved by', value: 'Gareth · Tuesday 10:12' },
    { key: 'Fixed in', value: 'a7c4d19', mono: true, href: '/settings/audit-log', signed: true },
  ],
  stats: [
    { label: 'Time to resolve', value: '1 h 10 min' },
    { label: 'Snapshots expired', value: '2,318' },
    { label: 'Storage freed', value: '214 GB' },
    { label: 'Release impact', value: 'None · reads unaffected', tone: 'ok' },
  ],
  timeline: [
    { time: '09:02', tone: 'warn', text: 'Snapshot age check failed on `silver.elisa_results`' },
    { time: '09:15', tone: 'info', text: 'Root cause found: expiry blocked by compaction lock' },
    { time: '09:40', tone: 'branch', text: 'Lock timeout added and signed' },
    { time: '10:12', tone: 'ok', text: 'Expiry finished, incident resolved' },
  ],
  postmortem: {
    author: { initials: 'GP', name: 'Gareth' },
    reviewer: 'Rui P.',
    when: 'Wednesday',
    sections: [
      {
        title: 'What happened',
        text: 'A long-running compaction on `silver.elisa_results` held the table lock over three nights, so `iceberg_maintenance` skipped snapshot expiry each time. Snapshots older than 7 days built up to 2,318.',
      },
      {
        title: 'Impact',
        text: 'Query planning on the table slowed from under 1 s to about 6 s. Reads stayed correct and no reports were late.',
      },
      {
        title: 'Root cause',
        text: 'The expiry step waited for the lock with no timeout and then gave up silently. Nothing alerted on a skipped expiry.',
      },
      {
        title: 'Fix',
        text: 'Added a 20 min lock timeout that retries after compaction, ran `expire_snapshots` by hand, and alert when expiry is skipped twice in a row.',
      },
    ],
  },
  followUps: [
    { label: 'Alert when snapshot expiry is skipped twice in a row', who: 'Gareth', done: true },
    { label: 'Split compaction for tables over 10 GB into smaller jobs', who: 'due next week', done: false },
  ],
  activity: [
    { kind: 'event', tone: 'warn', meta: 'Problem detected · Tue 09:02', text: 'Check `snapshot_age < 7 d` failed on `silver.elisa_results`: 2,318 snapshots past retention.' },
    { kind: 'event', tone: 'neutral', meta: 'Gareth acknowledged · 09:06' },
    {
      kind: 'event',
      tone: 'info',
      meta: 'Finding · 09:15',
      text: 'Compaction held the table lock for up to 5 h, and expiry waited with no timeout.',
      diff: {
        file: 'maintenance/expiry.py',
        badge: { tone: 'ok', label: 'merged' },
        lines: [
          { n: 31, op: ' ', text: 'def expire(table, older_than="7d"):' },
          { n: 32, op: '-', text: '    with table.lock():' },
          { n: 32, op: '+', text: '    with table.lock(timeout="20m", retry_after="compaction"):' },
        ],
      },
    },
    { kind: 'event', branch: true, meta: '`fix/expiry-lock-timeout` signed and merged by Gareth · 09:40' },
    { kind: 'event', tone: 'ok', meta: 'Status set to Resolved by Gareth · 10:12' },
  ],
  runs: {
    title: 'Runs during the incident',
    window: 'Tue 09:00 – 10:15',
    job: 'iceberg_maintenance',
    rows: [
      { when: 'Sat 02:00', job: 'iceberg_maintenance', duration: '4 m 12 s', status: { tone: 'warn', label: 'Partial' }, detail: 'Expiry skipped · table locked' },
      { when: 'Sun 02:00', job: 'iceberg_maintenance', duration: '4 m 40 s', status: { tone: 'warn', label: 'Partial' }, detail: 'Expiry skipped · table locked' },
      { when: 'Mon 02:00', job: 'iceberg_maintenance', duration: '5 m 03 s', status: { tone: 'warn', label: 'Partial' }, detail: 'Expiry skipped · table locked' },
      { when: '09:48', job: 'iceberg_maintenance', duration: '22 m 31 s', status: { tone: 'ok', label: 'Succeeded' }, detail: '2,318 snapshots expired · 214 GB freed' },
    ],
  },
  lineage: {
    title: 'What was affected',
    note: 'Planning time only',
    outcome: 'Reads stayed correct throughout. Only query planning on the silver table slowed down.',
    graph: {
      columns: ['Source', 'Bronze', 'Silver', 'Gold'],
      height: 170,
      edgeTone: 'neutral',
      nodes: [
        { id: 'src', col: 0, y: 72, label: 'dlt source', name: 'Plate readers', tone: 'source' },
        { id: 'br', col: 1, y: 72, label: 'fresh', name: 'elisa_plate_reads', tone: 'fresh' },
        { id: 'sv', col: 2, y: 72, label: 'origin · fixed', name: 'elisa_results', tone: 'origin-fixed' },
        { id: 'gd', col: 3, y: 72, label: 'unaffected', name: 'qc_release_dashboard', tone: 'neutral' },
      ],
      edges: [
        ['src', 'br'],
        ['br', 'sv'],
        ['sv', 'gd'],
      ],
      ariaLabel: 'Plate readers feed bronze.elisa_plate_reads, then silver.elisa_results, the table with overdue expiry, then gold.qc_release_dashboard, which was unaffected.',
    },
  },
}

const r202: ResolvedDetail = {
  id: '202',
  summary:
    "Commits to the Nessie catalog slowed to up to 40 s because its Postgres store ran out of connections. Two runs timed out while committing.",
  facts: [
    { key: 'Service', value: 'Nessie catalog · Postgres' },
    { key: 'Caught by', value: 'nessie_commit_p95 < 5 s', mono: true },
    { key: 'Owner', value: 'Gareth' },
    { key: 'Resolved by', value: 'Gareth · Sunday 07:54' },
    { key: 'Fixed in', value: 'd93e0b7', mono: true, href: '/settings/audit-log', signed: true },
  ],
  stats: [
    { label: 'Time to resolve', value: '42 min' },
    { label: 'Commits delayed', value: '37' },
    { label: 'Runs timed out', value: '2', tone: 'bad' },
    { label: 'Release impact', value: 'None · retried cleanly', tone: 'ok' },
  ],
  timeline: [
    { time: '07:12', tone: 'bad', text: 'Commit latency p95 over 5 s on main' },
    { time: '07:20', tone: 'info', text: 'Root cause found: connection pool exhausted' },
    { time: '07:38', tone: 'branch', text: 'Pool size change signed and applied' },
    { time: '07:54', tone: 'ok', text: 'Latency normal, incident resolved' },
  ],
  postmortem: {
    author: { initials: 'GP', name: 'Gareth' },
    reviewer: 'Rui P.',
    when: 'Monday',
    sections: [
      {
        title: 'What happened',
        text: 'Autovacuum stalled on the Nessie commit log table early on Sunday. Queries got slower, held their connections longer, and the pool of 20 ran out.',
      },
      {
        title: 'Impact',
        text: '37 commits waited up to 40 s. Two `ingest_erp` runs timed out while committing and were retried cleanly. No data was lost.',
      },
      {
        title: 'Root cause',
        text: 'The pool was sized for last year’s load, and nothing alerted on autovacuum falling behind.',
      },
      {
        title: 'Fix',
        text: 'Raised the pool to 40, vacuumed the commit log by hand, and added alerts for commit latency and vacuum lag.',
      },
    ],
  },
  followUps: [
    { label: 'Alert when autovacuum lags more than 1 h', who: 'Gareth', done: true },
    { label: 'Load-test the catalog at twice the current commit rate', who: 'Rui P.', done: true },
  ],
  activity: [
    { kind: 'event', tone: 'bad', meta: 'Problem detected · Sun 07:12', text: 'Check `nessie_commit_p95 < 5 s` failed: p95 commit latency 38 s on main.' },
    { kind: 'event', tone: 'neutral', meta: 'Gareth acknowledged · 07:15' },
    {
      kind: 'event',
      tone: 'info',
      meta: 'Finding · 07:20',
      text: 'All 20 Postgres connections were busy on slow queries against the commit log after autovacuum stalled.',
      diff: {
        file: 'deploy/nessie.yaml',
        badge: { tone: 'ok', label: 'applied' },
        lines: [
          { n: 14, op: ' ', text: 'datasource:' },
          { n: 15, op: '-', text: '  max_pool_size: 20' },
          { n: 15, op: '+', text: '  max_pool_size: 40' },
        ],
      },
    },
    { kind: 'event', branch: true, meta: 'Config change signed and applied by Gareth · 07:38' },
    { kind: 'event', tone: 'ok', meta: 'Status set to Resolved by Gareth · 07:54' },
  ],
  runs: {
    title: 'Runs during the incident',
    window: 'Sun 07:00 – 08:00',
    job: 'ingest_erp',
    rows: [
      { when: '07:00', job: 'ingest_erp', duration: '1 m 04 s', status: { tone: 'ok', label: 'Succeeded' }, detail: 'Commit took 9 s' },
      { when: '07:10', job: 'ingest_plate_readers', duration: '1 m 31 s', status: { tone: 'warn', label: 'Slow' }, detail: 'Commit took 38 s' },
      { when: '07:15', job: 'ingest_erp', duration: '2 m 00 s', status: { tone: 'bad', label: 'Failed' }, detail: 'Commit timed out · retried' },
      { when: '07:30', job: 'ingest_erp', duration: '2 m 00 s', status: { tone: 'bad', label: 'Failed' }, detail: 'Commit timed out · retried' },
      { when: '07:45', job: 'ingest_erp', duration: '58 s', status: { tone: 'ok', label: 'Succeeded' }, detail: 'Commit took 0.4 s' },
    ],
  },
  lineage: {
    title: 'What was affected',
    note: 'Every writer to the catalog',
    outcome: 'Runs that timed out were retried and committed cleanly. Readers kept seeing the last committed state of main.',
    graph: {
      columns: ['Writers', 'Catalog', 'Store'],
      height: 230,
      edgeTone: 'neutral',
      nodes: [
        { id: 'dag', col: 0, y: 47, label: 'orchestrator', name: 'Dagster runs', tone: 'source' },
        { id: 'dlt', col: 0, y: 147, label: 'loader', name: 'dlt-loader', tone: 'source' },
        { id: 'nes', col: 1, y: 97, label: 'slow commits', name: 'nessie', tone: 'neutral' },
        { id: 'pg', col: 2, y: 97, label: 'origin · fixed', name: 'postgres', tone: 'origin-fixed' },
      ],
      edges: [
        ['dag', 'nes'],
        ['dlt', 'nes'],
        ['nes', 'pg'],
      ],
      ariaLabel: 'Dagster runs and the dlt loader commit through the Nessie catalog, which stores its commit log in Postgres, where the problem was.',
    },
  },
}

export const resolvedDetails: Record<string, ResolvedDetail> = { '198': r198, '205': r205, '202': r202 }
