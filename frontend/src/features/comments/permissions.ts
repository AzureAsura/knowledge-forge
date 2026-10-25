import type { User } from '@/features/auth/schemas'
import type { Comment } from './schemas'

export const canDeleteComment = (me: User, comment: Comment) => me.role === 'admin' || comment.authorId === me.id
