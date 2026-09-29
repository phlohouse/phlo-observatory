import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { getAssetList } from '@/lib/data/api/assets'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_app/assets/')({
  validateSearch: (search: Record<string, unknown>) => ({
    env: search.env === 'staging' ? 'staging' as const : undefined,
  }),
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ deps }) => getAssetList({ data: { env: deps.env } }),
  head: () => ({ meta: [{ title: 'Assets · phlo' }] }),
  component: AssetsPage,
})

function AssetsPage() {
  const { env, items, next_cursor } = Route.useLoaderData()
  const [query, setQuery] = React.useState('')
  const rows = items.filter((asset) => `${asset.id} ${asset.description ?? ''} ${asset.group_name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <>
      <PageHeader title="Assets" meta={`${env} · ${items.length} API records`} />
      <PageBody>
        <label className="flex h-10 max-w-lg items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground">
          <SearchIcon className="size-4" aria-hidden />
          <span className="sr-only">Search assets</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search asset, group, or description" className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" />
        </label>
        {next_cursor ? <p className="m-0 text-xs text-muted-foreground">This API page is limited to 100 records; more records are available.</p> : null}
        {rows.length ? (
          <div className="overflow-x-auto rounded-lg border border-border-card">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-line bg-raised text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2.5 font-medium">Asset</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Group</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Compute kind</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Latest materialization</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Latest run</th>
              </tr></thead>
              <tbody>
                {rows.map((asset) => (
                  <tr key={asset.id} className="border-b border-line-soft last:border-0 hover:bg-raised">
                    <td className="px-3 py-3">
                      <Link to="/assets/$assetId" params={{ assetId: asset.id }} search={{ env: env === 'staging' ? env : undefined }} className="font-mono text-[13px] text-foreground hover:text-link">{asset.id}</Link>
                      {asset.description ? <div className="mt-1 max-w-[440px] text-xs text-muted-foreground">{asset.description}</div> : null}
                    </td>
                    <td className="px-3 py-3"><Badge variant="neutral">{asset.group_name ?? 'Unassigned'}</Badge></td>
                    <td className="px-3 py-3 text-text-2">{asset.compute_kind ?? (asset.is_source ? 'Source' : 'Unknown')}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{asset.last_materialization_at ?? 'No materialization evidence'}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{asset.last_run_id ?? 'No run evidence'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={query ? 'No assets match this search' : 'No asset records available'}>
            {query ? 'Try a different asset name, group, or description.' : 'The API returned no asset records for this environment.'}
          </EmptyState>
        )}
        <p className="m-0 text-xs text-muted-foreground">Freshness lag, row counts, storage size, ownership, and seven-day history are not provided by this API response and are omitted.</p>
      </PageBody>
    </>
  )
}
