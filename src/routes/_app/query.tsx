import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ChevronDownIcon,
  CircleCheckIcon,
  DownloadIcon,
  GitBranchIcon,
  Loader2Icon,
  PinIcon,
  PlayIcon,
  PlusIcon,
  TableIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { getQueryWorkspace } from '@/lib/data/api/query'
import { CatalogTree } from '@/components/query/catalog-tree'
import { SqlEditor } from '@/components/query/sql-editor'
import { DoChart, PlanView, ResultsGrid } from '@/components/query/result-views'
import { EmptyState } from '@/components/phlo/states'
import { Dot, Mono } from '@/components/phlo/status'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/toggle-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/menu'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ResultRow } from '@/lib/data/fixtures/query'

export const Route = createFileRoute('/_app/query')({
  loader: () => getQueryWorkspace(),
  head: () => ({ meta: [{ title: 'Query · phlo' }] }),
  component: QueryPage,
})

type View = 'results' | 'chart' | 'plan'
type RunState = 'idle' | 'running' | 'done'
interface Tab {
  id: string
  name: string
  sql: string
  run: RunState
}

function QueryPage() {
  const data = Route.useLoaderData()
  const [tabs, setTabs] = React.useState<Tab[]>(() =>
    data.tabs.map((t) => ({ ...t, run: t.id === 'do-trend' ? 'done' : 'idle' })),
  )
  const [activeId, setActiveId] = React.useState(tabs[0]!.id)
  const [view, setView] = React.useState<View>('results')
  const [ref, setRef] = React.useState<string>(data.refs[0]!)
  const [engine, setEngine] = React.useState<string>(data.engines[0]!)
  const [selected, setSelected] = React.useState('bronze.bioreactor_telemetry')
  const [pinned, setPinned] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [treeOpen, setTreeOpen] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0]!
  const isDo = tab.id === 'do-trend'
  const rows: ResultRow[] = isDo && tab.run === 'done' ? data.result.rows : []
  const stats = data.result.stats

  const patch = (id: string, p: Partial<Tab>) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))

  const run = () => {
    const id = tab.id
    patch(id, { run: 'running' })
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => patch(id, { run: 'done' }), 700)
  }

  const openSaved = (id: string) => {
    setTreeOpen(false)
    const existing = tabs.find((t) => t.id === id)
    if (!existing) {
      const s = data.saved.find((q) => q.id === id)
      setTabs((ts) => [...ts, { id, name: s?.name ?? id, sql: data.savedSql[id] ?? '', run: 'idle' }])
    }
    setActiveId(id)
  }

  const newTab = () => {
    const n = tabs.filter((t) => t.id.startsWith('new-')).length + 1
    const id = `new-${n}`
    setTabs((ts) => [...ts, { id, name: `Untitled ${n}`, sql: `SELECT *\nFROM ${selected}\nLIMIT 100;`, run: 'idle' }])
    setActiveId(id)
  }

  const downloadCsv = () => {
    const head = 'minute,vessel_id,ph,do_pct,temp_c,n'
    const body = rows.map((r) => [r.minute, r.vessel, r.ph, r.doPct, r.temp, r.n].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`${head}\n${body}\n`], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${tab.name.replace(/[^\w-]+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tree = (
    <CatalogTree
      catalog={data.catalog}
      saved={data.saved}
      selected={selected}
      onSelect={setSelected}
      onOpenSaved={openSaved}
      activeSaved={tab.id}
    />
  )

  return (
    <>
      {/* Header: same frame as PageHeader, with the open-query tabs beside the title on desktop */}
      <header className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line px-4 py-2.5 lg:flex-nowrap lg:py-0 lg:pl-5">
        <h1 className="m-0 mr-1.5 text-sm font-medium">Query</h1>
        <div
          role="tablist"
          aria-label="Open queries"
          className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:min-w-0 lg:px-0"
        >
          {tabs.map((t) => {
            const on = t.id === tab.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  'flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] whitespace-nowrap lg:h-[30px]',
                  on ? 'border-border bg-soft text-foreground' : 'border-transparent text-text-3 hover:bg-soft',
                )}
              >
                {on ? <Dot tone="info" size="md" /> : null}
                {t.name}
              </button>
            )
          })}
          <button
            type="button"
            aria-label="New query tab"
            onClick={newTab}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-3 hover:bg-soft lg:size-[30px]"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Popover open={treeOpen} onOpenChange={setTreeOpen}>
            <PopoverTrigger className={cn(buttonVariants({ variant: 'outline' }), 'h-10 lg:hidden')}>
              <TableIcon /> Tables
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[70dvh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto p-2.5">
              {tree}
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`Branch: ${ref}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 max-w-[160px] lg:h-8 lg:max-w-none')}>
              <GitBranchIcon className="text-branch" />
              <span className="truncate font-mono text-[12.5px]">{ref}</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Query on</DropdownMenuLabel>
              {data.refs.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setRef(r)}>
                  <span className="font-mono text-[13px]">{r}</span>
                  {r === ref ? <span className="ml-auto text-xs text-muted-foreground">current</span> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`Engine: ${engine}`} className={cn(buttonVariants({ variant: 'outline' }), 'hidden md:inline-flex')}>
              {engine}
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Engine</DropdownMenuLabel>
              {data.engines.map((e) => (
                <DropdownMenuItem key={e} onClick={() => setEngine(e)}>
                  {e}
                  {e === engine ? <span className="ml-auto text-xs text-muted-foreground">current</span> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setSaved(true)}>
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button onClick={run} disabled={tab.run === 'running'} className="h-10 lg:h-8">
            <PlayIcon className="size-3 fill-current" />
            Run
            <span className="hidden font-mono text-[11px] opacity-80 sm:inline">⌘↵</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="Catalog" className="hidden w-[260px] shrink-0 flex-col overflow-y-auto border-r border-line px-2.5 py-3 lg:flex">
          {tree}
        </aside>

        <section aria-label="Workspace" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
          <SqlEditor
            key={tab.id}
            value={tab.sql}
            onChange={(sql) => patch(tab.id, { sql })}
            onRun={run}
            catalog={data.catalog}
            label={`SQL for ${tab.name}`}
            className="h-[264px] shrink-0 lg:h-[328px]"
          />

          <StatusBar tab={tab} isDo={isDo} rows={rows.length} stats={stats} refName={ref} />

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2">
            <Segmented
              aria-label="Result view"
              value={view}
              onValueChange={setView}
              options={[
                { value: 'results', label: rows.length ? `Results · ${rows.length}` : 'Results' },
                { value: 'chart', label: 'Chart' },
                { value: 'plan', label: 'Plan' },
              ]}
            />
            <div className="ml-auto flex gap-2">
              {isDo ? (
                <Button variant="outline" size="sm" className="h-10 sm:h-[30px]" aria-pressed={pinned} onClick={() => setPinned((p) => !p)}>
                  <PinIcon /> {pinned ? 'Pinned to #214' : 'Pin to #214'}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" className="h-10 sm:h-[30px]" disabled={!rows.length} onClick={downloadCsv}>
                <DownloadIcon /> CSV
              </Button>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-0">
            {tab.run === 'running' ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Running on <Mono>{ref}</Mono>…
              </div>
            ) : tab.run === 'idle' ? (
              <div className="p-4">
                <EmptyState title="Not run yet" icon={<PlayIcon className="size-3" />}>
                  Press Run or <Mono>⌘↵</Mono> to query <Mono>{ref}</Mono> with {engine}.
                </EmptyState>
              </div>
            ) : !isDo ? (
              <div className="p-4">
                <EmptyState title={tab.id === 'dupes' ? 'No duplicates found' : 'No rows returned'}>
                  {tab.id === 'dupes'
                    ? 'Every batch_id and test_code pair in silver.qc_results appears once.'
                    : `The query ran on ${ref} and matched nothing.`}
                </EmptyState>
              </div>
            ) : view === 'results' ? (
              <ResultsGrid rows={rows} />
            ) : view === 'chart' ? (
              <DoChart points={data.result.chart} />
            ) : (
              <PlanView plan={data.result.plan} />
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function StatusBar({
  tab,
  isDo,
  rows,
  stats,
  refName,
}: {
  tab: Tab
  isDo: boolean
  rows: number
  stats: { time: string; read: string; files: string; ref: string; snapshot: string; newest: string; behind: string }
  refName: string
}) {
  const sep = <span aria-hidden className="hidden h-3.5 w-px bg-border md:block" />
  return (
    <div
      role="status"
      className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-y border-line bg-raised px-4 py-2 text-[12.5px] text-muted-foreground lg:flex-nowrap lg:py-0"
    >
      {tab.run === 'running' ? (
        <span className="flex items-center gap-1.5">
          <Loader2Icon className="size-3.5 animate-spin" /> Running…
        </span>
      ) : tab.run === 'idle' ? (
        <span>Not run yet</span>
      ) : (
        <span className="flex items-center gap-1.5 text-ok-text">
          <CircleCheckIcon className="size-3.5" />
          {isDo ? `${rows} rows in ${stats.time}` : '0 rows in 0.3 s'}
        </span>
      )}
      {isDo && tab.run === 'done' ? (
        <>
          {sep}
          <span className="hidden sm:inline">
            Read {stats.read} · {stats.files}
          </span>
          {sep}
          <span className="hidden md:inline">
            <Mono className="text-xs">{refName === 'main' ? stats.ref : refName}</Mono> · snapshot <Mono className="text-xs">{stats.snapshot}</Mono>
          </span>
          <Link to="/incidents/$incidentId" params={{ incidentId: '214' }} className="flex items-center gap-1.5 text-warn-ink hover:text-warn-ink hover:underline lg:ml-auto">
            <TriangleAlertIcon className="size-3.5 shrink-0" />
            Newest row is {stats.newest} · table {stats.behind} behind (#214)
          </Link>
        </>
      ) : (
        <>
          {sep}
          <span>
            on <Mono className="text-xs">{refName}</Mono>
          </span>
        </>
      )}
    </div>
  )
}
