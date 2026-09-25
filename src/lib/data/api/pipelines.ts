/**
 * Server functions for the Pipelines area. Today they read fixtures; later the job list and
 * run history come from Dagster (GraphQL: repositoriesOrError, runsOrError) and the patterns
 * from phlo's own correlation job.
 */
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import * as fx from '../fixtures/pipelines'

export const getPipelineList = createServerFn({ method: 'GET' }).handler(async () => ({
  summary: fx.pipelineSummary,
  jobs: fx.scaleJobs,
  domains: fx.domainGroups,
}))

export const getPipelineJob = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const detail = fx.jobDetail(name)
    if (!detail) throw notFound()
    return detail
  })

export const getRunTimeline = createServerFn({ method: 'GET' }).handler(async () => ({
  summary: fx.pipelineSummary,
  timeline: fx.timeline,
}))
