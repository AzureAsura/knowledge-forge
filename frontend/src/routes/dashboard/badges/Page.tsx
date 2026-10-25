import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowUpDown, Award, Check, CircleCheckBig, Gem, Lock, Sparkles, Zap } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useMe } from "@/features/auth/queries";
import { myBadgesQuery, type MyBadge } from "@/features/gamification/queries";
import { BADGE_ICON } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";

const TABS = ["all", "unlocked", "locked"] as const;
const SORTS = [
  { value: "xp", label: "Sort by: XP Value (High to Low)" },
  { value: "date", label: "Sort by: Unlock Date" },
  { value: "name", label: "Sort by: Alphabetical" },
] as const;

const searchSchema = z.object({
  tab: z.enum(TABS).catch("all"),
  sort: z.enum(["xp", "date", "name"]).catch("xp"),
});

const comparators: Record<(typeof SORTS)[number]["value"], (a: MyBadge, b: MyBadge) => number> = {
  xp: (a, b) => b.xpReward - a.xpReward,
  // Unlocked first (newest first), locked after.
  date: (a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""),
  name: (a, b) => a.name.localeCompare(b.name),
};

export default function BadgesPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const { tab, sort } = searchSchema.parse(Object.fromEntries(params));
  const { data: badges, isPending, isError } = useQuery(myBadgesQuery);

  const update = (patch: Partial<{ tab: (typeof TABS)[number]; sort: string }>) => {
    const next = { tab, sort, ...patch };
    const out = new URLSearchParams();
    if (next.tab !== "all") out.set("tab", next.tab);
    if (next.sort !== "xp") out.set("sort", next.sort);
    setParams(out);
  };

  const all = badges ?? [];
  const unlocked = all.filter((b) => b.unlocked);
  const locked = all.filter((b) => !b.unlocked);
  const percent = all.length ? Math.round((unlocked.length / all.length) * 1000) / 10 : 0;
  const totalXp = unlocked.reduce((sum, b) => sum + b.xpReward, 0);
  const closest = locked.filter((b) => b.percentDone !== null).sort((a, b) => b.percentDone! - a.percentDone!)[0];

  const counts = { all: all.length, unlocked: unlocked.length, locked: locked.length };
  const visible = (tab === "unlocked" ? unlocked : tab === "locked" ? locked : all).toSorted(comparators[sort as keyof typeof comparators]);

  const summary = [
    { label: "Badges Unlocked", icon: Award, value: `${unlocked.length} / ${all.length}`, note: `${locked.length} remaining` },
    { label: "Total Badge XP", icon: Zap, value: `+${formatNumber(totalXp)} XP`, valueColor: "text-[#3B82F6]", note: "Earned from unlocked badges" },
    {
      label: "Closest Badge",
      icon: Gem,
      value: closest?.name ?? (locked.length ? "Awarded by admin" : "All unlocked"),
      note: closest ? `${closest.percentDone}% done` : locked.length ? "Manual badges are granted by an admin" : "Every badge is unlocked",
    },
    { label: "Current Level", icon: Sparkles, value: `Lv. ${me.currentLevel}`, note: me.title },
  ];

  return (
    <div className="bg-base min-h-screen space-y-8 text-[#4B5563] font-sans">
      <section className="space-y-6">
        <div className="p-6 md:p-8 bg-base neu-raised rounded-[28px] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {summary.map((card) => (
              <div key={card.label} className="p-5 bg-base neu-raised-sm rounded-[20px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#6B7280]">
                  <span className="text-[10px] uppercase font-bold tracking-wider">{card.label}</span>
                  <div className="p-2 bg-base neu-raised-sm rounded-full">
                    <card.icon size={16} className="text-[#3B82F6]" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-[22px] leading-tight font-extrabold truncate ${card.valueColor ?? "text-[#1F2937]"}`}>{card.value}</span>
                </div>
                <div className="mt-1 text-[12px] text-[#6B7280] truncate">{card.note}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between text-[12px] font-bold text-[#4B5563]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#3B82F6]" />
                <span>OVERALL BADGE PROGRESS</span>
              </div>
              <span className="text-[#3B82F6]">{unlocked.length} OF {all.length} UNLOCKED</span>
            </div>

            <div className="w-full bg-base h-5 neu-pressed rounded-full overflow-hidden p-1 flex items-center">
              <div
                className="h-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] rounded-full relative flex items-center justify-end pr-1 transition-all duration-500 shadow-[0_2px_6px_rgba(59,130,246,0.3)]"
                style={{ width: `${percent}%` }}
              >
                <span className="text-[9px] font-extrabold text-[#1F2937] bg-base px-2 py-0.5 rounded-full neu-raised-sm">LEVEL {me.currentLevel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4">
        <div role="tablist" aria-label="Badge filter" className="flex items-center gap-4 overflow-x-auto py-4 px-3 -mx-3 -my-2 scrollbar-none min-w-0">
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => update({ tab: t })}
                className={`px-4 py-2.5 rounded-full text-[13px] flex items-center gap-2 shrink-0 whitespace-nowrap transition-all duration-200 ${
                  active ? "bg-[#3B82F6] text-white neu-raised-sm font-bold" : "bg-base text-[#4B5563] neu-raised-sm neu-hover font-medium"
                }`}
              >
                {t === "unlocked" && <CircleCheckBig size={15} className={active ? "text-white" : "text-[#3B82F6]"} />}
                {t === "locked" && <Lock size={15} className={active ? "text-white" : "text-[#6B7280]"} />}
                <span className="capitalize">{t === "all" ? "All Badges" : t}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-base text-[#6B7280] neu-pressed"}`}>
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[150px] shrink-0">
          <label htmlFor="badge-sort" className="sr-only">
            Sort badges
          </label>
          <select
            id="badge-sort"
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="w-full appearance-none pl-4 pr-9 py-2.5 bg-base neu-pressed rounded-[16px] text-[12px] font-semibold text-[#1F2937] focus:outline-none cursor-pointer"
          >
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7280]" />
        </div>
      </section>

      {isError && <EmptyState title="Couldn't load badges" message="Please try again in a moment." />}
      {badges && visible.length === 0 && <EmptyState title="Nothing here" message="No badges match this filter." />}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isPending && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 rounded-[24px]" />)}
        {visible.map((badge, i) => {
          const Icon = BADGE_ICON[badge.icon] ?? Award;
          return badge.unlocked ? (
            <article key={badge.slug} style={{ "--i": i } as CSSProperties} className="stagger-in card-lift bg-base neu-raised rounded-[24px] p-6 neu-hover transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-end mb-4">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-base text-[#3B82F6] neu-pressed">+{formatNumber(badge.xpReward)} XP</span>
                </div>

                <div className="flex justify-center my-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-base neu-raised flex items-center justify-center p-2">
                      <div className="w-full h-full rounded-full bg-[#3B82F6] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)]">
                        <Icon size={30} />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-base neu-raised-sm flex items-center justify-center text-[#3B82F6]">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                <h3 className="text-center mt-3 text-[16px] text-[#1F2937] font-extrabold tracking-tight">{badge.name}</h3>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6B7280]">Unlocked:</span>
                  <span className="font-semibold text-[#1F2937]">{badge.unlockedAt && formatDate(badge.unlockedAt, true)}</span>
                </div>
              </div>
            </article>
          ) : (
            <article key={badge.slug} style={{ "--i": i } as CSSProperties} className="stagger-in card-lift bg-base neu-raised rounded-[24px] p-6 opacity-85 hover:opacity-100 neu-hover transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-end mb-4">
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-base text-[#6B7280] neu-pressed">+{formatNumber(badge.xpReward)} XP</span>
                </div>

                <div className="flex justify-center my-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-base neu-pressed flex items-center justify-center">
                      <Icon size={30} className="text-[#9CA3AF]" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-base neu-raised-sm flex items-center justify-center text-[#6B7280]">
                      <Lock size={13} />
                    </div>
                  </div>
                </div>

                <h3 className="text-center mt-3 text-[16px] text-[#1F2937] font-extrabold tracking-tight">{badge.name}</h3>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E7EB] space-y-2">
                {badge.percentDone === null ? (
                  <p className="text-[11px] font-bold text-[#6B7280]">Awarded by admin</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-[#3B82F6]">
                        <span className="w-2 h-2 rounded-full bg-[#3B82F6] motion-safe:animate-pulse" />
                        In Progress
                      </span>
                      <span className="text-[#1F2937]">{badge.percentDone}%</span>
                    </div>
                    <div className="w-full bg-base h-2.5 rounded-full neu-pressed overflow-hidden p-0.5">
                      <div className="h-full bg-[#3B82F6] rounded-full shadow-[0_1px_4px_rgba(59,130,246,0.3)]" style={{ width: `${badge.percentDone}%` }} />
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
