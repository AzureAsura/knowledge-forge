import { ZodError } from 'zod'

export class ApiError extends Error {
  status: number
  retryAfter?: number

  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 429 && error.retryAfter
      ? `Too many requests. Try again in ${error.retryAfter}s.`
      : error.message
  }
  if (error instanceof ZodError) return 'Unexpected response from the server.'
  return error instanceof Error ? error.message : 'Something went wrong.'
}
