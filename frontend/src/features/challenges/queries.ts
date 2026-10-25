import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { challengeSchema, submissionSchema } from './schemas'

// One list serves every section (featured, tracker, archive): status and my submission are derived per item.
export const challengesQuery = queryOptions({
  queryKey: ['challenges', 'all'],
  queryFn: ({ signal }) =>
    api.get('/challenges', z.array(challengeSchema), { signal, query: { scope: 'all' } }).then((r) => r.data),
  staleTime: 60_000,
})

// Admin only.
export const pendingSubmissionsQuery = queryOptions({
  queryKey: ['challenges', 'submissions', 'pending'],
  queryFn: ({ signal }) =>
    api.get('/challenges/submissions', z.array(submissionSchema), { signal, query: { status: 'pending' } }).then((r) => r.data),
  staleTime: 30_000,
})
