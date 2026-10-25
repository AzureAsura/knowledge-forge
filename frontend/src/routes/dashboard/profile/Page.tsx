import type { CSSProperties } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import StreakTip from "@/components/gamification/StreakTip";
import Tooltip from "@/components/ui/Tooltip";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  Activity,
  Award,
  Bookmark,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Crown,
  Flame,
  Heart,
  Network,
  Pencil,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import UserAvatar from "@/components/ui/UserAvatar";
import FollowMentorButton from "@/components/apprentice/FollowMentorButton";
import { apprenticesQuery } from "@/features/apprentice/queries";
import { useMe } from "@/features/auth/queries";
import { badgeDefsQuery, treeQuery, xpHistoryQuery } from "@/features/gamification/queries";
import { SORT_OPTIONS } from "@/features/scrolls/filters";
import { scrollQueries, type ScrollFilters } from "@/features/scrolls/queries";
import type { ScrollItem } from "@/features/scrolls/schemas";
import GrantBadgeControl from "@/components/users/GrantBadgeControl";
import { userQueries } from "@/features/users/queries";
import { BADGE_ICON, DIFFICULTY, XP_SOURCE_ICON, xpReasonLabel } from "@/lib/constants";
import { cloudinaryWidth } from "@/lib/image";
import { formatDate, formatNumber, timeAgo } from "@/lib/format";

const PROFILE_PAGE_SIZE = 6;
const DEFAULT_SORT = "-likes_count";

const searchSchema = z.object({
  tab: z.enum(["scrolls", "badges", "saved", "liked", "activity"]).catch("scrolls"),
  sort: z.enum(SORT_OPTIONS.map((o) => o.value) as [string, ...string[]]).catch(DEFAULT_SORT),
  page: z.coerce.number().int().positive().catch(1),
});

function ProfileScrollCard({ scroll, index }: { scroll: ScrollItem; index: number }) {
  return (
    <article style={{ "--i": index } as CSSProperties} className="stagger-in card-lift group relative bg-base neu-raised rounded-[24px] overflow-hidden neu-hover transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="aspect-video w-full relative overflow-hidden bg-base neu-pressed">
          {scroll.coverImageUrl && (
            <img src={cloudinaryWidth(scroll.coverImageUrl, 640)} alt={scroll.title} loading="lazy" className="w-full h-full object-cover opacity-90" />
          )}
        </div>

        <div className="p-5 space-y-2.5">
          <p className="text-[11px] font-medium text-[#6B7280]">
            {scroll.category.name} · {DIFFICULTY[scroll.difficulty]}
          </p>
          <h3 className="text-[17px] leading-snug text-[#1F2937] font-bold line-clamp-2">
            <Link to={`/dashboard/scrolls/${scroll.slug}`} className="group-hover:text-[#3B82F6] transition-colors after:absolute after:inset-0">
              {scroll.title}
            </Link>
          </h3>
          <p className="text-[12px] leading-relaxed text-[#6B7280] line-clamp-2">{scroll.excerpt}</p>
        </div>
      </div>

      <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex items-center justify-between text-[12px]">
        <span className="text-[11px] text-[#9CA3AF] font-medium">{formatDate(scroll.publishedAt ?? scroll.createdAt, true)}</span>
        <div className="flex items-center gap-3 text-[#6B7280] font-semibold">
          <span className="flex items-center gap-1">
            <Heart size={16} className="text-[#EF4444]" fill="currentColor" />
            {formatNumber(scroll.likesCount)}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark size={16} />
            {formatNumber(scroll.bookmarksCount)}
          </span>
        </div>
      </div>
    </article>
  );
}

const EMPTY_TITLE = { scrolls: "No published scrolls yet", saved: "Nothing saved yet", liked: "Nothing liked yet" } as const;
const SCROLL_LIST_TABS: string[] = ["scrolls", "saved", "liked"];

// "saved" and "liked" are always the signed-in user's own lists: the backend scopes them to the caller.
function ScrollsTab({ kind, username, sort, page, onPage }: { kind: "scrolls" | "saved" | "liked"; username: string; sort: string; page: number; onPage: (page: number) => void }) {
  const filters: ScrollFilters = kind === "scrolls" ? { author: username } : { view: kind };
  const { data, isPending, isError, isPlaceholderData } = useQuery(
    scrollQueries.list({ ...filters, sort, page, limit: PROFILE_PAGE_SIZE }),
  );

  return (
    <>
      <div
        aria-busy={isPlaceholderData}
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
      >
        {isPending && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 rounded-[24px]" />)}
        {data?.items.map((scroll, i) => <ProfileScrollCard key={scroll.id} scroll={scroll} index={i} />)}
      </div>
      {isError && <EmptyState title="Couldn't load scrolls" message="Please try again in a moment." />}
      {data?.items.length === 0 && <EmptyState title={EMPTY_TITLE[kind]} />}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={onPage} />}
    </>
  );
}

