import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2Icon } from 'lucide-react'
import { getShell } from '@/lib/data/api/core'
import { PageHeader } from '@/components/phlo/page'
import { Dot, LayerSwatch, Mono } from '@/components/phlo/status'
import { SettingsFrame } from '@/components/settings/frame'
import { Button } from '@/components/ui/button'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { CheckLine } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Layer, ServiceState } from '@/lib/data/types'

export const Route = createFileRoute('/_app/settings/')({
  loader: () => getShell(),
  head: () => ({ meta: [{ title: 'Settings · phlo' }] }),
  component: SettingsPage,
})

const initial = {
  sla: { bronze: '60', silver: '60', gold: '90' } as Record<Layer, string>,
  openIncidentOnBreach: true,
  holdDownstream: false,
  chat: '#data-platform',
  digest: 'Weekdays at 08:00',
  notifyOwners: true,
  notifyConsumers: true,
  fileSize: '512',
  expireDays: '7',
  orphan: 'Sundays 03:00',
  keepTagged: true,
  compactNightly: true,
  protectMain: true,
  requireReason: true,
  signTags: true,
  secondReviewer: false,
  retention: '[YEARS]',
}
type Settings = typeof initial

const connections: Array<{ name: string; uri: string; service: string; latency: string }> = [
  { name: 'Nessie catalog', uri: '[NESSIE_URI]/api/v2', service: 'Nessie catalog', latency: '38 ms' },
  { name: 'Dagster', uri: '[DAGSTER_URL]', service: 'Dagster', latency: '52 ms' },
  { name: 'Postgres', uri: '[POSTGRES_DSN]', service: 'Postgres', latency: '4 ms' },
  { name: 'Object store', uri: '[WAREHOUSE_BUCKET]', service: 'Object store', latency: '' },
]

