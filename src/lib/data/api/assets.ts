import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const environment = z.enum(['prod', 'staging'])

const assetView = z.object({
  id: z.string(),
  key: z.array(z.string()),
  description: z.string().nullable(),
  compute_kind: z.string().nullable(),
  group_name: z.string().nullable(),
  is_source: z.boolean(),
  dependencies: z.array(z.array(z.string())),
  last_materialization_at: z.string().nullable(),
  last_run_id: z.string().nullable(),
  relation: z.string().nullable().optional(),
  history_scoped: z.boolean(),
})

const assetPage = z.object({
  env: environment,
  items: z.array(assetView),
  next_cursor: z.string().nullable(),
})

const assetDetail = assetView.extend({
  columns: z.array(z.object({ name: z.string(), type: z.string().nullable(), description: z.string().nullable() })),
  schema_observed_at: z.string().nullable(),
  column_lineage: z.record(z.string(), z.array(z.object({ asset_key: z.array(z.string()), column_name: z.string() }))).nullable().optional(),
})

const assetRuns = z.object({
  env: environment,
  asset_id: z.string(),
  items: z.array(z.object({
    run_id: z.string(),
    status: z.string(),
    created_at: z.string(),
    started_at: z.string().nullable(),
    ended_at: z.string().nullable(),
  })),
  next_cursor: z.string().nullable(),
})

const envInput = z.object({ env: environment.default('prod') })

export type Asset = z.infer<typeof assetView>
export type AssetDetail = z.infer<typeof assetDetail>
export type AssetRun = z.infer<typeof assetRuns>['items'][number]

export const getAssetList = createServerFn({ method: 'GET' })
  .validator(envInput)
  .handler(async ({ data: { env } }) => {
    const value = await phloApiRequest(`/api/v1/assets?env=${env}&limit=100`)
    return assetPage.parse(value)
  })

export const getAssetDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().min(1).max(512), env: environment.default('prod') }))
  .handler(async ({ data: { id, env } }) => {
    const path = encodeURIComponent(id)
    const detail = assetDetail.parse(await phloApiRequest(`/api/v1/assets/${path}?env=${env}`))
    const runHistory = detail.history_scoped
      ? assetRuns.parse(await phloApiRequest(`/api/v1/assets/${path}/runs?env=${env}&limit=100`))
      : null
    return {
      env,
      asset: detail,
      runs: runHistory,
    }
  })
