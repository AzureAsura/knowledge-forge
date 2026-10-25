import type { FetchQueryOptions } from '@tanstack/react-query'
import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { meQuery } from '@/features/auth/queries'
import type { Role } from '@/features/auth/schemas'
import { ApiError } from '@/lib/api/errors'
import { restoreSession } from '@/lib/api/client'
import { session } from '@/lib/api/session'
import { queryClient } from '@/lib/query/queryClient'

// Only same-site absolute paths: blocks open redirects like `//evil.com` or `https://evil.com`.
export const safeNext = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'

export async function requireAuth({ request }: LoaderFunctionArgs) {
  const { pathname, search } = new URL(request.url)
  const toAuth = () => redirect(`/auth?next=${encodeURIComponent(pathname + search)}`)

  await restoreSession()
  if (!session.hasSession()) throw toAuth()

  try {
    await queryClient.ensureQueryData(meQuery)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw toAuth()
    throw error
  }
  return null
}

export async function redirectIfAuthed({ request }: LoaderFunctionArgs) {
  await restoreSession()
  if (session.getAccess()) throw redirect(safeNext(new URL(request.url).searchParams.get('next')))
  return null
}

// Gate for role-only pages; the backend still enforces the same rule on every call.
export const requireRole = (...roles: Role[]) =>
  async () => {
    await restoreSession()
    if (!session.hasSession()) return null // requireAuth on the parent route does the redirect
    const me = await queryClient.ensureQueryData(meQuery)
    if (!roles.includes(me.role)) throw redirect('/dashboard')
    return null
  }

// Warms the query cache for a route without blocking navigation; pages still suspend/skeleton on their own.
export const prefetch =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- queryOptions() results vary in generics
  (...queries: FetchQueryOptions<any, any, any, any>[]) =>
  async () => {
    await restoreSession()
    if (session.hasSession()) queries.forEach((query) => void queryClient.prefetchQuery(query))
    return null
  }
