import { clientResponseSchemas as adminAudit } from './admin-audit'
import { clientResponseSchemas as admin } from './admin'
import { clientResponseSchemas as assets } from './assets'
import { clientResponseSchemas as branches } from './branches'
import { clientResponseSchemas as core } from './core'
import { clientResponseSchemas as incidents } from './incidents'
import { clientResponseSchemas as pipelines } from './pipelines'
import { clientRequestSchemas as queryRequests, clientResponseSchemas as query } from './query'

/** Zod response schemas paired with the canonical API operation paths they consume. */
export const clientResponseSchemas = {
  ...core,
  ...assets,
  ...incidents,
  ...pipelines,
  ...branches,
  ...query,
  ...admin,
  ...adminAudit,
}

export const clientRequestSchemas = queryRequests
