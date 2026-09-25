import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRightIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import { getPipelineList } from '@/lib/data/api/pipelines'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { RunLegend, RunStrip } from '@/components/phlo/status'
import { Facet, HealthMix, LinkedIcon, StatusDot, ViewSwitch, statusText } from '@/components/pipelines/bits'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Segmented } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { DomainGroup, ScaleJob, ScaleStatus, SourceName, Team } from '@/lib/data/fixtures/pipelines'

type GroupBy = 'domain' | 'owner' | 'source'
type Search = { by?: GroupBy; q?: string }

export const Route = createFileRoute('/_app/pipelines/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    by: s.by === 'owner' || s.by === 'source' || s.by === 'domain' ? s.by : undefined,
    q: typeof s.q === 'string' && s.q ? s.q : undefined,
  }),
  loader: () => getPipelineList(),
  head: () => ({ meta: [{ title: 'Pipelines · phlo' }] }),
  component: PipelinesPage,
})

const statusFacets: Array<{ value: ScaleStatus; label: string; dot: string }> = [
  { value: 'failing', label: 'Failing', dot: 'bg-bad' },
  { value: 'slow', label: 'Slow', dot: 'bg-warn-bar' },
  { value: 'paused', label: 'Paused', dot: 'bg-skip-line' },
  { value: 'ok', label: 'Healthy', dot: 'bg-ok' },
]
const sourceFacets: SourceName[] = ['Process historian', 'LIMS', 'Plate readers', 'Env sensors', 'ERP · MES', 'Internal']
const teamFacets: Team[] = ['Data platform', 'QC Analytics', 'Process Dev', 'Assay Dev']
type SavedView = 'mine' | 'release'
const savedFacets: Array<{ value: SavedView; label: string }> = [
  { value: 'mine', label: 'My jobs' },
  { value: 'release', label: 'Feeds batch release' },
]

/** Desktop grid: dot · job · domain · why · strip · last run · owner */
const rowGrid =
  'grid grid-cols-[14px_minmax(0,1.3fr)_110px_minmax(0,1.3fr)_148px_70px_96px] items-center gap-x-3 px-4'

interface Group {
  key: string
  name: string
  healthy: ScaleJob[]
  total: number
  attention: Record<Exclude<ScaleStatus, 'ok'>, number>
  note: string
  rate: string
  owner: string
}

function toggle<T>(set: Set<T>, v: T, on: boolean) {
  const next = new Set(set)
  if (on) next.add(v)
  else next.delete(v)
  return next
}

