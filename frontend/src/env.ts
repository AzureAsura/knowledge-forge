import { z } from 'zod'

export const env = z
  .object({ VITE_API_BASE_URL: z.string().default('/api') })
  .parse(import.meta.env)
