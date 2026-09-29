import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const environmentSchema = z.enum(['prod', 'staging'])
const jsonValueSchema = z.json()
const envInput = z.object({ env: environmentSchema })

const catalogResponse = z.object({
  env: environmentSchema,
  nessie_ref: z.string(),
  engine: z.string(),
  catalogs: z.array(
    z.object({
      name: z.string(),
      schemas: z.array(z.object({ name: z.string(), tables: z.array(z.string()) })),
      truncated: z.boolean(),
    }),
  ),
})

const refsResponse = z.object({
  env: environmentSchema,
  items: z.array(z.object({ env: environmentSchema, name: z.string(), catalog: z.string() })),
})

const enginesResponse = z.object({
  env: environmentSchema,
  items: z.array(z.object({ id: z.string(), status: z.enum(['configured', 'unavailable']) })),
})

const savedQuerySchema = z.object({
  id: z.string(),
  env: environmentSchema,
  nessie_ref: z.string(),
  name: z.string(),
  sql: z.string(),
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.string(), jsonValueSchema),
})

const savedQueryResponse = z.object({
  env: environmentSchema,
  items: z.array(savedQuerySchema),
})

const queryResultSchema = z.object({
  columns: z.array(z.object({ name: z.string(), type: z.string().optional() })),
  rows: z.array(z.record(z.string(), jsonValueSchema)),
  has_more: z.boolean(),
})

const querySessionSchema = z.object({
  id: z.string(),
  env: environmentSchema,
  nessie_ref: z.string(),
  status: z.enum(['queued', 'running', 'cancelling', 'completed', 'failed', 'cancelled']),
  sql_hash: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  result: queryResultSchema.nullable(),
  error: z.string().nullable(),
})

const queryInput = z.object({ env: environmentSchema, sql: z.string().min(1).max(64 * 1024) })

export const clientResponseSchemas = {
  'GET /api/v1/query/catalog': catalogResponse,
  'GET /api/v1/query/refs': refsResponse,
  'GET /api/v1/query/engines': enginesResponse,
  'GET /api/v1/queries/saved': savedQueryResponse,
  'POST /api/v1/queries': querySessionSchema,
  'POST /api/v1/queries/explain': querySessionSchema,
  'GET /api/v1/queries/{query_id}': querySessionSchema,
  'POST /api/v1/queries/{query_id}/cancel': querySessionSchema,
  'GET /api/v1/queries/{query_id}/csv': z.string(),
  'POST /api/v1/queries/saved': savedQuerySchema,
  'PUT /api/v1/queries/saved/{query_id}': savedQuerySchema,
}

export const clientRequestSchemas = {
  'POST /api/v1/queries': z.object({ sql: z.string(), row_limit: z.number().int().min(1).max(100) }),
  'POST /api/v1/queries/explain': z.object({ sql: z.string(), row_limit: z.number().int().min(1).max(100) }),
  'POST /api/v1/queries/saved': z.object({ env: environmentSchema, name: z.string(), sql: z.string() }),
  'PUT /api/v1/queries/saved/{query_id}': z.object({ env: environmentSchema, expected_version: z.number().int().positive(), name: z.string(), sql: z.string() }),
  'DELETE /api/v1/queries/saved/{query_id}': z.object({ env: environmentSchema, expected_version: z.number().int().positive() }),
}

export type QueryCatalogLayer = {
  layer: string
  count: number
  tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }>
  truncated: boolean
}
export type SavedQuery = z.infer<typeof savedQuerySchema>
export type QueryEngine = z.infer<typeof enginesResponse>['items'][number]
export type QuerySession = z.infer<typeof querySessionSchema>
export type QueryResult = z.infer<typeof queryResultSchema>

