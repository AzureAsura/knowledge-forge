import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message?: string
  action?: ReactNode
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="bg-base neu-raised rounded-[20px] p-6 text-center space-y-2">
      <p className="text-[14px] font-bold text-[#1F2937]">{title}</p>
      {message && <p className="text-[12px] text-[#6B7280]">{message}</p>}
      {action}
    </div>
  )
}
