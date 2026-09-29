import { readFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
    return nextResolve(specifier, context)
  },
})

const [{ clientRequestSchemas, clientResponseSchemas }, { z }] = await Promise.all([
  import('../src/lib/data/api/contracts.ts'),
  import('zod'),
])
export { clientRequestSchemas, clientResponseSchemas }

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
      const clientSchema = clientResponseSchemas[`${method.toUpperCase()} ${path}`]
      const responseSchemas = Object.values(content ?? {}).map((media) => media.schema).filter(Boolean)
      const schema = responseSchemas.find(hasSchemaType) ?? responseSchemas[0]
      if (!success || (clientSchema && schema === undefined) || (content?.['application/json'] && schema === undefined)) {
        errors.push(`Missing successful response schema on ${method.toUpperCase()} ${path}`)
      } else if (schema !== undefined) {
        for (const ref of collectRefs(schema)) {
          if (!ref.startsWith('#/$defs/') && !resolveRef(document, ref)) errors.push(`Unresolved response schema ${ref} on ${method.toUpperCase()} ${path}`)
        }
        if (clientSchema) {
          compareClientSchema(z.toJSONSchema(clientSchema), schema, document, `${method.toUpperCase()} ${path}`, errors, false)
        }
      }

      const clientRequestSchema = clientRequestSchemas[`${method.toUpperCase()} ${path}`]
      if (clientRequestSchema && operation.requestBody?.required !== true) {
        errors.push(`Client sends a required JSON request body but API does not require one on ${method.toUpperCase()} ${path}`)
      }
      if (['post', 'put', 'patch', 'delete'].includes(method) && operation.requestBody?.required === true) {
        const requestSchema = operation.requestBody?.content?.['application/json']?.schema
        if (requestSchema === undefined) {
          errors.push(`Missing JSON request schema on ${method.toUpperCase()} ${path}`)
        } else {
          for (const ref of collectRefs(requestSchema)) {
            if (!resolveRef(document, ref)) errors.push(`Unresolved request schema ${ref} on ${method.toUpperCase()} ${path}`)
          }
          if (clientRequestSchema) {
            compareClientSchema(z.toJSONSchema(clientRequestSchema), requestSchema, document, `${method.toUpperCase()} ${path} request`, errors, true)
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

function compareClientSchema(clientSchema, apiSchema, document, location, errors, isRequest, clientDocument = clientSchema) {
  if (apiSchema.$ref) {
    const resolved = resolveRef(document, apiSchema.$ref)
    if (resolved) compareClientSchema(clientSchema, resolved, document, location, errors, isRequest, clientDocument)
    return
  }
  if (clientSchema.$ref) {
    const resolved = resolveRef(clientDocument, clientSchema.$ref)
    if (resolved) compareClientSchema(resolved, apiSchema, document, location, errors, isRequest, clientDocument)
    return
  }

  const clientTypes = schemaTypes(clientSchema)
  const apiTypes = schemaTypes(apiSchema)
  if (clientTypes.size && apiTypes.size) {
    const [produced, accepted] = isRequest ? [clientTypes, apiTypes] : [apiTypes, clientTypes]
    const incompatible = [...produced].some((type) => !clientTypeAccepts(accepted, type))
    if (incompatible) errors.push(`Incompatible schema type at ${location}: client accepts ${[...clientTypes].join('|')}, API documents ${[...apiTypes].join('|')}`)
  } else if (clientTypes.size && apiTypes.size === 0) {
    errors.push(`Untyped API schema at ${location}`)
  }

  const [producedEnum, acceptedEnum] = isRequest ? [clientSchema.enum, apiSchema.enum] : [apiSchema.enum, clientSchema.enum]
  if (producedEnum && acceptedEnum && !producedEnum.every((value) => acceptedEnum.includes(value))) {
    errors.push(`Incompatible schema enum at ${location}`)
  }

  const clientProperties = clientSchema.properties ?? {}
  const apiProperties = apiSchema.properties ?? {}
  if (isRequest) {
    for (const name of apiSchema.required ?? []) {
      if (!Object.hasOwn(clientProperties, name)) {
        errors.push(`API-required property ${name} is missing from the client schema at ${location}`)
      }
    }
  }
  for (const [name, child] of Object.entries(clientProperties)) {
    const additional = apiSchema.additionalProperties
    const propertyNameIsEnumerated = apiSchema.propertyNames?.enum?.includes(name)
    const additionalCoversProperty = typeof additional === 'object' && propertyNameIsEnumerated
    const apiProperty = apiProperties[name] ?? (additionalCoversProperty ? additional : undefined)
    if (!apiProperty) {
      errors.push(`Schema property ${name} is missing from API contract at ${location}`)
      continue
    }
    if (clientSchema.required?.includes(name) && !additionalCoversProperty && !apiSchema.required?.includes(name) && !Object.hasOwn(apiProperty, 'default')) {
      errors.push(`Required client property ${name} is not required by the API schema at ${location}`)
    }
    if (isRequest && apiSchema.required?.includes(name) && !clientSchema.required?.includes(name)) {
      errors.push(`API-required property ${name} may be omitted by the client at ${location}`)
    }
    compareClientSchema(child, apiProperty, document, `${location}.${name}`, errors, isRequest, clientDocument)
  }

  if (clientSchema.items && apiSchema.items) {
    compareClientSchema(clientSchema.items, apiSchema.items, document, `${location}[]`, errors, isRequest, clientDocument)
  } else if (clientSchema.items && apiTypes.has('array') && !apiSchema.items) {
    errors.push(`Array item schema is missing at ${location}`)
  }

  if (clientSchema.additionalProperties && apiSchema.additionalProperties && typeof clientSchema.additionalProperties === 'object' && typeof apiSchema.additionalProperties === 'object') {
    compareClientSchema(clientSchema.additionalProperties, apiSchema.additionalProperties, document, `${location}.*`, errors, isRequest, clientDocument)
  }
}

function clientTypeAccepts(acceptedTypes, type) {
  return acceptedTypes.has(type) || (type === 'integer' && acceptedTypes.has('number'))
}

function schemaTypes(schema) {
  if (typeof schema.type === 'string') return new Set([schema.type])
  if (Array.isArray(schema.type)) return new Set(schema.type)
  const variants = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]
  return new Set(variants.flatMap((variant) => [...schemaTypes(variant)]))
}

function hasSchemaType(schema) {
  return schemaTypes(schema).size > 0 || typeof schema.$ref === 'string'
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
