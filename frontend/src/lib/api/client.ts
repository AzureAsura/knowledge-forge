import { z } from 'zod'
import { env } from '@/env'
import { camelizeKeys, snakeizeKeys } from './case'
import { ApiError } from './errors'
import { envelopeSchema, type Gamification, type Pagination } from './schemas'
import { session } from './session'

type Query = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

export interface ApiResult<T> {
  data: T
  message?: string
  pagination?: Pagination
  gamification?: Gamification
}

// Endpoints that run without a valid access token: a 401 there is a real answer, not an expired session.
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout']

let onSessionExpired = () => {}
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${env.VITE_API_BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

const parseBody = (res: Response) => res.json().catch(() => ({}) as Record<string, unknown>)

async function doRefresh() {
  const refreshToken = session.getRefresh()
  if (!refreshToken) throw new ApiError(401, 'No session')

  const res = await fetch(`${env.VITE_API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const json = await parseBody(res)
  if (!res.ok) throw new ApiError(res.status, String(json.message ?? 'Session expired'))

  const data = json.data as { access_token: string; refresh_token: string }
  session.set({ accessToken: data.access_token, refreshToken: data.refresh_token })
}

// The backend revokes a whole token family when a refresh token is reused, so concurrent
// refreshes (same tab: single-flight, other tabs: Web Locks) must never reuse a stale token.
let inflight: Promise<void> | null = null
export function refreshSession() {
  inflight ??= (navigator.locks ? navigator.locks.request('knofo-refresh', doRefresh) : doRefresh()).finally(
    () => {
      inflight = null
    },
  )
  return inflight
}

export async function restoreSession() {
  if (session.getAccess() || !session.getRefresh()) return
  try {
    await refreshSession()
  } catch (error) {
    if (error instanceof ApiError) session.clear()
  }
}

async function request<S extends z.ZodType>(
  method: string,
  path: string,
  schema: S,
  { query, body, signal }: RequestOptions = {},
): Promise<ApiResult<z.infer<S>>> {
  const isForm = body instanceof FormData
  const send = () => {
    const token = session.getAccess()
    return fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(snakeizeKeys(body)),
    })
  }

  let res = await send()
  if (res.status === 401 && !NO_REFRESH.includes(path)) {
    try {
      await refreshSession()
    } catch {
      session.clear()
      onSessionExpired()
      throw new ApiError(401, 'Session expired. Please sign in again.')
    }
    res = await send()
  }

  const json = await parseBody(res)
  if (!res.ok) {
    throw new ApiError(
      res.status,
      String(json.message ?? res.statusText),
      Number(res.headers.get('Retry-After')) || undefined,
    )
  }

  const envelope = envelopeSchema.parse(camelizeKeys(json))
  return {
    data: schema.parse(envelope.data),
    message: envelope.message,
    pagination: envelope.pagination,
    gamification: envelope.gamification,
  }
}

export const api = {
  get: <S extends z.ZodType>(path: string, schema: S, opts?: Omit<RequestOptions, 'body'>) =>
    request('GET', path, schema, opts),
  post: <S extends z.ZodType>(path: string, schema: S, body?: unknown, opts?: RequestOptions) =>
    request('POST', path, schema, { ...opts, body }),
  patch: <S extends z.ZodType>(path: string, schema: S, body?: unknown, opts?: RequestOptions) =>
    request('PATCH', path, schema, { ...opts, body }),
  delete: <S extends z.ZodType>(path: string, schema: S, opts?: RequestOptions) =>
    request('DELETE', path, schema, opts),
}
