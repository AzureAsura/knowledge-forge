import type { CSSProperties } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ScrollText, Target, Users, Wand2, Zap, type LucideIcon } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useMe } from "@/features/auth/queries";
import {
  leaderboardQuery,
  parseLeaderboardParams,
  type LeaderboardPeriod,
  type LeaderboardType,
} from "@/features/gamification/queries";
import { formatNumber } from "@/lib/format";

const TABS: { type: LeaderboardType; label: string; icon: LucideIcon; unit: string; column: string }[] = [
  { type: "xp", label: "Top Scholars (by XP)", icon: Zap, unit: "XP", column: "Metric (XP Earned)" },
  { type: "scribes", label: "Top Writers (by scrolls)", icon: ScrollText, unit: "Scrolls", column: "Metric (Scrolls Published)" },
  { type: "mentors", label: "Top Mentors (by apprentice XP)", icon: Users, unit: "XP", column: "Metric (Apprentice XP)" },
];

const HORIZONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
];

const MEDALS = [
  { color: "text-[#D97706]", order: "order-1 md:order-2" },
  { color: "text-[#6B7280]", order: "order-2 md:order-1" },
  { color: "text-[#B45309]", order: "order-3" },
];

const TREND = {
  up: { text: "↑", color: "text-[#10B981]", sr: "Moved up" },
  down: { text: "↓", color: "text-[#EF4444]", sr: "Moved down" },
  same: { text: "—", color: "text-[#6B7280]", sr: "No change" },
  new: { text: "NEW", color: "text-[#3B82F6]", sr: "New entry" },
} as const;

