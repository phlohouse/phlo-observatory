import assert from 'node:assert/strict'
import test from 'node:test'
import { requiredOperations, validateOpenApi } from '../../../../scripts/check-api-contract.mjs'

function completeDocument() {
  const operationFor = (path, method) => {
    const operation = {
      parameters: [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({ name, in: 'path', required: true })),
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Response' } } } } },
    }
    if (['post', 'put', 'patch'].includes(method) && path !== '/api/v1/queries/{query_id}/cancel') {
      operation.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Request' } } } }
    }
    return operation
  }

  return {
    components: { schemas: { Response: { type: 'object' }, Request: { type: 'object' } } },
    paths: Object.fromEntries(
      [...requiredOperations].map(([path, methods]) => [
        path,
        Object.fromEntries(methods.map((method) => [method, operationFor(path, method)])),
      ]),
    ),
  }
}

test('accepts the required replacement-app API operations', () => {
  assert.deepEqual(validateOpenApi(completeDocument()), [])
})

test('detects removed paths and methods as API/client contract drift', () => {
  const document = completeDocument()
  delete document.paths['/api/v1/branches/{branch_name}/diff']
  delete document.paths['/api/v1/queries/saved'].post

  const errors = validateOpenApi(document)
  assert.ok(errors.includes('Missing GET /api/v1/branches/{branch_name}/diff'))
  assert.ok(errors.includes('Missing POST /api/v1/queries/saved'))
})

test('detects missing request/response schemas, path parameters, and dangling schema references', () => {
  const document = completeDocument()
  const operation = document.paths['/api/v1/queries/{query_id}'].get
  operation.parameters = []
  operation.responses[200].content['application/json'].schema.$ref = '#/components/schemas/Removed'
  document.paths['/api/v1/queries/saved'].post.requestBody = { required: true, content: {} }

  const errors = validateOpenApi(document)
  assert.ok(errors.includes('Missing required path parameter query_id on GET /api/v1/queries/{query_id}'))
  assert.ok(errors.includes('Unresolved response schema #/components/schemas/Removed on GET /api/v1/queries/{query_id}'))
  assert.ok(errors.includes('Missing JSON request schema on POST /api/v1/queries/saved'))
})

test('rejects an OpenAPI document without paths', () => {
  assert.deepEqual(validateOpenApi({}), ['OpenAPI document has no paths object.'])
})
