import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { SearchIcon, Share2Icon } from 'lucide-react'
import { getAssetList } from '@/lib/data/api/assets'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { DayStrip, Dot, LayerLabel, LayerSwatch, Mono } from '@/components/phlo/status'
import { AssetTagPill, SlaLegend, healthTone } from '@/components/assets/bits'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Asset, Layer } from '@/lib/data/types'

type Search = { layer?: 'bronze' | 'silver' | 'gold'; filter?: 'all' | 'attention'; q?: string }
type ChipKey = 'all' | 'attention' | Layer

export const Route = createFileRoute('/_app/assets/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    layer: s.layer === 'bronze' || s.layer === 'silver' || s.layer === 'gold' ? s.layer : undefined,
    filter: s.filter === 'all' || s.filter === 'attention' ? s.filter : undefined,
    q: typeof s.q === 'string' && s.q ? s.q : undefined,
  }),
  loader: () => getAssetList(),
  head: () => ({ meta: [{ title: 'Assets · phlo' }] }),
  component: AssetsPage,
})

const chips: Array<{ key: ChipKey; label: string; layer?: Layer }> = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'bronze', label: 'Bronze', layer: 'bronze' },
  { key: 'silver', label: 'Silver', layer: 'silver' },
  { key: 'gold', label: 'Gold', layer: 'gold' },
]

/** Desktop grid: name · layer · freshness · last · rows · size · owner · 7 days */
const gridCols = 'grid grid-cols-[minmax(250px,2.4fr)_84px_128px_128px_80px_80px_104px_104px] items-center gap-x-4 px-5'

