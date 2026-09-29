import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  CircleCheckIcon,
  DownloadIcon,
  GitBranchIcon,
  Loader2Icon,
  PlayIcon,
  PlusIcon,
  TableIcon,
} from 'lucide-react'
import {
  cancelQuery,
  deleteSavedQuery,
  explainQuery,
  exportQueryCsv,
  getQuerySession,
  getQueryWorkspace,
  saveQuery,
  submitQuery,
  updateSavedQuery,
  type SavedQuery,
  type QuerySession,
} from '@/lib/data/api/query'
import { CatalogTree } from '@/components/query/catalog-tree'
import { SqlEditor } from '@/components/query/sql-editor'
import { PlanView, ResultsGrid } from '@/components/query/result-views'
import { EmptyState } from '@/components/phlo/states'
import { Dot, Mono } from '@/components/phlo/status'
import { Button, buttonVariants } from '@/components/ui/button'
import { Segmented } from '@/components/ui/toggle-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/query')({
  validateSearch: (search: Record<string, unknown>): { env?: 'staging' } => ({
    ...(search.env === 'staging' ? { env: 'staging' } : {}),
  }),
  loaderDeps: ({ search }) => ({ env: search.env ?? ('prod' as const) }),
  loader: ({ deps }) => getQueryWorkspace({ data: { env: deps.env } }),
  head: () => ({ meta: [{ title: 'Query · phlo' }] }),
  component: QueryPage,
})

type View = 'results' | 'plan'
type RunState = 'idle' | 'running' | 'complete' | 'failed' | 'cancelled'
interface Tab {
  id: string
  name: string
  sql: string
  run: RunState
  session?: QuerySession
  savedVersion?: number
}

