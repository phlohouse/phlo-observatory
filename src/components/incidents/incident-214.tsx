import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, GitBranchIcon, PauseIcon, PlayIcon, RotateCwIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eyebrow, KeyValues } from '@/components/phlo/page'
import { Stat } from '@/components/phlo/kpi'
import { IncidentStatusBadge, IncidentTile, LayerSwatch, Mono, RichText, SeverityBadge } from '@/components/phlo/status'
import type { Asset, Incident } from '@/lib/data/types'
import type { ActivityEntry, OpenDetail214 } from '@/lib/data/fixtures/incidents'
import {
  ActivityFeed,
  DetailSplit,
  DetailTabPanel,
  DetailTabs,
  Highlight,
  LineageGraph,
  Note,
  PaneHeading,
  RunsTable,
  SideBlock,
  SideDivider,
  ToneBadge,
} from './shared'

type Tab = 'activity' | 'runs' | 'lineage' | 'snapshots'
type Rerun = 'idle' | 'confirm' | 'started'

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'activity', label: 'Activity' },
  { value: 'runs', label: 'Runs' },
  { value: 'lineage', label: 'Lineage' },
  { value: 'snapshots', label: 'Snapshots' },
]

const ASSET = 'bronze.bioreactor_telemetry'
const JOB = 'ingest_bioreactor'
const BRANCH = 'fix/telemetry-schema'

