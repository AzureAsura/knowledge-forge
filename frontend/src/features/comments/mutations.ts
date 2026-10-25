import { mutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { commentSchema } from './schemas'

// Posting a comment can award XP/badges, so the XP-derived views are refreshed too.
export const createCommentMutation = (scrollId: number) =>
  mutationOptions({
    mutationFn: (content: string) =>
      api.post(`/scrolls/${scrollId}/comments`, commentSchema, { content }).then((r) => r.data),
    meta: {
      invalidates: [['scrolls', 'comments', scrollId], ['scrolls', 'detail'], ['xp'], ['dashboard'], ['badges', 'my']],
    },
  })

export const deleteCommentMutation = (scrollId: number) =>
  mutationOptions({
    mutationFn: (commentId: number) => api.delete(`/comments/${commentId}`, z.unknown()),
    meta: { invalidates: [['scrolls', 'comments', scrollId], ['scrolls', 'detail']] },
  })
