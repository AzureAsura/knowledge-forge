import { mutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { session } from '@/lib/api/session'
import { queryClient, resetGamificationBaseline } from '@/lib/query/queryClient'
import { tokensSchema, type LoginForm } from './schemas'

// The login form shows the server message inline, so no global toast.
export const loginMutation = mutationOptions({
  mutationFn: async (input: LoginForm) => {
    const { data } = await api.post('/auth/login', tokensSchema, input)
    queryClient.removeQueries()
    resetGamificationBaseline()
    session.set(data)
  },
  meta: { silent: true },
})

// Clear locally even if the server call fails, so the user is never stuck "logged in".
// Cached queries are wiped on the next login: removing them here would make the still-mounted
// Sidebar refetch `me` without a token and bounce through the session-expired handler.
export const logoutMutation = mutationOptions({
  mutationFn: async () => {
    const refreshToken = session.getRefresh()
    if (refreshToken) await api.post('/auth/logout', z.unknown(), { refreshToken })
  },
  onSettled: () => session.clear(),
  meta: { silent: true },
})
