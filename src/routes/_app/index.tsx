import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RefreshCwIcon } from 'lucide-react'
import { getOverview } from '@/lib/data/api/core'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { KpiCard } from '@/components/phlo/kpi'
import { Dot, LayerSwatch } from '@/components/phlo/status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/')({
  loader: () => getOverview({ data: { env: 'prod' } }),
  head: () => ({ meta: [{ title: 'Overview · phlo' }] }),
  component: OverviewPage,
})

function OverviewPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const overview = data.overview
  const freshness = overview.freshness_counts
  const freshnessTotal = freshness.fresh + freshness.stale + freshness.unknown
  const runs = overview.run_status_counts
  const runCount = Object.values(runs).reduce((sum, count) => sum + count, 0)
  const openIncidents = (overview.incident_counts.open ?? 0) + (overview.incident_counts.acknowledged ?? 0)
  const resolvedIncidents = overview.incident_counts.resolved ?? 0
  const quality = overview.quality_checks

  return (
    <>
      <PageHeader
        title="Overview"
        meta={`${overview.env} · fetched ${data.refreshedAt}`}
        actions={
          <Button variant="outline" onClick={() => router.invalidate()}>
            <RefreshCwIcon /> Refresh
          </Button>
        }
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <KpiCard
            label="Asset freshness"
            value={freshnessTotal ? `${freshness.fresh}/${freshnessTotal}` : 'Unavailable'}
            qualifier={`${freshness.stale} stale · ${freshness.unknown} unknown`}
            qualifierTone={freshness.stale > 0 ? 'bad' : undefined}
          />
          <KpiCard
            label="Recent runs"
            value={runCount}
            qualifier={`${runs.FAILURE ?? 0} failed`}
            qualifierTone={(runs.FAILURE ?? 0) > 0 ? 'bad' : undefined}
            footer={overview.run_history_truncated ? 'History limited to the latest 100 runs' : 'From configured Dagster location'}
          />
          <KpiCard
            label="Quality checks"
            value={quality.status === 'available' && quality.counts ? `${quality.counts.passing}/${quality.counts.total}` : 'Unknown'}
            qualifier={quality.status === 'available' && quality.counts ? `${quality.counts.unevaluated} unevaluated` : quality.reason ?? 'Evidence unavailable'}
          />
          <KpiCard
            label="Open incidents"
            value={openIncidents}
            qualifier="open or acknowledged"
            footer={`${resolvedIncidents} resolved · see Incidents for details`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Metric label="Total assets" value={overview.asset_count} />
              <Metric label="Materialized assets" value={overview.materialized_asset_count} />
              <Metric label="Latest materialization" value={overview.latest_materialization_at ?? 'No materialization evidence'} />
              <Metric label="Fresh" value={freshness.fresh} />
              <Metric label="Stale" value={freshness.stale} tone={freshness.stale ? 'bad' : 'neutral'} />
              <Metric label="Unknown freshness" value={freshness.unknown} tone={freshness.unknown ? 'warn' : 'neutral'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Run status</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Object.entries(runs).length ? Object.entries(runs).map(([status, count]) => (
                <Metric key={status} label={status.replaceAll('_', ' ').toLowerCase()} value={count} tone={status === 'FAILURE' && count > 0 ? 'bad' : 'neutral'} />
              )) : <p className="m-0 text-sm text-muted-foreground">No run evidence is available.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Layers</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.layers.length ? data.layers.map((layer) => (
              <div key={layer.group_name ?? 'ungrouped'} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border-card p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {isLayer(layer.group_name) ? <LayerSwatch layer={layer.group_name} /> : <Dot tone="neutral" />}
                  <span className="truncate">{layer.group_name ?? 'Ungrouped'}</span>
                </div>
                <Metric label="Assets" value={layer.asset_count} />
                <Metric label="Materialized" value={layer.materialized_asset_count} />
                <Metric label="Latest" value={layer.latest_materialization_at ?? 'No materialization evidence'} />
              </div>
            )) : <p className="m-0 text-sm text-muted-foreground">No layer data is available.</p>}
          </CardContent>
        </Card>
      </PageBody>
    </>
  )
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'bad' | 'warn' }) {
  const color = tone === 'bad' ? 'text-bad-ink' : tone === 'warn' ? 'text-warn-ink' : 'text-foreground'
  return <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
    <span className="truncate text-muted-foreground">{label}</span>
    <span className={`max-w-[65%] truncate text-right font-mono text-xs ${color}`}>{value}</span>
  </div>
}

function isLayer(value: string | null): value is 'bronze' | 'silver' | 'gold' {
  return value === 'bronze' || value === 'silver' || value === 'gold'
}