function PipelinesPage() {
  const { summary, jobs, domains } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const by: GroupBy = search.by ?? 'domain'
  const q = search.q ?? ''

  const [statuses, setStatuses] = React.useState<Set<ScaleStatus>>(() => new Set(['failing', 'slow', 'paused', 'ok']))
  const [sources, setSources] = React.useState<Set<SourceName>>(() => new Set())
  const [teams, setTeams] = React.useState<Set<Team>>(() => new Set())
  const [saved, setSaved] = React.useState<Set<SavedView>>(() => new Set())
  const [open, setOpen] = React.useState<Set<string>>(() => new Set())
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  const count = React.useMemo(() => {
    const c = (f: (j: ScaleJob) => boolean) => jobs.filter(f).length
    return {
      status: Object.fromEntries(statusFacets.map((s) => [s.value, c((j) => j.status === s.value)])) as Record<ScaleStatus, number>,
      source: Object.fromEntries(sourceFacets.map((s) => [s, c((j) => j.source === s)])) as Record<SourceName, number>,
      team: Object.fromEntries(teamFacets.map((t) => [t, c((j) => j.team === t)])) as Record<Team, number>,
      saved: { mine: c((j) => !!j.mine), release: c((j) => !!j.release) } as Record<SavedView, number>,
    }
  }, [jobs])

  const visible = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return jobs.filter(
      (j) =>
        statuses.has(j.status) &&
        (sources.size === 0 || sources.has(j.source)) &&
        (teams.size === 0 || teams.has(j.team)) &&
        (!saved.has('mine') || j.mine) &&
        (!saved.has('release') || j.release) &&
        (!needle || j.name.toLowerCase().includes(needle)),
    )
  }, [jobs, statuses, sources, teams, saved, q])

  const attention = React.useMemo(
    () => visible.filter((j) => j.status !== 'ok').sort((a, b) => (a.pin ?? 0) - (b.pin ?? 0)),
    [visible],
  )
  const failing = attention.filter((j) => j.status === 'failing')
  const groups = React.useMemo(() => buildGroups(visible, by, domains), [visible, by, domains])
  const healthyCount = groups.reduce((n, g) => n + g.healthy.length, 0)
  const filtered =
    statuses.size !== 4 || sources.size + teams.size + saved.size > 0 || q.trim() !== ''
  const activeFilters = (4 - statuses.size) + sources.size + teams.size + saved.size

  const setQuery = (v: string) => navigate({ search: (p) => ({ ...p, q: v || undefined }), replace: true })
  const setBy = (v: GroupBy) => {
    setOpen(new Set())
    navigate({ search: (p) => ({ ...p, by: v === 'domain' ? undefined : v }), replace: true })
  }
  const toggleGroup = (key: string) => setOpen((s) => toggle(s, key, !s.has(key)))
  const clearFilters = () => {
    setStatuses(new Set(['failing', 'slow', 'paused', 'ok']))
    setSources(new Set())
    setTeams(new Set())
    setSaved(new Set())
    setQuery('')
  }

  const facets = (
    <>
      <Facet title="Status">
        {statusFacets.map((s) => (
          <FacetItem
            key={s.value}
            checked={statuses.has(s.value)}
            onChange={(on) => setStatuses((x) => toggle(x, s.value, on))}
            count={count.status[s.value]}
          >
            <span aria-hidden className={cn('size-[7px] shrink-0 rounded-full', s.dot)} />
            {s.label}
          </FacetItem>
        ))}
      </Facet>
      <Facet title="Source">
        {sourceFacets.map((s) => (
          <FacetItem key={s} checked={sources.has(s)} onChange={(on) => setSources((x) => toggle(x, s, on))} count={count.source[s]}>
            {s}
          </FacetItem>
        ))}
      </Facet>
      <Facet title="Owner">
        {teamFacets.map((t) => (
          <FacetItem key={t} checked={teams.has(t)} onChange={(on) => setTeams((x) => toggle(x, t, on))} count={count.team[t]}>
            {t}
          </FacetItem>
        ))}
      </Facet>
      <Facet title="Saved views">
        {savedFacets.map((s) => (
          <FacetItem
            key={s.value}
            checked={saved.has(s.value)}
            onChange={(on) => setSaved((x) => toggle(x, s.value, on))}
            count={count.saved[s.value]}
          >
            {s.label}
          </FacetItem>
        ))}
      </Facet>
    </>
  )

  const searchBox = (id: string, className?: string) => (
    <label
      htmlFor={id}
      className={cn(
        'flex h-8 items-center gap-2 rounded-lg border border-border bg-raised px-2.5 text-muted-foreground focus-within:border-primary',
        className,
      )}
    >
      <SearchIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">Find a job</span>
      <input
        id={id}
        type="search"
        autoComplete="off"
        value={q}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a job"
        className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-faint"
      />
    </label>
  )

  const banner = failing.length ? (
    <Link
      to="/incidents/$incidentId"
      params={{ incidentId: '214' }}
      className="flex items-start gap-2.5 rounded-lg border border-bad-line bg-bad-wash px-3 py-2 text-[13px] leading-snug text-bad-ink hover:text-bad-ink hover:border-bad"
    >
      <LinkedIcon className="mt-px" />
      <span className="flex-1">
        All 3 failures read from the process historian<span className="hidden md:inline"> and started within 10 minutes</span>.
        Grouped under <span className="font-medium underline underline-offset-2">#214</span>
        <span className="hidden md:inline"> instead of 3 separate alerts</span>.
      </span>
      <ChevronRightIcon className="mt-0.5 size-3.5 shrink-0 md:hidden" aria-hidden />
    </Link>
  ) : null

  const empty = attention.length === 0 && healthyCount === 0

  return (
    <>
      <PageHeader
        title="Pipelines"
        meta={`${summary.jobs} jobs · ${summary.runs24h} runs in 24 h · ${summary.successRate} succeeded`}
        actions={
          <>
            {searchBox('job-search', 'hidden w-[220px] lg:flex')}
            <span className="hidden text-[13px] text-muted-foreground sm:inline">Group by</span>
            <Segmented
              aria-label="Group healthy jobs by"
              value={by}
              onValueChange={setBy}
              options={[
                { value: 'domain', label: 'Domain' },
                { value: 'owner', label: 'Owner' },
                { value: 'source', label: 'Source' },
              ]}
            />
            <ViewSwitch current="list" />
          </>
        }
      />

      {/* Status strip (tablet and desktop) */}
      <div className="hidden shrink-0 items-center gap-4 border-b border-line px-5 py-3 md:flex">
        <HealthMix
          className="h-2.5 flex-1 gap-0.5 rounded-[4px]"
          label={`${summary.failing} failing, ${summary.slow} slow, ${summary.paused} paused, ${summary.healthy} healthy`}
          parts={[
            { n: summary.failing, cls: 'bg-bad' },
            { n: summary.slow, cls: 'bg-warn-bar' },
            { n: summary.paused, cls: 'bg-skip-line' },
            { n: summary.healthy, cls: 'bg-sla-ok' },
          ]}
        />
        <Legend cls="bg-bad">{summary.failing} failing</Legend>
        <Legend cls="bg-warn-bar">{summary.slow} slow</Legend>
        <Legend cls="bg-skip-line">{summary.paused} paused</Legend>
        <Legend cls="bg-sla-ok" className="text-text-2">
          {summary.healthy} healthy
        </Legend>
      </div>

      {/* Search + filters toggle (below lg) */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-line px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          {searchBox('job-search-m', 'h-10 flex-1')}
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="pipeline-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              'flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13.5px]',
              filtersOpen ? 'border-primary bg-primary-soft text-foreground' : 'border-border bg-raised text-text-2',
            )}
          >
            <SlidersHorizontalIcon className="size-3.5" aria-hidden />
            Filters
            {activeFilters ? <span className="font-mono text-xs text-muted-foreground">{activeFilters}</span> : null}
          </button>
        </div>
        {filtersOpen ? (
          <div id="pipeline-filters" className="grid max-h-[50dvh] grid-cols-1 gap-4 overflow-y-auto overscroll-contain sm:grid-cols-2 [&_label]:h-10">
            {facets}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="Filters" className="hidden w-[216px] shrink-0 flex-col gap-[18px] overflow-y-auto border-r border-line px-2.5 py-3.5 lg:flex">
          {facets}
          {filtered ? (
            <button type="button" onClick={clearFilters} className="cursor-pointer self-start px-1.5 text-[13px] text-link hover:underline">
              Clear filters
            </button>
          ) : null}
        </aside>

        {/* Phones: cards */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3.5 pb-6 md:hidden">
          <Card className="shrink-0 gap-2.5 p-3.5">
            <div className="text-[14.5px] font-medium">
              {summary.jobs} jobs · <span className="text-bad-text">{summary.failing} failing</span> ·{' '}
              <span className="text-warn-ink">{summary.slow} slow</span> · {summary.healthy} healthy
            </div>
            <HealthMix
              className="h-2.5"
              label={`${summary.failing} failing, ${summary.slow} slow, ${summary.paused} paused, ${summary.healthy} healthy`}
              parts={[
                { n: summary.failing, cls: 'bg-bad' },
                { n: summary.slow, cls: 'bg-warn-bar' },
                { n: summary.paused, cls: 'bg-skip-line' },
                { n: summary.healthy, cls: 'bg-sla-ok' },
              ]}
            />
            <div className="text-[12.5px] text-muted-foreground">
              {summary.runs24h} runs in 24 h · {summary.successRate} succeeded · {summary.paused} paused
            </div>
          </Card>

          {attention.length ? (
            <section aria-labelledby="att-h-m" className="flex shrink-0 flex-col gap-2">
              <div className="flex items-baseline">
                <Eyebrow id="att-h-m" role="heading" aria-level={2}>
                  Needs attention · {attention.length}
                </Eyebrow>
                <span className="ml-auto text-[12.5px] text-muted-foreground">Last 24 runs</span>
              </div>
              {banner}
              <Card className="overflow-hidden">
                {attention.map((j) => (
                  <Link
                    key={j.name}
                    to="/pipelines/$jobName"
                    params={{ jobName: j.name }}
                    className="flex items-start gap-2.5 border-b border-line-soft px-3.5 py-3 text-foreground last:border-b-0 hover:bg-raised hover:text-foreground"
                  >
                    <StatusDot status={j.status} className="mt-1.5" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{j.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{j.last} ago</span>
                      </div>
                      <div className={cn('truncate text-[13px]', statusText[j.status])}>{j.reason}</div>
                      <RunStrip runs={j.runs} size="sm" />
                    </div>
                  </Link>
                ))}
              </Card>
              <RunLegend className="gap-x-3.5 gap-y-1.5 px-0.5 text-[12.5px]" />
            </section>
          ) : null}

          {groups.length ? (
            <section aria-labelledby="ok-h-m" className="flex shrink-0 flex-col gap-2">
              <div className="flex items-baseline">
                <Eyebrow id="ok-h-m" role="heading" aria-level={2}>
                  Healthy · {healthyCount} jobs
                </Eyebrow>
                <span className="ml-auto text-[12.5px] text-muted-foreground">{groups.length} groups</span>
              </div>
              <Card className="overflow-hidden">
                {groups.map((g) => {
                  const isOpen = open.has(g.key)
                  return (
                    <div key={g.key} className="border-b border-line-soft last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleGroup(g.key)}
                        className={cn(
                          'flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-2 pr-3.5 pl-2.5 text-left',
                          isOpen && 'bg-raised',
                        )}
                      >
                        <ChevronRightIcon className={cn('size-3.5 shrink-0 text-faint transition-transform', isOpen && 'rotate-90')} aria-hidden />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[14.5px] font-medium">{g.name}</span>
                          <span className="truncate text-[12.5px] text-muted-foreground">
                            {g.healthy.length} jobs · {g.note.toLowerCase()}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">{g.rate}</span>
                          <GroupMix group={g} className="h-1.5 w-14" />
                        </span>
                      </button>
                      {isOpen ? (
                        <div className="bg-raised pr-3.5 pb-2 pl-[34px]">
                          {g.healthy.map((j) => (
                            <Link
                              key={j.name}
                              to="/pipelines/$jobName"
                              params={{ jobName: j.name }}
                              className="flex min-h-11 items-center gap-2.5 border-b border-line-soft text-foreground last:border-b-0 hover:text-link"
                            >
                              <StatusDot status="ok" className="size-[7px]" />
                              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{j.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{j.sched}</span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </Card>
            </section>
          ) : null}
          {empty ? <NoMatch onClear={clearFilters} /> : null}
        </div>

        {/* Tablet and desktop: dense rows */}
        <section aria-label="Jobs" className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-y-auto md:flex">
          <div aria-hidden className={cn(rowGrid, 'sticky top-0 z-10 h-8 shrink-0 border-b border-line-soft bg-raised text-xs text-muted-foreground')}>
            <span />
            <span>Job</span>
            <span>Domain</span>
            <span>Why it's here</span>
            <span>Last 24 runs</span>
            <span className="text-right">
              Last run
            </span>
            <span>Owner</span>
          </div>

          {attention.length ? (
            <>
              <div className="flex items-center gap-2.5 px-4 pt-2.5 pb-2">
                <h2 className="m-0 text-[13.5px] font-medium">Needs attention</h2>
                <span className="text-[13px] text-muted-foreground">
                  {attention.length} {attention.length === 1 ? 'job' : 'jobs'}, pinned to the top
                </span>
              </div>
              {banner ? <div className="mx-4 mb-2">{banner}</div> : null}
              <div>
                {attention.map((j) => (
                  <JobRow key={j.name} job={j} why={j.reason ?? ''} />
                ))}
              </div>
            </>
          ) : null}

          {groups.length ? (
            <>
              <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
                <h2 className="m-0 text-[13.5px] font-medium">Healthy</h2>
                <span className="text-[13px] text-muted-foreground">
                  {healthyCount} jobs in {groups.length} groups, {open.size ? 'click a group to fold it' : 'folded'}
                </span>
              </div>
              {groups.map((g) => {
                const isOpen = open.has(g.key)
                return (
                  <div key={g.key}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleGroup(g.key)}
                      className={cn(rowGrid, 'h-[38px] w-full cursor-pointer border-b border-line-soft text-left text-[13.5px] hover:bg-raised', isOpen && 'bg-raised')}
                    >
                      <ChevronRightIcon className={cn('size-3 text-faint transition-transform', isOpen && 'rotate-90')} aria-hidden />
                      <span className="truncate font-medium">{g.name}</span>
                      <span className="text-[13px] text-muted-foreground">{g.healthy.length} jobs</span>
                      <span className="truncate text-[13px] text-muted-foreground">{g.note}</span>
                      <GroupMix group={g} />
                      <span className="text-right font-mono text-xs text-muted-foreground">{g.rate}</span>
                      <span className="truncate text-[13px] text-muted-foreground">{g.owner}</span>
                    </button>
                    {isOpen ? (
                      <div className="bg-sunken">
                        {g.healthy.map((j) => (
                          <JobRow key={j.name} job={j} why={j.sched} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </>
          ) : null}
          {empty ? (
            <div className="p-4">
              <NoMatch onClear={clearFilters} />
            </div>
          ) : null}
          <div className="mt-auto flex min-h-11 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[13px] text-muted-foreground">
            <span>
              Showing {attention.length + healthyCount} of {summary.jobs}
            </span>
            <RunLegend className="ml-auto" />
          </div>
        </section>
      </div>
    </>
  )
}

function JobRow({ job: j, why }: { job: ScaleJob; why: string }) {
  return (
    <div className={cn(rowGrid, 'h-[30px] border-b border-line-soft text-[13px] hover:bg-raised')}>
      <span>
        <StatusDot status={j.status} />
      </span>
      <span className="min-w-0 truncate">
        <Link to="/pipelines/$jobName" params={{ jobName: j.name }} className="font-mono text-[12.5px] text-foreground hover:text-link">
          {j.name}
        </Link>
      </span>
      <span className="truncate text-muted-foreground">
        {j.domain}
      </span>
      <span className={cn('truncate', j.status === 'ok' ? 'text-muted-foreground' : statusText[j.status])}>
        {why}
      </span>
      <span>
        <RunStrip runs={j.runs} size="sm" />
      </span>
      <span className="text-right whitespace-nowrap text-muted-foreground">
        {j.last}
      </span>
      <span className="truncate text-text-2">
        {j.owner}
      </span>
    </div>
  )
}

function GroupMix({ group: g, className }: { group: Group; className?: string }) {
  const bad = g.attention.failing + g.attention.slow + g.attention.paused
  const badCls = g.attention.failing ? 'bg-bad' : g.attention.slow ? 'bg-warn-bar' : 'bg-skip-line'
  return (
    <HealthMix
      className={className}
      label={`${g.healthy.length} healthy, ${bad} need attention`}
      parts={[
        { n: g.healthy.length, cls: 'bg-sla-ok' },
        { n: bad, cls: badCls },
      ]}
    />
  )
}

function Legend({ cls, children, className }: { cls: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5 text-[13px] whitespace-nowrap', className)}>
      <span aria-hidden className={cn('size-2 rounded-[2px]', cls)} />
      {children}
    </span>
  )
}

function FacetItem({
  checked,
  onChange,
  count,
  children,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  count: number
  children: React.ReactNode
}) {
  return (
    <label className="flex h-7 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[13px] text-text-2 hover:bg-soft">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="size-3.5" />
      {children}
      <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">{count}</span>
    </label>
  )
}

function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <Card className="items-center gap-1.5 px-4 py-6 text-center">
      <div className="text-[15px] font-medium">No jobs match</div>
      <div className="text-[13px] text-muted-foreground">Try another name, or clear the filters.</div>
      <button type="button" onClick={onClear} className="mt-1 min-h-10 cursor-pointer text-[13.5px] text-link hover:underline">
        Clear filters
      </button>
    </Card>
  )
}

/* ---------- Grouping ---------- */

const domainRate = (domains: DomainGroup[], name: string) => Number.parseFloat(domains.find((d) => d.name === name)?.rate ?? '100')

function topNames(xs: string[], n = 2) {
  const tally = new Map<string, number>()
  for (const x of xs) tally.set(x, (tally.get(x) ?? 0) + 1)
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .join(' · ')
}

function groupNote(a: Group['attention']) {
  const parts: string[] = []
  if (a.failing) parts.push(`${a.failing} failing`)
  if (a.slow) parts.push(`${a.slow} slow`)
  if (a.paused) parts.push(`${a.paused} paused`)
  if (!parts.length) return 'All healthy'
  return `Plus ${parts.join(', ')}${a.paused ? '' : ', above'}`
}

function buildGroups(visible: ScaleJob[], by: GroupBy, domains: DomainGroup[]): Group[] {
  const keyOf = (j: ScaleJob) => (by === 'domain' ? j.domain : by === 'owner' ? j.team : j.source)
  const order =
    by === 'domain' ? domains.map((d) => d.name) : by === 'owner' ? (teamFacets as string[]) : (sourceFacets as string[])
  const out: Group[] = []
  for (const key of order) {
    const members = visible.filter((j) => keyOf(j) === key)
    const healthy = members.filter((j) => j.status === 'ok')
    if (!healthy.length) continue
    const attention = {
      failing: members.filter((j) => j.status === 'failing').length,
      slow: members.filter((j) => j.status === 'slow').length,
      paused: members.filter((j) => j.status === 'paused').length,
    }
    const meta = by === 'domain' ? domains.find((d) => d.name === key) : undefined
    const rate = members.reduce((s, j) => s + domainRate(domains, j.domain), 0) / members.length
    out.push({
      key,
      name: key,
      healthy,
      total: members.length,
      attention,
      note: groupNote(attention),
      rate: meta?.rate ?? (rate >= 99.95 ? '100%' : `${rate.toFixed(1)}%`),
      owner: meta?.owner ?? (by === 'owner' ? topNames(members.map((j) => j.domain)) : topNames(members.map((j) => j.team))),
    })
  }
  return out
}
