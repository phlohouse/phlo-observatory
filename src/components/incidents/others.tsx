import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlarmClockIcon,
  CircleCheckIcon,
  GitBranchIcon,
  GitMergeIcon,
  ListIcon,
  RefreshCwIcon,
  TableIcon,
  Undo2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { Asset, Incident } from '@/lib/data/types'
import {
  incident207,
  incident209,
  incident211,
  incident213,
  type CodeLine,
  type ConflictPick,
  type DetailActivity,
  type DetailStat,
  type MergeConflict,
  type SchemaDecision,
} from '@/lib/data/fixtures/incident-details'
import { Eyebrow, KeyValues, Meta } from '@/components/phlo/page'
import { Stat } from '@/components/phlo/kpi'
import { Timeline, TimelineComment, TimelineItem } from '@/components/phlo/timeline'
import { IncidentStatusBadge, IncidentTile, Mono, SeverityBadge } from '@/components/phlo/status'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { OptionCard, RadioGroup } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/toggle-group'

type Props = { incident: Incident; asset?: Asset }

/* ======================================================================
 * Shared pieces
 * ==================================================================== */

/** `code` → monospace, #NNN → incident link. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|#\d{3}\b)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`') && p.length > 1) return <Mono key={i}>{p.slice(1, -1)}</Mono>
        if (/^#\d{3}$/.test(p))
          return (
            <Link key={i} to="/incidents/$incidentId" params={{ incidentId: p.slice(1) }}>
              {p}
            </Link>
          )
        return <React.Fragment key={i}>{p}</React.Fragment>
      })}
    </>
  )
}

/** Left detail column + right working area. Both scroll on desktop; one column on phones. */
function IncidentLayout({ left, right, leftWidth }: { left: React.ReactNode; right: React.ReactNode; leftWidth: 440 | 480 | 500 }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <section
        className={cn(
          'flex shrink-0 flex-col border-b border-line lg:overflow-y-auto lg:border-r lg:border-b-0',
          leftWidth === 440 && 'lg:w-[440px]',
          leftWidth === 480 && 'lg:w-[480px]',
          leftWidth === 500 && 'lg:w-[500px]',
        )}
      >
        {left}
      </section>
      <section className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-5 lg:overflow-y-auto lg:px-7">{right}</section>
    </div>
  )
}

function IncidentIntro({ incident, summary, children, badges }: { incident: Incident; summary: string; children?: React.ReactNode; badges?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-5 pb-[18px] lg:px-7 lg:pt-[22px]">
      <div className="flex flex-wrap items-center gap-2">
        <IncidentTile kind={incident.kind} size="lg" />
        <Mono className="text-[13px] text-muted-foreground">#{incident.id}</Mono>
        <span className="ml-1.5">
          <SeverityBadge severity={incident.severity} size="lg" />
        </span>
        <IncidentStatusBadge status={incident.status} />
        {badges}
      </div>
      <h2 className="m-0 text-xl leading-tight font-semibold tracking-[-0.01em] lg:text-[22px]">{incident.headline}</h2>
      <p className="m-0 text-sm leading-relaxed text-text-3">
        <Rich text={summary} />
      </p>
      {children}
    </div>
  )
}

function Details({ items }: { items: Array<[React.ReactNode, React.ReactNode]> }) {
  return (
    <div className="px-4 pb-[18px] lg:px-7">
      <KeyValues keyWidth={120} items={items} className="[&_dd]:flex-wrap" />
    </div>
  )
}

function Stats({ stats }: { stats: DetailStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 pb-5 lg:px-7">
      {stats.map((s) => (
        <Stat key={s.label} label={s.label} value={s.value} sub={s.sub} tone={s.tone} />
      ))}
    </div>
  )
}

