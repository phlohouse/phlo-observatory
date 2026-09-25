/**
 * Server functions for the shared data. Today they read typed fixtures; to go live, replace the
 * handler bodies with calls to Dagster (GraphQL), Nessie (REST) and the phlo Postgres — the
 * return types stay the same, so no screen changes.
 */
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import * as fx from '../fixtures/core'

/** Sidebar + app chrome: open incidents, services, counts. */
export const getShell = createServerFn({ method: 'GET' }).handler(async () => ({
  openIncidents: fx.openIncidents,
  services: fx.services,
  now: fx.NOW_LABEL,
}))

export const getOverview = createServerFn({ method: 'GET' }).handler(async () => ({
  kpis: fx.kpis,
  sources: fx.sources,
  layers: fx.layers,
  runsByHour: fx.runsByHour,
  activity: fx.recentActivity,
  openIncidents: fx.openIncidents,
  services: fx.services,
  now: fx.NOW_LABEL,
}))

export const getIncidents = createServerFn({ method: 'GET' }).handler(async () => ({
  incidents: fx.incidents,
}))

export const getIncident = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const incident = fx.incidents.find((i) => i.id === id)
    if (!incident) throw notFound()
    const asset = incident.assetId ? fx.assets.find((a) => a.id === incident.assetId) : undefined
    return { incident, asset }
  })

export const getAssets = createServerFn({ method: 'GET' }).handler(async () => ({
  assets: fx.assets,
  totals: fx.assetTotals,
}))

export const getAsset = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const asset = fx.assets.find((a) => a.id === id)
    if (!asset) throw notFound()
    const incidents = fx.incidents.filter((i) => i.assetId === id && i.status !== 'resolved')
    return { asset, incidents }
  })

export const getJobs = createServerFn({ method: 'GET' }).handler(async () => ({ jobs: fx.jobs }))

export const getJob = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const job = fx.jobs.find((j) => j.name === name)
    if (!job) throw notFound()
    return { job, jobs: fx.jobs }
  })

export const getBranches = createServerFn({ method: 'GET' }).handler(async () => ({
  branches: fx.branches,
  tags: fx.releaseTags,
}))

export const getMembers = createServerFn({ method: 'GET' }).handler(async () => ({
  members: fx.members,
  serviceAccounts: fx.serviceAccounts,
}))

export const getAuditLog = createServerFn({ method: 'GET' }).handler(async () => ({
  events: fx.auditEvents,
}))
