/**
 * Server functions for the Branches screen. Today they read fixtures; later the list and commits
 * come from Nessie (REST) and the checks from Dagster + the phlo Postgres.
 */
import { createServerFn } from '@tanstack/react-start'
import * as core from '../fixtures/core'
import { branchDetails, branchStartPoints } from '../fixtures/branches'

export const getBranchesPage = createServerFn({ method: 'GET' }).handler(async () => ({
  branches: core.branches,
  tags: core.releaseTags,
  details: branchDetails,
  startPoints: [...branchStartPoints],
  incidents: core.openIncidents.map((i) => ({ id: i.id, title: i.title, kind: i.kind })),
  me: core.members.find((m) => m.you)!,
}))
