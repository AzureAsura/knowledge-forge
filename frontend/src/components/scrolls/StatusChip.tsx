import { Archive, CircleCheck, Hourglass, PenLine } from 'lucide-react'
import { STATUS_LABEL } from '@/lib/constants'
import type { ScrollStatus } from '@/features/scrolls/schemas'

const STATUS = {
  draft: { icon: PenLine, color: 'text-[#6B7280]' },
  pending: { icon: Hourglass, color: 'text-[#F59E0B]' },
  published: { icon: CircleCheck, color: 'text-[#3B82F6]' },
  archived: { icon: Archive, color: 'text-[#9CA3AF]' },
} as const

export default function StatusChip({ status }: { status: ScrollStatus }) {
  const { icon: Icon, color } = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${color}`}>
      <Icon size={14} />
      {STATUS_LABEL[status]}
    </span>
  )
}
