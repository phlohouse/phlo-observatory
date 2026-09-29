import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const incident = z.object({
  id: z.string(),
  asset_id: z.string(),
  kind: z.string(),
  title: z.string(),
  status: z.enum(['open', 'acknowledged', 'resolved']),
  owner: z.string().nullable(),
  version: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
})
const incidentPage = z.object({
  env: z.enum(['prod', 'staging']),
  items: z.array(incident),
  next_cursor: z.string().nullable(),
})
const stats = z.object({ env: z.enum(['prod', 'staging']), counts: z.record(z.string(), z.number().int().nonnegative()) })
const timeline = z.object({ items: z.array(z.object({ id: z.string(), actor: z.string(), kind: z.string(), payload: z.record(z.string(), z.json()), occurred_at: z.string() })) })

export const clientResponseSchemas = {
  'GET /api/v1/incidents': incidentPage,
  'GET /api/v1/incidents/stats': stats,
  'GET /api/v1/incidents/{incident_id}': incident,
  'GET /api/v1/incidents/{incident_id}/timeline': timeline,
}

export const getIncidentList = createServerFn({ method: 'GET' })
  .validator(z.object({ env: z.enum(['prod', 'staging']).default('prod') }))
  .handler(async ({ data: { env } }) => {
  const [pageValue, statsValue] = await Promise.all([
    phloApiRequest(`/api/v1/incidents?env=${env}&limit=500`),
    phloApiRequest(`/api/v1/incidents/stats?env=${env}`),
  ])
  const page = incidentPage.parse(pageValue)
  const summary = stats.parse(statsValue)
  return { env, incidents: page.items, counts: summary.counts, truncated: page.next_cursor !== null }
  })

export const getIncidentDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().min(1).max(512), env: z.enum(['prod', 'staging']).default('prod') }))
  .handler(async ({ data: { id, env } }) => {
    const [incidentValue, timelineValue] = await Promise.all([
      phloApiRequest(`/api/v1/incidents/${encodeURIComponent(id)}?env=${env}`),
      phloApiRequest(`/api/v1/incidents/${encodeURIComponent(id)}/timeline?env=${env}`),
    ])
    return { env, incident: incident.parse(incidentValue), timeline: timeline.parse(timelineValue).items }
  })
