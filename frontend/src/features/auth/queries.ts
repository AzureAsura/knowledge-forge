import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { userSchema } from './schemas'

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: ({ signal }) => api.get('/auth/me', userSchema, { signal }).then((r) => r.data),
  staleTime: 5 * 60_000,
})

// Only used under /dashboard, where the requireAuth loader has already put `me` in the cache.
export const useMe = () => useSuspenseQuery(meQuery).data
