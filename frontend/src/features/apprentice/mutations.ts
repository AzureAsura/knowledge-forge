import { mutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'

export const mentorMutation = mutationOptions({
  mutationFn: ({ follow, mentorId }: { follow: boolean; mentorId: number }) =>
    follow ? api.post('/apprentice/follow', z.unknown(), { mentorId }) : api.delete('/apprentice/follow', z.unknown()),
  meta: { invalidates: [['me'], ['users'], ['apprentice']] },
})
