import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDownIcon, DownloadIcon, PlusIcon, ShieldCheckIcon, XIcon } from 'lucide-react'
import { getAuditLog } from '@/lib/data/api/core'
import { PageHeader } from '@/components/phlo/page'
import { AuditDetail } from '@/components/settings/audit-detail'
import { SettingsFrame } from '@/components/settings/frame'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import type { AuditEvent } from '@/lib/data/types'

export const Route = createFileRoute('/_app/settings/audit-log')({
  loader: () => getAuditLog(),
  head: () => ({ meta: [{ title: 'Audit log · phlo' }] }),
  component: AuditLogPage,
})

const TOTAL = 1284
const rowGrid = 'md:grid md:grid-cols-[92px_132px_minmax(0,1fr)_86px] md:items-center md:gap-x-3.5'
const chip = 'flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap lg:h-[30px]'
const chipOff = 'border-dashed border-skip-line bg-card text-text-2 hover:bg-soft'
const chipOn = 'border-foreground bg-foreground text-background'

function AuditLogPage() {
  const { events } = Route.useLoaderData()
  const [selectedId, setSelectedId] = React.useState(events[0]?.id)
  const [actor, setActor] = React.useState<string | null>(null)
  const [action, setAction] = React.useState<string | null>(null)
  const [signedOnly, setSignedOnly] = React.useState(false)
  const [week, setWeek] = React.useState(true)

  const actors = [...new Set(events.map((e) => e.actor))]
  const actions = [...new Set(events.map((e) => e.action))]
  const rows = events.filter(
    (e) => (!actor || e.actor === actor) && (!action || e.action === action) && (!signedOnly || (e.signature && e.signature.tone !== 'bad')),
  )
  const filtered = actor || action || signedOnly || !week
  const selected = events.find((e) => e.id === selectedId) ?? events[0]!

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines = [['id', 'day', 'time', 'actor', 'kind', 'action', 'object', 'signature'].join(',')]
    for (const e of rows) lines.push([e.id, e.day, e.time, e.actor, e.actorKind, e.action, e.object, e.signature?.label ?? ''].map(esc).join(','))
    const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'phlo-audit-log.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SettingsFrame
      header={
        <PageHeader
          crumbs={[{ label: 'Settings', to: '/settings' }]}
          title="Audit log"
          actions={
            <>
              <span className="flex items-center gap-1.5 text-[13px] text-ok-text">
                <ShieldCheckIcon className="size-3.5" aria-hidden /> Hash chain verified 09:50
              </span>
              <Button variant="outline" className="h-10 lg:h-8" onClick={exportCsv}>
                <DownloadIcon /> Export
              </Button>
            </>
          }
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <section aria-label="Events" className="flex min-w-0 flex-1 flex-col xl:overflow-y-auto">
          <div className="flex shrink-0 items-center gap-2 border-b border-line py-3 pl-4 lg:px-5">
            <div role="group" aria-label="Filter events" className="flex min-w-0 flex-1 gap-2 overflow-x-auto pr-4 [scrollbar-width:none] lg:pr-0">
              <button type="button" aria-pressed={week} onClick={() => setWeek((w) => !w)} className={cn(chip, week ? chipOn : 'border-border bg-card text-text-2 hover:bg-soft')}>
                Last 7 days
              </button>
              <FilterChip label="Actor" value={actor} options={actors} onChange={setActor} />
              <FilterChip label="Action" value={action} options={actions} onChange={setAction} />
              <button type="button" aria-pressed={signedOnly} onClick={() => setSignedOnly((s) => !s)} className={cn(chip, signedOnly ? chipOn : chipOff)}>
                Signed only
              </button>
            </div>
            <span className="hidden shrink-0 text-[13px] text-muted-foreground sm:inline lg:ml-auto" aria-live="polite">
              {filtered ? `${rows.length} shown · ` : ''}
              {TOTAL.toLocaleString('en-GB')} events
            </span>
          </div>

          <div className="flex flex-col">
            <div aria-hidden className={cn(rowGrid, 'hidden min-h-9 bg-raised px-5 text-xs text-muted-foreground')}>
              <span>When</span>
              <span>Who</span>
              <span>What</span>
              <span>Signature</span>
            </div>
            {rows.map((e) => (
              <EventRow key={e.id} e={e} on={e.id === selected.id} onSelect={() => setSelectedId(e.id)} />
            ))}
            {rows.length === 0 ? <p className="m-0 px-5 py-6 text-[13.5px] text-muted-foreground">No events match these filters.</p> : null}
          </div>
        </section>

        <aside
          aria-label="Selected event"
          aria-live="polite"
          className="flex shrink-0 flex-col gap-[18px] border-t border-line bg-raised px-4 py-5 xl:w-[340px] xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-[22px]"
        >
          <AuditDetail event={selected} />
        </aside>
      </div>
    </SettingsFrame>
  )
}

function EventRow({ e, on, onSelect }: { e: AuditEvent; on: boolean; onSelect: () => void }) {
  return (
    <div className={cn('border-b border-line-soft', on ? 'bg-primary-soft' : 'hover:bg-raised')}>
      <button
        type="button"
        aria-pressed={on}
        onClick={onSelect}
        className={cn(rowGrid, 'grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-2.5 text-left text-foreground md:min-h-[54px] md:px-5 md:py-1.5')}
      >
        <span className="hidden flex-col gap-0.5 md:flex">
          <span className="text-[13.5px]">{e.time}</span>
          <span className="text-xs text-muted-foreground">{e.day}</span>
        </span>
        <span className="hidden flex-col gap-0.5 md:flex">
          <span className="text-[13.5px]">{e.actor}</span>
          <span className="text-xs text-muted-foreground">{e.actorKind}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13.5px]">{e.action}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{e.object}</span>
          <span className="text-xs text-muted-foreground md:hidden">
            {e.day} {e.time} · {e.actor}
          </span>
        </span>
        <span className="self-start md:self-auto">
          {e.signature ? <Badge variant={e.signature.tone === 'neutral' ? 'neutral' : e.signature.tone}>{e.signature.label}</Badge> : null}
        </span>
      </button>
    </div>
  )
}

function FilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
}) {
  if (value)
    return (
      <span className={cn(chip, chipOn, 'cursor-default gap-1 pr-1')}>
        {label}: {value}
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={() => onChange(null)}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-background/20 lg:size-5"
        >
          <XIcon className="size-3" />
        </button>
      </span>
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(chip, chipOff)}>
        <PlusIcon className="size-3" aria-hidden /> {label}
        <ChevronDownIcon className="size-3 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((o) => (
          <DropdownMenuItem key={o} onClick={() => onChange(o)}>
            {o}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