function AssetsPage() {
  const { assets, totals } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const active: ChipKey = search.layer ?? search.filter ?? 'attention'
  const q = search.q ?? ''

  const rows = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return assets.filter((a) => {
      if (active === 'attention' && a.health === 'ok') return false
      if ((active === 'bronze' || active === 'silver' || active === 'gold') && a.layer !== active) return false
      if (!needle) return true
      return [a.id, a.owner, a.tag?.label ?? ''].some((s) => s.toLowerCase().includes(needle))
    })
  }, [assets, active, q])

  const setQuery = (v: string) => navigate({ search: (p) => ({ ...p, q: v || undefined }), replace: true })
  const pick = (k: ChipKey) =>
    navigate({
      search: (p) => ({
        q: p.q,
        layer: k === 'bronze' || k === 'silver' || k === 'gold' ? k : undefined,
        filter: k === 'all' ? 'all' : undefined,
      }),
    })

  const countLabel = `Showing ${rows.length} of ${totals[active]}`
  const first = rows[0]

  return (
    <>
      <PageHeader
        title="Assets"
        meta={
          <>
            148 Iceberg tables on <Mono>main</Mono>
          </>
        }
        actions={
          <>
            <label className="hidden h-8 w-[280px] items-center gap-2 rounded-lg border border-border bg-raised px-2.5 text-muted-foreground focus-within:border-primary lg:flex">
              <SearchIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">Filter assets</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, owner or tag"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-faint"
              />
            </label>
            {first ? (
              <Link
                to="/assets/$assetId"
                params={{ assetId: first.id }}
                search={{ tab: 'lineage' }}
                className={cn(buttonVariants({ variant: 'outline' }), 'hidden lg:inline-flex')}
              >
                <Share2Icon /> Lineage
              </Link>
            ) : null}
          </>
        }
      />

      {/* Search (phones and tablets) + chips */}
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-line px-4 py-3 lg:px-5 lg:py-3.5">
        <div className="flex flex-col gap-1.5 lg:hidden">
          <label htmlFor="asset-search-m" className="text-[13.5px] font-medium">
            Find a table
          </label>
          <Input
            id="asset-search-m"
            type="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, owner or tag"
            className="h-11 rounded-[10px] border-border-strong text-base"
          />
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Filter tables"
            className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-none lg:px-0"
          >
            {chips.map((c) => {
              const on = c.key === active
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(c.key)}
                  className={cn(
                    'flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap lg:h-[30px] lg:px-3 lg:text-[13px]',
                    on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-text-2 hover:bg-soft',
                  )}
                >
                  {c.layer ? <LayerSwatch layer={c.layer} /> : null}
                  {c.label}
                  <span className={cn('font-mono text-xs', on ? 'opacity-75' : 'text-muted-foreground')}>{totals[c.key]}</span>
                </button>
              )
            })}
          </div>
          <span className="ml-auto hidden text-[13px] text-muted-foreground lg:inline">Sorted by freshness lag</span>
        </div>
      </div>

      {/* Phones: card rows */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3 pb-5 md:hidden">
        <div className="flex items-baseline">
          <Eyebrow>{countLabel}</Eyebrow>
          <span className="ml-auto text-[12.5px] text-muted-foreground">By freshness lag</span>
        </div>
        {rows.length ? (
          <Card className="shrink-0 overflow-hidden">
            {rows.map((a) => (
              <MobileRow key={a.id} asset={a} />
            ))}
          </Card>
        ) : (
          <NoMatch />
        )}
        <SlaLegend prefix="Last 7 days:" className="px-0.5 pt-1 text-[12.5px]" />
      </div>

      {/* Tablet and desktop: table, scrolls sideways inside the panel if it must */}
      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <div className="min-h-0 flex-1 overflow-auto">
          <div role="table" aria-label="Assets" className="min-w-[1040px]">
            <div role="row" className={cn(gridCols, 'sticky top-0 z-10 h-[38px] bg-raised text-xs tracking-wide text-muted-foreground')}>
              <span role="columnheader">Asset</span>
              <span role="columnheader">Layer</span>
              <span role="columnheader">Freshness</span>
              <span role="columnheader">Last materialized</span>
              <span role="columnheader" className="text-right">
                Rows
              </span>
              <span role="columnheader" className="text-right">
                Size
              </span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">Last 7 days</span>
            </div>
            {rows.map((a) => (
              <DesktopRow key={a.id} asset={a} />
            ))}
            {rows.length === 0 ? (
              <div className="p-5">
                <NoMatch />
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex h-11 shrink-0 items-center border-t border-line px-5 text-[13px] text-muted-foreground">
          <span>{countLabel}</span>
          <SlaLegend className="ml-auto" />
        </div>
      </div>
    </>
  )
}

function DesktopRow({ asset: a }: { asset: Asset }) {
  return (
    <div role="row" className={cn(gridCols, 'h-[46px] border-b border-line-soft hover:bg-raised')}>
      <div role="cell" className="flex min-w-0 items-center gap-2.5">
        <Dot tone={healthTone[a.health]} size="md" />
        <Link
          to="/assets/$assetId"
          params={{ assetId: a.id }}
          className="truncate font-mono text-[13px] text-foreground hover:text-link"
        >
          {a.id}
        </Link>
        {a.tag ? <AssetTagPill tag={a.tag} /> : null}
      </div>
      <div role="cell">
        <LayerLabel layer={a.layer} />
      </div>
      <div role="cell" className={cn('font-mono text-[13px]', a.health === 'stale' ? 'text-bad-text' : 'text-text-2')}>
        {a.lag}
      </div>
      <div role="cell" className="text-[13px] text-muted-foreground">
        {a.lastMaterialized}
      </div>
      <div role="cell" className="text-right font-mono text-[13px] text-text-2">
        {a.rows}
      </div>
      <div role="cell" className="text-right font-mono text-[13px] text-text-2">
        {a.size}
      </div>
      <div role="cell" className="truncate text-[13.5px] text-text-2">
        {a.owner}
      </div>
      <div role="cell">
        <DayStrip days={a.days} />
      </div>
    </div>
  )
}

const dayWord = { g: 'met', a: 'late', r: 'breached' } as const

function MobileRow({ asset: a }: { asset: Asset }) {
  return (
    <Link
      to="/assets/$assetId"
      params={{ assetId: a.id }}
      className="flex min-h-[60px] items-center gap-3 border-b border-line-soft px-3.5 py-2.5 text-foreground last:border-b-0 hover:bg-raised hover:text-foreground"
    >
      <Dot tone={healthTone[a.health]} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-mono text-[13px]">{a.id}</span>
        <span className="flex items-center gap-1.5 overflow-hidden text-[12.5px] whitespace-nowrap">
          <LayerSwatch layer={a.layer} />
          <span className="text-text-2">{a.layer[0]!.toUpperCase() + a.layer.slice(1)}</span>
          <span className={cn('font-mono text-xs', a.health === 'stale' ? 'text-bad-text' : 'text-text-2')}>{a.lag}</span>
          {a.tag ? <AssetTagPill tag={a.tag} link={false} className="px-1.5 py-0 text-[11px]" /> : null}
        </span>
      </div>
      <div
        role="img"
        aria-label={`Last 7 days: ${a.days.map((d) => dayWord[d]).join(', ')}`}
        className="flex shrink-0 gap-[3px]"
      >
        {a.days.map((d, i) => (
          <span key={i} className={cn('h-3.5 w-[9px] rounded-[2px]', d === 'g' ? 'bg-sla-ok' : d === 'a' ? 'bg-sla-late' : 'bg-bad')} />
        ))}
      </div>
    </Link>
  )
}

function NoMatch() {
  return (
    <Card className="items-center gap-1.5 px-4 py-6 text-center">
      <div className="text-[15px] font-medium">No tables match</div>
      <div className="text-[13px] text-muted-foreground">Try another name, or pick All.</div>
    </Card>
  )
}
