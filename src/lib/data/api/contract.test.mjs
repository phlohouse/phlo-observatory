import assert from 'node:assert/strict'
import test from 'node:test'
import { requiredOperations, validateOpenApi } from '../../../../scripts/check-api-contract.mjs'

function completeDocument() {
  return {
    paths: Object.fromEntries(
      [...requiredOperations].map(([path, methods]) => [
        path,
        Object.fromEntries(methods.map((method) => [method, {}])),
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

test('rejects an OpenAPI document without paths', () => {
  assert.deepEqual(validateOpenApi({}), ['OpenAPI document has no paths object.'])
})
