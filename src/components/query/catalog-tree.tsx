import * as React from 'react'
import { ChevronDownIcon, ChevronRightIcon, SearchIcon, StarIcon } from 'lucide-react'
import { Dot, LayerSwatch } from '@/components/phlo/status'
import { cn } from '@/lib/utils'
import type { CatalogLayer, SavedQuery } from '@/lib/data/fixtures/query'

const row =
  'flex h-7 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-[13px] whitespace-nowrap text-text-2 hover:bg-soft'

/** Catalog browser + saved queries. Expand state lives here; the selected table is lifted. */
export function CatalogTree({
  catalog,
  saved,
  selected,
  onSelect,
  onOpenSaved,
  activeSaved,
  className,
}: {
  catalog: CatalogLayer[]
  saved: SavedQuery[]
  selected: string
  onSelect: (fq: string) => void
  onOpenSaved: (id: string) => void
  activeSaved?: string
  className?: string
}) {
  const [open, setOpen] = React.useState<Set<string>>(() => new Set(['bronze', 'bronze.bioreactor_telemetry']))
  const [q, setQ] = React.useState('')
  const needle = q.trim().toLowerCase()

  const toggle = (key: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  return (
    <div className={cn('flex min-h-0 flex-col gap-0.5', className)}>
      <label className="mb-2 flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border bg-raised px-2.5 text-muted-foreground focus-within:border-primary">
        <SearchIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only">Find a table or column</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a table or column"
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
        />
      </label>

      <ul role="tree" aria-label="Catalog" className="m-0 flex list-none flex-col gap-0.5 p-0">
        {catalog.map((l) => {
          const tables = needle
            ? l.tables.filter((t) => t.name.includes(needle) || t.columns.some((c) => c.name.includes(needle)))
            : l.tables
          if (needle && tables.length === 0) return null
          const lOpen = needle ? true : open.has(l.layer)
          return (
            <li key={l.layer} role="treeitem" aria-expanded={lOpen} aria-selected={false}>
              <button type="button" className={row} onClick={() => toggle(l.layer)}>
                {lOpen ? <ChevronDownIcon className="size-3 shrink-0 text-faint" /> : <ChevronRightIcon className="size-3 shrink-0 text-faint" />}
                <LayerSwatch layer={l.layer} />
                <span className="font-medium text-foreground">{l.layer}</span>
                <span className="ml-auto text-[11.5px] text-muted-foreground">{l.count}</span>
              </button>
              {lOpen ? (
                <ul role="group" className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {tables.map((t) => {
                    const fq = `${l.layer}.${t.name}`
                    const tOpen = needle ? t.columns.some((c) => c.name.includes(needle)) || open.has(fq) : open.has(fq)
                    const on = selected === fq
                    const cols = needle && !t.name.includes(needle) ? t.columns.filter((c) => c.name.includes(needle)) : t.columns
                    return (
                      <li key={fq} role="treeitem" aria-expanded={tOpen} aria-selected={on}>
                        <button
                          type="button"
                          className={cn(row, 'pl-[22px]', on && 'bg-primary-soft text-foreground hover:bg-primary-soft')}
                          onClick={() => {
                            onSelect(fq)
                            toggle(fq)
                          }}
                        >
                          {tOpen ? <ChevronDownIcon className="size-3 shrink-0 text-faint" /> : <ChevronRightIcon className="size-3 shrink-0 text-faint" />}
                          <span className="truncate font-mono text-[12.5px]">{t.name}</span>
                          {t.stale ? (
                            <>
                              <Dot tone="bad" className="ml-auto" />
                              <span className="sr-only">(stale)</span>
                            </>
                          ) : null}
                        </button>
                        {tOpen ? (
                          <ul role="group" className="m-0 flex list-none flex-col gap-0.5 p-0">
                            {cols.map((c) => (
                              <li key={c.name} role="treeitem" aria-selected={false} className="flex h-7 items-center gap-1.5 rounded-md pr-2 pl-11 text-[13px] whitespace-nowrap text-text-2">
                                <span className="truncate font-mono text-xs">{c.name}</span>
                                <span className="ml-auto font-mono text-[11px] text-faint">{c.type}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="px-2 pt-[18px] pb-1.5 text-xs tracking-[0.02em] text-muted-foreground" id="saved-queries">
        Saved queries
      </div>
      <ul aria-labelledby="saved-queries" className="m-0 flex list-none flex-col gap-0.5 p-0">
        {saved.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={cn(row, activeSaved === s.id && 'text-foreground')}
              aria-current={activeSaved === s.id ? 'true' : undefined}
              onClick={() => onOpenSaved(s.id)}
            >
              {s.starred ? (
                <StarIcon className="size-3 shrink-0 fill-warn text-warn" aria-label="Starred" />
              ) : (
                <span className="w-3 shrink-0" />
              )}
              <span className="truncate">{s.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
