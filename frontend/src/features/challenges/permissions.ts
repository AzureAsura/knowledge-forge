import type { Challenge } from './schemas'

// Mirrors the backend: only an active challenge accepts a submission, and only if there is none yet or the last one was rejected.
export const canSubmitChallenge = (c: Challenge) => c.status === 'active' && (!c.mySubmissionStatus || c.mySubmissionStatus === 'rejected')