function SettingsPage() {
  const { services } = Route.useLoaderData()
  const [s, setS] = React.useState<Settings>(initial)
  const [savedS, setSavedS] = React.useState<Settings>(initial)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const dirty = JSON.stringify(s) !== JSON.stringify(savedS)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }))

  return (
    <SettingsFrame
      header={
        <PageHeader
          title="Settings"
          meta={
            <>
              Lakehouse · <Mono>prod</Mono>
            </>
          }
          actions={
            <>
              <span className="hidden text-[13px] text-muted-foreground sm:inline" aria-live="polite">
                {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt}` : 'Last changed by Gareth · 3 d ago'}
              </span>
              <Button variant="outline" className="h-10 lg:h-8" disabled={!dirty} onClick={() => setS(savedS)}>
                Discard
              </Button>
              <Button
                className="h-10 lg:h-8"
                disabled={!dirty}
                onClick={() => {
                  setSavedS(s)
                  setSavedAt('just now')
                }}
              >
                Save changes
              </Button>
            </>
          }
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:px-6 lg:py-5">
        <SettingsCard title="Connections" description="Services phlo reads from and writes to" inline className="gap-2">
          <div className="flex flex-col">
            {connections.map((c) => (
              <ConnectionRow key={c.name} conn={c} state={services.find((x) => x.name === c.service)?.state ?? 'up'} detail={services.find((x) => x.name === c.service)?.detail} />
            ))}
          </div>
        </SettingsCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SettingsCard title="Freshness targets" description="Default SLA per layer. Assets can override.">
            {(['bronze', 'silver', 'gold'] as const).map((l) => (
              <NumberRow
                key={l}
                label={
                  <span className="flex items-center gap-2.5">
                    <LayerSwatch layer={l} size="lg" />
                    {l[0]!.toUpperCase() + l.slice(1)}
                  </span>
                }
                labelWidth="w-[100px]"
                value={s.sla[l]}
                onChange={(v) => set('sla', { ...s.sla, [l]: v })}
                unit="min"
              />
            ))}
            <Split>
              <CheckLine checked={s.openIncidentOnBreach} onCheckedChange={(v) => set('openIncidentOnBreach', v)}>
                Open an incident when a table breaches its SLA
              </CheckLine>
              <CheckLine checked={s.holdDownstream} onCheckedChange={(v) => set('holdDownstream', v)}>
                Hold downstream jobs while an upstream table is stale
              </CheckLine>
            </Split>
          </SettingsCard>

          <SettingsCard title="Alerts" description="Where incidents and digests go">
            <TextRow label="Chat channel" labelWidth="w-[110px]" value={s.chat} onChange={(v) => set('chat', v)} />
            <TextRow label="Email digest" labelWidth="w-[110px]" value={s.digest} onChange={(v) => set('digest', v)} />
            <Split>
              <CheckLine checked={s.notifyOwners} onCheckedChange={(v) => set('notifyOwners', v)}>
                Notify asset owners directly
              </CheckLine>
              <CheckLine checked={s.notifyConsumers} onCheckedChange={(v) => set('notifyConsumers', v)}>
                Tell downstream consumers when their data is stale
              </CheckLine>
            </Split>
          </SettingsCard>

          <SettingsCard title="Table maintenance" description="Iceberg compaction and snapshot housekeeping">
            <NumberRow label="Target file size" labelWidth="w-[150px]" value={s.fileSize} onChange={(v) => set('fileSize', v)} unit="MB" />
            <NumberRow label="Expire snapshots after" labelWidth="w-[150px]" value={s.expireDays} onChange={(v) => set('expireDays', v)} unit="days" />
            <TextRow label="Orphan file cleanup" labelWidth="w-[150px]" value={s.orphan} onChange={(v) => set('orphan', v)} />
            <Split>
              <CheckLine checked={s.keepTagged} onCheckedChange={(v) => set('keepTagged', v)}>
                Keep snapshots that a release tag points to
              </CheckLine>
              <CheckLine checked={s.compactNightly} onCheckedChange={(v) => set('compactNightly', v)}>
                Compact nightly when a table has 200+ small files
              </CheckLine>
            </Split>
          </SettingsCard>

          <SettingsCard
            title="Audit & data integrity"
            description={
              <>
                Controls for the GxP audit trail on <Mono className="text-xs">main</Mono>
              </>
            }
          >
            <CheckLine checked={s.protectMain} onCheckedChange={(v) => set('protectMain', v)}>
              Protect <Mono>main</Mono> from direct writes
            </CheckLine>
            <CheckLine checked={s.requireReason} onCheckedChange={(v) => set('requireReason', v)}>
              Require a reason on every merge into <Mono>main</Mono>
            </CheckLine>
            <CheckLine checked={s.signTags} onCheckedChange={(v) => set('signTags', v)}>
              Require an e-signature to create a release tag
            </CheckLine>
            <CheckLine checked={s.secondReviewer} onCheckedChange={(v) => set('secondReviewer', v)}>
              Require a second reviewer for gold-layer merges
            </CheckLine>
            <div className="border-t border-line-soft pt-3">
              <TextRow label="Keep audit log for" labelWidth="w-[150px]" value={s.retention} onChange={(v) => set('retention', v)} unit="years" narrow mono />
            </div>
          </SettingsCard>
        </div>
      </div>
    </SettingsFrame>
  )
}

function SettingsCard({
  title,
  description,
  inline,
  className,
  children,
}: {
  title: React.ReactNode
  description: React.ReactNode
  inline?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border border-border-card bg-card px-4 py-4 lg:px-5 lg:py-[18px]', className)}>
      <div className={cn('flex gap-x-2.5 gap-y-0.5', inline ? 'flex-wrap items-baseline pb-1' : 'flex-col')}>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {children}
    </section>
  )
}

function Split({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5 border-t border-line-soft pt-3">{children}</div>
}

function NumberRow(props: { label: React.ReactNode; labelWidth: string; value: string; onChange: (v: string) => void; unit: string }) {
  return <TextRow {...props} narrow mono inputMode="numeric" />
}

function TextRow({
  label,
  labelWidth,
  value,
  onChange,
  unit,
  narrow,
  mono,
  inputMode,
}: {
  label: React.ReactNode
  labelWidth: string
  value: string
  onChange: (v: string) => void
  unit?: string
  narrow?: boolean
  mono?: boolean
  inputMode?: 'numeric'
}) {
  return (
    <Field className="flex-row items-center gap-2.5">
      <FieldLabel className={cn('shrink-0 text-sm font-normal text-text-2', labelWidth)}>{label}</FieldLabel>
      <Input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(inputMode === 'numeric' ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
        className={cn('h-10 sm:h-8', narrow ? 'w-[84px]' : 'min-w-0 flex-1', mono && 'font-mono text-[13.5px]')}
      />
      {unit ? <span className="text-[13px] text-muted-foreground">{unit}</span> : null}
    </Field>
  )
}

function ConnectionRow({
  conn,
  state,
  detail,
}: {
  conn: { name: string; uri: string; latency: string }
  state: ServiceState
  detail?: string
}) {
  const [testing, setTesting] = React.useState(false)
  const [tested, setTested] = React.useState(false)
  const label = state === 'up' ? 'Connected' : state === 'slow' ? 'Degraded' : 'Down'
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-line-soft py-2.5 md:h-11 md:grid-cols-[150px_minmax(0,1fr)_190px_64px] md:py-0">
      <span className="text-sm">{conn.name}</span>
      <span className="col-start-1 row-start-2 truncate font-mono text-[12.5px] text-text-3 md:col-start-auto md:row-start-auto">{conn.uri}</span>
      <span className="col-start-1 row-start-3 flex items-center gap-2 text-[13.5px] md:col-start-auto md:row-start-auto" aria-live="polite">
        <Dot tone={state === 'up' ? 'ok' : state === 'slow' ? 'warn' : 'bad'} />
        {label}
        <span className="text-[13px] text-muted-foreground">· {tested ? 'just now' : state === 'slow' ? detail : conn.latency}</span>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="col-start-2 row-span-3 row-start-1 h-10 md:col-start-auto md:row-span-1 md:row-start-auto md:h-7"
        disabled={testing}
        aria-label={`Test ${conn.name} connection`}
        onClick={() => {
          setTesting(true)
          setTimeout(() => {
            setTesting(false)
            setTested(true)
          }, 600)
        }}
      >
        {testing ? <Loader2Icon className="animate-spin" /> : 'Test'}
      </Button>
    </div>
  )
}
