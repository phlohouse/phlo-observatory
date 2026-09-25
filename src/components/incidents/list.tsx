import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CheckIcon, ChevronRightIcon, PlusIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import { Eyebrow } from '@/components/phlo/page'
import { Dot, IncidentStatusText, IncidentTile, LayerLabel, SeverityBadge } from '@/components/phlo/status'
import type { Incident, Severity } from '@/lib/data/types'

/* ---------- Sorting + filters ---------- */

const sevRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

/** "52 min" / "5 h" / "1 d" → minutes. */
export function ageMinutes(age: string) {
  const m = /([\d.]+)\s*(min|m|h|d)/.exec(age)
  if (!m) return 0
  const n = Number(m[1])
  return m[2] === 'd' ? n * 1440 : m[2] === 'h' ? n * 60 : n
}

export function sortIncidents(list: Incident[]) {
  return [...list].sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || ageMinutes(a.age) - ageMinutes(b.age))
}

export type FilterKey = 'severity' | 'kind' | 'layer' | 'owner'
export type Filters = Partial<Record<FilterKey, string>>

export const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export function applyFilters(list: Incident[], f: Filters) {
  return list.filter((i) => (Object.keys(f) as FilterKey[]).every((k) => !f[k] || i[k] === f[k]))
}

/** Dashed "+ Severity" chip; once a value is picked it turns solid and gets a clear button. */
export function FilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: string[]
  onChange: (v: string | undefined) => void
}) {
  const active = value !== undefined
  return (
    <span
      className={cn(
        'inline-flex h-10 items-center rounded-full border text-[13px] sm:h-[30px]',
        active ? 'border-foreground bg-foreground text-background' : 'border-dashed border-skip-line bg-card text-text-2',
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'inline-flex h-full cursor-pointer items-center gap-1.5 rounded-full px-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            active && 'pr-1.5',
          )}
        >
          {active ? (
            <>
              {label} <span className="opacity-75">·</span> {cap(value)}
            </>
          ) : (
            <>
              <PlusIcon className="size-3" aria-hidden /> {label}
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {options.map((o) => (
            <DropdownMenuItem key={o} onClick={() => onChange(o === value ? undefined : o)}>
              <CheckIcon className={cn('size-3.5', o === value ? 'text-primary' : 'invisible')} aria-hidden />
              {cap(o)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {active ? (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={() => onChange(undefined)}
          className="mr-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-background/15 sm:size-5"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  )
}

/* ---------- Rows ---------- */

const sevText: Record<Severity, string> = { high: 'text-bad-text', medium: 'text-warn-ink', low: 'text-text-3' }

const gridCols =
  'md:grid md:items-center md:gap-x-4 md:grid-cols-[56px_minmax(0,1fr)_76px_150px_60px] xl:grid-cols-[62px_minmax(0,1fr)_92px_84px_160px_110px_70px]'

/** Header row of the desktop table (md and up). */
export function IncidentTableHead() {
  return (
    <div
      aria-hidden
      className={cn('hidden h-9 border-b border-line bg-raised px-4 text-xs tracking-wide text-muted-foreground lg:px-5', gridCols)}
    >
      <span>ID</span>
      <span>Incident</span>
      <span className="hidden xl:block">Layer</span>
      <span>Severity</span>
      <span>Status</span>
      <span className="hidden xl:block">Owner</span>
      <span className="text-right">Opened</span>
    </div>
  )
}

function rowLabel(i: Incident) {
  const status = i.status === 'resolved' ? i.resolvedIn : i.status
  return `#${i.id} ${i.title}, ${i.severity} severity, ${status}, ${i.status === 'resolved' ? `resolved ${i.resolvedAgo} ago` : `opened ${i.age} ago`}`
}

/** One incident: a table row from md up, a two-line card on phones. */
export function IncidentRow({ incident: i, last }: { incident: Incident; last?: boolean }) {
  const resolved = i.status === 'resolved'
  return (
    <li>
      <Link
        to="/incidents/$incidentId"
        params={{ incidentId: i.id }}
        aria-label={rowLabel(i)}
        className={cn(
          'hover:bg-raised',
          resolved ? 'text-text-3 hover:text-text-3' : 'text-foreground hover:text-foreground',
          // phone card
          'flex items-start gap-3 py-3 pr-3 pl-3.5',
          !last && 'border-b border-line-soft',
          // desktop grid
          'md:h-12 md:border-b md:border-line-soft md:py-0 md:pr-4 md:pl-4 lg:pr-5 lg:pl-5',
          gridCols,
        )}
      >
        {/* ---- md+ cells ---- */}
        <span className="hidden font-mono text-[12.5px] text-muted-foreground md:block">#{i.id}</span>
        <span className="hidden min-w-0 items-center gap-2.5 md:flex">
          <IncidentTile kind={i.kind} resolved={resolved} size="lg" />
          <span className="truncate text-sm">{i.title}</span>
          <span className="hidden text-[13px] whitespace-nowrap text-muted-foreground lg:inline">{cap(i.kind)}</span>
        </span>
        <span className="hidden xl:flex">
          <LayerLabel layer={i.layer} className={resolved ? 'text-text-3' : undefined} />
        </span>
        <span className={cn('hidden text-[13.5px] md:block', !resolved && sevText[i.severity])}>{cap(i.severity)}</span>
        <span className="hidden min-w-0 md:flex">
          {resolved ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px]">
              <Dot tone="ok" size="md" />
              <span className="truncate">{i.resolvedIn}</span>
            </span>
          ) : (
            <IncidentStatusText status={i.status} />
          )}
        </span>
        <span className="hidden truncate text-[13.5px] xl:block">{i.owner}</span>
        <span className="hidden text-right text-[13px] text-muted-foreground md:block">{resolved ? i.resolvedAgo : i.age}</span>

        {/* ---- phone card ---- */}
        <IncidentTile kind={i.kind} resolved={resolved} size="lg" className="mt-px md:hidden" />
        <span className="flex min-w-0 flex-1 flex-col gap-[5px] md:hidden">
          <span className="truncate text-[15px] font-medium">{i.title}</span>
          <span className="truncate text-[12.5px] text-muted-foreground">
            <span className="font-mono text-xs">#{i.id}</span> · {cap(i.layer)} · {i.owner}
          </span>
          <span className="flex items-center gap-2.5 text-[13px]">
            {resolved ? <Badge variant="outline">{cap(i.severity)}</Badge> : <SeverityBadge severity={i.severity} />}
            {resolved ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-text-2">
                <Dot tone="ok" size="md" />
                <span className="truncate">{i.resolvedIn}</span>
              </span>
            ) : (
              <IncidentStatusText status={i.status} />
            )}
            <span className="ml-auto shrink-0 text-[12.5px] text-muted-foreground">{resolved ? i.resolvedAgo : i.age}</span>
          </span>
        </span>
        <ChevronRightIcon className="mt-[3px] size-3.5 shrink-0 text-faint md:hidden" aria-hidden />
      </Link>
    </li>
  )
}

/** A titled group of rows. Phones get a bordered card; desktop is full-bleed rows. */
export function IncidentGroup({
  title,
  note,
  incidents,
  headed,
}: {
  title: React.ReactNode
  note?: React.ReactNode
  incidents: Incident[]
  /** Show the desktop column header above this group */
  headed?: boolean
}) {
  return (
    <section className="flex flex-col gap-2.5 px-4 pt-3 md:gap-0 md:px-0 md:pt-0">
      <div className={cn('flex items-baseline gap-2 md:px-5', headed ? 'md:hidden' : 'md:pt-[18px] md:pb-2')}>
        <Eyebrow>{title}</Eyebrow>
        {note ? <span className="ml-auto text-[12.5px] text-muted-foreground">{note}</span> : null}
      </div>
      {headed ? <IncidentTableHead /> : null}
      <ul className="m-0 list-none overflow-hidden rounded-xl border border-border-card p-0 md:rounded-none md:border-0">
        {incidents.map((i, idx) => (
          <IncidentRow key={i.id} incident={i} last={idx === incidents.length - 1} />
        ))}
      </ul>
    </section>
  )
}
