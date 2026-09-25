import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ExternalLinkIcon, PauseIcon, PlayIcon } from 'lucide-react'
import { getPipelineJob } from '@/lib/data/api/pipelines'
import { Eyebrow, KeyValues, PageHeader } from '@/components/phlo/page'
import { Mono, RunLegend, RunStrip } from '@/components/phlo/status'
import { StatusDot, statusText } from '@/components/pipelines/bits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { JobStatus, RunCode } from '@/lib/data/types'
import type { RunDetail, ScaleStatus } from '@/lib/data/fixtures/pipelines'

type Search = { run?: number }

export const Route = createFileRoute('/_app/pipelines/$jobName')({
  validateSearch: (s: Record<string, unknown>): Search => {
    const n = Number(s.run)
    return { run: Number.isInteger(n) && n >= 0 && n < 24 && s.run !== undefined && s.run !== '' ? n : undefined }
  },
  loader: ({ params }) => getPipelineJob({ data: params.jobName }),
  head: ({ params }) => ({ meta: [{ title: `${params.jobName} · phlo` }] }),
  component: JobPage,
})

const jobTone: Record<JobStatus, ScaleStatus> = { failing: 'failing', slow: 'slow', ok: 'ok', paused: 'paused', waiting: 'paused' }
const jobBadge: Record<JobStatus, 'bad' | 'warn' | 'ok' | 'neutral'> = {
  failing: 'bad',
  slow: 'warn',
  ok: 'ok',
  paused: 'neutral',
  waiting: 'neutral',
}

const runMeta: Record<RunCode, { label: string; badge: 'bad' | 'warn' | 'ok' | 'neutral'; cell: string }> = {
  s: { label: 'Succeeded', badge: 'ok', cell: 'bg-ok-bar' },
  w: { label: 'Slow', badge: 'warn', cell: 'bg-warn-bar' },
  f: { label: 'Failed', badge: 'bad', cell: 'bg-bad' },
  k: { label: 'Skipped', badge: 'neutral', cell: 'border border-skip-line' },
  p: { label: 'Paused', badge: 'neutral', cell: 'bg-soft' },
  n: { label: 'No run', badge: 'neutral', cell: '' },
}

