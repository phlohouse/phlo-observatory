import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CircleCheckIcon, CircleDashedIcon, CircleXIcon, GitCompareIcon, GitMergeIcon, PlusIcon } from 'lucide-react'
import { getBranchesPage } from '@/lib/data/api/branches'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { LayerSwatch, Mono } from '@/components/phlo/status'
import { BranchGraph } from '@/components/branches/branch-graph'
import { MergeDialog } from '@/components/branches/merge-dialog'
import { NewBranchDialog } from '@/components/branches/new-branch-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { emptyBranchDetail, type BranchDetail, type MergeCheck } from '@/lib/data/fixtures/branches'
import { cn } from '@/lib/utils'
import type { Branch, Tone } from '@/lib/data/types'

type Search = { dialog?: 'new-branch' | 'merge' }
export const Route = createFileRoute('/_app/branches')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    dialog: s.dialog === 'new-branch' || s.dialog === 'merge' ? s.dialog : undefined,
  }),
  loader: () => getBranchesPage(),
  head: () => ({ meta: [{ title: 'Branches · phlo' }] }),
  component: BranchesPage,
})

const badgeFor = (t: Tone) => (t === 'neutral' ? 'neutral' : t)

function BranchesPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [extra, setExtra] = React.useState<Array<{ branch: Branch; detail: BranchDetail }>>([])
  const [selected, setSelected] = React.useState('fix/telemetry-schema')

  const branches = [...data.branches, ...extra.map((e) => e.branch)]
  const details: Record<string, BranchDetail> = { ...data.details, ...Object.fromEntries(extra.map((e) => [e.branch.name, e.detail])) }
  const detail = details[selected] ?? details['fix/telemetry-schema']!
  const mergeTarget = details['fix/telemetry-schema']!
  const closeDialog = () => navigate({ search: (p) => ({ ...p, dialog: undefined }), replace: true })

  return (
    <>
      <PageHeader
        title="Branches"
        meta={`Nessie catalog · ${branches.length} branches, ${data.tags.length} tags`}
        actions={
          <Link from={Route.fullPath} to="." search={{ dialog: 'new-branch' }} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 lg:h-8')}>
            <PlusIcon /> New branch
          </Link>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <section aria-label="Branches" className="flex shrink-0 flex-col gap-1 border-b border-line p-3 lg:w-[340px] lg:overflow-y-auto lg:border-r lg:border-b-0">
          {branches.map((b) => {
            const inner = (
              <>
                <span className="flex items-center gap-2">
                  <span className="truncate font-mono text-[13.5px] font-medium">{b.name}</span>
                  {b.kind === 'main' ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[11.5px]">
                      {b.status.label}
                    </Badge>
                  ) : (
                    <Badge variant={badgeFor(b.status.tone)} className="ml-auto px-1.5 text-[11.5px]">
                      {b.status.label}
                    </Badge>
                  )}
                  {b.kind === 'main' ? <span className="ml-auto font-mono text-xs text-muted-foreground">{b.head}</span> : null}
                </span>
                <span className="text-[13px] text-muted-foreground">{b.note}</span>
              </>
            )
            const cls = 'flex w-full flex-col gap-1.5 rounded-[10px] px-4 py-3.5 text-left text-foreground hover:bg-sunken hover:text-foreground'
            if (b.name === 'feat/qc-trend-alerts')
              return (
                <Link key={b.name} to="/incidents/$incidentId" params={{ incidentId: '209' }} className={cls}>
                  {inner}
                </Link>
              )
            const on = b.name === selected
            return (
              <button
                key={b.name}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(b.name)}
                className={cn(cls, 'cursor-pointer', on && 'bg-soft hover:bg-soft')}
              >
                {inner}
              </button>
            )
          })}
          <Eyebrow className="px-4 pt-[18px] pb-1.5">Tags</Eyebrow>
          {data.tags.map((t) => (
            <Link
              key={t.name}
              to="/settings/audit-log"
              className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-foreground hover:bg-sunken hover:text-foreground"
            >
              <span className="truncate font-mono text-[13px]">{t.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{t.commit}</span>
            </Link>
          ))}
        </section>

        <BranchDetailView detail={detail} />
      </div>

      <MergeDialog
        open={search.dialog === 'merge'}
        onClose={closeDialog}
        onMerged={() => navigate({ to: '/settings/audit-log' })}
        branch={mergeTarget}
        me={data.me}
      />
      <NewBranchDialog
        open={search.dialog === 'new-branch'}
        onClose={closeDialog}
        startPoints={data.startPoints}
        incidents={data.incidents}
        onCreate={({ name, from, incidentId }) => {
          const kind = name.split('/')[0] as Branch['kind']
          setExtra((x) => [
            ...x.filter((e) => e.branch.name !== name),
            {
              branch: {
                name,
                kind,
                owner: 'Gareth',
                head: from.split('@')[1] ?? '',
                ahead: 0,
                behind: 0,
                status: { tone: 'neutral', label: 'new' },
                note: `Gareth · 0 ahead · 0 behind${incidentId ? ` · #${incidentId}` : ''}`,
                incidentId,
              },
              detail: { ...emptyBranchDetail(name, from), resolves: incidentId },
            },
          ])
          setSelected(name)
          closeDialog()
        }}
      />
    </>
  )
}

