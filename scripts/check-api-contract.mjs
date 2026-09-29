import { readFile } from 'node:fs/promises'

export const requiredOperations = new Map([
  ['/api/v1/environments', ['get']],
  ['/api/v1/services', ['get']],
  ['/api/v1/me', ['get']],
  ['/api/v1/overview', ['get']],
  ['/api/v1/layers', ['get']],
  ['/api/v1/incidents', ['get']],
  ['/api/v1/incidents/stats', ['get']],
  ['/api/v1/incidents/{incident_id}', ['get']],
  ['/api/v1/incidents/{incident_id}/timeline', ['get']],
  ['/api/v1/assets', ['get']],
  ['/api/v1/assets/{asset_id}', ['get']],
  ['/api/v1/assets/{asset_id}/runs', ['get']],
  ['/api/v1/jobs', ['get']],
  ['/api/v1/jobs/{job_id}', ['get']],
  ['/api/v1/jobs/{job_id}/summary', ['get']],
  ['/api/v1/jobs/{job_id}/patterns', ['get']],
  ['/api/v1/jobs/{job_id}/schedules', ['get']],
  ['/api/v1/schedules', ['get']],
  ['/api/v1/runs', ['get']],
  ['/api/v1/runs/{run_id}', ['get']],
  ['/api/v1/runs/{run_id}/timeline', ['get']],
  ['/api/v1/runs/{run_id}/logs', ['get']],
  ['/api/v1/maintenance-windows', ['get']],
  ['/api/v1/query/catalog', ['get']],
  ['/api/v1/query/refs', ['get']],
  ['/api/v1/query/engines', ['get']],
  ['/api/v1/queries', ['post']],
  ['/api/v1/queries/explain', ['post']],
  ['/api/v1/queries/saved', ['get', 'post']],
  ['/api/v1/queries/saved/{query_id}', ['put', 'delete']],
  ['/api/v1/queries/{query_id}', ['get']],
  ['/api/v1/queries/{query_id}/cancel', ['post']],
  ['/api/v1/queries/{query_id}/csv', ['get']],
  ['/api/v1/branches', ['get']],
  ['/api/v1/branches/refs', ['get']],
  ['/api/v1/branches/{branch_name}', ['get']],
  ['/api/v1/branches/{branch_name}/commits', ['get']],
  ['/api/v1/branches/{branch_name}/diff', ['get']],
  ['/api/v1/branches/{branch_name}/compare', ['get']],
  ['/api/v1/admin/settings', ['get']],
  ['/api/v1/admin/members', ['get']],
  ['/api/v1/admin/invitations', ['get']],
  ['/api/v1/admin/service-accounts', ['get']],
  ['/api/v1/admin/audit/records', ['get']],
  ['/api/v1/admin/audit/verify', ['get']],
  ['/api/v1/admin/audit/export', ['get']],
])

export function validateOpenApi(document) {
  const paths = document?.paths
  if (typeof paths !== 'object' || paths === null) return ['OpenAPI document has no paths object.']

  const errors = []
  for (const [path, methods] of requiredOperations) {
    const operations = paths[path]
    for (const method of methods) {
      if (typeof operations?.[method] !== 'object' || operations[method] === null) {
        errors.push(`Missing ${method.toUpperCase()} ${path}`)
        continue
      }

      const operation = operations[method]
      const pathParameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])
      for (const parameter of pathParameters) {
        const declared = operation.parameters?.some((item) => item.in === 'path' && item.name === parameter && item.required === true)
        if (!declared) errors.push(`Missing required path parameter ${parameter} on ${method.toUpperCase()} ${path}`)
      }

      const success = Object.entries(operation.responses ?? {}).find(([status]) => /^2\d\d$/.test(status))
      const content = success?.[1]?.content
      const schema = content?.['application/json']?.schema
        ?? content?.['text/csv']?.schema
        ?? content?.['application/octet-stream']?.schema
      if (!success || (content?.['application/json'] && schema === undefined)) {
        errors.push(`Missing successful response schema on ${method.toUpperCase()} ${path}`)
      } else if (schema !== undefined) {
        for (const ref of collectRefs(schema)) {
          if (!resolveRef(document, ref)) errors.push(`Unresolved response schema ${ref} on ${method.toUpperCase()} ${path}`)
        }
      }

      if (['post', 'put', 'patch'].includes(method) && operation.requestBody?.required === true) {
        const requestSchema = operation.requestBody?.content?.['application/json']?.schema
        if (requestSchema === undefined) {
          errors.push(`Missing JSON request schema on ${method.toUpperCase()} ${path}`)
        } else {
          for (const ref of collectRefs(requestSchema)) {
            if (!resolveRef(document, ref)) errors.push(`Unresolved request schema ${ref} on ${method.toUpperCase()} ${path}`)
          }
        }
      }
    }
  }
  return errors
}

function collectRefs(value, refs = []) {
  if (!value || typeof value !== 'object') return refs
  if (typeof value.$ref === 'string') refs.push(value.$ref)
  for (const child of Object.values(value)) collectRefs(child, refs)
  return refs
}

function resolveRef(document, ref) {
  if (!ref.startsWith('#/')) return undefined
  return ref.slice(2).split('/').reduce((value, part) => value?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], document)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const origin = process.env.PHLO_API_BASE_URL
  const [openApiFile] = process.argv.slice(2)
  if (!origin && !openApiFile) {
    console.error('Set PHLO_API_BASE_URL to a disposable or approved API origin; no API was contacted.')
    process.exitCode = 2
  } else {
    try {
      let document
      if (openApiFile) {
        document = JSON.parse(await readFile(openApiFile, 'utf8'))
      } else {
        const url = new URL('/openapi.json', origin)
        if (url.protocol !== 'https:' && !(process.env.NODE_ENV === 'development' && url.hostname === 'localhost')) {
          throw new Error('OpenAPI URL must use HTTPS (or localhost in development).')
        }
        const response = await fetch(url, { redirect: 'error', cache: 'no-store' })
        if (!response.ok) throw new Error(`OpenAPI request failed with status ${response.status}.`)
        document = await response.json()
      }
      const errors = validateOpenApi(document)
      if (errors.length) {
        console.error(`Phlo API/client contract drift detected:\n${errors.map((error) => `- ${error}`).join('\n')}`)
        process.exitCode = 1
      } else {
        console.log(`Phlo API contract check passed: ${requiredOperations.size} paths, ${[...requiredOperations.values()].flat().length} operations.`)
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Phlo API contract check failed.')
      process.exitCode = 1
    }
  }
}
