import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'

const apprenticeSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  username: z.string(),
  level: z.number(),
  publishedScrollsCount: z.number(),
  joinedAt: z.string(),
})

// Senior/admin only: scholars get a 403, so callers must gate with `enabled`.
export const apprenticesQuery = queryOptions({
  queryKey: ['apprentice', 'apprentices'],
  queryFn: ({ signal }) => api.get('/apprentice/apprentices', z.array(apprenticeSchema), { signal }).then((r) => r.data),
  staleTime: 60_000,
})
