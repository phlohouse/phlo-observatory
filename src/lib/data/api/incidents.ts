/**
 * Server functions for the incident screens. The shared incident records come from core
 * (getIncidents / getIncident); these add the triage stats and per-incident detail.
 */
import { createServerFn } from '@tanstack/react-start'
import * as core from '../fixtures/core'
import * as fx from '../fixtures/incidents'

export const getIncidentList = createServerFn({ method: 'GET' }).handler(async () => ({
  incidents: core.incidents,
  triage: fx.triage,
  owners: fx.owners.map((o) => ({ ...o })),
  assets: core.assets.map((a) => ({ id: a.id, layer: a.layer, owner: a.owner })),
}))

/** Detail for incidents this area renders itself: #214 and the resolved post-mortems. */
export const getIncidentDetail = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => ({
    open214: id === '214' ? fx.incident214 : undefined,
    resolved: fx.resolvedDetails[id],
  }))
