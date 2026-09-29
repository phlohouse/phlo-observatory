import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RefreshCwIcon } from 'lucide-react'
import { getStagingOverview } from '@/lib/data/api/staging'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { KpiCard } from '@/components/phlo/kpi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_app/staging')({
  loader: () => getStagingOverview(),
  head: () => ({ meta: [{ title: 'Overview · staging · phlo' }] }),
  component: StagingPage,
})

function StagingPage() {
  const { prod, staging } = Route.useLoaderData()
  const router = useRouter()
  const stage = staging.overview
  const production = prod.overview
  const stageFresh = stage.freshness_counts
  const prodFresh = production.freshness_counts
  const stageRuns = Object.values(stage.run_status_counts).reduce((sum, count) => sum + count, 0)
  const prodRuns = Object.values(production.run_status_counts).reduce((sum, count) => sum + count, 0)

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2.5">Staging <Badge variant="warn">staging</Badge></span>}
        meta={`Environment-scoped API observations · fetched ${staging.refreshedAt}`}
        actions={<Button variant="outline" onClick={() => router.invalidate()}><RefreshCwIcon /> Refresh</Button>}
      />
      <PageBody className="gap-4">
        <div role="note" className="rounded-lg border border-warn-line bg-warn-wash px-4 py-3 text-sm text-warn-ink">
          Staging and production are queried independently and show different API results. Staging copy inventory, promotion diffs, and signed promotion are not available in the current API; promotion is intentionally disabled (Wave 8 deferred).
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <KpiCard label="Staging assets" value={stage.asset_count} qualifier={`${stage.materialized_asset_count} materialized`} />
          <KpiCard label="Staging freshness" value={`${stageFresh.fresh} fresh`} qualifier={`${stageFresh.stale} stale · ${stageFresh.unknown} unknown`} qualifierTone={stageFresh.stale > 0 ? 'bad' : undefined} />
          <KpiCard label="Staging runs" value={stageRuns} qualifier={`${stage.run_status_counts.FAILURE ?? 0} failed`} qualifierTone={(stage.run_status_counts.FAILURE ?? 0) > 0 ? 'bad' : undefined} />
          <KpiCard label="Quality checks" value={stage.quality_checks.status === 'available' && stage.quality_checks.counts ? `${stage.quality_checks.counts.passing}/${stage.quality_checks.counts.total}` : 'Unknown'} qualifier={stage.quality_checks.reason ?? 'Staging evidence'} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <EnvironmentSummary label="staging" data={stage} freshness={stageFresh} runs={stageRuns} />
          <EnvironmentSummary label="prod" data={production} freshness={prodFresh} runs={prodRuns} />
        </div>

        <Card>
          <CardHeader><CardTitle>Comparison available from the overview API</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Comparison label="Assets" staging={stage.asset_count} prod={production.asset_count} />
            <Comparison label="Materialized" staging={stage.materialized_asset_count} prod={production.materialized_asset_count} />
            <Comparison label="Recent runs" staging={stageRuns} prod={prodRuns} />
            <Comparison label="Stale assets" staging={stageFresh.stale} prod={prodFresh.stale} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  )
}

function EnvironmentSummary({ label, data, freshness, runs }: {
  label: string
  data: { asset_count: number; materialized_asset_count: number; latest_materialization_at: string | null; run_status_counts: Record<string, number>; quality_checks: { status: 'available' | 'unknown'; reason: string | null } }
  freshness: { fresh: number; stale: number; unknown: number }
  runs: number
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="capitalize">{label} evidence</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <EvidenceValue label="Assets" value={data.asset_count} />
        <EvidenceValue label="Materialized assets" value={data.materialized_asset_count} />
        <EvidenceValue label="Fresh / stale / unknown" value={`${freshness.fresh} / ${freshness.stale} / ${freshness.unknown}`} />
        <EvidenceValue label="Runs in current history" value={runs} />
        <EvidenceValue label="Run failures" value={data.run_status_counts.FAILURE ?? 0} />
        <EvidenceValue label="Quality evidence" value={data.quality_checks.status === 'available' ? 'Available' : data.quality_checks.reason ?? 'Unknown'} />
        <EvidenceValue label="Latest materialization" value={data.latest_materialization_at ?? 'No evidence'} />
      </CardContent>
    </Card>
  )
}

function EvidenceValue({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-line-soft pb-2 text-[13px] last:border-0 last:pb-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="max-w-[70%] truncate text-right font-mono text-xs">{value}</span>
  </div>
}

function Comparison({ label, staging, prod }: { label: string; staging: string | number; prod: string | number }) {
  return <div className="rounded-md border border-border-card px-3 py-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 flex justify-between gap-2 font-mono text-sm">
      <span className="truncate">{staging}</span>
      <span className="text-muted-foreground">{prod}</span>
    </div>
  </div>
}
