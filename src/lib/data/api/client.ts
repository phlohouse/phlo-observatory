import { createServerOnlyFn } from '@tanstack/react-start'

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export class PhloApiError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(status: number, code: string | undefined) {
    super(`Phlo API request failed with status ${status}${code ? ` (${code})` : ''}`)
    this.name = 'PhloApiError'
    this.status = status
    this.code = code
  }
}

interface ApiClientOptions {
  baseUrl: string
  getCookie: () => string | undefined
  fetch: typeof globalThis.fetch
}

export interface RequestOptions {
  method?: ApiMethod
  body?: unknown
  idempotencyKey?: string
  responseType?: 'json' | 'text'
  signal?: AbortSignal
}

/** Create a server-only client; the browser never receives API credentials. */
export function createApiClient({ baseUrl, getCookie, fetch }: ApiClientOptions) {
  const origin = validateBaseUrl(baseUrl)

  return async function request(path: `/api/v1/${string}`, options: RequestOptions = {}) {
    if (!path.startsWith('/api/v1/') || path.startsWith('//')) {
      throw new Error('Phlo API paths must be under /api/v1')
    }

    const headers = new Headers({ accept: 'application/json' })
    const cookie = getCookie()
    if (cookie) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)

    const url = new URL(path, origin)
    if (url.origin !== origin.origin || !url.pathname.startsWith('/api/v1/')) {
      throw new Error('Phlo API paths must remain under /api/v1')
    }

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      redirect: 'manual',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new PhloApiError(response.status, await readErrorCode(response))
    }
    if (response.status === 204) return undefined
    if (options.responseType === 'text') return response.text()
    const body: unknown = await response.json()
    return body
  }
}

export const phloApiRequest = createServerOnlyFn(
  async (path: `/api/v1/${string}`, options: RequestOptions = {}) => {
    const { getRequestHeader } = await import('@tanstack/react-start/server')
    return createApiClient({
      baseUrl: process.env.PHLO_API_BASE_URL ?? '',
      getCookie: () => getRequestHeader('cookie'),
      fetch: globalThis.fetch,
    })(path, options)
  },
)

function validateBaseUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('PHLO_API_BASE_URL must be an absolute HTTPS URL')
  }

  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (
    !['https:', ...(process.env.NODE_ENV === 'development' && isLoopback ? ['http:'] : [])].includes(
      url.protocol,
    ) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('PHLO_API_BASE_URL must be an HTTPS origin without credentials or a path')
  }
  return url
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) return undefined

  try {
    const body: unknown = await response.json()
    if (!isRecord(body)) return undefined
    const detail = body.detail
    if (!isRecord(detail)) return undefined
    const code = detail.code ?? detail.error
    return typeof code === 'string' ? code : undefined
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