function TrendBadge({ trend, className = "" }: { trend: keyof typeof TREND; className?: string }) {
  const { text, color, sr } = TREND[trend];
  return (
    <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] whitespace-nowrap bg-base neu-pressed ${color} ${className}`}>
      <span aria-hidden>{text}</span>
      <span className="sr-only">{sr}</span>
    </span>
  );
}

export default function LeaderboardPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const { type, period } = parseLeaderboardParams(params);
  const tab = TABS.find((t) => t.type === type)!;

  const { data, isPending, isError, isPlaceholderData } = useQuery({
    ...leaderboardQuery(type, period),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });

  const update = (patch: { type?: LeaderboardType; period?: LeaderboardPeriod }) => {
    const next = { type, period, ...patch };
    const out = new URLSearchParams();
    if (next.type !== "xp") out.set("type", next.type);
    if (next.period !== "all") out.set("period", next.period);
    setParams(out);
  };

  const rows = data ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myIndex = rows.findIndex((row) => row.user.id === me.id);
  const mine = myIndex >= 0 ? rows[myIndex] : undefined;
  const above = myIndex > 0 ? rows[myIndex - 1] : undefined;

  return (
    <div className="w-full flex flex-col space-y-6 bg-base text-[#4B5563] font-sans relative">
      {/* Header Tabs */}
      <section className="bg-base neu-raised rounded-[24px] p-4 sm:p-5 space-y-4 shrink-0">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          <div role="tablist" aria-label="Leaderboard type" className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-none min-w-0">
            {TABS.map((t) => {
              const active = t.type === type;
              return (
                <button
                  key={t.type}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => update({ type: t.type })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] sm:text-[14px] shrink-0 whitespace-nowrap transition-all duration-200 ${
                    active ? "bg-[#3B82F6] text-white neu-raised-sm font-bold" : "bg-base text-[#4B5563] neu-raised-sm neu-hover font-medium"
                  }`}
                >
                  <t.icon size={16} fill={active ? "currentColor" : "none"} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center bg-base neu-pressed p-1 rounded-full justify-between sm:justify-start self-start xl:self-auto">
            {HORIZONS.map((h) => (
              <button
                key={h.value}
                type="button"
                aria-pressed={h.value === period}
                onClick={() => update({ period: h.value })}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] rounded-full transition-all duration-200 ${
                  h.value === period ? "bg-[#3B82F6] font-bold text-white neu-raised-sm" : "text-[#6B7280] font-semibold hover:text-[#1F2937]"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 rounded-[24px]" />)}
        </div>
      )}
      {isError && <EmptyState title="Couldn't load the leaderboard" message="Please try again in a moment." />}
      {data?.length === 0 && <EmptyState title="No standings yet" message="Nobody has earned anything in this period." />}

      {/* Main Content Area */}
      <div className={`space-y-6 flex-1 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`} aria-busy={isPlaceholderData}>
        {podium.length > 0 && (
          <section aria-label="Top three" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {podium.map((entry, i) => {
              const champion = i === 0;
              const medal = MEDALS[i];
              const isYou = entry.user.id === me.id;
              return (
                <article
                  key={entry.user.id}
                  style={{ "--i": i } as CSSProperties}
                  className={`stagger-in card-lift flex flex-col items-center text-center gap-3 bg-base neu-raised rounded-[24px] p-6 ${medal.order} neu-hover transition-all duration-300 ${
                    champion ? "md:py-9" : ""
                  } ${isYou ? "ring-2 ring-[#3B82F6]/40" : ""}`}
                >
                  <span className={`text-[28px] leading-none font-black ${medal.color}`}>
                    <span className="sr-only">Rank </span>#{entry.rank}
                  </span>

                  <Link
                    to={`/dashboard/profile/${entry.user.username}`}
                    tabIndex={-1}
                    aria-hidden
                    className={`rounded-[22px] bg-base neu-raised-sm p-1 overflow-hidden block text-xl ${champion ? "w-24 h-24" : "w-20 h-20"}`}
                  >
                    <UserAvatar src={entry.user.avatarUrl} name={entry.user.fullName} className="rounded-[18px]" />
                  </Link>

                  <div className="min-w-0 max-w-full">
                    <h3 className={`text-[#1F2937] truncate ${champion ? "text-[19px] font-extrabold" : "text-[16px] font-bold"}`}>
                      <Link to={`/dashboard/profile/${entry.user.username}`} className="hover:text-[#3B82F6] transition-colors">
                        {entry.user.fullName}
                      </Link>
                    </h3>
                    <p className="text-[12px] text-[#6B7280] font-medium truncate mt-0.5">
                      @{entry.user.username} · Lv. {entry.user.level}
                    </p>
                  </div>

                  <div className="w-full pt-3 mt-auto border-t border-[#E5E7EB] flex items-baseline justify-center gap-1">
                    <span className={`text-[#1F2937] font-extrabold ${champion ? "text-[24px]" : "text-[20px]"}`}>{formatNumber(entry.metric)}</span>
                    <span className="text-[11px] text-[#6B7280] font-bold">{tab.unit}</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {rest.length > 0 && (
          <section className="bg-base neu-raised rounded-[24px] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center gap-2.5 flex-wrap">
              <span className="text-[15px] sm:text-[16px] font-extrabold text-[#1F2937]">Full Standings</span>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-[#E5E7EB]">
              {rest.map((row, i) => {
                const isYou = row.user.id === me.id;
                return (
                  <div key={row.user.id} style={{ "--i": i } as CSSProperties} className={`stagger-in p-4 space-y-3 ${isYou ? "bg-[#EEF2FF]" : "bg-base"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-[10px] bg-base neu-raised-sm flex items-center justify-center font-black text-xs shrink-0 ${isYou ? "text-[#3B82F6]" : "text-[#1F2937]"}`}>
                          {row.rank}
                        </span>
                        <Link to={`/dashboard/profile/${row.user.username}`} tabIndex={-1} aria-hidden className="w-9 h-9 rounded-[12px] overflow-hidden shrink-0 text-xs block">
                          <UserAvatar src={row.user.avatarUrl} name={row.user.fullName} />
                        </Link>
                        <div className="truncate">
                          <div className="font-extrabold text-[#1F2937] text-[13px] flex items-center gap-1.5 truncate">
                            <Link to={`/dashboard/profile/${row.user.username}`} className="truncate">{row.user.fullName}</Link>
                            {isYou && <span className="bg-[#3B82F6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">YOU</span>}
                          </div>
                          <span className="text-[10px] text-[#6B7280] block truncate">@{row.user.username}</span>
                        </div>
                      </div>
                      <TrendBadge trend={row.trend} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="bg-base neu-pressed px-2.5 py-0.5 rounded-full font-semibold text-[10px] text-[#6B7280]">Lv. {row.user.level}</span>
                      <span className="font-extrabold text-[14px] text-[#1F2937] shrink-0">
                        {formatNumber(row.metric)} {tab.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto p-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[11px] text-[#6B7280] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Member</th>
                    <th className="py-3.5 px-4">Level</th>
                    <th className="py-3.5 px-4 text-right">{tab.column}</th>
                    <th className="py-3.5 px-4 text-center">Trend</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]/70 text-[13px]">
                  {rest.map((row, i) => {
                    const isYou = row.user.id === me.id;
                    return (
                      <tr key={row.user.id} style={{ "--i": i } as CSSProperties} className={`stagger-in ${isYou ? "bg-[#EEF2FF] font-semibold" : "hover:bg-[#EAEFF5]/50 transition-colors"}`}>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex rounded-[10px] items-center justify-center font-bold text-xs ${
                              isYou ? "w-8 h-8 bg-white text-[#3B82F6] neu-raised-sm font-extrabold text-sm" : "w-7 h-7 bg-base neu-raised-sm text-[#1F2937]"
                            }`}
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Link to={`/dashboard/profile/${row.user.username}`} className="group flex items-center gap-3">
                            <div className={`${isYou ? "w-10 h-10" : "w-8 h-8"} rounded-[10px] overflow-hidden text-xs shrink-0`}>
                              <UserAvatar src={row.user.avatarUrl} name={row.user.fullName} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap font-extrabold text-[#1F2937] text-[13px]">
                                <span className="group-hover:text-[#3B82F6] transition-colors">{row.user.fullName}</span>
                                {isYou && <span className="bg-[#3B82F6] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">YOU</span>}
                              </div>
                              <span className="text-[10px] text-[#6B7280] font-medium">@{row.user.username}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-base neu-pressed text-[#6B7280] px-2.5 py-1 rounded-full text-[11px] font-semibold">Lv. {row.user.level}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-[15px] text-[#1F2937]">{formatNumber(row.metric)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <TrendBadge trend={row.trend} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/dashboard/profile/${row.user.username}`}
                            className={
                              isYou
                                ? "px-3.5 py-1.5 bg-[#3B82F6] text-white text-[12px] font-bold rounded-[12px] neu-raised-sm hover:bg-[#2563EB] transition-all"
                                : "px-3 py-1 bg-base text-[#4B5563] neu-raised-sm neu-hover rounded-[10px] text-[11px] font-semibold transition-all"
                            }
                          >
                            {isYou ? "Your Profile" : "View Profile"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#E5E7EB] text-[12px] text-[#6B7280] font-medium">
              Showing the top <strong className="text-[#1F2937]">{rows.length}</strong>
            </div>
          </section>
        )}
      </div>

      {/* Sticky Standing Bar */}
      {data && (
        <div className="sticky bottom-0 sm:bottom-4 z-20 bg-base neu-raised rounded-[24px] p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-[#ffffff] mt-auto">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-base neu-raised-sm flex items-center justify-center font-black text-[#3B82F6] text-lg sm:text-xl shrink-0">
              {mine ? `#${mine.rank}` : "—"}
            </div>
            <div className="min-w-0">
              <span className="text-[14px] sm:text-[16px] font-extrabold text-[#1F2937]">
                {mine ? `Your Standing: Rank #${mine.rank} of the top ${rows.length}` : "Not in the top 50 yet"}
              </span>
              <p className="text-[11px] sm:text-[12px] text-[#6B7280] font-medium mt-0.5 flex items-center gap-1.5 truncate">
                <Target size={14} className="text-[#3B82F6] shrink-0" />
                <span className="truncate">
                  {!mine ? (
                    "Earn more to enter the standings."
                  ) : above ? (
                    <>
                      <strong className="text-[#1F2937]">+{formatNumber(above.metric - mine.metric)} {tab.unit}</strong> needed for #{above.rank}
                    </>
                  ) : (
                    "You're leading this board."
                  )}
                </span>
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/scrolls/new"
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#3B82F6] text-white text-[13px] sm:text-[14px] px-5 py-3 rounded-[14px] neu-raised-sm font-bold hover:bg-[#2563EB] active:scale-95 transition-all shrink-0"
          >
            <Wand2 size={16} />
            <span>Forge a Scroll</span>
          </Link>
        </div>
      )}
    </div>
  );
}