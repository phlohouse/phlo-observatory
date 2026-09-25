import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon, CircleCheckIcon, RefreshCwIcon } from 'lucide-react'
import { getOverview } from '@/lib/data/api/core'
import { PageBody, PageHeader, Eyebrow } from '@/components/phlo/page'
import { KpiCard } from '@/components/phlo/kpi'
import { Dot, HealthBar, LayerSwatch, RichText, toneText } from '@/components/phlo/status'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/toggle-group'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { LayerSummary, Source } from '@/lib/data/types'

type Range = '24h' | '7d' | '30d'

export const Route = createFileRoute('/_app/')({
  loader: () => getOverview(),
  head: () => ({ meta: [{ title: 'Overview · phlo' }] }),
  component: OverviewPage,
})

function OverviewPage() {
  const data = Route.useLoaderData()
  const [range, setRange] = React.useState<Range>('24h')
  const [refreshed, setRefreshed] = React.useState(false)
  const { kpis } = data
  const calm = data.openIncidents.length === 0

  return (
    <>
      <PageHeader
        title="Overview"
        meta={refreshed ? 'Refreshed just now · auto every 60 s' : `Refreshed ${data.now} · auto every 60 s`}
        actions={
          <>
            <Segmented
              aria-label="Time range"
              value={range}
              onValueChange={setRange}
              options={[
                { value: '24h', label: '24 h' },
                { value: '7d', label: '7 d' },
                { value: '30d', label: '30 d' },
              ]}
            />
            <Button variant="outline" onClick={() => setRefreshed(true)}>
              <RefreshCwIcon /> Refresh
            </Button>
          </>
        }
      />
      <PageBody>
        {calm ? (
          <div className="flex items-center gap-3 rounded-xl border border-ok-line bg-ok-wash px-4 py-3 text-ok-ink">
            <CircleCheckIcon className="size-5" />
            <div className="flex flex-col">
              <span className="font-medium">All clear</span>
              <span className="text-[13px]">All 148 tables are within their freshness targets and every audit passed in the last 24 h.</span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <KpiCard
            label="Asset freshness"
            value={kpis.freshness.pct}
            qualifier={`${kpis.freshness.fresh} of ${kpis.freshness.total} fresh`}
            footer={<HealthBar ok={kpis.freshness.fresh} bad={kpis.freshness.total - kpis.freshness.fresh} />}
          />
          <KpiCard
            label="Dagster runs"
            value={kpis.runs.total}
            qualifier={`${kpis.runs.failed} failed`}
            qualifierTone="bad"
            footer={`${kpis.runs.successRate} success · median ${kpis.runs.median}`}
          />
          <KpiCard
            label="Audits"
            value={kpis.audits.passing}
            qualifier={`of ${kpis.audits.total} passing`}
            footer={`${kpis.audits.total - kpis.audits.passing} failing on ${kpis.audits.failingModels} models`}
          />
          <Link to="/incidents" className="text-foreground hover:text-foreground">
            <KpiCard
              className="h-full hover:border-border-strong"
              label="Open incidents"
              value={kpis.incidents.open}
              qualifier={`${kpis.incidents.high} high`}
              qualifierTone="bad"
              footer={`Oldest opened ${kpis.incidents.oldest}`}
            />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data flow</CardTitle>
            <CardDescription className="hidden sm:block">Sources through each layer, as of the last materialization</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-stretch gap-2.5 lg:flex-row">
            <SourcesWell sources={data.sources} />
            {data.layers.map((l) => (
              <React.Fragment key={l.layer}>
                <ArrowRightIcon className="hidden size-5 shrink-0 self-center text-faint lg:block" aria-hidden />
                <LayerCard layer={l} />
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <RunsByHour data={data.runsByHour} range={range} />
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardAction>
                <Link to="/incidents" className="text-[13px]">
                  All incidents
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3.5">
              {data.activity.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <Dot tone={a.tone} size="md" className="mt-1.5" />
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm leading-snug">
                      {a.href ? (
                        <Link to={a.href} className="text-foreground hover:text-link">
                          <RichText text={a.text} />
                        </Link>
                      ) : (
                        <RichText text={a.text} />
                      )}
                    </div>
                    <div className="text-[13px] text-muted-foreground">{a.ago}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

function SourcesWell({ sources }: { sources: Source[] }) {
  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-[10px] bg-sunken p-3.5 lg:w-[230px]">
      <Eyebrow>Sources · dlt</Eyebrow>
      {sources.map((s) => (
        <div key={s.name} className="flex items-center gap-2 text-[13.5px]">
          <Dot tone={s.tone} />
          {s.name}
          <span className={cn('ml-auto font-mono text-xs', s.tone === 'bad' ? toneText.bad : 'text-muted-foreground')}>{s.lag}</span>
        </div>
      ))}
    </div>
  )
}

function LayerCard({ layer }: { layer: LayerSummary }) {
  const name = layer.layer[0]!.toUpperCase() + layer.layer.slice(1)
  return (
    <Link
      to="/assets"
      search={{ layer: layer.layer }}
      className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[10px] border border-border-card p-3.5 text-foreground hover:border-border-strong hover:text-foreground"
    >
      <div className="flex items-center gap-2">
        <LayerSwatch layer={layer.layer} size="lg" />
        <span className="text-sm font-medium">{name}</span>
        <span className="ml-auto text-[13px] text-muted-foreground">{layer.description}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-medium">{layer.tables}</span>
        <span className="text-[13px] text-muted-foreground">tables</span>
      </div>
      <HealthBar ok={layer.tables - layer.stale} bad={layer.stale} />
      <div className="text-[13px] text-muted-foreground">
        {layer.stale > 0 ? <span className="text-bad-text">{layer.stale} stale</span> : 'All fresh'} · {layer.note}
      </div>
    </Link>
  )
}

const runsChartConfig = {
  succeeded: { label: 'Succeeded', color: 'var(--bar)' },
  failed: { label: 'Failed', color: 'var(--bad)' },
} satisfies ChartConfig

function RunsByHour({ data, range }: { data: { ok: number[]; failed: number[]; labels: string[] }; range: Range }) {
  const rows = React.useMemo(
    () =>
      data.ok.map((n, i) => {
        const h = (10 + i) % 24
        return { hour: `${h < 10 ? '0' : ''}${h}:00`, succeeded: n, failed: data.failed[i] ?? 0 }
      }),
    [data],
  )
  const total = rows.reduce((a, r) => a + r.succeeded + r.failed, 0)
  const failed = rows.reduce((a, r) => a + r.failed, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Runs by hour</CardTitle>
        <CardAction className="gap-3.5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-bar" /> Succeeded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-bad" /> Failed
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {range !== '24h' ? (
          <p className="m-0 text-xs text-muted-foreground">Showing the last 24 h — longer ranges come from the Dagster run history once connected.</p>
        ) : null}
        <ChartContainer
          config={runsChartConfig}
          label={`Runs per hour, last 24 hours: ${total} runs, ${failed} failed`}
          className="aspect-auto h-[180px] w-full lg:h-auto lg:min-h-[180px] lg:flex-1"
        >
          <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="hour" hide />
            <YAxis width={24} tickLine={false} axisLine={false} tickMargin={4} fontSize={11} allowDecimals={false} tickCount={4} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={(v) => `${v} runs`} />} />
            <Bar dataKey="succeeded" stackId="runs" fill="var(--color-succeeded)" radius={3} isAnimationActive={false} />
            <Bar dataKey="failed" stackId="runs" fill="var(--color-failed)" radius={3} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <div className="flex justify-between pl-6 font-mono text-[11px] text-muted-foreground">
          {data.labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
