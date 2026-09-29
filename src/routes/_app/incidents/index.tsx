import * as React from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { getIncidentList } from '@/lib/data/api/incidents'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/toggle-group'

type View = 'open' | 'resolved'
type Search = { view?: View; env?: 'staging' }

export const Route = createFileRoute('/_app/incidents/')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    view: search.view === 'resolved' ? 'resolved' : undefined,
    env: search.env === 'staging' ? 'staging' : undefined,
  }),
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ deps }) => getIncidentList({ data: { env: deps.env } }),
  head: () => ({ meta: [{ title: 'Incidents · phlo' }] }),
  component: IncidentsPage,
})

function IncidentsPage() {
  const { incidents, counts, env, truncated } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const view = search.view ?? 'open'
  const [query, setQuery] = React.useState('')
  const openCount = (counts.open ?? 0) + (counts.acknowledged ?? 0)
  const rows = incidents.filter((incident) => {
    const inView = view === 'resolved' ? incident.status === 'resolved' : incident.status !== 'resolved'
    const text = `${incident.id} ${incident.title} ${incident.asset_id} ${incident.owner ?? ''}`.toLowerCase()
    return inView && text.includes(query.trim().toLowerCase())
  })

  return (
    <>
      <PageHeader
        title="Incidents"
        meta={env}
        actions={
          <Segmented
            aria-label="Show incidents"
            value={view}
            onValueChange={(value) => navigate({ search: value === 'resolved' ? { view: 'resolved' } : {} })}
            options={[
              { value: 'open', label: `Open · ${openCount}` },
              { value: 'resolved', label: `Resolved · ${counts.resolved ?? 0}` },
            ]}
          />
        }
      />
      <PageBody>
        {truncated ? <p className="m-0 text-xs text-muted-foreground">Showing the first 500 incidents. Use the API cursor for older records.</p> : null}
        <label className="flex h-10 max-w-lg items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground">
          <SearchIcon className="size-4" aria-hidden />
          <span className="sr-only">Search incidents</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, asset, owner, or ID" className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" />
        </label>

        {rows.length ? (
          <div className="overflow-x-auto rounded-lg border border-border-card">
            <table className="w-full min-w-[740px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-line bg-raised text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2.5 font-medium">Incident</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Asset</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Owner</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Updated</th>
              </tr></thead>
              <tbody>
                {rows.map((incident) => (
                  <tr key={incident.id} className="border-b border-line-soft last:border-0 hover:bg-raised">
                    <td className="px-3 py-3"><Link to="/incidents/$incidentId" params={{ incidentId: incident.id }} search={env === 'staging' ? { env } : {}} className="font-medium text-foreground hover:text-link">{incident.title}</Link><div className="mt-1 font-mono text-xs text-muted-foreground">{incident.id} · {incident.kind}</div></td>
                    <td className="px-3 py-3 font-mono text-xs">{incident.asset_id}</td>
                    <td className="px-3 py-3"><Badge variant={incident.status === 'resolved' ? 'ok' : incident.status === 'acknowledged' ? 'info' : 'warn'}>{incident.status}</Badge></td>
                    <td className="px-3 py-3">{incident.owner ?? 'Unassigned'}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{formatTimestamp(incident.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={query ? 'No incidents match this search' : view === 'open' ? 'No open incidents' : 'No resolved incidents'}>
            {query ? 'Try another title, asset, owner, or ID.' : 'There are no records in this view for the selected environment.'}
          </EmptyState>
        )}
      </PageBody>
    </>
  )
}

function formatTimestamp(value: string) {
  return new Date(value).toISOString()
}
