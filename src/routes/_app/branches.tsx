import { Link, createFileRoute } from '@tanstack/react-router'
import { GitCompareIcon } from 'lucide-react'
import { getBranchesPage } from '@/lib/data/api/branches'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Mono } from '@/components/phlo/status'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Search = { env?: 'staging'; branch?: string }

export const Route = createFileRoute('/_app/branches')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    env: search.env === 'staging' ? 'staging' : undefined,
    branch: typeof search.branch === 'string' && search.branch.length <= 128 ? search.branch : undefined,
  }),
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const), branch: search.branch }),
  loader: ({ deps }) => getBranchesPage({ data: deps }),
  head: () => ({ meta: [{ title: 'Branches · phlo' }] }),
  component: BranchesPage,
})

function BranchesPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  return (
    <>
      <PageHeader title="Branches" meta={`${data.env} · Nessie catalog · ${data.branches.length} branches, ${data.tags.length} tags`} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <section aria-label="Branches" className="flex shrink-0 flex-col gap-1 border-b border-line p-3 lg:w-[340px] lg:overflow-y-auto lg:border-r lg:border-b-0">
          {data.branches.map((branch) => {
            const selected = data.detail?.reference.name === branch.name
            return (
              <Link
                key={branch.name}
                to="/branches"
                search={{ env: data.env === 'staging' ? data.env : undefined, branch: branch.name }}
                aria-current={selected ? 'page' : undefined}
                className={cn('flex flex-col gap-1.5 rounded-[10px] px-4 py-3.5 text-left text-foreground hover:bg-sunken hover:text-foreground', selected && 'bg-soft hover:bg-soft')}
              >
                <span className="flex items-center gap-2">
                  <span className="truncate font-mono text-[13.5px] font-medium">{branch.name}</span>
                  <Badge variant={branch.protected ? 'neutral' : 'outline'} className="ml-auto px-1.5 text-[11.5px]">
                    {branch.protected ? 'protected' : 'branch'}
                  </Badge>
                </span>
                <span className="font-mono text-[12px] text-muted-foreground">{branch.hash}</span>
              </Link>
            )
          })}
          <Eyebrow className="px-4 pt-[18px] pb-1.5">Tags</Eyebrow>
          {data.tags.length ? data.tags.map((tag) => <div key={tag.name} className="flex items-center gap-2 rounded-[10px] px-4 py-2.5"><span className="truncate font-mono text-[13px]">{tag.name}</span><span className="ml-auto font-mono text-xs text-muted-foreground">{tag.hash}</span></div>) : <span className="px-4 py-2 text-[13px] text-muted-foreground">No tags returned by the API.</span>}
        </section>
        {data.detail ? <BranchDetailView detail={data.detail} /> : <EmptyState title={search.branch ? 'Branch unavailable' : 'No branch records available'} className="m-7">{search.branch ? 'The selected branch is not present in this environment. Choose a branch from the list.' : 'The API returned no branches for this environment.'}</EmptyState>}
      </div>
      {search.branch && !data.branches.some((branch) => branch.name === search.branch) ? <p className="sr-only">The requested branch is unavailable in this environment.</p> : null}
    </>
  )
}

type Detail = NonNullable<Awaited<ReturnType<typeof getBranchesPage>>>['detail']

function BranchDetailView({ detail }: { detail: NonNullable<Detail> }) {
  const { reference, commits, diff, comparison, nextCursor } = detail
  return <section aria-label={reference.name} className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
    <div className="flex flex-col gap-3 border-b border-line px-4 pt-5 pb-4 lg:px-7 lg:pt-[22px] lg:pb-[18px]">
      <h2 className="m-0 font-mono text-lg font-medium break-all lg:text-xl">{reference.name}</h2>
      <p className="m-0 text-[13px] text-muted-foreground">Head <Mono className="rounded bg-branch-soft px-1 text-[12.5px] text-branch">{reference.hash}</Mono>{reference.protected ? ' · protected reference' : ' · branch reference'}</p>
      {comparison ? <p className="m-0 text-[13px] text-muted-foreground">{comparison.status === 'compared' ? `${comparison.ahead ?? 'unavailable'} ahead · ${comparison.behind ?? 'unavailable'} behind ${comparison.target}` : `Comparison with ${comparison.target} is unavailable.`}</p> : <p className="m-0 text-[13px] text-muted-foreground">Comparison is not applicable to the protected branch.</p>}
    </div>
    <div className="grid grid-cols-1 gap-7 px-4 pt-3 pb-6 lg:grid-cols-2 lg:px-7">
      <div id="changes" className="flex scroll-mt-4 flex-col gap-2"><Eyebrow>Table changes</Eyebrow>{diff?.items.length ? <div className="overflow-hidden rounded-[10px] border border-border-card">{diff.items.map((change, index) => <div key={change.key} className={cn('flex flex-col gap-1 px-3.5 py-3 text-sm', index > 0 && 'border-t border-line-soft')}><span className="font-mono text-[12.5px]">{change.key}</span><span className="text-[13px] text-muted-foreground">{change.status} · {change.from_content_id ?? 'unavailable'} → {change.to_content_id ?? 'unavailable'}</span></div>)}</div> : <EmptyState title={diff?.truncated ? 'Change list unavailable' : 'No table changes returned'}>{diff?.truncated ? 'The API truncated this diff.' : 'Diff data is unavailable or contains no changes.'}</EmptyState>}{diff?.truncated ? <p className="m-0 text-xs text-muted-foreground">The API truncated this diff after its supported limit.</p> : null}</div>
      <div className="flex flex-col gap-1"><Eyebrow className="pb-1.5">Commits</Eyebrow>{commits.length ? commits.map((commit, index) => <div key={commit.hash} className={cn('flex gap-3 py-2', index < commits.length - 1 && 'border-b border-line-soft')}><span className="min-w-20 max-w-32 shrink-0 break-all font-mono text-[12.5px] text-branch">{commit.hash}</span><div className="flex min-w-0 flex-col gap-0.5"><span className="text-sm">{commit.message ?? 'No commit message'}</span><span className="text-[13px] text-muted-foreground">{commit.author ?? commit.committer ?? 'Unknown author'} · {commit.committed_at ?? 'Timestamp unavailable'}</span></div></div>) : <span className="py-2 text-[13px] text-muted-foreground">No commits returned by the API.</span>}{nextCursor ? <p className="m-0 text-xs text-muted-foreground">Showing the first 50 commits.</p> : null}</div>
    </div>
    <div className="px-4 pb-6 lg:px-7"><a href="#changes" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10 sm:h-9')}><GitCompareIcon /> View table changes</a><p className="mt-3 text-xs text-muted-foreground">Branch creation, checks, rebases, trial merges, and merges are not available from this read-only screen.</p></div>
  </section>
}
