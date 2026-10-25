import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Award } from 'lucide-react'
import { badgeDefsQuery } from '@/features/gamification/queries'
import { grantBadgeMutation } from '@/features/users/mutations'
import { userQueries } from '@/features/users/queries'

// Admin only. Only `manual` badges the user doesn't own yet can be granted.
export default function GrantBadgeControl({ userId, username }: { userId: number; username: string }) {
  const { data: defs } = useQuery(badgeDefsQuery)
  const { data: owned } = useQuery(userQueries.badges(username))
  const options = (defs ?? []).filter((d) => d.triggerType === 'manual' && !owned?.some((b) => b.slug === d.slug))
  const [chosen, setChosen] = useState('')
  const slug = chosen || options[0]?.slug || ''
  const grant = useMutation(grantBadgeMutation(slug, userId))

  if (options.length === 0) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label htmlFor="grant-badge" className="sr-only">
        Badge to grant
      </label>
      <select
        id="grant-badge"
        value={slug}
        onChange={(e) => setChosen(e.target.value)}
        className="bg-base neu-pressed rounded-[12px] px-3 py-2 text-[12px] font-semibold text-[#1F2937] focus:outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={grant.isPending}
        onClick={() => grant.mutate(undefined, { onSuccess: () => toast.success('Badge granted') })}
        className="bg-base neu-raised-sm neu-hover text-[#3B82F6] text-[12px] font-bold px-3.5 py-2 rounded-[12px] flex items-center gap-1.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
      >
        <Award size={15} />
        Grant badge
      </button>
    </div>
  )
}
