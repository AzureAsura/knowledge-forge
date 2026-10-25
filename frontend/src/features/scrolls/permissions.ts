import type { User } from '@/features/auth/schemas'
import type { ScrollItem } from './schemas'

// Mirrors the backend rules; the backend stays the source of truth and rejects anything else.
export function scrollPermissions(me: User, scroll: ScrollItem) {
  const isAuthor = scroll.authorId === me.id
  const isAdmin = me.role === 'admin'
  const isReviewer = isAdmin || me.role === 'senior'
  const { status } = scroll

  return {
    edit: isAdmin || (isAuthor && status === 'draft'),
    submit: isAuthor && status === 'draft',
    approve: isReviewer && status === 'pending' && !isAuthor,
    reject: isReviewer && status === 'pending' && !(me.role === 'senior' && isAuthor),
    archive: isAdmin || (isAuthor && status === 'published'),
    feature: isAdmin && status === 'published' && !scroll.isFeatured,
    unfeature: isAdmin && scroll.isFeatured,
  }
}
export const canEditScroll = (me: User, scroll: ScrollItem) => scrollPermissions(me, scroll).edit
