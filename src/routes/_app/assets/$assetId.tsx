import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CodeIcon, PlusIcon } from 'lucide-react'
import { getAssetDetail } from '@/lib/data/api/assets'
import { PageHeader } from '@/components/phlo/page'
import { LayerSwatch, Mono } from '@/components/phlo/status'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditsTab, DataTab, LineageTab, OverviewTab, SchemaTab, SnapshotsTab } from '@/components/assets/asset-tabs'
import { MaterializeDialog } from '@/components/assets/materialize-dialog'
import { AddAuditDialog } from '@/components/assets/add-audit-dialog'
import { cn } from '@/lib/utils'
import type { Layer } from '@/lib/data/types'

type Tab = 'overview' | 'data' | 'schema' | 'lineage' | 'snapshots' | 'audits'
const tabs: Tab[] = ['overview', 'data', 'schema', 'lineage', 'snapshots', 'audits']
type Search = { tab?: Tab; dialog?: 'materialize' | 'add-audit' }

const tabLabel: Record<Tab, string> = {
  overview: 'Overview',
  data: 'Data',
  schema: 'Schema history',
  lineage: 'Lineage',
  snapshots: 'Snapshots',
  audits: 'Audits',
}

const layerSoft: Record<Layer, string> = { bronze: 'bg-bronze-soft', silver: 'bg-silver-soft', gold: 'bg-gold-soft' }

export const Route = createFileRoute('/_app/assets/$assetId')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: tabs.includes(s.tab as Tab) ? (s.tab as Tab) : undefined,
    dialog: s.dialog === 'materialize' || s.dialog === 'add-audit' ? s.dialog : undefined,
  }),
  loader: ({ params }) => getAssetDetail({ data: params.assetId }),
  head: ({ params }) => ({ meta: [{ title: `${params.assetId} · phlo` }] }),
  component: AssetPage,
})

function AssetPage() {
  const { asset, incidents, detail, window } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const tab = search.tab ?? 'overview'
  const lag = asset.lag.split(' / ')[0]!.replace(/(\d) m$/, '$1 min')
  const tabList = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    tabList.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tab])
  const closeDialog = () => navigate({ search: (p) => ({ ...p, dialog: undefined }), replace: true })

  const addAuditButton = (
    <Link from={Route.fullPath} to="." search={(p) => ({ ...p, dialog: 'add-audit' as const })} className={buttonVariants({ variant: 'outline' })}>
      <PlusIcon /> Add audit
    </Link>
  )

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Assets', to: '/assets' }]}
        title={<Mono className="text-[13.5px]">{asset.id}</Mono>}
        actions={
          <>
            <Link to="/query" className={buttonVariants({ variant: 'outline' })}>
              <CodeIcon /> Query
            </Link>
            <Link from={Route.fullPath} to="." search={(p) => ({ ...p, dialog: 'materialize' as const })} className={buttonVariants()}>
              Materialize
            </Link>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Tabs
          value={tab}
          onValueChange={(v) => navigate({ search: (p) => ({ ...p, tab: v === 'overview' ? undefined : (v as Tab) }), replace: true })}
        >
          <div className="flex flex-col gap-2.5 border-b border-line px-4 pt-5 lg:px-7 lg:pt-[22px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="lg" className={cn('text-text-2', layerSoft[asset.layer])}>
                <LayerSwatch layer={asset.layer} />
                {asset.layer[0]!.toUpperCase() + asset.layer.slice(1)}
              </Badge>
              {asset.health === 'stale' ? (
                <Badge variant="bad" size="lg">
                  Stale · {lag}
                </Badge>
              ) : asset.health === 'warn' ? (
                <Badge variant="warn" size="lg">
                  Needs attention · {lag}
                </Badge>
              ) : (
                <Badge variant="ok" size="lg">
                  Fresh · {lag}
                </Badge>
              )}
              <Badge variant="outline" size="lg">
                {detail.format}
              </Badge>
              {incidents.map((i) => (
                <Link key={i.id} to="/incidents/$incidentId" params={{ incidentId: i.id }} className="ml-1 text-[13px]">
                  Incident #{i.id}
                </Link>
              ))}
            </div>
            <h1 className="m-0 font-mono text-lg font-medium tracking-[-0.01em] [overflow-wrap:anywhere] lg:text-[22px]">{asset.id}</h1>
            <p className="m-0 max-w-[900px] text-sm leading-normal text-text-3">{detail.description}</p>
            <TabsList ref={tabList} aria-label="Asset views" className="-mx-4 overflow-x-auto border-b-0 px-4 pt-2 pb-3 [scrollbar-width:none] lg:mx-0 lg:px-0">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t} className="shrink-0 whitespace-nowrap">
                  {tabLabel[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab asset={asset} detail={detail} />
          </TabsContent>
          <TabsContent value="data">
            <DataTab asset={asset} detail={detail} />
          </TabsContent>
          <TabsContent value="schema">
            <SchemaTab asset={asset} detail={detail} />
          </TabsContent>
          <TabsContent value="lineage">
            <LineageTab asset={asset} detail={detail} />
          </TabsContent>
          <TabsContent value="snapshots">
            <SnapshotsTab asset={asset} detail={detail} />
          </TabsContent>
          <TabsContent value="audits">
            <AuditsTab asset={asset} detail={detail} addAudit={addAuditButton} />
          </TabsContent>
        </Tabs>
      </div>

      <MaterializeDialog
        key={`mz-${asset.id}`}
        open={search.dialog === 'materialize'}
        onClose={closeDialog}
        onStart={() => navigate({ to: '/pipelines/$jobName', params: { jobName: detail.job } })}
        assetId={asset.id}
        via={detail.materialize.via}
        modes={detail.materialize.modes}
        rebuild={detail.materialize.rebuild}
        workBranch={detail.workBranch}
        window={window}
      />
      <AddAuditDialog
        key={`aa-${asset.id}`}
        open={search.dialog === 'add-audit'}
        onClose={closeDialog}
        onAdd={() => navigate({ search: (p) => ({ ...p, dialog: undefined, tab: 'audits' }) })}
        assetId={asset.id}
        columns={detail.columns}
        dryRun={detail.addAudit.dryRun}
        footer={detail.addAudit.footer}
      />
    </>
  )
}
