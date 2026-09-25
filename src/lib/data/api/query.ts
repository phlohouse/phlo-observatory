/**
 * Server functions for the Query workspace. Today they read fixtures; later the catalog comes from
 * Nessie and queries run through DuckDB (or Trino) against the Iceberg tables on the chosen ref.
 */
import { createServerFn } from '@tanstack/react-start'
import * as fx from '../fixtures/query'

export const getQueryWorkspace = createServerFn({ method: 'GET' }).handler(async () => ({
  catalog: fx.catalog,
  saved: fx.savedQueries,
  savedSql: fx.savedSql,
  tabs: fx.openTabs,
  result: {
    rows: fx.doTrendRows,
    stats: fx.doTrendStats,
    plan: fx.doTrendPlan,
    chart: fx.doTrendChart,
  },
  refs: [...fx.refs],
  engines: [...fx.engines],
}))