function BranchDetailView({ detail: d }: { detail: BranchDetail }) {
  return (
    <section aria-label={d.name} className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-line px-4 pt-5 pb-4 sm:flex-row sm:items-start lg:px-7 lg:pt-[22px] lg:pb-[18px]">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="m-0 font-mono text-lg font-medium break-all lg:text-xl">{d.name}</h2>
          <div className="text-[13px] text-muted-foreground">
            {d.from ? (
              <>
                Branched from <Mono className="rounded bg-branch-soft px-1 text-[12.5px] text-branch">{d.from}</Mono> {d.created} by {d.by}
                {d.resolves ? (
                  <>
                    {' '}
                    · resolves{' '}
                    <Link to="/incidents/$incidentId" params={{ incidentId: d.resolves }}>
                      #{d.resolves}
                    </Link>
                  </>
                ) : null}
                {d.summary ? <> · {d.summary}</> : null}
              </>
            ) : (
              d.summary
            )}
          </div>
        </div>
        {d.merge !== 'protected' ? (
          <div className="flex gap-2.5 sm:ml-auto">
            <a href="#changes" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10 sm:h-9')}>
              <GitCompareIcon /> Compare
            </a>
            {d.merge === 'ready' ? (
              <Link from="/branches" to="." search={{ dialog: 'merge' }} className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4 sm:h-9')}>
                <GitMergeIcon /> Merge into main
              </Link>
            ) : (
              <Button size="lg" className="h-10 px-4 sm:h-9" disabled title={d.merge === 'sandbox' ? 'Sandbox branches can’t be merged' : 'Nothing to merge yet'}>
                <GitMergeIcon /> Merge into main
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="px-4 pt-5 pb-2 lg:px-7">
        <BranchGraph name={d.name} graph={d.graph} commits={d.commits} />
      </div>

      <div className="grid grid-cols-1 gap-7 px-4 pt-3 pb-6 lg:grid-cols-2 lg:px-7">
        <div className="flex flex-col">
          <Eyebrow className="pb-1">{d.merge === 'protected' ? 'Protection' : 'Pre-merge checks'}</Eyebrow>
          {d.merge === 'protected' ? (
            <>
              <CheckRow check={{ state: 'pass', label: 'Direct writes blocked', detail: 'Changes arrive only through signed merges' }} />
              <CheckRow check={{ state: 'pass', label: 'Signed approval required', detail: 'Approvers: Gareth, Sam R.' }} last />
            </>
          ) : d.checks.length ? (
            d.checks.map((c, i) => <CheckRow key={c.label} check={c} last={i === d.checks.length - 1} />)
          ) : (
            <EmptyState title="No checks yet" className="mt-2">
              Checks run on the first commit to this branch.
            </EmptyState>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-[22px]">
          <div id="changes" className="flex scroll-mt-4 flex-col gap-2">
            <Eyebrow>Table changes</Eyebrow>
            {d.tableChanges.length ? (
              <div className="overflow-hidden rounded-[10px] border border-border-card">
                {d.tableChanges.map((t, i) => (
                  <React.Fragment key={t.table}>
                    <div className={cn('flex items-center gap-2.5 px-3.5 py-3', i > 0 && 'border-t border-line-soft', t.diff && 'border-b border-line-soft')}>
                      <LayerSwatch layer={t.layer} />
                      <Link to="/assets/$assetId" params={{ assetId: t.table }} className="min-w-0 truncate font-mono text-[12.5px] text-foreground hover:text-link">
                        {t.table}
                      </Link>
                      <span className="ml-auto shrink-0 font-mono text-xs text-ok-text">{t.rows}</span>
                    </div>
                    {t.diff ? (
                      <div className="overflow-x-auto py-1.5 font-mono text-xs leading-[22px]" aria-label="Schema diff">
                        {t.diff.map((l) => (
                          <div
                            key={l.text}
                            className={cn(
                              'border-l-2 px-3.5 pl-3 whitespace-pre',
                              l.kind === 'del' ? 'border-bad bg-bad-wash text-bad-ink' : 'border-ok bg-ok-soft text-ok-ink',
                            )}
                          >
                            <span className="sr-only">{l.kind === 'del' ? 'Removed: ' : 'Added: '}</span>
                            {l.text}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <EmptyState title={d.merge === 'protected' ? 'This is main' : 'No changes yet'}>
                {d.merge === 'protected' ? 'Pick a branch to see what it changes.' : 'Nothing has been written to this branch.'}
              </EmptyState>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Eyebrow className="pb-1.5">Commits</Eyebrow>
            {d.commits.length ? (
              d.commits.map((c, i) => (
                <div key={c.id} className={cn('flex gap-3 py-2', i < d.commits.length - 1 && 'border-b border-line-soft')}>
                  <span className="w-16 shrink-0 font-mono text-[12.5px] text-branch">{c.id}</span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm">{c.message}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {c.who} · {c.ago}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <span className="py-2 text-[13px] text-muted-foreground">No commits yet</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CheckRow({ check: c, last }: { check: MergeCheck; last?: boolean }) {
  const Icon = c.state === 'pass' ? CircleCheckIcon : c.state === 'fail' ? CircleXIcon : CircleDashedIcon
  return (
    <div className={cn('flex items-center gap-3 py-3 text-sm', !last && 'border-b border-line-soft')}>
      <Icon
        className={cn('size-[18px] shrink-0', c.state === 'pass' ? 'text-ok' : c.state === 'fail' ? 'text-bad' : 'text-warn')}
        aria-label={c.state === 'pass' ? 'Passed' : c.state === 'fail' ? 'Failed' : 'Running'}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span>{c.label}</span>
        {c.detailMono ? (
          <span className="text-[13px] text-muted-foreground">
            <Mono className="text-xs">{c.detailMono[0]}</Mono> → <Mono className="text-xs">{c.detailMono[1]}</Mono>
          </span>
        ) : c.detail ? (
          <span className="text-[13px] text-muted-foreground">{c.detail}</span>
        ) : null}
        {c.progress ? (
          <div className="mt-1 flex items-center gap-2.5">
            <div
              className="relative h-[5px] flex-1 rounded-[3px] bg-soft"
              role="progressbar"
              aria-label={c.label}
              aria-valuenow={c.progress.done}
              aria-valuemax={c.progress.total}
            >
              <div className="absolute inset-y-0 left-0 rounded-[3px] bg-warn" style={{ width: `${(c.progress.done / c.progress.total) * 100}%` }} />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {c.progress.done} / {c.progress.total}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
