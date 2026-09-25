/**
 * Server functions for the staging environment. Later: diffs come from comparing the staging
 * Dagster code location and Nessie branch with prod; promotions from open staging → prod merges.
 */
import { createServerFn } from '@tanstack/react-start'
import * as fx from '../fixtures/staging'

export const getStagingOverview = createServerFn({ method: 'GET' }).handler(async () => ({
  kpis: fx.stagingKpis,
  diffs: fx.stagingDiffs,
  groupTitles: fx.stagingGroupTitles,
  promotions: fx.promotions,
  source: fx.stagingSource,
}))