/** #214 — the stale bioreactor telemetry table (the live investigation). */
export function Incident214({ incident, detail }: { incident: Incident; asset?: Asset; detail: OpenDetail214 }) {
  const [tab, setTab] = React.useState<Tab>('activity')
  const [rerun, setRerun] = React.useState<Rerun>('idle')
  const [paused, setPaused] = React.useState(false)
  const [comments, setComments] = React.useState<ActivityEntry[]>([])
  const [draft, setDraft] = React.useState(detail.draftComment)

  const askRerun = () => setRerun((r) => (r === 'started' ? r : 'confirm'))

  return (
    <DetailSplit
      side={
        <>
          <SideBlock className="flex flex-col gap-2.5 pt-5 lg:pt-[22px]">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentTile kind={incident.kind} size="lg" />
              <Mono className="text-[13px] text-muted-foreground">#{incident.id}</Mono>
              <span className="ml-1.5 flex items-center gap-2">
                <SeverityBadge severity={incident.severity} size="lg" />
                <IncidentStatusBadge status={incident.status} />
              </span>
            </div>
            <h2 className="m-0 text-[22px] leading-tight font-semibold tracking-[-0.01em]">{incident.headline}</h2>
            <p className="m-0 text-sm leading-relaxed text-text-3">{detail.summary}</p>
          </SideBlock>

          <SideBlock className="flex flex-col gap-2 lg:hidden">
            <h3 className="m-0 text-[15px] font-medium">What happened</h3>
            <p className="m-0 text-[14.5px] leading-relaxed text-text-2">
              <RichText text={detail.whatHappened} />
            </p>
            <Note tone="ok">{detail.reassurance}</Note>
          </SideBlock>

          <SideBlock>
            <KeyValues
              keyWidth={110}
              className="items-center gap-y-3"
              items={[
                [
                  'Asset',
                  <Link key="a" to="/assets/$assetId" params={{ assetId: ASSET }} search={{ env: undefined }} className="min-w-0 truncate font-mono text-[13px]">
                    {ASSET}
                  </Link>,
                ],
                [
                  'Source',
                  <>
                    Process historian <Badge variant="outline">dlt</Badge>
                  </>,
                ],
                [
                  'Job',
                  <>
                    <Link to="/pipelines/$jobName" params={{ jobName: JOB }} className="font-mono text-[13px]">
                      {JOB}
                    </Link>
                    <Badge variant="outline">Dagster</Badge>
                  </>,
                ],
                [
                  'Owner',
                  <>
                    <Avatar initials="GP" /> {incident.owner}
                  </>,
                ],
                [
                  'Fix branch',
                  <>
                    <GitBranchIcon className="size-3.5 shrink-0 text-branch" aria-hidden />
                    <Link to="/branches" className="min-w-0 truncate font-mono text-[13px]">
                      {BRANCH}
                    </Link>
                  </>,
                ],
              ]}
            />
          </SideBlock>

          <SideBlock className="grid grid-cols-2 gap-2.5">
            <Stat className="[&>span:first-of-type]:text-[15px]" label="Last success" value="2 h 14 min ago" />
            <Stat className="[&>span:first-of-type]:text-[15px]" label="Freshness SLA" value={`${detail.lag.sla} min`} />
            <Stat className="[&>span:first-of-type]:text-[15px]" label="Regression" value="Yes · historian upgrade" tone="bad" />
            <Link
              to="/assets"
              search={{ env: undefined }}
              className="rounded-[10px] text-foreground hover:bg-raised hover:text-foreground"
            >
              <Stat
                className="h-full [&>span:first-of-type]:text-[15px]"
                label="Downstream"
                value={
                  <span className="inline-flex items-center gap-1">
                    6 stale assets <ChevronRightIcon className="size-3.5" aria-hidden />
                  </span>
                }
              />
            </Link>
          </SideBlock>

          <SideBlock>
            <RerunPanel state={rerun} setState={setRerun} paused={paused} setPaused={setPaused} />
          </SideBlock>

          <SideDivider />
          <SideBlock className="flex flex-col gap-2.5 pt-4 pb-5">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Freshness lag · 24 h</Eyebrow>
              <span className="text-lg font-medium text-bad-text">{detail.lag.now} min</span>
            </div>
            <LagChart series={detail.lag.series} sla={detail.lag.sla} />
          </SideBlock>
        </>
      }
    >
      <DetailTabs value={tab} onValueChange={setTab} tabs={TABS}>
        {/* Activity: timeline scrolls, composer pinned at the bottom on desktop */}
        <DetailTabPanel value="activity" className="gap-0 p-0 lg:flex lg:min-h-0 lg:overflow-hidden lg:p-0">
          <div className="flex flex-col px-4 pt-[18px] pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-6 lg:pl-7">
            <ActivityFeed entries={[...detail.activity, ...comments]} />
          </div>
          <form
            className="shrink-0 border-t border-line bg-card px-4 pt-3 pb-4"
            onSubmit={(e) => {
              e.preventDefault()
              const text = draft.trim()
              if (!text) return
              setComments((c) => [...c, { kind: 'comment', initials: 'GP', name: 'Gareth', when: 'just now', text }])
              setDraft('')
            }}
          >
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-sunken px-3.5 py-2.5 focus-within:border-primary">
              <Input
                aria-label="Add a comment"
                placeholder="Add a comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-auto border-0 bg-transparent px-0 py-0.5 text-[14.5px] focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Posts to #data-platform</span>
                <Button type="submit" className="ml-auto h-9 px-4 text-sm lg:h-8" disabled={!draft.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </form>
        </DetailTabPanel>

        <DetailTabPanel value="runs">
          <PaneHeading
            mono
            title={JOB}
            note={detail.runs.cadence}
            link={
              <Link to="/pipelines/$jobName" params={{ jobName: JOB }}>
                Open in Pipelines
              </Link>
            }
          />
          <Note tone="info">{detail.runs.note}</Note>
          <RunsTable rows={detail.runs.rows} mode="run" />
          <div className="flex flex-wrap gap-2.5">
            <Button size="lg" onClick={askRerun} disabled={rerun !== 'idle'}>
              {rerun === 'started' ? 'Re-running on fix branch' : 'Re-run on fix branch'}
            </Button>
            <Button size="lg" variant="outline" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume schedule' : 'Pause schedule'}
            </Button>
          </div>
        </DetailTabPanel>

        <DetailTabPanel value="lineage" className="gap-[18px]">
          <PaneHeading
            title="Blast radius"
            note="Everything downstream of the stale table"
            link={
              <Link to="/assets" search={{ env: undefined }}>
                View in Assets
              </Link>
            }
          />
          <LineageGraph graph={detail.lineage} />
          <div className="flex flex-col border-t border-line">
            <Eyebrow className="pt-3.5 pb-1.5">Who's affected</Eyebrow>
            {detail.consumers.map((c, i) => (
              <div
                key={c.name}
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5',
                  i < detail.consumers.length - 1 && 'border-b border-line-soft',
                )}
              >
                <LayerSwatch layer="gold" />
                <span className="text-sm">{c.name}</span>
                <span className="text-[13px] text-muted-foreground">
                  reads <Mono className="text-xs">{c.reads}</Mono>
                </span>
                <ToneBadge tone={c.status.tone} className="ml-auto">
                  {c.status.label}
                </ToneBadge>
              </div>
            ))}
          </div>
        </DetailTabPanel>

        <DetailTabPanel value="snapshots">
          <PaneHeading mono title={ASSET} note="Iceberg snapshots across refs" />
          <div className="-mx-4 overflow-x-auto lg:mx-0">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Snapshot</TableHead>
                  <TableHead>Committed</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead>Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.snapshots.map((s, i) =>
                  s.kind === 'gap' ? (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell colSpan={5} className="h-10">
                        <div className="flex items-center gap-2.5">
                          <span className="h-0 flex-1 border-t border-dashed border-bad-line" />
                          <span className="text-[12.5px] text-bad-text">{s.text}</span>
                          <span className="h-0 flex-1 border-t border-dashed border-bad-line" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-[12.5px]">{s.id}</TableCell>
                      <TableCell className="text-[13px] whitespace-nowrap text-muted-foreground">{s.when}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.op}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono text-[12.5px]',
                          s.rowsTone === 'ok' && 'text-ok-text',
                          s.rowsTone === 'muted' && 'text-muted-foreground',
                          s.rowsTone === 'plain' && 'text-text-2',
                        )}
                      >
                        {s.rows}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.refTone} className="font-mono">
                          {s.ref}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2">
            <Eyebrow>Time travel</Eyebrow>
            <pre className="m-0 overflow-x-auto rounded-[10px] border border-border-card bg-sunken px-3.5 py-3 font-mono text-[12.5px] leading-[1.7] text-text-2">
              <Highlight text={detail.timeTravel} />
            </pre>
            <p className="m-0 text-[13px] text-muted-foreground">
              Snapshots expire after 7 days. Snapshots with a release tag are kept.
            </p>
          </div>
        </DetailTabPanel>
      </DetailTabs>
    </DetailSplit>
  )
}