function Activity({ items, children }: { items: DetailActivity[]; children?: React.ReactNode }) {
  return (
    <div className="mx-4 flex flex-col gap-3 border-t border-line pt-4 pb-6 lg:mx-7">
      <Eyebrow>Activity</Eyebrow>
      <Timeline>
        {items.map((a, i) =>
          a.kind === 'comment' ? (
            <TimelineComment key={i} initials={a.initials} name={a.name} when={a.when} tone={a.avatarTone}>
              <Rich text={a.text} />
            </TimelineComment>
          ) : (
            <TimelineItem key={i} tone={a.tone} ring={a.ring} compact={!a.text} meta={a.meta}>
              {a.text ? <Rich text={a.text} /> : null}
              {a.log ? (
                <pre className="m-0 mt-1.5 overflow-x-auto rounded-lg bg-sunken px-3 py-2.5 font-mono text-[11.5px] leading-[19px] text-text-3">
                  {a.log}
                </pre>
              ) : null}
            </TimelineItem>
          ),
        )}
        {children}
      </Timeline>
    </div>
  )
}

function SectionTitle({ title, meta, action }: { title: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h3 className="m-0 text-[15px] font-medium">{title}</h3>
      {meta ? <Meta>{meta}</Meta> : null}
      {action ? <div className="ml-auto flex items-center gap-2.5">{action}</div> : null}
    </div>
  )
}

function Note({ tone, children, className }: { tone: 'info' | 'ok' | 'warn'; children: React.ReactNode; className?: string }) {
  return (
    <div
      role={tone === 'info' ? undefined : 'status'}
      className={cn(
        'rounded-[10px] border px-3.5 py-3 text-[13.5px] leading-normal',
        tone === 'info' && 'border-primary-line bg-primary-soft text-primary-ink',
        tone === 'ok' && 'border-ok-line bg-ok-wash text-ok-ink',
        tone === 'warn' && 'border-warn-soft bg-warn-wash text-warn-ink',
        className,
      )}
    >
      {children}
    </div>
  )
}

function Help({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('m-0 text-[12.5px] leading-snug text-muted-foreground', className)} {...props} />
}

function AssetLink({ id }: { id: string }) {
  return (
    <Link to="/assets/$assetId" params={{ assetId: id }} search={{ env: undefined }} className="font-mono text-[13px]">
      {id}
    </Link>
  )
}

function Person({ initials, name, tone }: { initials: string; name: string; tone?: 'dark' | 'teal' }) {
  return (
    <>
      <Avatar initials={initials} tone={tone} />
      {name}
    </>
  )
}

/** Horizontal breakdown row: label, track with fill (+ optional marker), value. */
function BreakdownRow({
  label,
  pct,
  fill,
  marker,
  value,
}: {
  label: string
  pct: number
  fill: string
  marker?: number
  value: string
}) {
  return (
    <div className="grid h-[30px] grid-cols-[100px_minmax(0,1fr)_64px] items-center gap-x-3 text-[13px] sm:grid-cols-[130px_minmax(0,1fr)_64px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="relative h-2.5 overflow-visible rounded-[3px] bg-soft">
        <div className={cn('absolute inset-y-0 left-0 rounded-[3px]', fill)} style={{ width: `${pct}%` }} />
        {marker !== undefined ? (
          <div aria-hidden className="absolute -inset-y-0.5 w-0.5 bg-foreground" style={{ left: `${marker}%` }} />
        ) : null}
      </div>
      <Mono className="text-right text-xs">{value}</Mono>
    </div>
  )
}

const CardBox = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div className={cn('overflow-hidden rounded-[10px] border border-border-card', className)} {...props} />
)

/* ======================================================================
 * #213 Schema drift
 * ==================================================================== */

