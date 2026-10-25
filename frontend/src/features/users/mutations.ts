import { mutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { userSchema } from '@/features/auth/schemas'
import { api } from '@/lib/api/client'
import type { CreateUserForm, PasswordForm, ProfileForm } from './schemas'

// Name, username and avatar show up on scrolls, comments and the leaderboard, so those caches are refreshed too.
const PROFILE_CHANGED = [['me'], ['users'], ['scrolls'], ['leaderboard'], ['dashboard']]

export const updateProfileMutation = mutationOptions({
  mutationFn: (input: ProfileForm) => api.patch('/users/me', userSchema, input).then((r) => r.data),
  meta: { invalidates: PROFILE_CHANGED },
})

export const uploadAvatarMutation = mutationOptions({
  mutationFn: (file: File) => {
    const body = new FormData()
    body.set('avatar', file)
    return api.post('/auth/avatar', userSchema, body).then((r) => r.data)
  },
  meta: { invalidates: PROFILE_CHANGED },
})

// The backend revokes every refresh token on success: the caller signs the user out.
export const changePasswordMutation = mutationOptions({
  mutationFn: ({ currentPassword, newPassword }: PasswordForm) =>
    api.patch('/auth/password', z.unknown(), { currentPassword, newPassword }),
})

export const createUserMutation = mutationOptions({
  mutationFn: (input: CreateUserForm) => api.post('/users', userSchema, input).then((r) => r.data),
})

export const grantBadgeMutation = (slug: string, userId: number) =>
  mutationOptions({
    mutationFn: () => api.post(`/badges/${slug}/grant`, z.unknown(), { userId }),
    meta: { invalidates: [['users'], ['badges', 'my'], ['xp'], ['leaderboard']] },
  })
