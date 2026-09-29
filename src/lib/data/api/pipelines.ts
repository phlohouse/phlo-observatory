import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { phloApiRequest } from './client'

const environment = z.enum(['prod', 'staging'])
const envInput = z.object({ env: environment.default('prod') })
const job = z.object({
  id: z.string(), repository_name: z.string(), description: z.string().nullable(),
  selected_assets: z.array(z.array(z.string())), assets_url: z.string(), runs_url: z.string(),
  incidents_url: z.string(), resource_id: z.string(),
})
const schedule = z.object({ id: z.string(), job_id: z.string(), status: z.string(), resource_id: z.string() })
const run = z.object({
  run_id: z.string(), job_id: z.string(), status: z.string(), created_at: z.string(),
  started_at: z.string().nullable(), ended_at: z.string().nullable(), duration_seconds: z.number().nonnegative().nullable(),
  selected_assets: z.array(z.array(z.string())), logs_url: z.string(), resource_id: z.string(),
})
const jobsPage = z.object({ env: environment, items: z.array(job), next_cursor: z.null().optional() })
const schedulesPage = z.object({ env: environment, items: z.array(schedule) })
const runsPage = z.object({ env: environment, items: z.array(run), next_cursor: z.null().optional() })
const summary = z.object({ env: environment, job_id: z.string(), scanned_runs: z.number().int().nonnegative(), counts_by_status: z.record(z.string(), z.number().int().nonnegative()), duration_histogram_seconds: z.record(z.string(), z.number().int().nonnegative()) })
const patterns = z.object({ env: environment, job_id: z.string(), scanned_runs: z.number().int().nonnegative(), items: z.array(z.object({ kind: z.enum(['failure', 'slow_run']), job_id: z.string(), count: z.number().int().positive(), run_ids: z.array(z.string()), typical_duration_seconds: z.number().nonnegative().nullable().optional() })) })
const runEvents = z.object({ env: environment, run_id: z.string(), items: z.array(z.object({ event_type: z.string(), message: z.string(), timestamp: z.string(), step_key: z.string().nullable() })), truncated: z.boolean(), next_cursor: z.string().nullable() })
const runLogs = runEvents.extend({ follow_supported: z.boolean(), status: z.string(), is_terminal: z.boolean() })
const maintenance = z.object({ env: environment, status: z.enum(['configured', 'unavailable']), items: z.array(z.object({ id: z.string(), starts_at: z.string(), ends_at: z.string(), description: z.string().nullable() })) })

export const clientResponseSchemas = {
  'GET /api/v1/jobs': jobsPage,
  'GET /api/v1/schedules': schedulesPage,
  'GET /api/v1/runs': runsPage,
  'GET /api/v1/jobs/{job_id}': job,
  'GET /api/v1/jobs/{job_id}/schedules': schedulesPage,
  'GET /api/v1/jobs/{job_id}/summary': summary,
  'GET /api/v1/jobs/{job_id}/patterns': patterns,
  'GET /api/v1/runs/{run_id}': run,
  'GET /api/v1/runs/{run_id}/timeline': runEvents,
  'GET /api/v1/runs/{run_id}/logs': runLogs,
  'GET /api/v1/maintenance-windows': maintenance,
}

export type Job = z.infer<typeof job>
export type Run = z.infer<typeof run>

export const getPipelineList = createServerFn({ method: 'GET' }).validator(envInput).handler(async ({ data: { env } }) => {
  const [jobsValue, schedulesValue, runsValue] = await Promise.all([
    phloApiRequest(`/api/v1/jobs?env=${env}`), phloApiRequest(`/api/v1/schedules?env=${env}`), phloApiRequest(`/api/v1/runs?env=${env}&limit=100`),
  ])
  return { env, jobs: jobsPage.parse(jobsValue).items, schedules: schedulesPage.parse(schedulesValue).items, runs: runsPage.parse(runsValue).items }
})

export const getPipelineJob = createServerFn({ method: 'GET' }).validator(z.object({ id: z.string().min(1).max(512), env: environment.default('prod'), runId: z.string().min(1).max(512).optional() })).handler(async ({ data: { id, env, runId } }) => {
  const jobId = encodeURIComponent(id)
  const [jobValue, schedulesValue, runsValue, summaryValue, patternsValue] = await Promise.all([
    phloApiRequest(`/api/v1/jobs/${jobId}?env=${env}`), phloApiRequest(`/api/v1/jobs/${jobId}/schedules?env=${env}`),
    phloApiRequest(`/api/v1/runs?env=${env}&limit=100&job_id=${jobId}`), phloApiRequest(`/api/v1/jobs/${jobId}/summary?env=${env}`), phloApiRequest(`/api/v1/jobs/${jobId}/patterns?env=${env}`),
  ])
  const runs = runsPage.parse(runsValue).items
  const selectedRunId = runId && runs.some((item) => item.run_id === runId) ? runId : undefined
  const selectedRun = selectedRunId
    ? await Promise.all([
        phloApiRequest(`/api/v1/runs/${encodeURIComponent(selectedRunId)}?env=${env}`),
        phloApiRequest(`/api/v1/runs/${encodeURIComponent(selectedRunId)}/timeline?env=${env}&limit=100`),
        phloApiRequest(`/api/v1/runs/${encodeURIComponent(selectedRunId)}/logs?env=${env}&limit=100`),
      ])
    : undefined
  return { env, job: job.parse(jobValue), schedules: schedulesPage.parse(schedulesValue).items, runs, summary: summary.parse(summaryValue), patterns: patterns.parse(patternsValue), selectedRun: selectedRun === undefined ? undefined : run.parse(selectedRun[0]), events: selectedRun === undefined ? undefined : runEvents.parse(selectedRun[1]), logs: selectedRun === undefined ? undefined : runLogs.parse(selectedRun[2]) }
})

export const getRunTimeline = createServerFn({ method: 'GET' }).validator(envInput).handler(async ({ data: { env } }) => {
  const [runsValue, maintenanceValue] = await Promise.all([phloApiRequest(`/api/v1/runs?env=${env}&limit=100`), phloApiRequest(`/api/v1/maintenance-windows?env=${env}`)])
  return { env, runs: runsPage.parse(runsValue).items, maintenance: maintenance.parse(maintenanceValue) }
})
