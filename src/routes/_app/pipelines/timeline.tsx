import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getRunTimeline } from '@/lib/data/api/pipelines'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { ViewSwitch, statusText } from '@/components/pipelines/bits'
import { Segmented } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { RunCode } from '@/lib/data/types'
import type { EventCode, TimelineRow, timeline as timelineFixture } from '@/lib/data/fixtures/pipelines'

type TimelineData = typeof timelineFixture

/**
 * Search: `?scale=N` (dev/testing only, 1–100) repeats the fixture groups N times with suffixed
 * job names (`ingest_lims_2`, …) so the virtualised grid can be checked with 1,000+ rows.
 */
interface Search {
  scale?: number
}

export const Route = createFileRoute('/_app/pipelines/timeline')({
  validateSearch: (s: Record<string, unknown>): Search => {
    const n = Math.floor(Number(s.scale))
    return Number.isFinite(n) && n > 1 ? { scale: Math.min(n, 100) } : {}
  },
  loader: () => getRunTimeline(),
  head: () => ({ meta: [{ title: 'Run timeline · phlo' }] }),
  component: TimelinePage,
})

const cellCls: Record<RunCode, string> = {
  s: 'bg-sla-ok',
  w: 'bg-warn-bar',
  f: 'bg-bad',
  k: 'border border-skip-line',
  p: 'bg-soft',
  n: '',
}
const cellWord: Record<RunCode, string> = { s: 'succeeded', w: 'slow', f: 'failed', k: 'skipped', p: 'paused', n: 'no run' }
const eventCls: Record<EventCode, string> = { '': '', m: 'bg-branch-soft', i: 'bg-bad-soft' }
const patternDot = { bad: 'bg-bad', warn: 'bg-warn-bar', branch: 'bg-branch', ok: 'bg-ok' } as const

