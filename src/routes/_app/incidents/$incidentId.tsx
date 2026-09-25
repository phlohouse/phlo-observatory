import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getIncident } from '@/lib/data/api/core'
import { getIncidentDetail } from '@/lib/data/api/incidents'
import { PageBody, PageHeader } from '@/components/phlo/page'
import { EmptyState, NotFound } from '@/components/phlo/states'
import { Incident214 } from '@/components/incidents/incident-214'
import { ResolvedIncident } from '@/components/incidents/resolved'
import { OpenIncidentActions, ResolvedIncidentActions } from '@/components/incidents/header-actions'
import {
  IncidentAuditFailed,
  IncidentMergeConflict,
  IncidentSchemaDrift,
  IncidentSlowLoad,
} from '@/components/incidents/others'

export const Route = createFileRoute('/_app/incidents/$incidentId')({
  loader: async ({ params }) => {
    const [base, detail] = await Promise.all([
      getIncident({ data: params.incidentId }),
      getIncidentDetail({ data: params.incidentId }),
    ])
    return { ...base, ...detail }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `#${loaderData.incident.id} ${loaderData.incident.title} · phlo` : 'Incident · phlo' }],
  }),
  notFoundComponent: NotFound,
  component: IncidentPage,
})

/** Dispatcher: shared chrome, then the body for this kind of incident. */
function IncidentPage() {
  const { incident, asset, open214, resolved } = Route.useLoaderData()

  let body: ReactNode
  if (open214) body = <Incident214 incident={incident} asset={asset} detail={open214} />
  else if (resolved) body = <ResolvedIncident incident={incident} detail={resolved} />
  else if (incident.id === '213') body = <IncidentSchemaDrift incident={incident} asset={asset} />
  else if (incident.id === '211') body = <IncidentAuditFailed incident={incident} asset={asset} />
  else if (incident.id === '209') body = <IncidentMergeConflict incident={incident} asset={asset} />
  else if (incident.id === '207') body = <IncidentSlowLoad incident={incident} asset={asset} />
  else
    body = (
      <PageBody>
        <EmptyState title="No detail yet">This incident has no investigation notes yet.</EmptyState>
      </PageBody>
    )

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Incidents', to: '/incidents' }]}
        title={`#${incident.id} ${incident.title}`}
        actions={
          resolved ? <ResolvedIncidentActions incident={incident} detail={resolved} /> : <OpenIncidentActions incident={incident} />
        }
      />
      {body}
    </>
  )
}