/* ---------- Re-run with an in-place confirm ---------- */

function RerunPanel({
  state,
  setState,
  paused,
  setPaused,
}: {
  state: Rerun
  setState: (s: Rerun) => void
  paused: boolean
  setPaused: (fn: (p: boolean) => boolean) => void
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (state === 'confirm') confirmRef.current?.focus()
  }, [state])

  return (
    <div className="flex flex-col gap-2">
      {state === 'idle' ? (
        <Button className="h-11 w-full rounded-[10px] text-[15px] lg:h-10 lg:text-sm" onClick={() => setState('confirm')}>
          <RotateCwIcon /> Re-run with patched contract
        </Button>
      ) : null}

      {state === 'confirm' ? (
        <div
          role="group"
          aria-labelledby="rerun-confirm-title"
          className="flex flex-col gap-3 rounded-xl border border-branch-line bg-branch-soft p-3.5"
        >
          <div className="flex items-start gap-2.5">
            <GitBranchIcon className="mt-0.5 size-4 shrink-0 text-branch" aria-hidden />
            <div className="flex flex-col gap-1">
              <div id="rerun-confirm-title" className="text-[15px] leading-snug font-medium">
                This runs on branch <Mono>{BRANCH}</Mono>, not main
              </div>
              <div className="text-[13px] text-muted-foreground">
                Main stays as it is. You merge once the audits pass. Takes about 2 min.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="h-11 bg-card lg:h-9" onClick={() => setState('idle')}>
              Cancel
            </Button>
            <Button ref={confirmRef} className="h-11 lg:h-9" onClick={() => setState('started')}>
              Confirm
            </Button>
          </div>
        </div>
      ) : null}

      {state === 'started' ? (
        <div role="status" className="flex flex-col gap-2 rounded-[10px] border border-primary-line bg-primary-soft px-3.5 py-2.5 text-primary-ink">
          <div className="flex items-center gap-2 text-sm">
            <span>
              Re-running on <Mono>{BRANCH}</Mono>
            </span>
            <span className="ml-auto text-[12.5px]">just now</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-[3px] bg-soft">
            <div className="progress-stripe absolute inset-y-0 left-0 w-[35%] rounded-[3px]" />
          </div>
        </div>
      ) : null}

      {state !== 'confirm' ? (
        <Button
          variant="outline"
          aria-pressed={paused}
          className="h-11 w-full rounded-[10px] text-[15px] lg:h-9 lg:text-[13.5px]"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? 'Downstream paused · Resume' : 'Pause downstream schedules'}
        </Button>
      ) : null}
    </div>
  )
}

