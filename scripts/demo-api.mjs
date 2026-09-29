import { createServer } from 'node:http'

const sessions = new Map()
const queryPolls = new Map()
const saved = []

function send(response, value, status = 200, type = 'application/json') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  response.end(type === 'application/json' ? JSON.stringify(value) : value)
}

function querySession(id, env, sql, explain = false) {
  return {
    id,
    env,
    nessie_ref: env === 'prod' ? 'main' : 'staging-main',
    status: 'completed',
    sql_hash: 'demo-only',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    result: {
      columns: explain ? [{ name: 'Query Plan', type: 'varchar' }] : [
        { name: 'batch_id', type: 'varchar' },
        { name: 'sample_count', type: 'integer' },
      ],
      rows: explain
        ? [{ 'Query Plan': `Mock plan for: ${sql}` }]
        : [{ batch_id: env === 'prod' ? 'batch-prod-042' : 'batch-stage-017', sample_count: env === 'prod' ? 184 : 29 }],
      has_more: false,
    },
    error: null,
  }
}

function assetsFor(env) {
  const asset = env === 'prod'
    ? { id: 'gold.batch_release_metrics', key: ['gold', 'batch_release_metrics'], description: 'Release metrics for production batches.', compute_kind: 'dbt', group_name: 'gold', is_source: false, dependencies: [['silver.run_summaries']], last_materialization_at: new Date().toISOString(), last_run_id: 'prod-run-042', relation: 'phlo_prod.gold.batch_release_metrics', history_scoped: true }
    : { id: 'silver.qc_results', key: ['silver', 'qc_results'], description: 'Quality control results for staging batches.', compute_kind: 'sql', group_name: 'silver', is_source: false, dependencies: [['bronze.instrument_samples']], last_materialization_at: new Date().toISOString(), last_run_id: 'stage-run-017', relation: 'phlo_staging.silver.qc_results', history_scoped: true }
  return [asset]
}

function jobsFor(env) {
  const id = env === 'prod' ? 'refresh-release-metrics' : 'validate-qc-results'
  const assetId = env === 'prod' ? 'gold.batch_release_metrics' : 'silver.qc_results'
  const runId = env === 'prod' ? 'prod-run-042' : 'stage-run-017'
  return {
    job: { id, repository_name: env === 'prod' ? 'phlo-prod' : 'phlo-staging', description: `Disposable ${env} demo job.`, selected_assets: [assetId.split('.')], assets_url: `/api/v1/assets?env=${env}`, runs_url: `/api/v1/runs?env=${env}&job_id=${id}`, incidents_url: `/api/v1/incidents?env=${env}`, resource_id: `demo-job:${env}:${id}` },
    schedule: { id: `${id}-hourly`, job_id: id, status: 'RUNNING', resource_id: `demo-schedule:${env}:${id}` },
    run: { run_id: runId, job_id: id, status: env === 'prod' ? 'SUCCESS' : 'FAILURE', created_at: new Date().toISOString(), started_at: new Date().toISOString(), ended_at: new Date().toISOString(), duration_seconds: env === 'prod' ? 48 : 93, selected_assets: [assetId.split('.')], logs_url: `/api/v1/runs/${runId}/logs?env=${env}`, resource_id: `demo-run:${env}:${runId}` },
  }
}