export function IncidentSchemaDrift({ incident, asset }: Props) {
  const d = incident213
  const assetId = asset?.id ?? incident.assetId ?? 'bronze.elisa_plate_reads'
  const [choice, setChoice] = React.useState<SchemaDecision>('accept')
  const [note, setNote] = React.useState(d.defaultNote)
  const [done, setDone] = React.useState<SchemaDecision | null>(null)
  const [snoozed, setSnoozed] = React.useState(false)
  const option = d.options.find((o) => o.value === choice)!
  const doneOption = d.options.find((o) => o.value === done)

  return (
    <IncidentLayout
      leftWidth={500}
      left={
        <>
          <IncidentIntro
            incident={incident}
            summary={d.summary}
            badges={snoozed ? <Badge variant="outline" size="lg">Snoozed 24 h</Badge> : null}
          />
          <Details
            items={[
              ['Asset', <AssetLink id={assetId} />],
              [
                'Source',
                <>
                  {d.source}
                  <Badge variant="outline">dlt</Badge>
                </>,
              ],
              [
                'Contract',
                <>
                  <Mono>{d.contract.mode}</Mono>
                  <Meta>{d.contract.note}</Meta>
                </>,
              ],
              ['Owner', <Person initials={d.owner.initials} name={d.owner.name} tone="teal" />],
              ['First seen', d.firstSeen],
            ]}
          />
          <Stats stats={d.stats} />
          <Activity items={d.activity}>
            {done && doneOption ? (
              <TimelineItem tone="ok" meta="You · just now">
                {doneOption.title}
                {note.trim() ? <span className="text-muted-foreground"> — “{note.trim()}”</span> : null}
              </TimelineItem>
            ) : null}
          </Activity>
        </>
      }
      right={
        <>
          <SectionTitle
            title="Decision needed"
            meta={
              <>
                What should happen to <Mono>{d.column.name}</Mono>?
              </>
            }
          />

          <CardBox>
            <div className="flex h-[38px] items-center border-b border-line px-3.5">
              <Eyebrow>Proposed column</Eyebrow>
            </div>
            <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5 px-4 py-3.5 text-[13.5px] sm:grid-cols-[110px_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="m-0">
                <Mono>{d.column.name}</Mono>
              </dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="m-0">
                <Mono>{d.column.type}</Mono>
              </dd>
              <dt className="text-muted-foreground">Seen values</dt>
              <dd className="m-0 flex flex-wrap gap-1.5">
                {d.column.values.map((v) => (
                  <span key={v} className="inline-flex h-6 items-center rounded-[5px] bg-soft px-2 font-mono text-xs text-text-2">
                    {v}
                  </span>
                ))}
              </dd>
              <dt className="text-muted-foreground">Rows so far</dt>
              <dd className="m-0">{d.column.rows}</dd>
            </dl>
          </CardBox>

          {done && doneOption ? (
            <Note tone="ok" className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <Rich text={doneOption.result} />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pl-6">
                {done === 'accept' ? (
                  <Link to="/branches" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <GitBranchIcon /> Open in Branches
                  </Link>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setDone(null)}>
                  <Undo2Icon /> Undo
                </Button>
              </div>
            </Note>
          ) : (
            <>
              <RadioGroup
                aria-label="Decision"
                value={choice}
                onValueChange={(v) => setChoice(v as SchemaDecision)}
                className="flex-col flex-nowrap"
              >
                {d.options.map((o) => (
                  <OptionCard key={o.value} value={o.value} title={o.title} hint={o.hint} />
                ))}
              </RadioGroup>

              <Field>
                <FieldLabel>Note for the audit log</FieldLabel>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="lg" className="h-10 px-4 lg:h-9" onClick={() => setDone(choice)}>
                  {option.cta}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-10 lg:h-9"
                  aria-pressed={snoozed}
                  onClick={() => setSnoozed((s) => !s)}
                >
                  <AlarmClockIcon /> {snoozed ? 'Unsnooze' : 'Snooze 24 h'}
                </Button>
                <Meta className="ml-auto">Needs Engineer role</Meta>
              </div>
              {snoozed ? (
                <Help role="status">Snoozed until tomorrow 09:41. You won't be notified about new loads with this column until then.</Help>
              ) : null}
            </>
          )}
        </>
      }
    />
  )
}

/* ======================================================================
 * #211 Audit failed
 * ==================================================================== */

type AuditOutcome = 'quarantined' | 'waiting' | 'accept-requested' | null

export function IncidentAuditFailed({ incident, asset }: Props) {
  const d = incident211
  const assetId = asset?.id ?? incident.assetId ?? 'silver.qc_results'
  const [dialog, setDialog] = React.useState<'quarantine' | 'accept' | null>(null)
  const [outcome, setOutcome] = React.useState<AuditOutcome>(null)
  const [reason, setReason] = React.useState('')

  const outcomeText: Record<Exclude<AuditOutcome, null>, string> = {
    quarantined:
      'Plate P-4471 quarantined. Its 37 rows are kept but excluded from silver and gold, and BR-2026-119 will release once a re-assay lands.',
    waiting: 'Waiting for re-assay. BR-2026-119 stays held and this incident will reopen the check when new P-4471 results load.',
    'accept-requested': 'Sign-off requested. An Approver needs to sign before the 37 rows are accepted as valid and BR-2026-119 is released.',
  }

  return (
    <IncidentLayout
      leftWidth={480}
      left={
        <>
          <IncidentIntro incident={incident} summary={d.summary} />
          <Details
            items={[
              ['Asset', <AssetLink id={assetId} />],
              ['Audit', <Mono className="text-[12.5px] break-all">{d.audit}</Mono>],
              ['When it fails', <Badge variant="bad">Blocks downstream</Badge>],
              ['Assignee', <Person initials={d.assignee.initials} name={d.assignee.name} tone="teal" />],
              ['Team', d.team],
            ]}
          />
          <Stats stats={d.stats} />
          <Activity items={d.activity}>
            {outcome ? (
              <TimelineItem tone={outcome === 'quarantined' ? 'ok' : 'info'} meta="You · just now">
                {outcome === 'quarantined' ? 'Quarantined plate P-4471' : outcome === 'waiting' ? 'Set to wait for re-assay' : 'Requested sign-off to accept as valid'}
              </TimelineItem>
            ) : null}
          </Activity>
        </>
      }
      right={
        <>
          <div className="flex flex-col gap-2.5">
            <SectionTitle
              title="Failing rows"
              meta={`${d.totalFailing} rows · showing ${d.rows.length}`}
              action={
                <Link to="/query" className={buttonVariants({ variant: 'outline' })}>
                  <TableIcon /> Open in Query
                </Link>
              }
            />
            <CardBox>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse font-mono text-[12.5px]">
                  <caption className="sr-only">Failing rows for {d.audit}</caption>
                  <thead className="bg-raised">
                    <tr>
                      {['sample_id', 'batch_id', 'plate_id', 'test_code', 'rep', 'potency_pct', 'curve_r2'].map((h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={cn(
                            'h-[34px] border-r border-b border-r-line-soft border-b-line px-3 font-sans text-xs font-normal whitespace-nowrap text-muted-foreground last:border-r-0',
                            i >= 4 ? 'text-right' : 'text-left',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((r, i) => (
                      <tr key={i} className="[&>td]:h-8 [&>td]:border-r [&>td]:border-b [&>td]:border-line-soft [&>td]:px-3 [&>td]:whitespace-nowrap [&>td:last-child]:border-r-0">
                        <td className="text-text-2">{r.sampleId}</td>
                        <td className="text-text-2">{r.batchId}</td>
                        <td className="text-text-2">{r.plateId}</td>
                        <td className="text-text-2">{r.testCode}</td>
                        <td className="text-right">{r.rep}</td>
                        <td className="text-right text-bad-text">{r.potency}</td>
                        <td className="text-right text-warn-ink">{r.curveR2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBox>
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="m-0 pb-1 text-[15px] font-medium">Where the failures come from</h3>
            <div role="img" aria-label="All failing rows share plate P-4471, batch BR-2026-119 and analyst run 04:10. The plate's curve fit R² is 0.912, below the 0.98 threshold.">
              {d.breakdown.map((b) => (
                <BreakdownRow
                  key={b.label}
                  label={b.label}
                  pct={b.pct}
                  fill={b.tone === 'bad' ? 'bg-bad' : 'bg-warn-bar'}
                  marker={'threshold' in b ? b.threshold : undefined}
                  value={b.value}
                />
              ))}
            </div>
            <Note tone="info" className="mt-2">
              {d.explanation}
            </Note>
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="m-0 text-[15px] font-medium">What to do</h3>
            {outcome ? (
              <Note tone={outcome === 'quarantined' ? 'ok' : 'warn'} className="flex flex-wrap items-start gap-2.5">
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">{outcomeText[outcome]}</span>
                <Button variant="ghost" size="sm" onClick={() => setOutcome(null)}>
                  <Undo2Icon /> Undo
                </Button>
              </Note>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="lg" className="h-10 px-4 lg:h-9" onClick={() => setDialog('quarantine')}>
                  Quarantine plate P-4471
                </Button>
                <Button variant="outline" size="lg" className="h-10 lg:h-9" onClick={() => setOutcome('waiting')}>
                  Wait for re-assay
                </Button>
                <Button variant="outline" size="lg" className="h-10 lg:h-9" onClick={() => setDialog('accept')}>
                  Accept as valid…
                </Button>
              </div>
            )}
            <Help>
              Quarantine keeps the rows but excludes them from silver and gold, and releases BR-2026-119 once a re-assay lands.
              Accepting needs an Approver's signature and a reason.
            </Help>
          </div>

          <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
            <DialogContent className="max-w-[520px]">
              {dialog === 'accept' ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Accept 37 rows as valid?</DialogTitle>
                    <DialogDescription>
                      The rows on plate P-4471 stay in silver and gold, and BR-2026-119 is released. An Approver must sign.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogBody>
                    <Field>
                      <FieldLabel>Reason</FieldLabel>
                      <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why these results can be trusted" />
                      <FieldDescription>Goes in the audit log with the Approver's name.</FieldDescription>
                    </Field>
                  </DialogBody>
                  <DialogFooter className="flex-wrap justify-end">
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button
                      disabled={!reason.trim()}
                      onClick={() => {
                        setOutcome('accept-requested')
                        setDialog(null)
                      }}
                    >
                      Request signature
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Quarantine plate P-4471?</DialogTitle>
                    <DialogDescription>Nothing is deleted. You can lift the quarantine at any time.</DialogDescription>
                  </DialogHeader>
                  <DialogBody>
                    <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-sm leading-snug text-text-2">
                      <li>
                        The 37 rows on P-4471 are kept in <Mono>{assetId}</Mono> but excluded from silver and gold models.
                      </li>
                      <li>BR-2026-119 stays held until a re-assay of the plate lands, then releases automatically.</li>
                      <li>The other 5 batches keep flowing as they are now.</li>
                      <li>Your name and this action go in the audit log.</li>
                    </ul>
                  </DialogBody>
                  <DialogFooter className="flex-wrap justify-end">
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button
                      onClick={() => {
                        setOutcome('quarantined')
                        setDialog(null)
                      }}
                    >
                      Quarantine plate
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      }
    />
  )
}

/* ======================================================================
 * #209 Merge conflict
 * ==================================================================== */

const pickOptions: ReadonlyArray<{ value: ConflictPick; label: string }> = [
  { value: 'main', label: 'Keep main' },
  { value: 'branch', label: 'Keep branch' },
  { value: 'both', label: 'Keep both' },
]

function CodeLines({ lines }: { lines: CodeLine[] }) {
  return (
    <div className="py-1.5 font-mono text-xs leading-[22px] text-text-2">
      {lines.map((l, i) => (
        <div
          key={i}
          className={cn(
            'px-3.5 break-all',
            l.change === 'add' && 'border-l-2 border-ok bg-ok-soft pl-3 text-ok-ink',
            l.change === 'del' && 'border-l-2 border-bad bg-bad-wash pl-3 text-bad-ink',
          )}
        >
          {l.change ? <span className="sr-only">{l.change === 'add' ? 'Added: ' : 'Removed: '}</span> : null}
          {l.text}
        </div>
      ))}
    </div>
  )
}

function ConflictCard({
  conflict,
  pick,
  onPick,
  branchHead,
}: {
  conflict: MergeConflict
  pick: ConflictPick | null
  onPick: (p: ConflictPick) => void
  branchHead: string
}) {
  const res = pick ? conflict.result[pick] : null
  return (
    <CardBox>
      <div className="flex min-h-[46px] flex-wrap items-center gap-2 border-b border-line px-3.5 py-2">
        <Mono className="text-[13px] font-medium">{conflict.column}</Mono>
        <Badge variant={res ? 'ok' : 'bad'}>{res ? 'Resolved' : conflict.kind}</Badge>
        <Segmented
          aria-label={`Resolve ${conflict.column}`}
          className="ml-auto"
          value={(pick ?? '') as ConflictPick}
          onValueChange={onPick}
          options={pickOptions}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3">
        <div className="min-w-0">
          <div className="px-3.5 pt-2.5 text-xs text-muted-foreground">
            On main · <Mono>{conflict.mainRef}</Mono>
          </div>
          <CodeLines lines={conflict.main} />
        </div>
        <div className="min-w-0 border-t border-line sm:border-t-0 sm:border-l">
          <div className="px-3.5 pt-2.5 text-xs text-muted-foreground">
            On branch · <Mono>{branchHead}</Mono>
          </div>
          <CodeLines lines={conflict.branch} />
        </div>
        <div className="min-w-0 border-t border-line bg-sunken sm:border-t-0 sm:border-l">
          <div className="px-3.5 pt-2.5 text-xs text-muted-foreground">Result</div>
          {res ? <CodeLines lines={res.lines} /> : <div className="px-3.5 py-3 text-[12.5px] text-muted-foreground">Not decided yet</div>}
        </div>
      </div>
      <div className="border-t border-line px-3.5 py-2.5 text-[12.5px] leading-snug text-muted-foreground" aria-live="polite">
        {res ? <Rich text={res.note} /> : 'Pick keep main, keep branch or keep both to see the result.'}
      </div>
    </CardBox>
  )
}

export function IncidentMergeConflict({ incident }: Props) {
  const d = incident209
  const [picks, setPicks] = React.useState<Record<string, ConflictPick | null>>(d.initialPicks)
  const [rebased, setRebased] = React.useState(false)
  const done = d.conflicts.filter((c) => picks[c.id]).length
  const mergeIcon = <GitMergeIcon />

  return (
    <IncidentLayout
      leftWidth={440}
      left={
        <>
          <IncidentIntro incident={incident} summary={d.summary}>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link to="/branches" className={buttonVariants({ variant: 'outline', className: 'h-10 lg:h-8' })}>
                <GitBranchIcon /> Open branch
              </Link>
              <Button variant="outline" className="h-10 lg:h-8" onClick={() => setRebased(true)}>
                <RefreshCwIcon /> Rebase onto main
              </Button>
            </div>
            {rebased ? (
              <Help role="status">
                Rebase stopped at <Mono>{d.table}</Mono>, the same conflict. Resolve it on the right and phlo will finish the rebase for you.
              </Help>
            ) : null}
          </IncidentIntro>
          <Details
            items={[
              [
                'Branch',
                <>
                  <Link to="/branches" className="font-mono text-[13px]">
                    {d.branch}
                  </Link>
                  <Meta>{d.aheadBehind}</Meta>
                </>,
              ],
              [
                'Into',
                <>
                  <Mono>{d.into}</Mono>
                  <Badge variant="outline">protected</Badge>
                </>,
              ],
              ['Table', <AssetLink id={d.table} />],
              ['Owner', <Person initials={d.owner.initials} name={d.owner.name} />],
              ['Opened', d.opened],
            ]}
          />
          <Stats stats={d.stats} />
          <Activity items={d.activity} />
        </>
      }
      right={
        <>
          <SectionTitle
            title={
              <>
                Resolve <Mono>{d.table}</Mono>
              </>
            }
            meta={
              <span aria-live="polite">
                {done} of {d.conflicts.length} conflicts resolved
              </span>
            }
            action={
              <Meta>
                main <Mono>{d.mainHead}</Mono> · branch <Mono>{d.branchHead}</Mono>
              </Meta>
            }
          />

          {d.conflicts.map((c) => (
            <ConflictCard
              key={c.id}
              conflict={c}
              pick={picks[c.id] ?? null}
              branchHead={d.branchHead}
              onPick={(p) => setPicks((prev) => ({ ...prev, [c.id]: p }))}
            />
          ))}

          <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
            <CircleCheckIcon className="mt-px size-4 shrink-0 text-ok" aria-hidden />
            <span>
              Everything else on the branch merges cleanly: 5 commits, including the new models{' '}
              {d.cleanModels.map((m, i) => (
                <React.Fragment key={m}>
                  {i > 0 ? ' and ' : null}
                  <Mono>{m}</Mono>
                </React.Fragment>
              ))}
              .
            </span>
          </div>

          <Note tone="info">
            Nessie merges whole commits, not single rows or columns. Both sides committed a new version of <Mono>{d.table}</Mono>, so it
            can't choose one for you. Your choices here are saved as one new commit on <Mono>{d.branch}</Mono>, on top of main at{' '}
            <Mono>{d.mainHead}</Mono>. Main's history isn't touched until the merge is signed.
          </Note>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size="lg" className="h-10 px-4 lg:h-9" disabled title="Signed branch merge is unavailable in this read-only preview.">
                {mergeIcon} Sign and merge
              </Button>
              <Meta className="ml-auto">Signed branch merge is unavailable</Meta>
            </div>
            <Help>
              Signing writes the resolution commit, runs the downstream audits on the branch, then merges into main. Needs Approver role;
              your name and reason go in the audit log.
            </Help>
          </div>
        </>
      }
    />
  )
}

/* ======================================================================
 * #207 Slow load
 * ==================================================================== */

function fmtSecs(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m} m ${r < 10 ? '0' : ''}${r} s`
}
const hh = (h: number) => `${h < 10 ? '0' : ''}${h}:00`

const durationChartConfig = {
  usual: { label: 'Duration', color: 'var(--bar)' },
  slow: { label: 'Duration · slow', color: 'var(--warn-bar)' },
} satisfies ChartConfig

function RunDurationChart() {
  const d = incident207
  const firstSlow = d.runs.findIndex((r) => r.slow)
  const data = React.useMemo(
    () => d.runs.map((r) => ({ hour: hh(r.hour), usual: r.slow ? undefined : r.secs, slow: r.slow ? r.secs : undefined })),
    [d.runs],
  )
  return (
    <CardBox className="px-3 pt-4 pb-2.5 sm:px-4">
      <ChartContainer config={durationChartConfig} label={d.chartLabel} className="aspect-auto h-[200px] w-full">
        <BarChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }} barCategoryGap="14%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={3} tickMargin={6} fontSize={11} />
          <YAxis
            domain={[0, d.axisMaxSecs]}
            ticks={[0, 300, 600, 900]}
            tickFormatter={(s: number) => (s ? `${s / 60} m` : '0')}
            tickLine={false}
            axisLine={false}
            width={40}
            fontSize={11}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={(v) => fmtSecs(Number(v))} />} />
          <Bar dataKey="usual" stackId="run" fill="var(--color-usual)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="slow" stackId="run" fill="var(--color-slow)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <ReferenceLine
            y={d.baselineSecs}
            style={{ stroke: 'var(--chart-line)' }}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{ value: fmtSecs(d.baselineSecs), position: 'insideBottomLeft', fill: 'var(--muted-foreground)', fontSize: 11.5, offset: 6 }}
          />
          {firstSlow >= 0 ? (
            <ReferenceArea
              x1={hh(d.runs[firstSlow]!.hour)}
              x2={hh(d.runs[d.runs.length - 1]!.hour)}
              fillOpacity={0}
              label={{ value: `Slow since ${hh(d.runs[firstSlow]!.hour)}`, position: 'insideTopRight', fill: 'var(--warn-ink)', fontSize: 11.5, offset: 2 }}
            />
          ) : null}
        </BarChart>
      </ChartContainer>
    </CardBox>
  )
}

export function IncidentSlowLoad({ incident, asset }: Props) {
  const d = incident207
  const assetId = asset?.id ?? incident.assetId ?? 'bronze.lims_samples'
  const [raised, setRaised] = React.useState(false)
  const [snoozed, setSnoozed] = React.useState(false)
  const stats = d.stats.map((s) => (s.label === 'Freshness' && asset?.lag ? { ...s, value: asset.lag } : s))

  return (
    <IncidentLayout
      leftWidth={440}
      left={
        <>
          <IncidentIntro
            incident={incident}
            summary={d.summary}
            badges={snoozed ? <Badge variant="outline" size="lg">Snoozed 24 h</Badge> : null}
          >
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button className="h-10 lg:h-8" onClick={() => setRaised(true)} disabled={raised}>
                {raised ? <CircleCheckIcon /> : <TableIcon />}
                {raised ? 'Page size set to 2,000' : 'Raise page size to 2,000'}
              </Button>
              <Link to="/pipelines/timeline" className={buttonVariants({ variant: 'outline', className: 'h-10 lg:h-8' })}>
                <ListIcon /> Open run timeline
              </Link>
              <Button variant="outline" className="h-10 lg:h-8" aria-pressed={snoozed} onClick={() => setSnoozed((s) => !s)}>
                <AlarmClockIcon /> {snoozed ? 'Unsnooze' : 'Snooze 24 h'}
              </Button>
            </div>
            <Help role="status">
              {raised ? (
                <>
                  Saved on the <Mono>{d.job}</Mono> source config. It applies from the 10:00 run; this incident stays open until durations
                  are back near baseline.
                </>
              ) : (
                <>
                  Changes one setting on the <Mono>{d.job}</Mono> source. Takes effect on the next run and can be undone at any time.
                </>
              )}
            </Help>
            {raised ? (
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => setRaised(false)}>
                <Undo2Icon /> Undo
              </Button>
            ) : null}
          </IncidentIntro>
          <Details
            items={[
              ['Asset', <AssetLink id={assetId} />],
              [
                'Job',
                <>
                  <Link to="/pipelines/$jobName" params={{ jobName: d.job }} className="font-mono text-[13px]">
                    {d.job}
                  </Link>
                  <Meta>{d.jobCadence}</Meta>
                </>,
              ],
              [
                'Source',
                <>
                  {d.source}
                  <Badge variant="outline">dlt</Badge>
                </>,
              ],
              ['Owner', <Person initials={d.owner.initials} name={d.owner.name} />],
              ['Opened', d.opened],
            ]}
          />
          <Stats stats={stats} />
          <Activity items={d.activity}>
            {raised ? (
              <TimelineItem tone="info" meta="You · just now">
                Raised the <Mono>{d.job}</Mono> page size from 500 to 2,000
              </TimelineItem>
            ) : null}
          </Activity>
        </>
      }
      right={
        <>
          <div className="flex flex-col gap-2.5">
            <SectionTitle
              title="Run duration"
              meta={
                <>
                  <Mono>{d.job}</Mono> · last 24 runs, hourly
                </>
              }
              action={
                <div className="flex items-center gap-3.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-bar" />
                    Normal
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-warn-bar" />
                    Slow
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 border-t-[1.5px] border-dashed border-chart-line" />
                    Baseline
                  </span>
                </div>
              }
            />
            <RunDurationChart />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="pb-1">
              <SectionTitle title="Where the time goes" meta="median of the 8 slow runs · black mark is the baseline" />
            </div>
            <div role="img" aria-label="Waiting on API 8 m 12 s, parsing 1 m 31 s, writing to Iceberg 1 m 21 s. Waiting on the API is far above its baseline.">
              {d.breakdown.map((b) => (
                <BreakdownRow key={b.label} label={b.label} pct={b.pct} fill={b.slow ? 'bg-warn-bar' : 'bg-bar'} marker={b.baseline} value={b.value} />
              ))}
            </div>
            <Note tone="info" className="mt-2">
              {d.cause}
            </Note>
          </div>

          <div className="flex flex-col">
            <div className="pb-1">
              <SectionTitle title="Slowed with it" meta="usual → last run" />
            </div>
            <ul className="m-0 list-none p-0">
              {d.slowedJobs.map((j) => (
                <li key={j.name} className="flex min-h-[40px] flex-wrap items-center gap-x-2.5 gap-y-0.5 border-b border-line-soft py-1.5 text-[13.5px]">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-warn-bar" />
                  <Link to="/pipelines/$jobName" params={{ jobName: j.name }} className="font-mono text-[13px]">
                    {j.name}
                  </Link>
                  <span className="text-[12.5px] text-muted-foreground">{j.why}</span>
                  <span className="ml-auto font-mono text-[12.5px]">
                    <span className="text-muted-foreground">{j.from}</span> → <span className="text-warn-ink">{j.to}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      }
    />
  )
}