/* ---------- Freshness lag chart ---------- */

const lagChartConfig = {
  lag: { label: 'Lag', color: 'var(--chart-line)' },
  breach: { label: 'Past SLA', color: 'var(--bad)' },
} satisfies ChartConfig

/** Lag per hour over 24 h against the SLA; the line turns red from the last hour before it crossed. */
function LagChart({ series, sla }: { series: number[]; sla: number }) {
  const n = series.length
  const breach = series.findIndex((v) => v > 30) - 1
  const data = React.useMemo(() => series.map((lag, i) => ({ i, lag })), [series])
  const last = series[n - 1]!
  const lo = Math.min(...series.slice(0, breach + 1))
  const hi = Math.max(...series.slice(0, breach + 1))
  const ago = (i: number) => (i === n - 1 ? 'now' : `−${n - 1 - i}h`)
  const gradId = React.useId().replace(/:/g, '')
  const split = n > 1 ? `${((breach / (n - 1)) * 100).toFixed(2)}%` : '100%'

  return (
    <div className="flex flex-col gap-1">
      <ChartContainer
        config={lagChartConfig}
        label={`Freshness lag stayed between ${lo} and ${hi} minutes for ${breach + 1} hours, then climbed past the ${sla} minute SLA to ${last} minutes.`}
        className="aspect-auto h-[140px] w-full"
      >
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset={split} stopColor="var(--color-lag)" />
              <stop offset={split} stopColor="var(--color-breach)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, n - 1]}
            ticks={[0, Math.round((n - 1) / 2), n - 1]}
            tickFormatter={(i: number) => (i === 0 ? `−${n}h` : ago(i))}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            fontSize={11}
          />
          <YAxis width={30} tickLine={false} axisLine={false} fontSize={11} tickCount={4} allowDecimals={false} />
          <ReferenceLine
            y={sla}
            style={{ stroke: 'var(--bad-text)' }}
            strokeOpacity={0.7}
            strokeDasharray="3 4"
            label={{ value: `SLA ${sla} min`, position: 'insideTopLeft', fill: 'var(--bad-text)', fontSize: 11, offset: 4 }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: '2 2' }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, p) => ago(Number(p[0]?.payload?.i ?? 0))}
                valueFormatter={(v) => `${v} min`}
              />
            }
          />
          <Line
            dataKey="lag"
            type="linear"
            stroke={`url(#${gradId})`}
            strokeWidth={2}
            strokeLinejoin="round"
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; index?: number }) =>
              p.index === n - 1 ? (
                <circle key="last" cx={p.cx} cy={p.cy} r={5} strokeWidth={2} fill="var(--color-breach)" stroke="var(--card)" />
              ) : (
                <g key={p.index} />
              )
            }
            activeDot={(p: { cx?: number; cy?: number; index?: number }) => (
              <circle
                cx={p.cx}
                cy={p.cy}
                r={4}
                strokeWidth={2}
                stroke="var(--card)"
                fill={(p.index ?? 0) > breach ? 'var(--color-breach)' : 'var(--color-lag)'}
              />
            )}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
