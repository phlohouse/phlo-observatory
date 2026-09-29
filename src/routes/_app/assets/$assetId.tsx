import { createFileRoute } from '@tanstack/react-router'
import { getAssetDetail } from '@/lib/data/api/assets'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_app/assets/$assetId')({
  validateSearch: (search: Record<string, unknown>) => ({
    env: search.env === 'staging' ? 'staging' as const : undefined,
  }),
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ params, deps }) => getAssetDetail({ data: { id: params.assetId, env: deps.env } }),
  head: ({ params }) => ({ meta: [{ title: `${params.assetId} · phlo` }] }),
  component: AssetPage,
})

function AssetPage() {
  const { env, asset, runs } = Route.useLoaderData()
  const lineage = asset.column_lineage ?? {}
  const dependencies = asset.dependencies

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Assets', to: env === 'staging' ? '/assets?env=staging' : '/assets' }]}
        title={asset.id}
        meta={`${env} · ${asset.compute_kind ?? 'compute kind unavailable'}`}
      />
      <PageBody>
        <Card>
          <CardHeader><CardTitle>Asset record</CardTitle></CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Fact label="Description" value={asset.description ?? 'Not provided'} />
            <Fact label="Group" value={asset.group_name ?? 'Not assigned'} />
            <Fact label="Kind" value={asset.compute_kind ?? 'Unknown'} />
            <Fact label="Source" value={asset.is_source ? 'Yes' : 'No'} />
            <Fact label="Latest materialization" value={asset.last_materialization_at ?? 'No materialization evidence'} mono />
            <Fact label="Latest run" value={asset.last_run_id ?? 'No run evidence'} mono />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Schema</CardTitle></CardHeader>
          <CardContent>
            {asset.columns.length ? (
              <div className="overflow-x-auto rounded-lg border border-border-card">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-line bg-raised text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 font-medium">Column</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Description</th>
                  </tr></thead>
                  <tbody>{asset.columns.map((column) => (
                    <tr key={column.name} className="border-b border-line-soft last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{column.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{column.type ?? 'Unknown'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{column.description ?? '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <EmptyState title="Schema unavailable">The API returned no column schema for this asset.</EmptyState>}
            <p className="mb-0 mt-3 text-xs text-muted-foreground">{asset.schema_observed_at ? `Observed ${asset.schema_observed_at}` : 'Schema observation time unavailable'}</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Dependencies</CardTitle></CardHeader>
            <CardContent>
              {dependencies.length ? <ul className="m-0 flex list-none flex-col gap-2 p-0">{dependencies.map((key) => <li key={key.join('/')} className="font-mono text-xs">{key.join('/')}</li>)}</ul> : <p className="m-0 text-sm text-muted-foreground">No dependency edges returned.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Column lineage</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(lineage).length ? <ul className="m-0 flex list-none flex-col gap-2 p-0">{Object.entries(lineage).map(([column, sources]) => <li key={column}><span className="font-mono text-xs">{column}</span><ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{sources.map((source) => <li key={`${source.asset_key.join('/')}.${source.column_name}`}>{source.asset_key.join('/')}.{source.column_name}</li>)}</ul></li>)}</ul> : <p className="m-0 text-sm text-muted-foreground">No column-lineage evidence returned.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent runs</CardTitle></CardHeader>
          <CardContent>
            {!runs ? <p className="m-0 text-sm text-muted-foreground">Run history is not scoped to this environment for this asset.</p> : runs.items.length ? (
              <div className="overflow-x-auto rounded-lg border border-border-card">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-line bg-raised text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2.5 font-medium">Run</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Created</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Started</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Ended</th>
                  </tr></thead>
                  <tbody>{runs.items.map((run) => (
                    <tr key={run.run_id} className="border-b border-line-soft last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{run.run_id}</td>
                      <td className="px-3 py-2"><Badge variant={run.status === 'SUCCESS' ? 'ok' : run.status === 'FAILURE' ? 'bad' : 'neutral'}>{run.status}</Badge></td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{run.created_at}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{run.started_at ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{run.ended_at ?? '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <EmptyState title="No run history">The API returned no runs for this asset.</EmptyState>}
          </CardContent>
        </Card>
        <p className="m-0 text-xs text-muted-foreground">Preview, materialization, backfill and audit-creation actions are omitted here until their API workflows and confirmation steps are integrated.</p>
      </PageBody>
    </>
  )
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</div></div>
}
