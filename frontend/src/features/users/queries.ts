import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { publicUserSchema, userBadgeSchema } from './schemas'

export const userQueries = {
  profile: (username: string) =>
    queryOptions({
      queryKey: ['users', username],
      queryFn: ({ signal }) =>
        api.get(`/users/${encodeURIComponent(username)}`, publicUserSchema, { signal }).then((r) => r.data),
      staleTime: 60_000,
    }),
  badges: (username: string) =>
    queryOptions({
      queryKey: ['users', username, 'badges'],
      queryFn: ({ signal }) =>
        api.get(`/users/${encodeURIComponent(username)}/badges`, z.array(userBadgeSchema), { signal }).then((r) => r.data),
      staleTime: 60_000,
    }),
}
