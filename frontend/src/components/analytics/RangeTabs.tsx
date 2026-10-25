import { RANGES, type Range } from '@/features/analytics/queries'
import { RANGE_LABEL } from '@/features/analytics/format'

export default function RangeTabs({ value, onChange }: { value: Range; onChange: (range: Range) => void }) {
  return (
    <div role="group" aria-label="Time range" className="flex items-center bg-base neu-pressed p-1 rounded-full">
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={range === value}
          onClick={() => onChange(range)}
          className={`px-4 py-1.5 text-[12px] rounded-full transition-all duration-200 ${
            range === value ? 'bg-[#3B82F6] font-bold text-white neu-raised-sm' : 'text-[#6B7280] font-semibold hover:text-[#1F2937]'
          }`}
        >
          {RANGE_LABEL[range]}
        </button>
      ))}
    </div>
  )
}
