import { Link, createFileRoute } from '@tanstack/react-router'
import { getRunTimeline } from '@/lib/data/api/pipelines'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Badge } from '@/components/ui/badge'

type Search = { env?: 'staging' }

export const Route = createFileRoute('/_app/pipelines/timeline')({
  validateSearch: (search: Record<string, unknown>): Search => search.env === 'staging' ? { env: 'staging' } : {},
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ deps }) => getRunTimeline({ data: { env: deps.env } }),
  head: () => ({ meta: [{ title: 'Run timeline · phlo' }] }), component: TimelinePage,
})

function TimelinePage() {
  const { env, runs, maintenance } = Route.useLoaderData()
  return <><PageHeader crumbs={[{ label: 'Pipelines', to: '/pipelines' }]} title="Run timeline" meta={`${env} · ${runs.length} API run records returned`} />
    <PageBody>
      <section><h2 className="m-0 text-sm font-medium">Maintenance windows</h2>{maintenance.status === 'unavailable' ? <p className="mt-2 text-sm text-muted-foreground">Maintenance-window data is unavailable for this environment.</p> : maintenance.items.length ? <ul className="mt-2 space-y-2 text-sm">{maintenance.items.map((item) => <li key={item.id} className="rounded-lg border border-border-card p-3"><span className="font-mono text-xs">{item.starts_at} — {item.ends_at}</span>{item.description ? <div className="mt-1">{item.description}</div> : null}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No maintenance windows returned.</p>}</section>
      <section><h2 className="m-0 text-sm font-medium">Run records</h2>{runs.length ? <div className="mt-2 overflow-x-auto rounded-lg border border-border-card"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-line bg-raised text-xs text-muted-foreground"><th className="px-3 py-2">Job</th><th className="px-3 py-2">Run ID</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Duration</th></tr></thead><tbody>{runs.map((item) => <tr key={item.run_id} className="border-b border-line-soft last:border-0"><td className="px-3 py-3"><Link to="/pipelines/$jobName" params={{ jobName: item.job_id }} search={{ env: env === 'staging' ? env : undefined, run: item.run_id }} className="font-mono text-xs hover:text-link">{item.job_id}</Link></td><td className="px-3 py-3 font-mono text-xs">{item.run_id}</td><td className="px-3 py-3"><Badge variant="neutral">{item.status}</Badge></td><td className="px-3 py-3 font-mono text-xs text-muted-foreground">{item.created_at}</td><td className="px-3 py-3 font-mono text-xs text-muted-foreground">{item.duration_seconds === null ? 'Unavailable' : `${item.duration_seconds}s`}</td></tr>)}</tbody></table></div> : <EmptyState title="No run records returned">The API returned no run evidence for this environment.</EmptyState>}</section>
      <p className="m-0 text-xs text-muted-foreground">The API provides individual run records, not slot-based history. Fixture run strips, inferred ordering, and fabricated event markers are omitted.</p>
    </PageBody></>
}
