import { List, Network } from "lucide-react";
import type { Filter } from "@/features/tree/layout";

export type View = "graph" | "list";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mastered", label: "Mastered" },
  { value: "unlocked", label: "Unlocked" },
  { value: "locked", label: "Locked" },
];

interface TreeToolbarProps {
  view: View;
  filter: Filter;
  counts: Record<Filter, number>;
  onView: (view: View) => void;
  onFilter: (filter: Filter) => void;
}

export default function TreeToolbar({ view, filter, counts, onView, onFilter }: TreeToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Tree view" className="flex items-center bg-base neu-pressed p-1 rounded-full">
        {(
          [
            { value: "graph", label: "Graph", icon: Network },
            { value: "list", label: "List", icon: List },
          ] as const
        ).map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            onClick={() => onView(v.value)}
            className={`flex items-center gap-1.5 px-5 py-2 text-[14px] rounded-full transition-all duration-200 ${
              view === v.value ? "bg-[#3B82F6] font-bold text-white neu-raised-sm" : "text-[#6B7280] font-semibold hover:text-[#1F2937]"
            }`}
          >
            <v.icon size={16} />
            {v.label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Filter topics by status" className="flex items-center gap-2.5 overflow-x-auto scrollbar-none px-2 pt-2 pb-4 -mb-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => onFilter(f.value)}
            className={`px-4 py-2 rounded-full text-[14px] font-bold shrink-0 whitespace-nowrap transition-all duration-200 ${
              filter === f.value ? "bg-[#3B82F6] text-white neu-raised-sm" : "bg-base text-[#6B7280] neu-raised-sm neu-hover"
            }`}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>
    </div>
  );
}
