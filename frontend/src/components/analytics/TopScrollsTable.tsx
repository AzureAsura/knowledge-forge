import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ScrollText } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { scrollQueries } from '@/features/scrolls/queries'
import { formatDate, formatNumber } from '@/lib/format'
import { cloudinaryWidth } from '@/lib/image'

const COLUMNS = [
  { sort: 'view_count', label: 'Views', value: (s: { viewCount: number }) => s.viewCount },
  { sort: 'likes_count', label: 'Likes', value: (s: { likesCount: number }) => s.likesCount },
  { sort: 'bookmarks_count', label: 'Bookmarks', value: (s: { bookmarksCount: number }) => s.bookmarksCount },
  { sort: 'comments_count', label: 'Comments', value: (s: { commentsCount: number }) => s.commentsCount },
] as const

// The user's own published scrolls, sorted by the server (the list endpoint already supports these columns).
export default function TopScrollsTable() {
  const [sort, setSort] = useState('-view_count')
  const { data, isPending } = useQuery(scrollQueries.list({ view: 'mine', status: 'published', sort, limit: 8 }))
  const column = sort.replace('-', '')
  const desc = sort.startsWith('-')
  const toggle = (key: string) => setSort(column === key ? (desc ? key : `-${key}`) : `-${key}`)

  if (isPending) return <Skeleton className="h-60 rounded-[18px]" />
  if (!data?.items.length) {
    return <div className="h-40 rounded-[18px] bg-base neu-pressed flex items-center justify-center text-[13px] font-semibold text-[#9CA3AF]">No published scrolls yet</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[560px]">
        <thead>
          <tr className="border-b border-[#E5E7EB] text-[11px] text-[#6B7280] font-bold uppercase tracking-wider">
            <th className="py-2.5 px-3">Scroll</th>
            {COLUMNS.map((c) => (
              <th key={c.sort} className="py-2.5 px-3 text-right" aria-sort={column === c.sort ? (desc ? 'descending' : 'ascending') : undefined}>
                <button type="button" onClick={() => toggle(c.sort)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-[#1F2937] ${column === c.sort ? 'text-[#3B82F6]' : ''}`}>
                  {c.label}
                  {column === c.sort ? desc ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : <ArrowUpDown size={12} className="opacity-50" />}
                </button>
              </th>
            ))}
            <th className="py-2.5 px-3 text-right">Published</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]/70 text-[13px]">
          {data.items.map((scroll) => (
            <tr key={scroll.id} className="hover:bg-[#EAEFF5]/50 transition-colors">
              <td className="py-2.5 px-3 max-w-[420px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[72px] h-12 rounded-[10px] bg-base neu-pressed overflow-hidden shrink-0">
                    {scroll.coverImageUrl ? (
                      <img src={cloudinaryWidth(scroll.coverImageUrl, 240)} alt="" loading="lazy" className="w-full h-full object-cover opacity-90" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
                        <ScrollText size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/dashboard/scrolls/${scroll.slug}`} className="font-bold text-[#1F2937] hover:text-[#3B82F6] line-clamp-1">
                      {scroll.title}
                    </Link>
                    <span className="text-[11px] text-[#6B7280]">{scroll.category.name}</span>
                  </div>
                </div>
              </td>
              {COLUMNS.map((c) => (
                <td key={c.sort} className={`py-2.5 px-3 text-right ${column === c.sort ? 'font-extrabold text-[#1F2937]' : 'text-[#4B5563]'}`}>
                  {formatNumber(c.value(scroll))}
                </td>
              ))}
              <td className="py-2.5 px-3 text-right text-[12px] text-[#6B7280]">{formatDate(scroll.publishedAt ?? scroll.createdAt, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
