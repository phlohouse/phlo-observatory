import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { FileTextIcon, GitBranchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mono, RichText } from '@/components/phlo/status'
import { Timeline, TimelineComment, TimelineItem } from '@/components/phlo/timeline'
import type { Tone } from '@/lib/data/types'
import type { ActivityEntry, CodeDiff, LineageGraphData, LineageTone, RunRow } from '@/lib/data/fixtures/incidents'

/* ---------- Layout ---------- */

/**
 * Incident detail layout. Desktop: a fixed-width summary column on the left and a tabbed
 * pane on the right, each scrolling on its own. Phones: one column, the tabs below the summary.
 */
export function DetailSplit({ side, children }: { side: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <section
        aria-label="Summary"
        className="flex shrink-0 flex-col border-line lg:w-[420px] lg:overflow-y-auto lg:border-r xl:w-[500px]"
      >
        {side}
      </section>
      <section className="flex min-w-0 flex-1 flex-col border-t border-line lg:min-h-0 lg:border-t-0">{children}</section>
    </div>
  )
}

/** Padded block inside the summary column. */
export function SideBlock({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-4 pb-[18px] lg:px-7', className)} {...props} />
}

export function SideDivider() {
  return <div className="mx-4 h-px shrink-0 bg-line lg:mx-7" />
}

/** Tabs for the right-hand pane. Tab state lives in the page. */
export function DetailTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  children,
}: {
  value: T
  onValueChange: (v: T) => void
  tabs: ReadonlyArray<{ value: T; label: string }>
  children: React.ReactNode
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)} className="flex-1">
      <TabsList aria-label="Incident views" className="overflow-x-auto px-3 lg:px-4">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="h-10 shrink-0 lg:h-[30px]">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}

export function DetailTabPanel({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <TabsContent value={value} className={cn('flex flex-col gap-4 px-4 py-5 lg:overflow-y-auto lg:px-6', className)}>
      {children}
    </TabsContent>
  )
}

/** Heading line inside a tab: title, a muted note, and an optional link on the right. */
export function PaneHeading({
  title,
  note,
  link,
  mono,
}: {
  title: React.ReactNode
  note?: React.ReactNode
  link?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className={cn('font-medium', mono ? 'font-mono text-sm' : 'text-[15px]')}>{title}</span>
      {note ? <span className="text-[13px] text-muted-foreground">{note}</span> : null}
      {link ? <span className="ml-auto text-[13px]">{link}</span> : null}
    </div>
  )
}

/* ---------- Small pieces ---------- */

