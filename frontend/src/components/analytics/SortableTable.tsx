import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  // Value used when sorting; omit to make the column unsortable.
  sortValue?: (row: T) => number | string
  align?: 'right'
}

// Small client-side sortable table for short lists (apprentices, top authors). Click a header to sort; click again to flip.
export default function SortableTable<T>({ rows, columns, rowKey, defaultSort }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string | number; defaultSort: string }) {
  const [sort, setSort] = useState({ key: defaultSort, desc: true })
  const column = columns.find((c) => c.key === sort.key)
  const sorted = column?.sortValue
    ? [...rows].sort((a, b) => {
        const x = column.sortValue!(a)
        const y = column.sortValue!(b)
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
        return sort.desc ? -cmp : cmp
      })
    : rows

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[420px]">
        <thead>
          <tr className="border-b border-[#E5E7EB] text-[11px] text-[#6B7280] font-bold uppercase tracking-wider">
            {columns.map((c) => (
              <th key={c.key} className={`py-2.5 px-3 ${c.align === 'right' ? 'text-right' : ''}`} aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                {c.sortValue ? (
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : true }))}
                    className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-[#1F2937] ${sort.key === c.key ? 'text-[#3B82F6]' : ''}`}
                  >
                    {c.label}
                    {sort.key === c.key ? sort.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : <ArrowUpDown size={12} className="opacity-50" />}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]/70 text-[13px]">
          {sorted.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-[#EAEFF5]/50 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={`py-2.5 px-3 ${c.align === 'right' ? 'text-right font-bold text-[#1F2937]' : ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
