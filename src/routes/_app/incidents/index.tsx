import * as React from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CircleCheckIcon, PlusIcon, XIcon } from 'lucide-react'
import { getIncidentList } from '@/lib/data/api/incidents'
import { PageHeader, Eyebrow } from '@/components/phlo/page'
import { EmptyState } from '@/components/phlo/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Segmented } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { FilterChip, IncidentGroup, applyFilters, sortIncidents, type FilterKey, type Filters } from '@/components/incidents/list'
import { NewIncidentDialog, type NewIncidentValues } from '@/components/incidents/new-incident-dialog'

type Search = { dialog?: 'new-incident'; view?: 'open' | 'resolved' }
export const Route = createFileRoute('/_app/incidents/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    dialog: s.dialog === 'new-incident' ? 'new-incident' : undefined,
    view: s.view === 'resolved' ? 'resolved' : undefined,
  }),
  loader: () => getIncidentList(),
  head: () => ({ meta: [{ title: 'Incidents · phlo' }] }),
  component: IncidentsPage,
})

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'severity', label: 'Severity' },
  { key: 'kind', label: 'Kind' },
  { key: 'layer', label: 'Layer' },
  { key: 'owner', label: 'Owner' },
]

function IncidentsPage() {
  const { incidents, triage, owners, assets } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const view = search.view ?? 'open'
  const [filters, setFilters] = React.useState<Filters>({})
  const [created, setCreated] = React.useState<NewIncidentValues & { id: string } | null>(null)

  const open = sortIncidents(incidents.filter((i) => i.status !== 'resolved'))
  const resolved = incidents.filter((i) => i.status === 'resolved')
  const high = open.filter((i) => i.severity === 'high').length
  const shownOpen = applyFilters(open, filters)
  const shownResolved = applyFilters(resolved, filters)
  const nextId = String(Math.max(...incidents.map((i) => Number(i.id))) + 1)
  const filtered = Object.values(filters).some(Boolean)

  const optionsFor = (k: FilterKey) =>
    k === 'severity' ? ['high', 'medium', 'low'] : Array.from(new Set(incidents.map((i) => i[k] as string)))

  const closeDialog = () => navigate({ search: (s) => ({ ...s, dialog: undefined }), replace: true })

  return (
    <>
      <PageHeader
        title="Incidents"
        actions={
          <>
            <Segmented
              aria-label="Show incidents"
              value={view}
              onValueChange={(v) => navigate({ search: (s) => ({ ...s, view: v === 'resolved' ? 'resolved' : undefined }) })}
              options={[
                { value: 'open', label: `Open · ${open.length}` },
                { value: 'resolved', label: `Resolved · ${triage.resolvedTotal}` },
              ]}
            />
            <Link
              to="/incidents"
              search={(s) => ({ ...s, dialog: 'new-incident' as const })}
              className={cn(buttonVariants(), 'h-10 hover:text-primary-foreground lg:h-8')}
            >
              <PlusIcon /> New incident
            </Link>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
        {created ? (
          <div role="status" className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-ok-line bg-ok-wash px-4 py-3 text-ok-ink lg:mx-5">
            <CircleCheckIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 text-sm">
              Incident <span className="font-mono">#{created.id}</span> “{created.title}” opened · owner {created.owner}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Dismiss" className="text-ok-ink" onClick={() => setCreated(null)}>
              <XIcon />
            </Button>
          </div>
        ) : null}

        <section aria-label="Triage stats" className="grid shrink-0 grid-cols-2 gap-px border-b border-line bg-line lg:grid-cols-4">
          <TriageCell label="Open" value={open.length} qualifier={`${high} high`} tone="bad" />
          <TriageCell label="Time to acknowledge · 30 d" value={triage.ackMedian} qualifier="median" />
          <TriageCell label="Time to resolve · 30 d" value={triage.resolveMedian} qualifier="median" />
          <TriageCell label="Opened this month" value={triage.openedThisMonth} qualifier={triage.vsLastMonth} tone="ok" />
        </section>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 lg:px-5" role="group" aria-label="Filters">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              value={filters[f.key]}
              options={optionsFor(f.key)}
              onChange={(v) => setFilters((cur) => ({ ...cur, [f.key]: v }))}
            />
          ))}
          {filtered ? (
            <Button variant="link" className="h-10 px-1 sm:h-auto" onClick={() => setFilters({})}>
              Clear all
            </Button>
          ) : null}
          <span className="ml-auto hidden text-[13px] text-muted-foreground sm:inline">Sorted by severity, then age</span>
        </div>

        {view === 'open' ? (
          <>
            {shownOpen.length ? (
              <IncidentGroup
                headed
                title={`Open · ${shownOpen.length}${filtered ? '' : ` · ${high} high`}`}
                note="By severity, then age"
                incidents={shownOpen}
              />
            ) : (
              <NoMatches onClear={() => setFilters({})} what="open incidents" />
            )}
            {shownResolved.length ? (
              <IncidentGroup title="Resolved this week" note={`${shownResolved.length} of ${triage.resolvedTotal} in total`} incidents={shownResolved} />
            ) : null}
          </>
        ) : shownResolved.length ? (
          <IncidentGroup headed title={`Resolved this week · ${shownResolved.length}`} note={`${triage.resolvedTotal} in total`} incidents={shownResolved} />
        ) : (
          <NoMatches onClear={() => setFilters({})} what="resolved incidents" />
        )}
      </div>

      <NewIncidentDialog
        open={search.dialog === 'new-incident'}
        nextId={nextId}
        owners={owners}
        assets={assets}
        onClose={closeDialog}
        onCreate={(v) => {
          setCreated({ ...v, id: nextId })
          closeDialog()
        }}
      />
    </>
  )
}

function TriageCell({
  label,
  value,
  qualifier,
  tone,
}: {
  label: string
  value: React.ReactNode
  qualifier: string
  tone?: 'bad' | 'ok'
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-card px-4 py-3.5 lg:px-5 lg:py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[22px] leading-tight font-medium lg:text-2xl">{value}</span>
        <span
          className={cn(
            'text-[13.5px]',
            tone === 'bad' ? 'text-bad-text' : tone === 'ok' ? 'text-ok-text' : 'text-muted-foreground',
          )}
        >
          {qualifier}
        </span>
      </div>
    </div>
  )
}

function NoMatches({ onClear, what }: { onClear: () => void; what: string }) {
  return (
    <EmptyState
      className="m-4 lg:m-5"
      title={`No ${what} match these filters`}
      action={
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  )
}