function QueryPage() {
  const data = Route.useLoaderData()
  const [tabs, setTabs] = React.useState<Tab[]>([
    { id: 'query-1', name: 'Untitled 1', sql: '', run: 'idle' },
  ])
  const [savedQueries, setSavedQueries] = React.useState<SavedQuery[]>(data.saved)
  const [activeId, setActiveId] = React.useState('query-1')
  const [view, setView] = React.useState<View>('results')
  const [selected, setSelected] = React.useState('')
  const [treeOpen, setTreeOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const tab = tabs.find((item) => item.id === activeId) ?? tabs[0]!
  const result = tab.session?.result ?? null
  const patch = (id: string, values: Partial<Tab>) =>
    setTabs((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)))

  const run = async (explain = false) => {
    if (!tab.sql.trim() || tab.run === 'running') return
    const id = tab.id
    setError(null)
    setView(explain ? 'plan' : 'results')
    patch(id, { run: 'running', session: undefined })
    try {
      let session = await (explain ? explainQuery : submitQuery)({
        data: { env: data.env, sql: tab.sql },
      })
      patch(id, { session })
      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (!['queued', 'running', 'cancelling'].includes(session.status)) break
        await new Promise((resolve) => setTimeout(resolve, 500))
        session = await getQuerySession({ data: { env: data.env, id: session.id } })
        patch(id, { session })
      }
      if (session.status === 'completed') patch(id, { run: 'complete', session })
      else if (session.status === 'cancelled') patch(id, { run: 'cancelled', session })
      else if (session.status === 'failed') {
        patch(id, { run: 'failed', session })
        setError(session.error ?? 'The query failed.')
      }
    } catch (cause) {
      patch(id, { run: 'failed' })
      setError(cause instanceof Error ? cause.message : 'The query request failed.')
    }
  }

  const stop = async () => {
    const sessionId = tab.session?.id
    if (!sessionId) return
    try {
      const session = await cancelQuery({ data: { env: data.env, id: sessionId } })
      patch(tab.id, { session })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The cancellation request failed.')
    }
  }

  const openSaved = (id: string) => {
    setTreeOpen(false)
    const existing = tabs.find((item) => item.id === id)
    if (!existing) {
      const query = savedQueries.find((item) => item.id === id)
      if (!query) return
      setTabs((current) => [...current, { id, name: query.name, sql: query.sql, run: 'idle', savedVersion: query.version }])
    }
    setActiveId(id)
  }

  const newTab = () => {
    const id = `query-${crypto.randomUUID()}`
    const suffix = selected ? `\nFROM ${selected}\nLIMIT 100;` : ''
    setTabs((current) => [...current, { id, name: `Untitled ${current.length + 1}`, sql: `SELECT *${suffix}`, run: 'idle' }])
    setActiveId(id)
  }

  const save = async () => {
    const name = window.prompt('Name this saved query', tab.name)
    if (!name?.trim()) return
    try {
      const saved = tab.savedVersion
        ? await updateSavedQuery({
            data: {
              env: data.env,
              id: tab.id,
              expectedVersion: tab.savedVersion,
              name,
              sql: tab.sql,
              idempotencyKey: crypto.randomUUID(),
            },
          })
        : await saveQuery({
            data: {
              env: data.env,
              name,
              sql: tab.sql,
              idempotencyKey: crypto.randomUUID(),
            },
          })
      setTabs((current) => current.map((item) => (item.id === tab.id ? { ...item, id: saved.id, name: saved.name, savedVersion: saved.version } : item)))
      setSavedQueries((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      setActiveId(saved.id)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The query could not be saved.')
    }
  }

  const deleteSaved = async (id: string) => {
    const saved = savedQueries.find((item) => item.id === id)
    if (!saved || !window.confirm(`Delete saved query “${saved.name}”?`)) return
    try {
      await deleteSavedQuery({
        data: { env: data.env, id, expectedVersion: saved.version, idempotencyKey: crypto.randomUUID() },
      })
      setSavedQueries((current) => current.filter((item) => item.id !== id))
      setTabs((current) => current.map((item) => item.id === id ? { ...item, id: `query-${crypto.randomUUID()}`, name: `Untitled ${current.length}`, savedVersion: undefined } : item))
      setActiveId((current) => current === id ? 'query-1' : current)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The saved query could not be deleted.')
    }
  }

  const downloadCsv = async () => {
    const sessionId = tab.session?.id
    if (!sessionId) return
    try {
      const csv = await exportQueryCsv({ data: { env: data.env, id: sessionId } })
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${tab.name.replace(/[^\w-]+/g, '_')}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The CSV export failed.')
    }
  }

  const tree = (
    <CatalogTree
      catalog={data.catalog}
      saved={savedQueries}
      selected={selected}
      onSelect={setSelected}
      onOpenSaved={openSaved}
      onDeleteSaved={deleteSaved}
      activeSaved={tab.id}
    />
  )

  return (
    <>
      <header className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line px-4 py-2.5 lg:flex-nowrap lg:py-0 lg:pl-5">
        <h1 className="m-0 mr-1.5 text-sm font-medium">Query</h1>
        <div role="tablist" aria-label="Open queries" className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:min-w-0 lg:px-0">
          {tabs.map((item) => {
            const active = item.id === tab.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  'flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] whitespace-nowrap lg:h-[30px]',
                  active ? 'border-border bg-soft text-foreground' : 'border-transparent text-text-3 hover:bg-soft',
                )}
              >
                {active ? <Dot tone="info" size="md" /> : null}
                {item.name}
              </button>
            )
          })}
          <button type="button" aria-label="New query tab" onClick={newTab} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-3 hover:bg-soft lg:size-[30px]">
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
          <span className={cn(buttonVariants({ variant: 'outline' }), 'h-10 max-w-[220px] lg:h-8')} title={`Ref: ${data.nessieRef}`}>
            <GitBranchIcon className="text-branch" />
            <span className="truncate font-mono text-[12.5px]">{data.nessieRef}</span>
          </span>
          <span className="hidden text-xs text-muted-foreground md:inline" aria-label="Configured query engine">
            {data.engines.filter((engine) => engine.status === 'configured').map((engine) => engine.id).join(', ') || 'No engine available'}
          </span>
          <Button variant="outline" className="hidden sm:inline-flex" onClick={save} disabled={!tab.sql.trim()}>
            Save
          </Button>
          {tab.run === 'running' ? (
            <Button variant="outline" onClick={stop} className="h-10 lg:h-8">Cancel</Button>
          ) : null}
          <Button onClick={() => run()} disabled={!tab.sql.trim() || tab.run === 'running'} className="h-10 lg:h-8">
            {tab.run === 'running' ? <Loader2Icon className="animate-spin" /> : <PlayIcon className="size-3 fill-current" />}
            Run
            <span className="hidden font-mono text-[11px] opacity-80 sm:inline">⌘↵</span>
          </Button>
          <Button variant="outline" onClick={() => run(true)} disabled={!tab.sql.trim() || tab.run === 'running'} className="hidden h-10 lg:inline-flex lg:h-8">
            Explain
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
            onRun={() => run()}
            catalog={data.catalog}
            label={`SQL for ${tab.name}`}
            className="h-[264px] shrink-0 lg:h-[328px]"
          />
          <StatusBar tab={tab} refName={data.nessieRef} />
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2">
            <Segmented
              aria-label="Result view"
              value={view}
              onValueChange={setView}
              options={[
                { value: 'results', label: result ? `Results · ${result.rows.length}` : 'Results' },
                { value: 'plan', label: 'Plan' },
              ]}
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="h-10 sm:h-[30px]" disabled={tab.session?.status !== 'completed'} onClick={downloadCsv}>
                <DownloadIcon /> CSV
              </Button>
            </div>
          </div>
          <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-0">
            {error ? (
              <div role="alert" className="m-4 rounded-lg border border-bad-line bg-bad-wash px-3.5 py-3 text-sm text-bad-ink">{error}</div>
            ) : tab.run === 'running' ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Running on <Mono>{data.nessieRef}</Mono>…
              </div>
            ) : !result ? (
              <div className="p-4">
                <EmptyState title={tab.run === 'failed' ? 'Query failed' : tab.run === 'cancelled' ? 'Query cancelled' : 'Not run yet'} icon={<PlayIcon className="size-3" />}>
                  {tab.run === 'idle' ? <>Press Run or <Mono>⌘↵</Mono> to query the configured ref.</> : 'No results are available for this query.'}
                </EmptyState>
              </div>
            ) : view === 'results' ? (
              <ResultsGrid result={result} />
            ) : (
              <PlanView result={result} />
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function StatusBar({ tab, refName }: { tab: Tab; refName: string }) {
  return (
    <div role="status" className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-y border-line bg-raised px-4 py-2 text-[12.5px] text-muted-foreground lg:flex-nowrap lg:py-0">
      {tab.run === 'running' ? (
        <span className="flex items-center gap-1.5"><Loader2Icon className="size-3.5 animate-spin" /> Running…</span>
      ) : tab.run === 'complete' ? (
        <span className="flex items-center gap-1.5 text-ok-text"><CircleCheckIcon className="size-3.5" />{tab.session?.result?.rows.length ?? 0} rows returned</span>
      ) : tab.run === 'failed' ? (
        <span className="text-bad-ink">Query failed</span>
      ) : tab.run === 'cancelled' ? (
        <span>Query cancelled</span>
      ) : (
        <span>Not run yet</span>
      )}
      <span>on <Mono className="text-xs">{refName}</Mono></span>
    </div>
  )
}