/** Cell i starts at 10:00 yesterday + i × 30 min. */
function slotTime(i: number) {
  const m = (10 * 60 + i * 30) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Label column + 48 cells. On phones the whole grid scrolls sideways inside its card. */
const rowGrid = 'grid grid-cols-[148px_minmax(0,1fr)] items-center gap-x-3 lg:grid-cols-[200px_minmax(0,1fr)]'
const cellsGrid = 'grid grid-cols-[repeat(48,minmax(0,1fr))] gap-0.5'

type Group = TimelineData['groups'][number]
type Item =
  | { kind: 'group'; group: Group; open: boolean; first: boolean }
  | { kind: 'row'; row: TimelineRow }
  | { kind: 'more'; n: number }

/** Fixed row heights (px) — the spacing the old flex layout had is folded into each item's top padding. */
const GROUP_GAP = 10 // group mb-1.5 + list gap-1
const ROW_H = 2 + 14 // gap-0.5 + 14px label row
const MORE_H = 2 + 16 // gap-0.5 + text-xs line
const headH = (lg: boolean) => (lg ? 26 : 40) // min-h-10 on phones, 26px on lg

const useIsoLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

function TimelinePage() {
  const { summary, timeline } = Route.useLoaderData()
  const { scale = 1 } = Route.useSearch()
  const [range, setRange] = React.useState<'24h' | '7d'>('24h')
  const [folded, setFolded] = React.useState<Set<string>>(() => new Set(timeline.groups.filter((g) => g.folded).map((g) => g.name)))

  const groups = React.useMemo<Group[]>(
    () =>
      scale <= 1
        ? timeline.groups
        : Array.from({ length: scale }, (_, k) =>
            timeline.groups.map((g) =>
              k === 0 ? g : { ...g, name: `${g.name} · ${k + 1}`, rows: g.rows.map((r) => ({ ...r, name: `${r.name}_${k + 1}` })) },
            ),
          ).flat(),
    [timeline.groups, scale],
  )
  const jobs = summary.jobs * scale

  const shown = groups.reduce((n, g) => n + (folded.has(g.name) ? 0 : g.rows.length), 0)
  const toggle = React.useCallback(
    (name: string) =>
      setFolded((s) => {
        const next = new Set(s)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      }),
    [],
  )

  const items = React.useMemo(() => {
    const out: Item[] = []
    groups.forEach((g, gi) => {
      const open = !folded.has(g.name)
      out.push({ kind: 'group', group: g, open, first: gi === 0 })
      if (!open) return
      for (const r of g.rows) out.push({ kind: 'row', row: r })
      if (g.more) out.push({ kind: 'more', n: g.more })
    })
    return out
  }, [groups, folded])

  /* The grid scrolls with the outer column on phones and with the <section> on lg+. */
  const outerRef = React.useRef<HTMLDivElement>(null)
  const sectionRef = React.useRef<HTMLElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const [isLg, setIsLg] = React.useState(true)
  const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null)
  const [margin, setMargin] = React.useState(0)

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 64rem)')
    const update = () => {
      setIsLg(mq.matches)
      setScrollEl(mq.matches ? sectionRef.current : outerRef.current)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useIsoLayoutEffect(() => {
    const list = listRef.current
    if (!scrollEl || !list) return
    const measure = () => setMargin(list.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scrollEl)
    return () => ro.disconnect()
  }, [scrollEl, range])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: (i) => {
      const it = items[i]!
      return it.kind === 'group' ? (it.first ? 0 : GROUP_GAP) + headH(isLg) : it.kind === 'row' ? ROW_H : MORE_H
    },
    getItemKey: (i) => {
      const it = items[i]!
      return it.kind === 'group' ? `g:${it.group.name}` : it.kind === 'row' ? `r:${it.row.name}` : `m:${i}`
    },
    paddingEnd: 6, // last group's mb-1.5
    overscan: 12,
    scrollMargin: margin,
    // Server render / first paint: pretend a desktop-sized viewport so the first rows are drawn.
    initialRect: { width: 1100, height: 900 },
  })
  React.useEffect(() => virtualizer.measure(), [isLg, virtualizer])

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Pipelines', to: '/pipelines' }]}
        title="Run timeline"
        meta={`${summary.jobs} jobs · last 24 h · each square is 30 minutes`}
        actions={
          <>
            <Segmented
              aria-label="Time range"
              value={range}
              onValueChange={setRange}
              options={[
                { value: '24h', label: '24 h' },
                { value: '7d', label: '7 d' },
              ]}
            />
            <ViewSwitch current="timeline" />
          </>
        }
      />
      <div ref={outerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <section ref={sectionRef} aria-label="Runs by job" className="flex min-w-0 flex-col gap-3 px-4 py-4 lg:flex-1 lg:overflow-y-auto lg:px-5">
          <p className="m-0 text-[12.5px] text-muted-foreground md:hidden">
            {jobs} jobs · last 24 h · each square is 30 minutes. Scroll sideways to see the whole day.
          </p>
          {range === '7d' ? (
            <p className="m-0 text-xs text-muted-foreground lg:relative lg:z-[4]">
              Showing the last 24 h — 7 days comes from the Dagster run history once connected.
            </p>
          ) : null}

          <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0" tabIndex={0} role="region" aria-label="Run timeline grid, scrolls sideways">
            <div className="flex min-w-[720px] flex-col gap-1 lg:min-w-0">
              {/* Time header: sticks to the top of the scrolling column on desktop; the shadow covers the column's top padding */}
              <div className="flex flex-col gap-1 bg-card pb-1.5 lg:sticky lg:top-0 lg:z-[3] lg:shadow-[0_-16px_0_var(--card)]">
                {/* Axis */}
                <div className={cn(rowGrid, 'h-5')} aria-hidden>
                  <span />
                  <div className="relative h-5 font-mono text-[11px] text-muted-foreground">
                    {timeline.axis.map((t, i) => (
                      <span
                        key={t}
                        className="absolute top-0.5"
                        style={i === timeline.axis.length - 1 ? { right: 0 } : { left: `${i * 25}%` }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Events */}
                <div className={cn(rowGrid, 'h-[18px]')}>
                  <span className="sticky left-0 z-[1] bg-card text-[11.5px] text-muted-foreground">Events</span>
                  <div className={cn(cellsGrid, 'h-4')} role="img" aria-label={timeline.eventNotes.map((e) => e.label).join('; ')}>
                    {timeline.events.map((e, i) => (
                      <span key={i} className={cn('rounded-[2px]', eventCls[e])} title={e ? `${slotTime(i)} · ${e === 'm' ? 'planned maintenance' : 'incident #214'}` : undefined} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Groups + jobs, virtualised: only the rows near the viewport are in the DOM */}
              <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((v) => {
                  const it = items[v.index]!
                  return (
                    <div
                      key={v.key}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        height: v.size,
                        transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)`,
                        paddingTop: it.kind === 'group' ? (it.first ? 0 : GROUP_GAP) : 2,
                      }}
                    >
                      {it.kind === 'group' ? (
                        <GroupHeader group={it.group} open={it.open} onToggle={toggle} />
                      ) : it.kind === 'row' ? (
                        <Row row={it.row} />
                      ) : (
                        <div className={rowGrid}>
                          <span className="sticky left-0 bg-card pl-0.5 text-xs text-muted-foreground">+ {it.n} more, all healthy</span>
                          <span />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-3.5 gap-y-1.5 pt-1 text-xs text-muted-foreground">
            <LegendItem cls="bg-sla-ok">Succeeded</LegendItem>
            <LegendItem cls="bg-warn-bar">Slow</LegendItem>
            <LegendItem cls="bg-bad">Failed</LegendItem>
            <LegendItem cls="border border-skip-line">Skipped</LegendItem>
            <LegendItem cls="bg-branch-soft">Planned maintenance</LegendItem>
            <LegendItem cls="bg-bad-soft">Incident</LegendItem>
            <span className="w-full lg:ml-auto lg:w-auto">
              Showing {shown} of {jobs} jobs · the other {jobs - shown} are healthy and folded
            </span>
          </div>
        </section>

        <aside
          aria-labelledby="patterns-h"
          className="flex shrink-0 flex-col border-t border-line bg-raised px-4 py-4 lg:w-[300px] lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-[22px] lg:py-[18px]"
        >
          <Eyebrow id="patterns-h" role="heading" aria-level={2}>
            Patterns across jobs
          </Eyebrow>
          {timeline.patterns.map((p) => (
            <div key={p.title} className="flex flex-col gap-1.5 border-b border-line-soft py-3.5 last:border-b-0">
              <h3 className="m-0 flex items-center gap-2 text-[13.5px] font-medium">
                <span aria-hidden className={cn('size-2 shrink-0 rounded-full', patternDot[p.tone])} />
                {p.title}
              </h3>
              <p className="m-0 text-[12.5px] leading-normal text-text-3">
                {p.text}
                {'incidentId' in p && p.incidentId ? (
                  <>
                    {' '}
                    <Link to="/incidents/$incidentId" params={{ incidentId: p.incidentId }}>
                      #{p.incidentId}
                    </Link>
                    {p.after}
                  </>
                ) : null}
              </p>
            </div>
          ))}
        </aside>
      </div>
    </>
  )
}

const GroupHeader = React.memo(function GroupHeader({
  group: g,
  open,
  onToggle,
}: {
  group: Group
  open: boolean
  onToggle: (name: string) => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => onToggle(g.name)}
      className="sticky left-0 flex min-h-10 w-fit cursor-pointer items-center gap-2 text-left text-[12.5px] font-medium lg:min-h-[26px]"
    >
      <ChevronRightIcon className={cn('size-3 text-faint transition-transform', open && 'rotate-90')} aria-hidden />
      {g.name}
      <span className="text-xs font-normal text-muted-foreground">{open && g.folded ? g.meta.replace(', folded', '') : g.meta}</span>
    </button>
  )
})

const Row = React.memo(function Row({ row: r }: { row: TimelineRow }) {
  const counts = r.cells.reduce<Partial<Record<RunCode, number>>>((acc, c) => {
    if (c !== 'n') acc[c] = (acc[c] ?? 0) + 1
    return acc
  }, {})
  const label = `${r.name}, last 24 h: ${Object.entries(counts)
    .map(([c, n]) => `${n} ${cellWord[c as RunCode]}`)
    .join(', ')}`
  return (
    <div className={rowGrid}>
      <Link
        to="/pipelines/$jobName"
        params={{ jobName: r.name }}
        className={cn(
          'sticky left-0 z-[1] h-3.5 truncate bg-card font-mono text-[11.5px] leading-3.5 hover:text-link',
          r.status === 'ok' ? 'text-text-2' : statusText[r.status],
        )}
      >
        {r.name}
      </Link>
      <div className={cn(cellsGrid, 'h-3')} role="img" aria-label={label}>
        {r.cells.map((c, i) => (
          <span
            key={i}
            className={cn('box-border rounded-[2px]', cellCls[c])}
            title={c === 'n' ? undefined : `${slotTime(i)} · ${cellWord[c]}`}
          />
        ))}
      </div>
    </div>
  )
})

function LegendItem({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('box-border size-2.5 rounded-[2px]', cls)} />
      {children}
    </span>
  )
}
