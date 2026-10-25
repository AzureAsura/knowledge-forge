import { queryOptions } from '@tanstack/react-query'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { z } from 'zod'
import { analyticsQueries, parseRange } from '@/features/analytics/queries'
import { streakSchema } from '@/features/users/schemas'
import { xpStatsQuery } from '@/features/gamification/queries'
import { api } from '@/lib/api/client'
import { prefetch } from '@/lib/router/guards'

// Only the streak is read from here now (Navbar); the dashboard page itself is analytics.
const dashboardSchema = z.object({
  stats: z.object({ currentStreak: z.number(), streaks: z.array(streakSchema) }),
})

export const dashboardQuery = queryOptions({
  queryKey: ['dashboard'],
  queryFn: ({ signal }) => api.get('/dashboard', dashboardSchema, { signal }).then((r) => r.data),
  staleTime: 30_000,
})

export const dashboardLoader = ({ request }: LoaderFunctionArgs) =>
  prefetch(dashboardQuery, xpStatsQuery, analyticsQueries.me(parseRange(new URL(request.url).searchParams.get('range'))))()
