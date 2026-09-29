/** Server functions for environment-scoped overview and app-shell data. */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const environment = z.enum(['prod', 'staging'])
const overviewResponse = z.object({
  env: environment,
  asset_count: z.number().int().nonnegative(),
  materialized_asset_count: z.number().int().nonnegative(),
  latest_materialization_at: z.string().nullable(),
  incident_counts: z.record(z.string(), z.number().int().nonnegative()),
  freshness_counts: z.object({ fresh: z.number(), stale: z.number(), unknown: z.number() }),
  run_status_counts: z.record(z.string(), z.number().int().nonnegative()),
  run_history_truncated: z.boolean(),
  quality_checks: z.object({
    status: z.enum(['available', 'unknown']),
    counts: z.object({ passing: z.number(), total: z.number(), unevaluated: z.number() }).nullable(),
    failing_assets: z.array(z.string()).nullable().optional(),
    reason: z.string().nullable(),
  }),
})
const servicesResponse = z.object({
  env: environment,
  items: z.array(z.object({
    id: z.string(),
    status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown', 'unavailable']),
    observed_at: z.string().nullable(),
    response_time_seconds: z.number().nullable(),
  })),
})
const layerResponse = z.object({
  env: environment,
  items: z.array(z.object({
    group_name: z.string().nullable(),
    asset_count: z.number().int().nonnegative(),
    materialized_asset_count: z.number().int().nonnegative(),
    latest_materialization_at: z.string().nullable(),
  })),
})

const envInput = z.object({ env: environment })

const shellInput = envInput
const environmentsResponse = z.object({ items: z.array(z.object({ env: environment, status: z.enum(['available', 'unavailable']) })) })
const incidentStatsResponse = z.object({
  env: environment,
  counts: z.record(z.string(), z.number().int().nonnegative()),
})

export const clientResponseSchemas = {
  'GET /api/v1/environments': environmentsResponse,
  'GET /api/v1/services': servicesResponse,
  'GET /api/v1/incidents/stats': incidentStatsResponse,
  'GET /api/v1/overview': overviewResponse,
  'GET /api/v1/layers': layerResponse,
}

/** Live API data for the app chrome. */
export const getShell = createServerFn({ method: 'GET' })
  .validator(shellInput)
  .handler(async ({ data: { env } }) => {
    const [environmentValue, servicesValue, statsValue] = await Promise.all([
      phloApiRequest('/api/v1/environments'),
      phloApiRequest(`/api/v1/services?env=${env}`),
      phloApiRequest(`/api/v1/incidents/stats?env=${env}`),
    ])
    const environments = environmentsResponse.parse(environmentValue).items
    const services = servicesResponse.parse(servicesValue).items
    const stats = incidentStatsResponse.parse(statsValue)
    return {
      env,
      environments,
      openIncidentCount: (stats.counts.open ?? 0) + (stats.counts.acknowledged ?? 0),
      services: services.map((service) => ({
        name: service.id,
        status: service.status,
        observedAt: service.observed_at,
        responseTimeSeconds: service.response_time_seconds,
      })),
    }
  })

export const getOverview = createServerFn({ method: 'GET' })
  .validator(envInput)
  .handler(async ({ data: { env } }) => fetchOverview(env))

export async function fetchOverview(env: z.infer<typeof environment>) {
  const suffix = `?env=${env}` as const
  const [overviewValue, servicesValue, layersValue] = await Promise.all([
    phloApiRequest(`/api/v1/overview${suffix}`),
    phloApiRequest(`/api/v1/services${suffix}`),
    phloApiRequest(`/api/v1/layers${suffix}`),
  ])
  return {
    overview: overviewResponse.parse(overviewValue),
    services: servicesResponse.parse(servicesValue).items,
    layers: layerResponse.parse(layersValue).items,
    refreshedAt: new Date().toISOString(),
  }
}
