import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const scalarSetting = z.union([z.string(), z.number(), z.boolean(), z.null()])
const settingsResponse = z.object({
  version: z.number().int().nonnegative(),
  values: z.record(z.string(), scalarSetting),
})
const meResponse = z.object({
  subject: z.string().min(1),
  principal_type: z.enum(['user', 'service', 'platform']),
  email: z.string().nullable(),
  roles: z.array(z.string()),
  permissions: z.object({
    prod: z.array(z.enum(['service.read', 'run.read'])),
    staging: z.array(z.enum(['service.read', 'run.read'])),
  }),
})
const member = z.object({
  subject: z.string(),
  email: z.string().nullable(),
  principal_type: z.string(),
  roles: z.array(z.string()),
  active: z.boolean(),
  version: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
})
const invitation = z.object({
  invitation_id: z.string(),
  email: z.string(),
  roles: z.array(z.string()),
  status: z.string(),
  invited_by: z.string(),
  expires_at: z.string(),
  created_at: z.string(),
})
const serviceAccount = z.object({
  subject: z.string(),
  name: z.string(),
  roles: z.array(z.string()),
  active: z.boolean(),
  version: z.number().int(),
  created_at: z.string(),
})
const membersResponse = z.object({ items: z.array(member) })
const invitationsResponse = z.object({ items: z.array(invitation) })
const serviceAccountsResponse = z.object({ items: z.array(serviceAccount) })

export type AdminSettings = z.infer<typeof settingsResponse>
export type AdminIdentity = {
  me: z.infer<typeof meResponse>
  members: z.infer<typeof membersResponse>['items']
  invitations: z.infer<typeof invitationsResponse>['items']
  serviceAccounts: z.infer<typeof serviceAccountsResponse>['items']
}

/** Read-only admin settings for the Wave 9 preview. */
export const getAdminSettings = createServerFn({ method: 'GET' }).handler(async () =>
  settingsResponse.parse(await phloApiRequest('/api/v1/admin/settings')),
)

/** Read-only identity administration data for the Wave 9 preview. */
export const getAdminIdentity = createServerFn({ method: 'GET' }).handler(async (): Promise<AdminIdentity> => {
  const [meValue, membersValue, invitationsValue, serviceAccountsValue] = await Promise.all([
    phloApiRequest('/api/v1/me'),
    phloApiRequest('/api/v1/admin/members'),
    phloApiRequest('/api/v1/admin/invitations'),
    phloApiRequest('/api/v1/admin/service-accounts'),
  ])
  return {
    me: meResponse.parse(meValue),
    members: membersResponse.parse(membersValue).items,
    invitations: invitationsResponse.parse(invitationsValue).items,
    serviceAccounts: serviceAccountsResponse.parse(serviceAccountsValue).items,
  }
})