export const getQueryWorkspace = createServerFn({ method: 'GET' })
  .validator(envInput)
  .handler(async ({ data: { env } }) => {
    const suffix = `?env=${env}` as const
    const [catalogValue, refsValue, enginesValue, savedValue] = await Promise.all([
      phloApiRequest(`/api/v1/query/catalog${suffix}`),
      phloApiRequest(`/api/v1/query/refs${suffix}`),
      phloApiRequest(`/api/v1/query/engines${suffix}`),
      phloApiRequest(`/api/v1/queries/saved${suffix}`),
    ])

    const catalog = catalogResponse.parse(catalogValue)
    const refs = refsResponse.parse(refsValue)
    const engines = enginesResponse.parse(enginesValue)
    const saved = savedQueryResponse.parse(savedValue)

    return {
      env,
      nessieRef: catalog.nessie_ref,
      catalog: catalog.catalogs.flatMap((item) =>
        item.schemas.map((schema) => ({
          layer: schema.name,
          count: schema.tables.length,
          tables: schema.tables.map((name) => ({ name, columns: [] })),
          truncated: item.truncated,
        })),
      ),
      saved: saved.items,
      refs: refs.items,
      engines: engines.items,
    }
  })

export const submitQuery = createServerFn({ method: 'POST' })
  .validator(queryInput)
  .handler(async ({ data: { env, sql } }) =>
    querySessionSchema.parse(
      await phloApiRequest(`/api/v1/queries?env=${env}`, {
        method: 'POST',
        body: { sql, row_limit: 100 },
      }),
    ),
  )

export const explainQuery = createServerFn({ method: 'POST' })
  .validator(queryInput)
  .handler(async ({ data: { env, sql } }) =>
    querySessionSchema.parse(
      await phloApiRequest(`/api/v1/queries/explain?env=${env}`, {
        method: 'POST',
        body: { sql, row_limit: 100 },
      }),
    ),
  )

export const getQuerySession = createServerFn({ method: 'GET' })
  .validator(z.object({ env: environmentSchema, id: z.string().min(1).max(128) }))
  .handler(async ({ data: { env, id } }) =>
    querySessionSchema.parse(
      await phloApiRequest(`/api/v1/queries/${encodeURIComponent(id)}?env=${env}`),
    ),
  )

export const cancelQuery = createServerFn({ method: 'POST' })
  .validator(z.object({ env: environmentSchema, id: z.string().min(1).max(128) }))
  .handler(async ({ data: { env, id } }) =>
    querySessionSchema.parse(
      await phloApiRequest(`/api/v1/queries/${encodeURIComponent(id)}/cancel?env=${env}`, {
        method: 'POST',
      }),
    ),
  )

export const exportQueryCsv = createServerFn({ method: 'GET' })
  .validator(z.object({ env: environmentSchema, id: z.string().min(1).max(128) }))
  .handler(async ({ data: { env, id } }) =>
    z.string().parse(
      await phloApiRequest(`/api/v1/queries/${encodeURIComponent(id)}/csv?env=${env}`, {
        responseType: 'text',
      }),
    ),
  )

export const saveQuery = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      env: environmentSchema,
      name: z.string().trim().min(1).max(120),
      sql: z.string().min(1).max(64 * 1024),
      idempotencyKey: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) =>
    savedQuerySchema.parse(
      await phloApiRequest(`/api/v1/queries/saved?env=${data.env}`, {
        method: 'POST',
        body: { env: data.env, name: data.name, sql: data.sql },
        idempotencyKey: data.idempotencyKey,
      }),
    ),
  )

export const updateSavedQuery = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      env: environmentSchema,
      id: z.string().min(1).max(128),
      expectedVersion: z.number().int().positive(),
      name: z.string().trim().min(1).max(120),
      sql: z.string().min(1).max(64 * 1024),
      idempotencyKey: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) =>
    savedQuerySchema.parse(
      await phloApiRequest(`/api/v1/queries/saved/${encodeURIComponent(data.id)}?env=${data.env}`, {
        method: 'PUT',
        body: {
          env: data.env,
          expected_version: data.expectedVersion,
          name: data.name,
          sql: data.sql,
        },
        idempotencyKey: data.idempotencyKey,
      }),
    ),
  )

export const deleteSavedQuery = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      env: environmentSchema,
      id: z.string().min(1).max(128),
      expectedVersion: z.number().int().positive(),
      idempotencyKey: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    await phloApiRequest(`/api/v1/queries/saved/${encodeURIComponent(data.id)}?env=${data.env}`, {
      method: 'DELETE',
      body: { env: data.env, expected_version: data.expectedVersion },
      idempotencyKey: data.idempotencyKey,
    })
    return data.id
  })