function JobPage() {
  const { job, incident, runs, siblings } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const selectedIndex = search.run ?? runs.length - 1
  const run = runs[selectedIndex] ?? runs[runs.length - 1]!
  const [paused, setPaused] = React.useState(job.status === 'paused' && job.statusLabel === 'Paused')

  const pick = (i: number) =>
    navigate({ search: (p) => ({ ...p, run: i === runs.length - 1 ? undefined : i }), replace: true, resetScroll: false })

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Pipelines', to: '/pipelines' }]}
        title={<Mono className="text-[13.5px]">{job.name}</Mono>}
        meta={`${job.kind} · ${job.domain}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? 'Resume schedule' : 'Pause schedule'}
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex">
              Open Dagster <ExternalLinkIcon className="size-3" />
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Job */}
        <div className="flex min-w-0 flex-col lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-line">
          <section aria-label="Job" className="flex flex-col gap-4 border-b border-line px-4 py-5 lg:px-6">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={paused ? 'neutral' : jobBadge[job.status]} size="lg" className="font-medium">
                  {paused ? 'Paused' : job.statusLabel}
                </Badge>
                {job.reason ? <span className={cn('text-[13px]', statusText[jobTone[job.status]])}>{job.reason}</span> : null}
              </div>
              <h2 className="m-0 font-mono text-lg font-medium break-all">{job.name}</h2>
            </div>
            <KeyValues
              className="text-[13.5px]"
              items={[
                [
                  'Schedule',
                  <span key="s" className="flex flex-wrap items-baseline gap-x-2">
                    <Mono className="text-text-2">{job.cron}</Mono>
                    <span className="text-muted-foreground">{paused ? 'paused' : job.next}</span>
                  </span>,
                ],
                ['Target', <Mono key="t" className="truncate">{job.target}</Mono>],
                ['Source', job.source],
                ['Owner', job.owner === job.team ? job.owner : `${job.owner} · ${job.team}`],
                ['Average', <Mono key="a" className={job.status === 'slow' && job.runs.at(-1) === 'w' ? 'text-warn-ink' : 'text-text-2'}>{job.avg}</Mono>],
                ['Last run', job.lastRun],
              ]}
            />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline gap-2">
                <Eyebrow>Last 24 runs</Eyebrow>
                <span className="text-[12.5px] text-muted-foreground">oldest on the left · pick one to inspect it</span>
              </div>
              <div role="group" aria-label="Pick a run" className="flex flex-wrap items-center gap-0.5">
                {runs.map((r) => (
                  <RunCell key={r.index} run={r} selected={r.index === run.index} onPick={() => pick(r.index)} />
                ))}
              </div>
              <RunLegend className="gap-x-4 gap-y-1.5 text-[12.5px]" />
            </div>
          </section>

          {/* Siblings (desktop) */}
          <section aria-labelledby="sib-h" className="hidden flex-col lg:flex">
            <div className="flex items-baseline gap-2 px-6 pt-4 pb-2">
              <h2 id="sib-h" className="m-0 text-[13.5px] font-medium">
                {job.domain}
              </h2>
              <span className="text-[13px] text-muted-foreground">{siblings.length} jobs</span>
              <Link to="/pipelines" className="ml-auto text-[13px]">
                All pipelines
              </Link>
            </div>
            <div className="grid h-8 grid-cols-[minmax(0,1.5fr)_128px_148px_72px] items-center gap-x-4 border-y border-line-soft bg-raised px-6 text-xs text-muted-foreground" aria-hidden>
              <span>Job</span>
              <span>Schedule</span>
              <span>Last 24 runs</span>
              <span className="text-right">Last run</span>
            </div>
            <ul className="m-0 list-none p-0">
              {siblings.map((s) => {
                const current = s.name === job.name
                return (
                  <li
                    key={s.name}
                    className={cn(
                      'grid grid-cols-[minmax(0,1.5fr)_128px_148px_72px] items-center gap-x-4 border-b border-line-soft px-6 py-2 text-[13px]',
                      current ? 'bg-primary-soft' : 'hover:bg-raised',
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusDot status={s.status} />
                        <Link
                          to="/pipelines/$jobName"
                          params={{ jobName: s.name }}
                          aria-current={current ? 'page' : undefined}
                          className="truncate font-mono text-[13px] text-foreground hover:text-link"
                        >
                          {s.name}
                        </Link>
                      </div>
                      <span className={cn('truncate pl-4 text-xs', s.status === 'ok' ? 'text-muted-foreground' : statusText[s.status])}>
                        {s.kind} · {s.reason ?? 'Healthy'}
                      </span>
                    </div>
                    <span className="truncate text-muted-foreground">{s.sched}</span>
                    <RunStrip runs={s.runs} size="sm" />
                    <span className="text-right whitespace-nowrap text-muted-foreground">{s.last}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        {/* Selected run */}
        <RunPanel key={run.id} run={run} jobName={job.name} target={job.target} incident={incident} latest={run.index === runs.length - 1} />
      </div>
    </>
  )
}

function RunCell({ run, selected, onPick }: { run: RunDetail; selected: boolean; onPick: () => void }) {
  const m = runMeta[run.code]
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Run ${run.index + 1}, ${m.label.toLowerCase()}${run.ago !== '—' ? `, ${run.ago}` : ''}`}
      title={`${m.label} · ${run.ago}`}
      onClick={onPick}
      className="group flex h-10 w-3 cursor-pointer items-center justify-center rounded-[3px] lg:h-8"
    >
      <span
        className={cn(
          'box-border h-[22px] w-2 rounded-[2px]',
          m.cell,
          selected && 'outline-2 outline-offset-2 outline-foreground',
          !selected && 'group-hover:opacity-75',
        )}
      />
    </button>
  )
}

