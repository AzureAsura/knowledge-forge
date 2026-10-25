import { mutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { reviewResultSchema, type ChallengeForm, type SubmitForm } from './schemas'

export const submitChallengeMutation = (id: number) =>
  mutationOptions({
    mutationFn: (input: SubmitForm) => api.post(`/challenges/${id}/submit`, z.unknown(), input),
    meta: { invalidates: [['challenges'], ['dashboard']] },
  })

const payload = (v: ChallengeForm) => ({
  ...v,
  startDate: new Date(v.startDate).toISOString(),
  endDate: new Date(v.endDate).toISOString(),
})

export const saveChallengeMutation = mutationOptions({
  mutationFn: ({ id, values }: { id?: number; values: ChallengeForm }) =>
    id ? api.patch(`/challenges/${id}`, z.unknown(), payload(values)) : api.post('/challenges', z.unknown(), payload(values)),
  meta: { invalidates: [['challenges'], ['dashboard']] },
})

export const reviewSubmissionMutation = mutationOptions({
  mutationFn: ({ id, status, rejectReason }: { id: number; status: 'approved' | 'rejected'; rejectReason?: string }) =>
    api.patch(`/challenges/submissions/${id}`, reviewResultSchema, { status, rejectReason }).then((r) => r.data),
  meta: { invalidates: [['challenges'], ['leaderboard'], ['xp'], ['dashboard'], ['badges', 'my']] },
})