function BadgesTab({ username }: { username: string }) {
  const { data: owned, isPending } = useQuery(userQueries.badges(username));
  const { data: defs } = useQuery(badgeDefsQuery);

  return (
    <div className="bg-base neu-raised rounded-[24px] p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2">
          <Award size={20} className="text-[#3B82F6]" />
          <h3 className="text-[17px] leading-snug text-[#1F2937] font-extrabold">Earned Badges</h3>
        </div>
        {owned && defs && (
          <span className="bg-base neu-pressed text-[#3B82F6] text-[11px] font-bold px-3 py-1 rounded-full">
            {owned.length} / {defs.length} UNLOCKED
          </span>
        )}
      </div>

      {isPending && <Skeleton className="h-28 rounded-[16px]" />}
      {owned?.length === 0 && <p className="text-[13px] text-[#6B7280]">No badges unlocked yet.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {owned?.map((badge, i) => {
          const Icon = BADGE_ICON[badge.icon] ?? Award;
          const xp = defs?.find((d) => d.slug === badge.slug)?.xpReward;
          return (
            <div key={badge.slug} style={{ "--i": i } as CSSProperties} className="stagger-in card-lift bg-base neu-raised-sm p-3.5 rounded-[16px] text-center space-y-2 neu-hover transition-all duration-200">
              <div className="w-11 h-11 mx-auto rounded-[12px] bg-base neu-raised-sm flex items-center justify-center text-[#3B82F6]">
                <Icon size={22} />
              </div>
              <div className="text-[11px] font-bold truncate text-[#1F2937]">{badge.name}</div>
              {xp !== undefined && <div className="text-[10px] font-semibold text-[#6B7280]">+{formatNumber(xp)} XP</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityTab({ page, onPage }: { page: number; onPage: (page: number) => void }) {
  const { data, isPending, isPlaceholderData } = useQuery(xpHistoryQuery(page));

  return (
    <div className="space-y-4">
      <div className="bg-base neu-raised rounded-[24px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
          <Activity size={20} className="text-[#3B82F6]" />
          <h3 className="text-[17px] leading-snug text-[#1F2937] font-extrabold">Recent XP Timeline</h3>
        </div>

        <div className={`space-y-3 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
          {isPending && <Skeleton className="h-16 rounded-[16px]" />}
          {data?.items.length === 0 && <p className="text-[13px] text-[#6B7280]">No XP earned yet.</p>}
          {data?.items.map((item) => {
            const Icon = XP_SOURCE_ICON[item.sourceType] ?? Award;
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-base neu-raised-sm rounded-[16px]">
                <div className="w-8 h-8 rounded-[10px] bg-base neu-raised-sm flex items-center justify-center flex-shrink-0 text-[#3B82F6]">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-[12px] font-bold text-[#1F2937] truncate">{xpReasonLabel(item.reason)}</p>
                    <span className="bg-base neu-pressed text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      +{formatNumber(item.amount)} XP
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[#6B7280] mt-0.5">{timeAgo(item.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={onPage} />}
    </div>
  );
}

function MyApprentices() {
  const { data, isPending, isError } = useQuery(apprenticesQuery);

  return (
    <section className="bg-base neu-raised rounded-[24px] p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
        <Users size={20} className="text-[#3B82F6]" />
        <h2 className="text-[18px] leading-snug text-[#1F2937] font-extrabold">My Apprentices</h2>
      </div>
      {isPending && <Skeleton className="h-16 rounded-[16px]" />}
      {isError && <p className="text-[13px] text-[#EF4444]">Couldn't load your apprentices.</p>}
      {data?.length === 0 && <p className="text-[13px] text-[#6B7280]">You have no apprentices yet. Scholars can follow you as their mentor from your profile.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data?.map((a) => (
          <Link
            key={a.id}
            to={`/dashboard/profile/${a.username}`}
            className="flex items-center gap-3 p-3 bg-base neu-raised-sm neu-hover rounded-[16px] transition-all"
          >
            <div className="w-10 h-10 rounded-[12px] bg-base neu-raised-sm overflow-hidden shrink-0">
              <UserAvatar name={a.fullName} className="text-[12px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#1F2937] truncate">{a.fullName}</p>
              <p className="text-[11px] text-[#6B7280]">
                Lv. {a.level} · {a.publishedScrollsCount} published · joined {formatDate(a.joinedAt, true)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { username = "" } = useParams();
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const { data: profile } = useSuspenseQuery(userQueries.profile(username));
  const { data: nodes } = useQuery({ ...treeQuery(profile.id), select: (t) => t.nodes });

  const isOwn = profile.id === me.id;
  const parsed = searchSchema.parse(Object.fromEntries(params));
  const ownOnly = parsed.tab === "activity" || parsed.tab === "saved" || parsed.tab === "liked";
  const tab = ownOnly && !isOwn ? "scrolls" : parsed.tab;

  // The URL is the single source of truth; only non-default values are written back.
  const setView = (patch: Partial<typeof parsed>) => {
    const next = { ...parsed, tab, page: 1, ...patch };
    const out = new URLSearchParams();
    if (next.tab !== "scrolls") out.set("tab", next.tab);
    if (SCROLL_LIST_TABS.includes(next.tab) && next.sort !== DEFAULT_SORT) out.set("sort", next.sort);
    if (next.page > 1) out.set("page", String(next.page));
    setParams(out);
  };

  const tabs: { id: typeof tab; label: string; icon: LucideIcon }[] = [
    { id: "scrolls", label: `Scrolls (${profile.stats.publishedScrolls})`, icon: BookOpen },
    { id: "badges", label: `Badges (${profile.stats.badgesCount})`, icon: Crown },
    ...(isOwn
      ? [
          { id: "saved" as const, label: "Saved", icon: Bookmark },
          { id: "liked" as const, label: "Liked", icon: Heart },
          { id: "activity" as const, label: "Activity (XP Timeline)", icon: Activity },
        ]
      : []),
  ];

  return (
    <div className="w-full space-y-8 bg-base text-[#4B5563] font-sans">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-base neu-raised rounded-[24px] p-6 md:p-8 flex flex-col">
          <div className="flex-1 flex flex-col sm:flex-row gap-5 items-stretch">
            {/* Always a square: sized to roughly match the height of the info column next to it. */}
            <div className="relative w-full aspect-square sm:w-64 sm:h-64 sm:self-start rounded-[28px] bg-base neu-raised-sm overflow-hidden shrink-0 text-7xl sm:text-6xl">
              <div className="absolute inset-1.5 overflow-hidden rounded-[22px]">
                <UserAvatar src={profile.avatarUrl} name={profile.fullName} width={480} />
              </div>
              {isOwn && (
                <Link
                  to="/dashboard/settings"
                  aria-label="Edit profile"
                  title="Edit profile"
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-base neu-raised-sm neu-hover text-[#4B5563] hover:text-[#3B82F6] flex items-center justify-center transition-all"
                >
                  <Pencil size={16} />
                </Link>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h1 className="text-[26px] sm:text-[30px] leading-tight text-[#1F2937] font-extrabold tracking-tight break-words">{profile.fullName}</h1>
                  <span className="text-[14px] text-[#6B7280] font-mono font-medium">@{profile.username}</span>
                </div>

                <Tooltip align="right" content={<StreakTip warn={isOwn} streaks={profile.stats.streaks} />}>
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-14 h-14">
                    <Flame size={56} strokeWidth={1.5} fill="currentColor" className={`${profile.stats.currentStreak > 0 ? "text-[#F97316]" : "text-[#D1D5DB]"} ${isOwn && profile.stats.streaks.some((s) => s.atRisk) ? "flame-warn" : ""}`} aria-hidden />
                    <span className="absolute inset-0 flex items-center justify-center pt-2.5 text-[17px] font-extrabold text-white" aria-hidden>
                      {profile.stats.currentStreak}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">day streak</span>
                  <span className="sr-only">{profile.stats.currentStreak} day streak</span>
                </div>
                </Tooltip>
              </div>

              <p className="sm:hidden text-[13px] font-semibold text-[#6B7280]">
                <span className="text-[#3B82F6] font-bold">
                  Lv. {profile.level} · {profile.title}
                </span>
                <span aria-hidden> · </span>
                <span className="capitalize">{profile.role}</span>
              </p>
              <div className="hidden sm:flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-base neu-raised-sm text-[#3B82F6] px-3 py-1 rounded-full text-[12px] font-bold">
                  <Award size={15} />
                  Lv. {profile.level} · {profile.title}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-base neu-pressed text-[#6B7280] px-3 py-1 rounded-full text-[12px] font-semibold capitalize">
                  <Shield size={15} />
                  {profile.role}
                </span>
              </div>

              {profile.bio && <p className="text-[14px] leading-relaxed text-[#4B5563] font-normal">{profile.bio}</p>}

              <div className="flex flex-wrap items-center gap-3 text-[12px]">
                <div className="flex items-center gap-1.5 text-[#6B7280] font-medium">
                  <Calendar size={16} />
                  <span>Joined {formatDate(profile.createdAt, true)}</span>
                </div>
                {profile.mentor && (
                  <Link
                    to={`/dashboard/profile/${profile.mentor}`}
                    className="inline-flex items-center gap-2 bg-base neu-raised-sm text-[#1F2937] px-3 py-1 rounded-full transition-all hover:text-[#3B82F6]"
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-[#E5E7EB] text-[9px]">
                      <UserAvatar name={profile.mentor} />
                    </div>
                    <span className="font-semibold text-xs">
                      Mentor: <span className="underline">@{profile.mentor}</span>
                    </span>
                  </Link>
                )}
              </div>

              {!isOwn && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <FollowMentorButton target={profile} />
                  {me.role === "admin" && <GrantBadgeControl userId={profile.id} username={profile.username} />}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-base neu-raised rounded-[24px] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network size={16} className="text-[#3B82F6]" />
              <h2 className="text-[15px] leading-snug font-extrabold text-[#1F2937]">Topic Mastery</h2>
            </div>

            <Link to={`/dashboard/tree/${profile.username}`} className="text-[11px] font-bold text-[#3B82F6] hover:underline flex items-center">
              <span>Open Tree</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Slim rows spread over the column's height, so the card still matches the (taller) left card. */}
          <div className="flex-1 flex flex-col justify-between gap-2">
            {!nodes && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-7 rounded-[10px]" />)}
            {nodes?.map((node) => {
              const percent = node.level >= 5 ? 100 : Math.min(100, Math.round((node.xpInTopic / node.xpForNextLevel) * 100));
              return (
                <div key={node.id} className="space-y-1">
                  <div className="flex justify-between items-center gap-2 text-[12px]">
                    <span className="font-extrabold text-[#1F2937] truncate flex items-center gap-1">
                      {percent === 100 && <span className="text-[#3B82F6]">★</span>}
                      {node.name}
                    </span>
                    <span className="font-bold text-[#3B82F6] shrink-0">
                      {percent}% · Lv. {node.level}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-base neu-pressed rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-[#3B82F6] rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {isOwn && me.role !== "scholar" && <MyApprentices />}

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
          <div role="tablist" aria-label="Profile sections" className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-none min-w-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setView({ tab: t.id })}
                className={`px-4 py-2.5 rounded-full text-[13px] flex items-center gap-2 shrink-0 whitespace-nowrap transition-all duration-200 ${
                  tab === t.id ? "bg-[#3B82F6] text-white neu-raised-sm font-bold" : "bg-base text-[#4B5563] neu-raised-sm neu-hover font-medium"
                }`}
              >
                <t.icon size={16} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {SCROLL_LIST_TABS.includes(tab) && (
            <div className="hidden sm:flex items-center gap-2 py-1 px-1">
              <label htmlFor="profile-sort" className="text-[12px] text-[#6B7280] font-medium">
                Sort:
              </label>
              <div className="relative">
                <select
                  id="profile-sort"
                  value={parsed.sort}
                  onChange={(e) => setView({ sort: e.target.value })}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-base neu-raised-sm rounded-[12px] text-[12px] font-semibold text-[#1F2937] neu-hover focus:outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7280]" />
              </div>
            </div>
          )}
        </div>

        {(tab === "scrolls" || tab === "saved" || tab === "liked") && (
          <ScrollsTab kind={tab} username={profile.username} sort={parsed.sort} page={parsed.page} onPage={(page) => setView({ page })} />
        )}
        {tab === "badges" && <BadgesTab username={profile.username} />}
        {tab === "activity" && <ActivityTab page={parsed.page} onPage={(page) => setView({ page })} />}
      </section>
    </div>
  );
}
