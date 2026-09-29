import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiClient, PhloApiError } from './client.ts'

test('forwards the browser session cookie only to the configured API origin', async () => {
  let requestUrl
  let requestInit
  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => 'oauth2_proxy=session',
    fetch: async (input, init) => {
      requestUrl = new URL(String(input))
      requestInit = init
      return Response.json({ env: 'prod' })
    },
  })

  const result = await request('/api/v1/services?env=prod')

  assert.deepEqual(result, { env: 'prod' })
  assert.equal(requestUrl.href, 'https://api.example.test/api/v1/services?env=prod')
  assert.equal(new Headers(requestInit.headers).get('cookie'), 'oauth2_proxy=session')
  assert.equal(new Headers(requestInit.headers).get('authorization'), null)
  assert.equal(requestInit.cache, 'no-store')
  assert.equal(requestInit.redirect, 'manual')
})

test('sends JSON bodies without adding credentials when no session cookie exists', async () => {
  let requestInit
  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => undefined,
    fetch: async (_input, init) => {
      requestInit = init
      return Response.json({ ok: true })
    },
  })

  await request('/api/v1/queries', { method: 'POST', body: { env: 'staging', sql: 'select 1' } })

  assert.equal(requestInit.method, 'POST')
  assert.equal(new Headers(requestInit.headers).get('content-type'), 'application/json')
  assert.equal(requestInit.body, JSON.stringify({ env: 'staging', sql: 'select 1' }))
  assert.equal(new Headers(requestInit.headers).get('cookie'), null)
})

test('rejects non-HTTPS production origins and paths outside the canonical API', async () => {
  assert.throws(
    () =>
      createApiClient({
        baseUrl: 'http://api.example.test',
        getCookie: () => undefined,
        fetch: globalThis.fetch,
      }),
    /HTTPS origin/,
  )

  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => undefined,
    fetch: globalThis.fetch,
  })
  await assert.rejects(request('/api/v1/../../admin'), /remain under \/api\/v1/)
})

test('returns only the status and structured error code for API errors', async () => {
  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => undefined,
    fetch: async () =>
      Response.json(
        { detail: { code: 'permission_denied', message: 'do not expose this' } },
        { status: 403 },
      ),
  })

  await assert.rejects(
    request('/api/v1/assets?env=prod'),
    (error) => {
      assert.ok(error instanceof PhloApiError)
      assert.equal(error.status, 403)
      assert.equal(error.code, 'permission_denied')
      assert.equal(error.message.includes('do not expose this'), false)
      return true
    },
  )
})

test('supports the canonical API error field without exposing its detail message', async () => {
  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => undefined,
    fetch: async () =>
      Response.json(
        { detail: { error: 'invalid_query', message: 'SQL text must remain private' } },
        { status: 422 },
      ),
  })

  await assert.rejects(request('/api/v1/queries'), (error) => {
    assert.ok(error instanceof PhloApiError)
    assert.equal(error.code, 'invalid_query')
    assert.equal(error.message.includes('SQL text'), false)
    return true
  })
})

test('surfaces API outages as bounded status errors without retrying or redirecting', async () => {
  let requestInit
  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => undefined,
    fetch: async (_input, init) => {
      requestInit = init
      return Response.json({ detail: { error: 'backend_unavailable' } }, { status: 503 })
    },
  })

  await assert.rejects(request('/api/v1/services?env=staging'), (error) => {
    assert.ok(error instanceof PhloApiError)
    assert.equal(error.status, 503)
    assert.equal(error.code, 'backend_unavailable')
    return true
  })
  assert.equal(requestInit.redirect, 'manual')
})

test('rejects malformed successful JSON instead of substituting local data', async () => {
  const request = createApiClient({
    baseUrl: 'https://api.example.test',
    getCookie: () => undefined,
    fetch: async () => new Response('{malformed', { status: 200, headers: { 'content-type': 'application/json' } }),
  })

  await assert.rejects(request('/api/v1/assets?env=prod'), SyntaxError)
})
