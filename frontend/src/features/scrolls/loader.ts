import type { LoaderFunctionArgs } from 'react-router-dom'
import { categoriesQuery } from '@/features/categories/queries'
import { restoreSession } from '@/lib/api/client'
import { session } from '@/lib/api/session'
import { queryClient } from '@/lib/query/queryClient'
import { prefetch } from '@/lib/router/guards'
import { PAGE_SIZE, parseScrollFilters } from './filters'
import { scrollQueries } from './queries'

export const scrollsLoader = ({ request }: LoaderFunctionArgs) => {
  const filters = parseScrollFilters(new URL(request.url).searchParams)
  return prefetch(scrollQueries.list({ ...filters, limit: PAGE_SIZE }), categoriesQuery)()
}

// Detail GET records a read on the server (+XP, streak), so XP-derived views are refreshed once it resolves.
export const scrollDetailLoader = async ({ params }: LoaderFunctionArgs) => {
  await restoreSession()
  if (!session.hasSession()) return null
  await queryClient.ensureQueryData(scrollQueries.detail(params.id!))
  void queryClient.invalidateQueries({ queryKey: ['xp'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  return null
}
