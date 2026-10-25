import { useMutation } from '@tanstack/react-query'
import { UserMinus, UserPlus } from 'lucide-react'
import { useMe } from '@/features/auth/queries'
import type { Role } from '@/features/auth/schemas'
import { mentorMutation } from '@/features/apprentice/mutations'

// Scholars have at most one mentor, who must be a senior or admin. Renders nothing when neither action applies.
export default function FollowMentorButton({ target }: { target: { id: number; role: Role } }) {
  const me = useMe()
  const mentor = useMutation(mentorMutation)
  const unfollow = me.mentorId === target.id
  const canFollow = me.role === 'scholar' && me.mentorId === null && target.role !== 'scholar' && target.id !== me.id
  if (!unfollow && !canFollow) return null

  return (
    <button
      type="button"
      disabled={mentor.isPending}
      onClick={() => mentor.mutate({ follow: !unfollow, mentorId: target.id })}
      className={`flex-1 md:flex-initial text-[13px] px-5 py-2.5 rounded-[14px] neu-raised-sm active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 font-bold whitespace-nowrap disabled:opacity-60 disabled:pointer-events-none ${
        unfollow ? 'bg-base text-[#4B5563] neu-hover' : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
      }`}
    >
      {unfollow ? <UserMinus size={18} /> : <UserPlus size={18} />}
      <span>{unfollow ? 'Unfollow Mentor' : 'Follow as Mentor'}</span>
    </button>
  )
}
