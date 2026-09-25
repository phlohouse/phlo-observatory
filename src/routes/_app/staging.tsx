import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { getStagingOverview } from '@/lib/data/api/staging'
import { Eyebrow, PageBody, PageHeader } from '@/components/phlo/page'
import { KpiCard } from '@/components/phlo/kpi'
import { Dot, Mono } from '@/components/phlo/status'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Promotion, StagingDiff } from '@/lib/data/types'

export const Route = createFileRoute('/_app/staging')({
  loader: () => getStagingOverview(),
  head: () => ({ meta: [{ title: 'Overview · staging · phlo' }] }),
  component: StagingPage,
})

const groupOrder: StagingDiff['group'][] = ['jobs', 'contracts', 'audits', 'config']
const changeTile: Record<StagingDiff['change'], { sign: string; cls: string; word: string }> = {
  add: { sign: '+', cls: 'bg-info-soft text-info', word: 'Added' },
  change: { sign: '~', cls: 'bg-warn-soft text-warn-ink', word: 'Changed' },
  remove: { sign: '−', cls: 'bg-bad-soft text-bad-text', word: 'Removed' },
}
const checkMark = {
  pass: { mark: '✓', cls: 'text-ok-text', word: 'passed' },
  fail: { mark: '✕', cls: 'text-bad-text', word: 'failed' },
  warn: { mark: '!', cls: 'text-warn-ink', word: 'waiting' },
  pending: { mark: '○', cls: 'text-faint', word: 'pending' },
} as const

