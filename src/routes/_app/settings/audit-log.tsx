import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronDownIcon, DownloadIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { exportAdminAudit, getAdminAuditLog } from '@/lib/data/api/admin-audit'
import type { AuditRecord } from '@/lib/data/api/admin-audit'
import { PageHeader } from '@/components/phlo/page'
import { SettingsFrame } from '@/components/settings/frame'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menu'
import { cn } from '@/lib/utils'

type Search = { surface?: string; search?: string; actor_subject?: string; action?: string }

export const Route = createFileRoute('/_app/settings/audit-log')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    surface: validSurface(search.surface),
    search: validString(search.search, 200),
    actor_subject: validString(search.actor_subject, 512),
    action: validString(search.action, 512),
  }),
  loaderDeps: ({ search }) => ({ surface: search.surface ?? 'phlo-api', search: search.search, actor_subject: search.actor_subject, action: search.action }),
  loader: ({ deps }) => getAdminAuditLog({ data: deps }),
  head: () => ({ meta: [{ title: 'Audit log · phlo' }] }),
  component: AuditLogPage,
})

const rowGrid = 'md:grid md:grid-cols-[152px_132px_minmax(0,1fr)_120px] md:items-center md:gap-x-3.5'
const chip = 'flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap lg:h-[30px]'
const chipOff = 'border-dashed border-skip-line bg-card text-text-2 hover:bg-soft'
const chipOn = 'border-foreground bg-foreground text-background'

function AuditLogPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [query, setQuery] = React.useState(search.search ?? '')
  const [exportError, setExportError] = React.useState<string | null>(null)
  const [exporting, setExporting] = React.useState(false)

  const updateSearch = (next: Partial<Search>) => navigate({ search: { ...search, ...next } })
  const exportJsonl = async () => {
    setExportError(null)
    setExporting(true)
    try {
      const currentSurface = search.surface ?? 'phlo-api'
      const body = await exportAdminAudit({ data: { surface: currentSurface } })
      const url = URL.createObjectURL(new Blob([body], { type: 'application/x-ndjson' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-${currentSurface}.jsonl`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Unable to export audit records.')
    } finally {
      setExporting(false)
    }
  }

  if (result.kind !== 'available') return <AuditUnavailable kind={result.kind} message={result.message} />

  const { records, verification } = result
  const actors = uniqueStrings(records.items.map((record) => eventString(record.event, 'actor_subject')))
  const actions = uniqueStrings(records.items.map((record) => eventString(record.event, 'action')))
  const verificationLabel = verification.valid
    ? `Verified · ${verification.total_records} records`
    : `Verification failed at sequence ${verification.first_invalid_sequence ?? 'unknown'}`

  return (
    <SettingsFrame header={<PageHeader crumbs={[{ label: 'Settings', to: '/settings' }]} title="Audit log" actions={<><span className="text-[13px] text-muted-foreground" role="status">{verificationLabel}</span><Button variant="outline" className="h-10 lg:h-8" onClick={exportJsonl} disabled={exporting}><DownloadIcon /> {exporting ? 'Exporting…' : 'Export JSONL'}</Button></>} />}>
      <section aria-label="Audit records" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex shrink-0 flex-col gap-3 border-b border-line p-4 lg:px-5">
          <form onSubmit={(event) => { event.preventDefault(); updateSearch({ search: query.trim() || undefined }) }} className="flex max-w-xl gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground"><SearchIcon className="size-4" aria-hidden /><span className="sr-only">Search audit records</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit event data" className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" /></label>
            <Button type="submit" variant="outline">Search</Button>
          </form>
          <div role="group" aria-label="Filter audit records" className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]">
            <span className={cn(chip, 'cursor-default border-border bg-raised text-muted-foreground')}>Surface: {records.surface}</span>
            <FilterChip label="Actor" value={search.actor_subject ?? null} options={actors} onChange={(actor_subject) => updateSearch({ actor_subject: actor_subject ?? undefined })} />
            <FilterChip label="Action" value={search.action ?? null} options={actions} onChange={(action) => updateSearch({ action: action ?? undefined })} />
          </div>
          {exportError ? <p role="alert" className="m-0 text-[13px] text-bad-ink">Export unavailable: {exportError}</p> : null}
          {!verification.valid ? <p role="alert" className="m-0 text-[13px] text-bad-ink">{verification.error_message ?? 'The audit chain could not be verified.'}</p> : null}
          {records.scan_truncated ? <p className="m-0 text-[13px] text-muted-foreground">Search scanning was truncated by the API; more matching records may exist.</p> : null}
          {records.next_after !== null ? <p className="m-0 text-[13px] text-muted-foreground">Only the first 100 matching records are shown.</p> : null}
        </div>
        <div className="flex flex-col">
          <div aria-hidden className={cn(rowGrid, 'hidden min-h-9 bg-raised px-5 text-xs text-muted-foreground')}><span>When</span><span>Who</span><span>What</span><span>Decision</span></div>
          {records.items.map((record) => <EventRow key={record.sequence_number} record={record} />)}
          {records.items.length === 0 ? <p className="m-0 px-5 py-6 text-[13.5px] text-muted-foreground">No audit records match these filters.</p> : null}
        </div>
        <p className="m-0 px-5 py-4 text-xs text-muted-foreground">Audit records are displayed as returned by the API. Verification reports chain integrity only and does not make a regulatory-compliance claim.</p>
      </section>
    </SettingsFrame>
  )
}

function AuditUnavailable({ kind, message }: { kind: 'unavailable' | 'error'; message: string }) {
  return <SettingsFrame header={<PageHeader crumbs={[{ label: 'Settings', to: '/settings' }]} title="Audit log" />}><section className="p-5" aria-live="polite"><h2 className="m-0 text-base font-medium">{kind === 'unavailable' ? 'Audit storage unavailable' : 'Audit log unavailable'}</h2><p className="mt-2 text-[13.5px] text-muted-foreground">{message}</p><p className="text-[13px] text-muted-foreground">No audit records or verification status can be shown until the read-only audit API is available.</p></section></SettingsFrame>
}

function EventRow({ record }: { record: AuditRecord }) {
  const event = record.event
  const timestamp = formatTimestamp(record.sealed_at)
  const actor = eventString(event, 'actor_subject') ?? 'Unknown actor'
  const action = eventString(event, 'action') ?? eventString(event, 'event_type') ?? 'Unknown event'
  const resource = eventString(event, 'resource_id') ?? 'No resource identifier'
  const decision = eventString(event, 'decision') ?? 'Not provided'
  return <div className={cn(rowGrid, 'border-b border-line-soft px-4 py-2.5 text-foreground md:min-h-[54px] md:px-5 md:py-1.5')}><span className="hidden flex-col gap-0.5 md:flex"><span className="text-[13.5px]">{timestamp.time}</span><span className="text-xs text-muted-foreground">{timestamp.day}</span></span><span className="hidden text-[13.5px] md:block">{actor}</span><span className="flex min-w-0 flex-col gap-0.5"><span className="text-[13.5px]">{action}</span><span className="truncate font-mono text-xs text-muted-foreground">{resource}</span><span className="text-xs text-muted-foreground md:hidden">{timestamp.day} {timestamp.time} · {actor}</span></span><span><Badge variant="neutral">{decision}</Badge></span></div>
}

function FilterChip({ label, value, options, onChange }: { label: string; value: string | null; options: string[]; onChange: (value: string | null) => void }) {
  if (value) return <span className={cn(chip, chipOn, 'cursor-default gap-1 pr-1')}>{label}: {value}<button type="button" aria-label={`Clear ${label.toLowerCase()} filter`} onClick={() => onChange(null)} className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-background/20 lg:size-5"><XIcon className="size-3" /></button></span>
  return <DropdownMenu><DropdownMenuTrigger className={cn(chip, chipOff)}><PlusIcon className="size-3" aria-hidden /> {label}<ChevronDownIcon className="size-3 text-muted-foreground" aria-hidden /></DropdownMenuTrigger><DropdownMenuContent>{options.map((option) => <DropdownMenuItem key={option} onClick={() => onChange(option)}>{option}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
}

function eventString(event: Record<string, unknown>, key: string) { return typeof event[key] === 'string' ? event[key] : undefined }
function uniqueStrings(values: Array<string | undefined>) { return [...new Set(values.filter((value): value is string => value !== undefined))] }
function validString(value: unknown, maxLength: number) { return typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : undefined }
function validSurface(value: unknown) { return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,255}$/.test(value) ? value : undefined }
function formatTimestamp(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? { day: value, time: 'Invalid timestamp' } : { day: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 19) } }