function RunPanel({
  run,
  jobName,
  target,
  incident,
  latest,
}: {
  run: RunDetail
  jobName: string
  target: string
  incident?: { id: string; title: string }
  latest: boolean
}) {
  const [queued, setQueued] = React.useState(false)
  const [logsOpen, setLogsOpen] = React.useState(false)
  const m = runMeta[run.code]
  const showIncident = incident && (run.code === 'f' || run.code === 'w' || run.code === 'k')
  const canRerun = run.code !== 'p' && run.code !== 'n'

  return (
    <aside
      aria-label="Selected run"
      className="flex shrink-0 flex-col border-t border-line lg:w-[440px] lg:overflow-y-auto lg:border-t-0"
    >
      <div className="flex flex-col gap-2.5 border-b border-line px-4 pt-5 pb-4 lg:px-6 lg:pt-[22px] lg:pb-[18px]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={m.badge} className="font-medium">
            {m.label}
          </Badge>
          <span className="text-[13px] text-muted-foreground">
            Run <Mono className="text-[12.5px]">{run.id}</Mono> · {run.ago}
            {latest ? ' · latest' : ''}
          </span>
        </div>
        <div className="font-mono text-lg font-medium break-all">{jobName}</div>
        <KeyValues
          className="mt-1 text-[13.5px]"
          items={[
            ['Duration', run.duration],
            ['Trigger', run.trigger],
            ['Target', <Mono key="t" className="truncate text-[12.5px]">{target}</Mono>],
            ...(showIncident
              ? ([
                  [
                    'Incident',
                    <Link key="i" to="/incidents/$incidentId" params={{ incidentId: incident.id }}>
                      #{incident.id} {incident.title}
                    </Link>,
                  ],
                ] as Array<[React.ReactNode, React.ReactNode]>)
              : []),
          ]}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-line px-4 py-[18px] lg:px-6">
        <Eyebrow>Steps</Eyebrow>
        <div className="grid grid-cols-[96px_minmax(0,1fr)_60px] items-center gap-x-3 gap-y-2.5">
          {run.steps.map((s) => (
            <React.Fragment key={s.name}>
              <span className={cn('font-mono text-[12.5px]', s.state === 'skipped' ? 'text-muted-foreground' : 'text-foreground')}>
                {s.name}
              </span>
              {s.state === 'skipped' ? (
                <div className="box-border h-2.5 rounded-[3px] border border-dashed border-skip-line" aria-label="skipped" />
              ) : (
                <div className="relative h-2.5 rounded-[3px] bg-soft" role="img" aria-label={`${s.name}: ${s.state}, ${s.duration}`}>
                  <div
                    className={cn(
                      'absolute inset-y-0 rounded-[3px]',
                      s.state === 'failed' ? 'bg-bad' : s.state === 'slow' ? 'bg-warn-bar' : 'bg-ok-bar',
                    )}
                    style={{ left: `${s.start}%`, width: `${Math.max(s.width, 2)}%` }}
                  />
                </div>
              )}
              <span
                className={cn(
                  'text-right text-xs',
                  s.state === 'skipped' ? 'text-muted-foreground' : 'font-mono',
                  s.state === 'failed' ? 'text-bad-text' : s.state === 'slow' ? 'text-warn-ink' : s.state === 'ok' && 'text-muted-foreground',
                )}
              >
                {s.duration}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {run.error || run.note ? (
        <div className="flex flex-col gap-2.5 px-4 py-[18px] lg:px-6">
          {run.error ? (
            <>
              <Eyebrow>Error</Eyebrow>
              <pre className="m-0 overflow-x-auto rounded-lg border border-bad-line bg-bad-wash px-3.5 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-bad-ink">
                {run.error}
              </pre>
            </>
          ) : (
            <Eyebrow>Note</Eyebrow>
          )}
          {run.note ? <p className="m-0 text-[13px] leading-normal text-muted-foreground">{run.note}</p> : null}
        </div>
      ) : null}

      {logsOpen ? (
        <div className="flex flex-col gap-2 px-4 pb-4 lg:px-6">
          <Eyebrow>Logs</Eyebrow>
          <pre className="m-0 max-h-56 overflow-auto rounded-lg border border-line bg-sunken px-3.5 py-3 font-mono text-[11.5px] leading-relaxed text-text-2">
            {logLines(run, jobName).join('\n')}
          </pre>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 border-t border-line px-4 py-4 lg:px-6">
        <div className="flex flex-wrap gap-2.5">
          {canRerun ? (
            <Button size="lg" disabled={queued} onClick={() => setQueued(true)}>
              {run.failedStep ? 'Re-run from failed step' : 'Re-run'}
            </Button>
          ) : null}
          <Button size="lg" variant="outline" aria-expanded={logsOpen} onClick={() => setLogsOpen((o) => !o)}>
            {logsOpen ? 'Hide logs' : 'View logs'}
          </Button>
        </div>
        <p aria-live="polite" className="m-0 text-[13px] text-muted-foreground empty:hidden">
          {queued ? `Re-run queued${run.failedStep ? ` from ${run.failedStep}` : ''}. It shows up in the strip when it starts.` : ''}
        </p>
      </div>
    </aside>
  )
}

function logLines(run: RunDetail, jobName: string) {
  const lines = [`[${run.id}] ${jobName} · ${run.trigger}`]
  for (const s of run.steps) {
    if (s.state === 'skipped') lines.push(`  ${s.name.padEnd(12)} SKIPPED`)
    else if (s.state === 'failed') lines.push(`  ${s.name.padEnd(12)} FAILED after ${s.duration}`)
    else lines.push(`  ${s.name.padEnd(12)} ${s.state === 'slow' ? 'SLOW   ' : 'OK     '} ${s.duration}`)
  }
  if (run.error) lines.push('', ...run.error.split('\n').map((l) => `  ${l}`))
  return lines
}
