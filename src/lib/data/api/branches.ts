import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const environment = z.enum(['prod', 'staging'])
const reference = z.object({
  env: environment,
  name: z.string(),
  type: z.enum(['BRANCH', 'TAG']),
  hash: z.string(),
  protected: z.boolean(),
})
const referencePage = z.object({ env: environment, items: z.array(reference) })
const commit = z.object({
  hash: z.string(),
  parent_hashes: z.array(z.string()),
  message: z.string().nullable(),
  author: z.string().nullable(),
  committer: z.string().nullable(),
  committed_at: z.string().nullable(),
})
const commitPage = z.object({ env: environment, branch: z.string(), items: z.array(commit), next_cursor: z.string().nullable() })
const branchDiff = z.object({
  env: environment,
  source: z.string(),
  target: z.string(),
  source_hash: z.string(),
  target_hash: z.string(),
  items: z.array(z.object({ key: z.string(), status: z.enum(['added', 'modified', 'deleted']), from_content_id: z.string().nullable(), to_content_id: z.string().nullable() })),
  truncated: z.boolean(),
})
const comparison = z.object({
  env: environment,
  source: z.string(),
  target: z.string(),
  source_hash: z.string(),
  target_hash: z.string(),
  merge_base: z.string().nullable(),
  ahead: z.number().int().nullable(),
  behind: z.number().int().nullable(),
  status: z.enum(['compared', 'unavailable']),
})

export const clientResponseSchemas = {
  'GET /api/v1/branches': referencePage,
  'GET /api/v1/branches/refs': referencePage,
  'GET /api/v1/branches/{branch_name}': reference,
  'GET /api/v1/branches/{branch_name}/commits': commitPage,
  'GET /api/v1/branches/{branch_name}/diff': branchDiff,
  'GET /api/v1/branches/{branch_name}/compare': comparison,
}

const input = z.object({ env: environment.default('prod'), branch: z.string().min(1).max(128).optional() })

export type BranchReference = z.infer<typeof reference>
export type BranchCommit = z.infer<typeof commit>

/** Reads only canonical branch workflow resources; branch actions remain intentionally unavailable. */
export const getBranchesPage = createServerFn({ method: 'GET' })
  .validator(input)
  .handler(async ({ data: { env, branch } }) => {
    const [branchesValue, refsValue] = await Promise.all([
      phloApiRequest(`/api/v1/branches?env=${env}`),
      phloApiRequest(`/api/v1/branches/refs?env=${env}`),
    ])
    const branches = referencePage.parse(branchesValue)
    const refs = referencePage.parse(refsValue)
    const selected = branch
      ? branches.items.find((item) => item.name === branch)
      : branches.items.find((item) => item.protected) ?? branches.items[0]

    if (!selected) return { env, branches: branches.items, tags: refs.items.filter((item) => item.type === 'TAG'), detail: null }

    const target = branches.items.find((item) => item.protected)
    const detailValue = await phloApiRequest(`/api/v1/branches/${encodeURIComponent(selected.name)}?env=${env}`)
    const commitsValue = await phloApiRequest(`/api/v1/branches/${encodeURIComponent(selected.name)}/commits?env=${env}&limit=50`)
    const detail = reference.parse(detailValue)
    const commits = commitPage.parse(commitsValue)
    const related = target && target.name !== selected.name
      ? await Promise.all([
          phloApiRequest(`/api/v1/branches/${encodeURIComponent(selected.name)}/diff?env=${env}&target=${encodeURIComponent(target.name)}`),
          phloApiRequest(`/api/v1/branches/${encodeURIComponent(selected.name)}/compare?env=${env}&target=${encodeURIComponent(target.name)}`),
        ])
      : null

    return {
      env,
      branches: branches.items,
      tags: refs.items.filter((item) => item.type === 'TAG'),
      detail: {
        reference: detail,
        commits: commits.items,
        nextCursor: commits.next_cursor,
        diff: related ? branchDiff.parse(related[0]) : null,
        comparison: related ? comparison.parse(related[1]) : null,
      },
    }
  })
