import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getPipelineList } from '@/lib/data/api/pipelines'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Badge } from '@/components/ui/badge'

type Search = { env?: 'staging' }

export const Route = createFileRoute('/_app/pipelines/')({
  validateSearch: (search: Record<string, unknown>): Search => search.env === 'staging' ? { env: 'staging' } : {},
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ deps }) => getPipelineList({ data: { env: deps.env } }),
  head: () => ({ meta: [{ title: 'Pipelines · phlo' }] }), component: PipelinesPage,
})

function PipelinesPage() {
  const { env, jobs, schedules, runs } = Route.useLoaderData()
  const [query, setQuery] = React.useState('')
  const visible = jobs.filter((item) => `${item.id} ${item.repository_name} ${item.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const schedulesByJob = new Map<string, string[]>()
  for (const item of schedules) schedulesByJob.set(item.job_id, [...(schedulesByJob.get(item.job_id) ?? []), item.status])
  const runCountByJob = new Map<string, number>()
  for (const item of runs) runCountByJob.set(item.job_id, (runCountByJob.get(item.job_id) ?? 0) + 1)
  return <><PageHeader title="Pipelines" meta={`${env} · ${jobs.length} API job records`} actions={<Link to="/pipelines/timeline" search={{ env: env === 'staging' ? env : undefined }} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-raised">Run records & maintenance</Link>} />
    <PageBody>
      <label className="flex h-10 max-w-lg items-center rounded-lg border border-border bg-card px-3"><span className="sr-only">Find a job</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a job" className="w-full bg-transparent text-sm outline-none" /></label>
      {visible.length ? <div className="overflow-x-auto rounded-lg border border-border-card"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-line bg-raised text-xs text-muted-foreground"><th className="px-3 py-2.5">Job</th><th className="px-3 py-2.5">Repository</th><th className="px-3 py-2.5">Schedules</th><th className="px-3 py-2.5">Run records returned</th><th className="px-3 py-2.5">Assets</th></tr></thead><tbody>{visible.map((item) => { const jobSchedules = schedulesByJob.get(item.id) ?? []; return <tr key={item.id} className="border-b border-line-soft last:border-0 hover:bg-raised"><td className="px-3 py-3"><Link to="/pipelines/$jobName" params={{ jobName: item.id }} search={{ env: env === 'staging' ? env : undefined }} className="font-mono text-[13px] hover:text-link">{item.id}</Link>{item.description ? <div className="mt-1 text-xs text-muted-foreground">{item.description}</div> : null}</td><td className="px-3 py-3 text-text-2">{item.repository_name}</td><td className="px-3 py-3">{jobSchedules.length ? jobSchedules.map((status) => <Badge key={status} variant="neutral" className="mr-1">{status}</Badge>) : 'No schedule evidence'}</td><td className="px-3 py-3 font-mono text-xs text-muted-foreground">{runCountByJob.get(item.id) ?? 0}</td><td className="px-3 py-3 text-xs text-muted-foreground">{item.selected_assets.length ? item.selected_assets.map((path) => path.join('/')).join(', ') : 'No selected assets'}</td></tr> })}</tbody></table></div> : <EmptyState title={query ? 'No jobs match this search' : 'No job records available'}>{query ? 'Try a different job name or repository.' : 'The API returned no jobs for this environment.'}</EmptyState>}
      <p className="m-0 text-xs text-muted-foreground">Status, ownership, source, run ordering, and schedule timing are not supplied by these API responses and are omitted.</p>
    </PageBody></>
}