export function Note({ tone, className, children }: { tone: 'ok' | 'info'; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[10px] border px-3.5 py-3 text-[13.5px] leading-normal',
        tone === 'ok' ? 'border-ok-line bg-ok-wash text-ok-ink' : 'border-primary-line bg-primary-soft text-primary-ink',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ToneBadge({ tone, children, className }: { tone: Tone | 'outline'; children: React.ReactNode; className?: string }) {
  return (
    <Badge variant={tone} className={className}>
      {children}
    </Badge>
  )
}

/** Text with `mono` spans; the first mono span becomes a link when `href` is given. */
export function LinkedRichText({ text, href }: { text: string; href?: string }) {
  if (!href) return <RichText text={text} />
  let linked = false
  return (
    <span>
      {text.split('`').map((p, i) => {
        if (i % 2 === 0) return <React.Fragment key={i}>{p}</React.Fragment>
        if (!linked) {
          linked = true
          return (
            <Link key={i} to={href}>
              <Mono>{p}</Mono>
            </Link>
          )
        }
        return <Mono key={i}>{p}</Mono>
      })}
    </span>
  )
}

/* ---------- Code ---------- */

const codeToken = /("[^"]*"|'[^']*'|@dlt\.resource|\bdef\b|\byield from\b|\bSELECT\b|\bFROM\b|\bFOR VERSION AS OF\b|\bWHERE\b)/g

export function Highlight({ text }: { text: string }) {
  return (
    <>
      {text.split(codeToken).map((p, i) => {
        if (i % 2 === 0) return <React.Fragment key={i}>{p}</React.Fragment>
        const str = p.startsWith('"') || p.startsWith("'")
        return (
          <span key={i} className={str ? 'text-ok-text' : 'text-code-kw'}>
            {p}
          </span>
        )
      })}
    </>
  )
}

/** A suggested or merged code change, as a small diff with line numbers. */
export function CodeDiffBlock({ diff }: { diff: CodeDiff }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border-card bg-card">
      <div className="flex h-[38px] items-center gap-2 border-b border-line px-3.5">
        <FileTextIcon className="size-3.5 shrink-0 text-text-2" aria-hidden />
        <span className="truncate font-mono text-[12.5px] text-text-2">{diff.file}</span>
        <Badge variant={diff.badge.tone} size="sm" className="ml-1">
          {diff.badge.label}
        </Badge>
        {diff.openHref ? (
          <Link to={diff.openHref} className="ml-auto text-[13px]">
            Open
          </Link>
        ) : null}
      </div>
      <div className="overflow-x-auto py-1.5 font-mono text-[12.5px] leading-[22px] text-text-2">
        <div className="min-w-max">
          {diff.lines.map((l, i) => (
            <div
              key={i}
              className={cn(
                'flex px-3.5',
                l.op === '-' && 'border-l-2 border-bad bg-bad-wash pl-3 text-bad-ink',
                l.op === '+' && 'border-l-2 border-ok bg-ok-soft pl-3 text-ok-ink',
              )}
            >
              <span
                className={cn(
                  'w-7 shrink-0 text-faint select-none',
                  l.op === '-' && 'text-bad-text',
                  l.op === '+' && 'text-ok-text',
                )}
              >
                {l.n}
              </span>
              {l.op !== ' ' ? <span className="sr-only">{l.op === '-' ? 'Removed: ' : 'Added: '}</span> : null}
              <span className="pr-4 whitespace-pre">{l.op === ' ' ? <Highlight text={l.text} /> : l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Activity ---------- */

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Timeline>
      {entries.map((e, i) =>
        e.kind === 'comment' ? (
          <TimelineComment key={i} initials={e.initials} name={e.name} when={e.when} tone={e.avatarTone}>
            {e.text}
          </TimelineComment>
        ) : (
          <TimelineItem
            key={i}
            tone={e.tone}
            ring={e.ring}
            compact={!e.text && !e.diff}
            icon={e.branch ? <GitBranchIcon className="size-3 text-branch" strokeWidth={2} aria-hidden /> : undefined}
            meta={<LinkedRichText text={e.meta} href={e.href} />}
          >
            {e.text || e.diff ? (
              <div className="flex flex-col gap-2">
                {e.text ? <RichText text={e.text} /> : null}
                {e.diff ? <CodeDiffBlock diff={e.diff} /> : null}
              </div>
            ) : null}
          </TimelineItem>
        ),
      )}
    </Timeline>
  )
}

/* ---------- Runs ---------- */

export function RunsTable({ rows, mode }: { rows: RunRow[]; mode: 'run' | 'job' }) {
  return (
    <div className="-mx-4 overflow-x-auto lg:mx-0">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            {mode === 'run' ? <TableHead>Run</TableHead> : <TableHead>Time</TableHead>}
            {mode === 'run' ? <TableHead>Started</TableHead> : <TableHead>Job</TableHead>}
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {mode === 'run' ? (
                <>
                  <TableCell className={cn('font-mono text-[12.5px] whitespace-nowrap', r.muted && 'text-muted-foreground')}>{r.id}</TableCell>
                  <TableCell className="text-[13px] whitespace-nowrap text-muted-foreground">{r.when}</TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-mono text-[12.5px] whitespace-nowrap text-muted-foreground">{r.when}</TableCell>
                  <TableCell className="font-mono text-[12.5px] whitespace-nowrap">{r.job}</TableCell>
                </>
              )}
              <TableCell className={cn('font-mono text-[12.5px] whitespace-nowrap', (r.muted || mode === 'job') && 'text-muted-foreground')}>
                {r.duration}
              </TableCell>
              <TableCell>
                <ToneBadge tone={r.status.tone}>{r.status.label}</ToneBadge>
              </TableCell>
              <TableCell className="min-w-[180px] py-2 text-[13px] leading-snug text-muted-foreground">{r.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/* ---------- Lineage ---------- */

const COL = 165
const NODE_W = 139
const NODE_H = 45

const nodeStyle: Record<LineageTone, { fill: string; stroke: string; width?: number; label: string }> = {
  source: { fill: 'var(--sunken)', stroke: 'var(--border)', label: 'var(--muted-foreground)' },
  'origin-bad': { fill: 'var(--bad-wash)', stroke: 'var(--bad)', width: 1.5, label: 'var(--bad-text)' },
  bad: { fill: 'var(--bad-wash)', stroke: 'var(--bad-line)', label: 'var(--bad-text)' },
  'origin-fixed': { fill: 'var(--card)', stroke: 'var(--foreground)', width: 1.5, label: 'var(--muted-foreground)' },
  fresh: { fill: 'var(--card)', stroke: 'var(--border)', label: 'var(--ok-text)' },
  neutral: { fill: 'var(--card)', stroke: 'var(--border)', label: 'var(--muted-foreground)' },
}

/** Column-per-layer lineage graph. Scrolls sideways inside its container on phones. */
export function LineageGraph({ graph }: { graph: LineageGraphData }) {
  const width = (graph.columns.length - 1) * COL + NODE_W + 1
  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]))
  return (
    <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <svg
        viewBox={`0 0 ${width} ${graph.height}`}
        role="img"
        aria-label={graph.ariaLabel}
        className="h-auto w-full"
        style={{ minWidth: Math.round(width * 0.86), maxWidth: width }}
      >
        <g fontSize="11" letterSpacing="0.6" style={{ fill: 'var(--muted-foreground)' }}>
          {graph.columns.map((c, i) => (
            <text key={c} x={i * COL} y={12}>
              {c.toUpperCase()}
            </text>
          ))}
        </g>
        <g fill="none" strokeWidth={1.5} style={{ stroke: graph.edgeTone === 'bad' ? 'var(--bad-line)' : 'var(--skip-line)' }}>
          {graph.edges.map(([a, b]) => {
            const from = byId[a]!
            const to = byId[b]!
            const x1 = from.col * COL + NODE_W + 1
            const y1 = from.y + NODE_H / 2 + 0.5
            const x2 = to.col * COL
            const y2 = to.y + NODE_H / 2 + 0.5
            const mx = (x1 + x2) / 2
            const d = y1 === y2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
            return <path key={a + b} d={d} />
          })}
        </g>
        {graph.nodes.map((n) => {
          const s = nodeStyle[n.tone]
          const x = n.col * COL
          return (
            <g key={n.id}>
              <rect
                x={x + 0.5}
                y={n.y + 0.5}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                strokeWidth={s.width ?? 1}
                style={{ fill: s.fill, stroke: s.stroke }}
              />
              <text x={x + 12} y={n.y + 19} fontSize="10.5" style={{ fill: s.label }}>
                {n.label}
              </text>
              <text
                x={x + 12}
                y={n.y + 35}
                fontSize={n.tone === 'source' ? 12.5 : 10}
                className={n.tone === 'source' ? undefined : 'font-mono'}
                style={{ fill: 'var(--foreground)' }}
              >
                {n.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
