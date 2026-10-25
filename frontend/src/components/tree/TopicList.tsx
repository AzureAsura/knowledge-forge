import { useState } from "react";
import { BookOpen, ChevronRight, Star } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type { Category } from "@/features/categories/queries";
import type { TopicNode, TreeData } from "@/features/gamification/queries";
import type { Filter } from "@/features/tree/layout";
import { topicProgress, unlockHint } from "@/features/tree/progress";
import { CATEGORY_ICON, categoryColor, LEVEL_TITLE, topicStatus } from "@/lib/constants";

const SORTS = { level: "Level", progress: "Progress", name: "Name" } as const;
type Sort = keyof typeof SORTS;

const compare: Record<Sort, (a: TopicNode, b: TopicNode) => number> = {
  level: (a, b) => b.level - a.level || b.xpInTopic - a.xpInTopic,
  progress: (a, b) => topicProgress(b).overall - topicProgress(a).overall,
  name: (a, b) => a.name.localeCompare(b.name),
};

interface TopicListProps {
  data: TreeData;
  categories: Category[];
  filter: Filter;
  selected?: string;
  onSelect: (slug: string) => void;
}

// The accessible, mobile-friendly twin of the graph: the same topics, grouped by their parent category.
export default function TopicList({ data, categories, filter, selected, onSelect }: TopicListProps) {
  const [sort, setSort] = useState<Sort>("level");
  const byId = new Map(categories.map((c) => [c.id, c]));

  const visible = data.nodes.filter((n) => filter === "all" || topicStatus(n.level) === filter).sort(compare[sort]);
  const groups = new Map<string, TopicNode[]>();
  for (const topic of visible) {
    const parentId = byId.get(topic.id)?.parentId;
    const label = parentId ? (byId.get(parentId)?.name ?? "Other") : "Other topics";
    groups.set(label, [...(groups.get(label) ?? []), topic]);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2 text-[14px]">
        <label htmlFor="tree-sort" className="text-[#6B7280] font-medium">
          Sort by
        </label>
        <select
          id="tree-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-base neu-pressed rounded-[12px] px-3 py-1.5 text-[14px] font-semibold text-[#1F2937] focus:outline-none"
        >
          {(Object.keys(SORTS) as Sort[]).map((key) => (
            <option key={key} value={key}>
              {SORTS[key]}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 && <EmptyState title="No topics match this filter" />}

      {[...groups].map(([label, topics]) => (
        <section key={label} className="space-y-3" aria-label={label}>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</h3>
          <div className="space-y-3">
            {topics.map((topic) => {
              const status = topicStatus(topic.level);
              const color = status === "locked" ? "#9CA3AF" : categoryColor(topic.slug);
              const { overall } = topicProgress(topic);
              const Icon = CATEGORY_ICON[topic.slug] ?? BookOpen;
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={selected === topic.slug}
                  onClick={() => onSelect(topic.slug)}
                  className={`w-full text-left bg-base ${status === "locked" ? "neu-pressed" : "neu-raised"} neu-hover rounded-[18px] p-4 flex items-center gap-4 transition-all ${
                    selected === topic.slug ? "ring-2 ring-[#3B82F6]" : ""
                  }`}
                >
                  <div className="w-11 h-11 rounded-[14px] bg-base neu-raised-sm flex items-center justify-center shrink-0" style={{ color }}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[16px] font-extrabold text-[#1F2937] truncate flex items-center gap-1.5">
                        {topic.name}
                        {status === "mastered" && <Star size={16} className="text-[#F59E0B]" fill="currentColor" aria-label="Mastered" />}
                      </span>
                      <span className="text-[13px] font-semibold text-[#6B7280] shrink-0">
                        {status === "locked" ? "Not started" : `Lv. ${topic.level} · ${LEVEL_TITLE[topic.level]}`}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-base neu-pressed rounded-full overflow-hidden p-0.5">
                      <div className="h-full rounded-full" style={{ width: `${overall}%`, background: color }} />
                    </div>
                    <p className="flex justify-between text-[13px] font-medium text-[#6B7280]">
                      <span>{status === "mastered" ? "Max level" : `${overall}% to next level`}</span>
                      <span>
                        {topic.scrollsContributed} written · {topic.scrollsRead} read
                      </span>
                    </p>
                    {status === "locked" && <p className="text-[13px] font-semibold text-[#6B7280]">{unlockHint(topic)}</p>}
                  </div>
                  <ChevronRight size={20} className="text-[#9CA3AF] shrink-0" aria-hidden />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
