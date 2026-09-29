import { createFileRoute } from '@tanstack/react-router'
import { getAdminSettings } from '@/lib/data/api/admin'
import { PageHeader } from '@/components/phlo/page'
import { Mono } from '@/components/phlo/status'
import { SettingsFrame } from '@/components/settings/frame'
import { Button } from '@/components/ui/button'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings/')({
  loader: () => getAdminSettings(),
  head: () => ({ meta: [{ title: 'Settings · phlo' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const settings = Route.useLoaderData()
  const values = Object.entries(settings.values).sort(([left], [right]) => left.localeCompare(right))

  return (
    <SettingsFrame
      header={
        <PageHeader
          title="Settings"
          meta={<>Admin settings · <Mono>version {settings.version}</Mono></>}
          actions={
            <>
              <span className="hidden text-[13px] text-muted-foreground sm:inline">Read-only API preview</span>
              <Button className="h-10 lg:h-8" disabled title="Saving settings is disabled in this preview">
                Saving unavailable
              </Button>
            </>
          }
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:px-6 lg:py-5">
        <p role="status" className="m-0 rounded-lg border border-warn-line bg-warn-wash px-3 py-2 text-sm text-warn-ink">Values are loaded from Phlo. Editing and saving are unavailable in this read-only preview.</p>
        <SettingsCard title="Stored settings" description="The API exposes untyped setting names and scalar values.">
          {values.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">No admin settings have been stored.</p>
          ) : (
            <dl className="m-0 divide-y divide-line-soft border-y border-line-soft">
              {values.map(([key, value]) => (
                <div key={key} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
                  <dt><Mono className="text-xs">{key}</Mono></dt>
                  <dd className="m-0 break-words text-sm text-text-2">{formatSetting(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </SettingsCard>
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

function formatSetting(value: string | number | boolean | null) {
  return value === null ? 'null' : String(value)
}