function branchesFor(env) {
  return [
    { env, name: env === 'prod' ? 'main' : 'staging-main', type: 'BRANCH', hash: env === 'prod' ? 'prod-a1b2c3' : 'stage-d4e5f6', protected: true },
    { env, name: env === 'prod' ? 'feature-qc' : 'feature-validation', type: 'BRANCH', hash: env === 'prod' ? 'prod-b2c3d4' : 'stage-e5f6a7', protected: false },
  ]
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost:4010')
  const env = url.searchParams.get('env') === 'staging' ? 'staging' : 'prod'
  const prefix = '/api/v1/'
  if (!url.pathname.startsWith(prefix)) return send(response, { detail: { error: 'not_found' } }, 404)

  if (url.pathname === '/api/v1/environments') {
    return send(response, { items: [{ env: 'prod', status: 'available' }, { env: 'staging', status: 'available' }] })
  }
  if (url.pathname === '/api/v1/me') {
    return send(response, {
      subject: 'demo:operator',
      principal_type: 'user',
      email: 'operator@example.invalid',
      roles: ['admin', 'operator'],
      permissions: {
        prod: ['service.read', 'run.read'],
        staging: ['service.read', 'run.read'],
      },
    })
  }
  if (url.pathname === '/api/v1/admin/settings' && request.method === 'GET') {
    return send(response, { version: 2, values: { 'alerts.channel': '#phlo-demo', 'runs.retention_days': 30 } })
  }
  if (url.pathname === '/api/v1/admin/members' && request.method === 'GET') {
    return send(response, { items: [
      { subject: 'demo:operator', email: 'operator@example.invalid', principal_type: 'user', roles: ['admin', 'operator'], active: true, version: 1, created_at: '2026-09-20T12:00:00Z', updated_at: '2026-09-20T12:00:00Z' },
      { subject: 'demo:analyst', email: 'analyst@example.invalid', principal_type: 'user', roles: ['analyst'], active: true, version: 1, created_at: '2026-09-21T12:00:00Z', updated_at: '2026-09-21T12:00:00Z' },
    ] })
  }
  if (url.pathname === '/api/v1/admin/invitations' && request.method === 'GET') {
    return send(response, { items: [{ invitation_id: 'demo-invitation-1', email: 'reviewer@example.invalid', roles: ['viewer'], status: 'pending', invited_by: 'demo:operator', expires_at: '2026-10-01T12:00:00Z', created_at: '2026-09-24T12:00:00Z' }] })
  }
  if (url.pathname === '/api/v1/admin/service-accounts' && request.method === 'GET') {
    return send(response, { items: [{ subject: 'demo:automation', name: 'demo-automation', roles: ['service'], active: true, version: 1, created_at: '2026-09-18T12:00:00Z' }] })
  }
  if (url.pathname === '/api/v1/admin/audit/records' && request.method === 'GET') {
    return send(response, { surface: url.searchParams.get('surface') ?? 'phlo-api', items: [], next_after: null, scan_truncated: false })
  }
  if (url.pathname === '/api/v1/admin/audit/verify' && request.method === 'GET') {
    return send(response, { surface: url.searchParams.get('surface') ?? 'phlo-api', valid: true, total_records: 0, first_invalid_sequence: null, error_message: null })
  }
  if (url.pathname === '/api/v1/admin/audit/export' && request.method === 'GET') {
    return send(response, '', 200, 'application/x-ndjson')
  }
  if (url.pathname === '/api/v1/services') {
    return send(response, { env, next_cursor: null, items: [
      { id: 'dagster', status: 'healthy', observed_at: new Date().toISOString(), response_time_seconds: 0.052 },
      { id: 'nessie', status: env === 'prod' ? 'healthy' : 'degraded', observed_at: new Date().toISOString(), response_time_seconds: env === 'prod' ? 0.038 : null },
    ] })
  }
  if (url.pathname === '/api/v1/incidents' && request.method === 'GET') {
    const items = env === 'prod'
      ? [
          { id: 'demo-prod-214', asset_id: 'bronze.bioreactor_telemetry', kind: 'freshness', title: 'Telemetry freshness breach', status: 'open', owner: 'Data Platform', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'demo-prod-208', asset_id: 'gold.batch_release_metrics', kind: 'audit', title: 'Batch release quality check failed', status: 'acknowledged', owner: 'QC Analytics', version: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'demo-prod-198', asset_id: 'silver.run_summaries', kind: 'schema', title: 'Schema change reviewed', status: 'resolved', owner: 'Assay Dev', version: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ]
      : [{ id: 'demo-stage-007', asset_id: 'silver.qc_results', kind: 'audit', title: 'Staging QC validation failed', status: 'open', owner: null, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
    return send(response, { env, items, next_cursor: null })
  }
  if (url.pathname === '/api/v1/incidents/stats') {
    return send(response, { env, counts: env === 'prod' ? { open: 2, acknowledged: 1, resolved: 4 } : { open: 1, resolved: 0 } })
  }
  const incidentMatch = url.pathname.match(/^\/api\/v1\/incidents\/([^/]+)(?:\/timeline)?$/)
  if (incidentMatch) {
    const id = incidentMatch[1]
    const item = (env === 'prod'
      ? [
          { id: 'demo-prod-214', asset_id: 'bronze.bioreactor_telemetry', kind: 'freshness', title: 'Telemetry freshness breach', status: 'open', owner: 'Data Platform', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'demo-prod-208', asset_id: 'gold.batch_release_metrics', kind: 'audit', title: 'Batch release quality check failed', status: 'acknowledged', owner: 'QC Analytics', version: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'demo-prod-198', asset_id: 'silver.run_summaries', kind: 'schema', title: 'Schema change reviewed', status: 'resolved', owner: 'Assay Dev', version: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ]
      : [{ id: 'demo-stage-007', asset_id: 'silver.qc_results', kind: 'audit', title: 'Staging QC validation failed', status: 'open', owner: null, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
    ).find((record) => record.id === id)
    if (!item) return send(response, { detail: { error: 'incident_not_found' } }, 404)
    if (url.pathname.endsWith('/timeline')) return send(response, { items: [{ id: `${id}-created`, actor: 'demo-operator', kind: 'created', payload: { preview: true }, occurred_at: item.created_at }] })
    return send(response, item)
  }
  if (url.pathname === '/api/v1/overview') {
    return send(response, {
      env,
      asset_count: env === 'prod' ? 148 : 26,
      materialized_asset_count: env === 'prod' ? 141 : 20,
      latest_materialization_at: new Date().toISOString(),
      incident_counts: env === 'prod' ? { open: 2, acknowledged: 1, resolved: 4 } : { open: 1, resolved: 0 },
      freshness_counts: env === 'prod' ? { fresh: 132, stale: 9, unknown: 7 } : { fresh: 18, stale: 2, unknown: 6 },
      run_status_counts: env === 'prod' ? { SUCCESS: 78, FAILURE: 3, STARTED: 2 } : { SUCCESS: 14, FAILURE: 1 },
      run_history_truncated: false,
      quality_checks: { status: 'available', counts: { passing: env === 'prod' ? 63 : 11, total: env === 'prod' ? 68 : 14, unevaluated: env === 'prod' ? 2 : 1 }, failing_assets: env === 'prod' ? ['gold.batch_release_metrics'] : ['silver.qc_results'], reason: null },
    })
  }
  if (url.pathname === '/api/v1/layers') {
    return send(response, { env, next_cursor: null, items: [
      { group_name: 'bronze', asset_count: env === 'prod' ? 55 : 10, materialized_asset_count: env === 'prod' ? 52 : 8, latest_materialization_at: new Date().toISOString() },
      { group_name: 'silver', asset_count: env === 'prod' ? 61 : 11, materialized_asset_count: env === 'prod' ? 57 : 8, latest_materialization_at: new Date().toISOString() },
      { group_name: 'gold', asset_count: env === 'prod' ? 32 : 5, materialized_asset_count: env === 'prod' ? 32 : 4, latest_materialization_at: new Date().toISOString() },
    ] })
  }
  if (url.pathname === '/api/v1/jobs' && request.method === 'GET') return send(response, { env, items: [jobsFor(env).job], next_cursor: null })
  if (url.pathname === '/api/v1/schedules' && request.method === 'GET') return send(response, { env, items: [jobsFor(env).schedule] })
  if (url.pathname === '/api/v1/runs' && request.method === 'GET') {
    const { run } = jobsFor(env)
    const jobId = url.searchParams.get('job_id')
    return send(response, { env, items: !jobId || jobId === run.job_id ? [run] : [], next_cursor: null })
  }
  if (url.pathname === '/api/v1/maintenance-windows' && request.method === 'GET') return send(response, { env, status: 'configured', items: [] })
  const jobEndpoint = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)(?:\/(schedules|summary|patterns))?$/)
  if (jobEndpoint && request.method === 'GET') {
    const [, id, action] = jobEndpoint
    const { job, schedule, run } = jobsFor(env)
    if (id !== job.id) return send(response, { detail: { error: 'job_not_found' } }, 404)
    if (action === 'schedules') return send(response, { env, items: [schedule] })
    if (action === 'summary') return send(response, { env, job_id: id, scanned_runs: 1, counts_by_status: { [run.status]: 1 }, duration_histogram_seconds: { '<60': run.duration_seconds < 60 ? 1 : 0, '60-299': run.duration_seconds >= 60 ? 1 : 0, '300-899': 0, '>=900': 0 } })
    if (action === 'patterns') return send(response, { env, job_id: id, items: env === 'staging' ? [{ kind: 'failure', job_id: id, count: 1, run_ids: [run.run_id], typical_duration_seconds: null }] : [], scanned_runs: 1 })
    return send(response, job)
  }
  const runEndpoint = url.pathname.match(/^\/api\/v1\/runs\/([^/]+)(?:\/(timeline|logs))?$/)
  if (runEndpoint && request.method === 'GET') {
    const [, runId, action] = runEndpoint
    const { run } = jobsFor(env)
    if (runId !== run.run_id) return send(response, { detail: { error: 'run_not_found' } }, 404)
    const events = [{ event_type: 'RunStartEvent', message: 'Demo run started.', timestamp: run.started_at, step_key: null }, { event_type: run.status === 'SUCCESS' ? 'RunSuccessEvent' : 'RunFailureEvent', message: run.status === 'SUCCESS' ? 'Demo run completed.' : 'Demo validation failed.', timestamp: run.ended_at, step_key: null }]
    if (action) return send(response, { env, run_id: runId, items: events, truncated: false, next_cursor: null, ...(action === 'logs' ? { follow_supported: true, status: run.status, is_terminal: true } : {}) })
    return send(response, run)
  }
  if (url.pathname === '/api/v1/branches' && request.method === 'GET') return send(response, { env, items: branchesFor(env).filter((item) => item.type === 'BRANCH') })
  if (url.pathname === '/api/v1/branches/refs' && request.method === 'GET') return send(response, { env, items: [...branchesFor(env), { env, name: env === 'prod' ? 'release-2026-09' : 'staging-baseline', type: 'TAG', hash: env === 'prod' ? 'prod-a1b2c3' : 'stage-d4e5f6', protected: true }] })
  const branchCommitMatch = url.pathname.match(/^\/api\/v1\/branches\/([^/]+)\/commits$/)
  if (branchCommitMatch && request.method === 'GET') {
    const name = decodeURIComponent(branchCommitMatch[1])
    const branch = branchesFor(env).find((item) => item.name === name)
    if (!branch) return send(response, { detail: { error: 'branch_not_found' } }, 404)
    return send(response, { env, branch: name, items: [{ hash: branch.hash, parent_hashes: [], message: `Demo head for ${name}`, author: 'demo-operator', committer: 'demo-operator', committed_at: new Date().toISOString() }], next_cursor: null })
  }
  const branchChangeMatch = url.pathname.match(/^\/api\/v1\/branches\/([^/]+)\/(diff|compare)$/)
  if (branchChangeMatch && request.method === 'GET') {
    const name = decodeURIComponent(branchChangeMatch[1])
    const target = url.searchParams.get('target')
    const references = branchesFor(env)
    const sourceBranch = references.find((item) => item.name === name)
    const targetBranch = references.find((item) => item.name === target)
    if (!sourceBranch || !targetBranch) return send(response, { detail: { error: 'branch_not_found' } }, 404)
    if (branchChangeMatch[2] === 'diff') return send(response, { env, source: name, target, source_hash: sourceBranch.hash, target_hash: targetBranch.hash, items: [{ key: 'demo/model.sql', status: 'modified', from_content_id: targetBranch.hash, to_content_id: sourceBranch.hash }], truncated: false })
    return send(response, { env, source: name, target, source_hash: sourceBranch.hash, target_hash: targetBranch.hash, merge_base: targetBranch.hash, ahead: 1, behind: 0, status: 'compared' })
  }
  const branchMatch = url.pathname.match(/^\/api\/v1\/branches\/([^/]+)$/)
  if (branchMatch && request.method === 'GET') {
    const name = decodeURIComponent(branchMatch[1])
    const branch = branchesFor(env).find((item) => item.name === name)
    return branch ? send(response, branch) : send(response, { detail: { error: 'branch_not_found' } }, 404)
  }
  if (url.pathname === '/api/v1/assets' && request.method === 'GET') {
    return send(response, { env, items: assetsFor(env), next_cursor: null })
  }
  const assetRunsMatch = url.pathname.match(/^\/api\/v1\/assets\/([^/]+)\/runs$/)
  if (assetRunsMatch && request.method === 'GET') {
    const assetId = decodeURIComponent(assetRunsMatch[1])
    const asset = assetsFor(env).find((item) => item.id === assetId)
    if (!asset) return send(response, { detail: { error: 'asset_not_found' } }, 404)
    return send(response, {
      env,
      asset_id: assetId,
      items: [{ run_id: asset.last_run_id, status: 'SUCCESS', created_at: new Date().toISOString(), started_at: new Date().toISOString(), ended_at: new Date().toISOString() }],
      next_cursor: null,
    })
  }
  const assetMatch = url.pathname.match(/^\/api\/v1\/assets\/([^/]+)$/)
  if (assetMatch && request.method === 'GET') {
    const assetId = decodeURIComponent(assetMatch[1])
    const asset = assetsFor(env).find((item) => item.id === assetId)
    if (!asset) return send(response, { detail: { error: 'asset_not_found' } }, 404)
    return send(response, {
      ...asset,
      columns: [{ name: 'batch_id', type: 'varchar', description: 'Unique batch identifier.' }, { name: 'sample_count', type: 'integer', description: null }],
      schema_observed_at: asset.last_materialization_at,
      column_lineage: { batch_id: [{ asset_key: asset.dependencies[0], column_name: 'batch_id' }] },
    })
  }
  if (url.pathname === '/api/v1/query/catalog') {
    return send(response, { env, nessie_ref: env === 'prod' ? 'main' : 'staging-main', engine: 'trino', catalogs: [{ name: env === 'prod' ? 'phlo_prod' : 'phlo_staging', schemas: [{ name: 'bronze', tables: ['bioreactor_telemetry'] }, { name: 'silver', tables: ['run_summaries', 'qc_results'] }, { name: 'gold', tables: ['batch_release_metrics'] }], truncated: false }] })
  }
  if (url.pathname === '/api/v1/query/refs') return send(response, { env, items: [{ env, name: env === 'prod' ? 'main' : 'staging-main', catalog: env === 'prod' ? 'phlo_prod' : 'phlo_staging' }] })
  if (url.pathname === '/api/v1/query/engines') return send(response, { env, items: [{ id: 'trino', status: 'configured' }] })
  if (url.pathname === '/api/v1/queries/saved' && request.method === 'GET') return send(response, { env, items: saved.filter((item) => item.env === env) })
  if (url.pathname === '/api/v1/queries/saved' && request.method === 'POST') {
    const body = await readBody(request)
    const item = { id: `saved-${saved.length + 1}`, env, nessie_ref: env === 'prod' ? 'main' : 'staging-main', name: body.name, sql: body.sql, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: {} }
    saved.push(item)
    return send(response, item, 201)
  }
  if (url.pathname === '/api/v1/queries' || url.pathname === '/api/v1/queries/explain') {
    const body = await readBody(request)
    const id = `demo-${sessions.size + 1}`
    const complete = querySession(id, env, body.sql, url.pathname.endsWith('/explain'))
    const session = { ...complete, status: 'queued', result: null }
    sessions.set(id, session)
    queryPolls.set(id, { complete, polls: 0 })
    return send(response, session, 202)
  }
  const sessionMatch = url.pathname.match(/^\/api\/v1\/queries\/([^/]+)(?:\/(csv|cancel))?$/)
  if (sessionMatch) {
    const [, id, action] = sessionMatch
    if (action === 'csv') return send(response, 'batch_id,sample_count\nbatch-demo,42\n', 200, 'text/csv; charset=utf-8')
    if (action === 'cancel') {
      const session = sessions.get(id)
      queryPolls.delete(id)
      return session ? send(response, { ...session, status: 'cancelled' }) : send(response, { detail: { error: 'query_not_found' } }, 404)
    }
    const poll = queryPolls.get(id)
    if (poll?.polls === 0) {
      poll.polls = 1
      const session = { ...sessions.get(id), status: 'running' }
      sessions.set(id, session)
      return send(response, session)
    }
    if (poll) {
      queryPolls.delete(id)
      sessions.set(id, poll.complete)
    }
    const session = sessions.get(id)
    return session ? send(response, session) : send(response, { detail: { error: 'query_not_found' } }, 404)
  }
  return send(response, { detail: { error: 'not_found' } }, 404)
})

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch (error) { reject(error) }
    })
    request.on('error', reject)
  })
}

server.listen(4010, '0.0.0.0')
