import { createFileRoute } from '@tanstack/react-router'
import { getIncidentDetail } from '@/lib/data/api/incidents'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState, NotFound } from '@/components/phlo/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_app/incidents/$incidentId')({
  validateSearch: (search: Record<string, unknown>): { env?: 'staging' } => ({
    ...(search.env === 'staging' ? { env: 'staging' } : {}),
  }),
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ params, deps }) => getIncidentDetail({ data: { id: params.incidentId, env: deps.env } }),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.incident.title} · phlo` : 'Incident · phlo' }] }),
  notFoundComponent: NotFound,
  component: IncidentPage,
})

function IncidentPage() {
  const { incident, timeline, env } = Route.useLoaderData()
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Incidents', to: env === 'staging' ? '/incidents?env=staging' : '/incidents' }]}
        title={incident.title}
        meta={`${env} · version ${incident.version}`}
        actions={<Badge variant={incident.status === 'resolved' ? 'ok' : incident.status === 'acknowledged' ? 'info' : 'warn'}>{incident.status}</Badge>}
      />
      <PageBody>
        <Card>
          <CardHeader><CardTitle>Incident record</CardTitle></CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Fact label="ID" value={incident.id} mono />
            <Fact label="Kind" value={incident.kind} />
            <Fact label="Asset" value={incident.asset_id} mono />
            <Fact label="Owner" value={incident.owner ?? 'Unassigned'} />
            <Fact label="Created" value={incident.created_at} mono />
            <Fact label="Updated" value={incident.updated_at} mono />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            {timeline.length ? (
              <ol className="m-0 flex list-none flex-col gap-0 p-0">
                {timeline.map((item) => (
                  <li key={item.id} className="grid gap-1 border-b border-line-soft py-3 last:border-0 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <time dateTime={item.occurred_at} className="font-mono text-xs text-muted-foreground">{item.occurred_at}</time>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.kind.replaceAll('_', ' ')}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.actor}</div>
                      <pre className="m-0 mt-2 overflow-x-auto rounded bg-raised p-2 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(item.payload, null, 2)}</pre>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No timeline events">No incident activity has been recorded for this environment.</EmptyState>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  )
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</div></div>
}
