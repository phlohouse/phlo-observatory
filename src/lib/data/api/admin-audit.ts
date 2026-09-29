import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { PhloApiError, phloApiRequest } from './client'

const filterValue = z.string().min(1).max(512)
const surface = z.string().min(1).max(255).regex(/^[A-Za-z0-9_.:-]+$/)
const auditQuery = z.object({
  surface: surface.default('phlo-api'),
  search: z.string().min(1).max(200).optional(),
  actor_subject: filterValue.optional(),
  action: filterValue.optional(),
})

const auditRecord = z.object({
  sequence_number: z.number().int().positive(),
  sealed_at: z.string(),
  previous_hash: z.string(),
  record_hash: z.string(),
  event: z.record(z.string(), z.json()),
})

const auditRecordPage = z.object({
  surface: z.string(),
  items: z.array(auditRecord),
  next_after: z.number().int().nonnegative().nullable(),
  scan_truncated: z.boolean(),
})

const auditVerification = z.object({
  surface: z.string(),
  valid: z.boolean(),
  total_records: z.number().int().nonnegative(),
  first_invalid_sequence: z.number().int().positive().nullable().optional(),
  error_message: z.string().nullable().optional(),
})

const auditExport = z.string()

export const clientResponseSchemas = {
  'GET /api/v1/admin/audit/records': auditRecordPage,
  'GET /api/v1/admin/audit/verify': auditVerification,
  'GET /api/v1/admin/audit/export': auditExport,
}

export type AuditRecord = z.infer<typeof auditRecord>
export type AuditVerification = z.infer<typeof auditVerification>
export type AuditQuery = z.infer<typeof auditQuery>
export type AuditLogResult =
  | { kind: 'available'; records: z.infer<typeof auditRecordPage>; verification: AuditVerification }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

export const getAdminAuditLog = createServerFn({ method: 'GET' })
  .validator(auditQuery)
  .handler(async ({ data }): Promise<AuditLogResult> => {
    const params = new URLSearchParams({ surface: data.surface, limit: '100' })
    if (data.search) params.set('search', data.search)
    if (data.actor_subject) params.set('actor_subject', data.actor_subject)
    if (data.action) params.set('action', data.action)

    try {
      const [records, verification] = await Promise.all([
        phloApiRequest(`/api/v1/admin/audit/records?${params.toString()}`),
        phloApiRequest(`/api/v1/admin/audit/verify?surface=${encodeURIComponent(data.surface)}`),
      ])
      return { kind: 'available', records: auditRecordPage.parse(records), verification: auditVerification.parse(verification) }
    } catch (error) {
      if (error instanceof PhloApiError && error.status === 503) {
        return { kind: 'unavailable', message: 'Durable audit storage is unavailable.' }
      }
      return { kind: 'error', message: error instanceof Error ? error.message : 'The audit API returned an unknown error.' }
    }
  })

export const exportAdminAudit = createServerFn({ method: 'GET' })
  .validator(auditQuery.pick({ surface: true }))
  .handler(async ({ data }) => {
    const value = await phloApiRequest(`/api/v1/admin/audit/export?surface=${encodeURIComponent(data.surface)}&limit=5000`, { responseType: 'text' })
    return auditExport.parse(value)
  })