function StagingPage() {
  const { kpis, diffs, groupTitles, promotions, source } = Route.useLoaderData()
  const [sync, setSync] = React.useState<'idle' | 'running' | 'done'>('idle')
  const ready = promotions.filter((p) => p.ready).length

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            Overview <Badge variant="warn">staging</Badge>
          </span>
        }
        meta="Copy of prod data from 02:10 today · changes here never reach prod until promoted"
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 lg:h-8"
              disabled={sync === 'running'}
              onClick={() => {
                setSync('running')
                setTimeout(() => setSync('done'), 900)
              }}
            >
              {sync === 'running' ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
              {sync === 'running' ? 'Re-syncing…' : sync === 'done' ? 'Re-synced just now' : 'Re-sync from prod'}
            </Button>
            <Link to="/branches" search={{ dialog: 'merge' }} className={cn(buttonVariants(), 'h-10 lg:h-8')}>
              Promote {ready} ready changes
            </Link>
          </>
        }
      />
      <PageBody className="gap-4">
        <p className="m-0 text-[13px] text-muted-foreground md:hidden">Copy of prod data from 02:10 today · changes here never reach prod until promoted.</p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3.5">
          <KpiCard label="Differs from prod" value={kpis.diffs.count} qualifier="changes waiting" footer={kpis.diffs.note} />
          <KpiCard
            label="Staging runs · since sync"
            value={kpis.runs.total}
            qualifier={`${kpis.runs.failed} failed`}
            qualifierTone="bad"
            footer={
              <>
                Both failures in new job <Mono className="text-xs">{kpis.runs.note}</Mono>
              </>
            }
          />
          <KpiCard label="Audits" value={kpis.audits.passing} qualifier={`of ${kpis.audits.total} passing`} footer={kpis.audits.note} />
          <KpiCard label="Data copy" value={sync === 'done' ? '09:41' : kpis.copy.at} qualifier={sync === 'done' ? 'just now' : kpis.copy.age} footer={kpis.copy.note} />
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:shrink lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Card className="px-4 py-4 lg:min-h-0 lg:px-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="m-0 text-[15px] font-medium">Differences from prod</h2>
              <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                <Badge className="font-mono text-[11.5px]">{kpis.versions.prod}</Badge>
                <ArrowRightIcon className="size-3.5" aria-label="to" />
                <Badge variant="warn" className="font-mono text-[11.5px]">
                  {kpis.versions.staging}
                </Badge>
              </div>
            </div>
            <div className="mt-1 min-h-0 lg:overflow-y-auto">
              {groupOrder.map((g) => {
                const items = diffs.filter((d) => d.group === g)
                if (!items.length) return null
                return (
                  <section key={g} aria-label={groupTitles[g]}>
                    <div className="flex items-center gap-2 pt-3.5 pb-1">
                      <Eyebrow>{groupTitles[g]}</Eyebrow>
                      <span className="font-mono text-[11.5px] text-muted-foreground">{items.length}</span>
                    </div>
                    {items.map((d, i) => (
                      <DiffRow key={d.name} d={d} last={i === items.length - 1} />
                    ))}
                  </section>
                )
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-4 lg:min-h-0">
            <Card id="promote" className="scroll-mt-4 px-4 py-4 lg:min-h-0 lg:flex-1 lg:px-5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="m-0 text-[15px] font-medium">Promote to prod</h2>
                <span className="text-[13px] text-muted-foreground">Each promotion is a signed merge into prod main</span>
              </div>
              <div className="min-h-0 lg:overflow-y-auto">
                {promotions.map((p, i) => (
                  <PromoRow key={p.title} p={p} last={i === promotions.length - 1} />
                ))}
              </div>
            </Card>

            <Card className="shrink-0">
              <CardHeader className="px-4 lg:px-5">
                <CardTitle>Where staging data comes from</CardTitle>
                <CardAction>
                  <Link to="/settings" className="text-[13px]">
                    Sync settings
                  </Link>
                </CardAction>
              </CardHeader>
              <CardDescription className="sr-only">How the staging copy is made</CardDescription>
              <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2 px-4 pt-2.5 pb-4 text-[13.5px] sm:grid-cols-[130px_minmax(0,1fr)] lg:px-5">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="m-0">
                  Zero-copy branch of prod <Mono className="text-xs text-muted-foreground">{source.source}</Mono>
                </dd>
                <dt className="text-muted-foreground">Schedule</dt>
                <dd className="m-0">{source.schedule}</dd>
                <dt className="text-muted-foreground">Masked</dt>
                <dd className="m-0 flex flex-wrap gap-1.5">
                  {source.masked.map((m) => (
                    <span key={m} className="inline-flex h-[26px] items-center rounded-md bg-soft px-2 font-mono text-xs">
                      {m}
                    </span>
                  ))}
                </dd>
                <dt className="text-muted-foreground">Writes</dt>
                <dd className="m-0">{source.writes}</dd>
              </dl>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  )
}

function DiffRow({ d, last }: { d: StagingDiff; last: boolean }) {
  const t = changeTile[d.change]
  return (
    <div className={cn('grid min-h-10 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 py-1.5', !last && 'border-b border-line-soft')}>
      <span className={cn('flex size-[18px] items-center justify-center rounded-[5px] text-[11px] font-semibold', t.cls)} aria-label={t.word}>
        {t.sign}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-[12.5px]" title={d.name}>
          {d.name}
        </span>
        <span className="text-[12.5px] text-muted-foreground lg:truncate" title={d.detail}>
          {d.detail}
        </span>
      </div>
      <Badge variant={d.status.tone === 'neutral' ? 'neutral' : d.status.tone}>{d.status.label}</Badge>
    </div>
  )
}

function PromoRow({ p, last }: { p: Promotion; last: boolean }) {
  return (
    <div className={cn('flex flex-col gap-2 py-3', !last && 'border-b border-line-soft')}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <Dot tone={p.tone} size="md" />
        <span className="text-sm font-medium">{p.title}</span>
        <span className="ml-auto text-[12.5px] text-muted-foreground">{p.who}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[18px]">
        {p.checks.map((c) => {
          const m = checkMark[c.state]
          return (
            <span key={c.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('font-semibold', m.cls)} aria-hidden>
                {m.mark}
              </span>
              <span className="sr-only">{m.word}: </span>
              {c.label}
            </span>
          )
        })}
        {p.ready ? (
          <Link to="/branches" search={{ dialog: 'merge' }} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto h-10 lg:h-7')}>
            Promote…
          </Link>
        ) : (
          <span className="ml-auto text-[12.5px] text-muted-foreground">{p.why}</span>
        )}
      </div>
    </div>
  )
}
