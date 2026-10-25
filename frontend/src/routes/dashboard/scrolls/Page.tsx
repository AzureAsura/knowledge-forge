import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  CirclePlus,
  Infinity as InfinityIcon,
  ChevronDown,
  PenLine,
  ScrollText,
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import { useMe } from "@/features/auth/queries";
import { categoriesQuery, leafCategories } from "@/features/categories/queries";
import ScrollCard from "@/components/scrolls/ScrollCard";
import { PAGE_SIZE, SORT_OPTIONS, useScrollFilters } from "@/features/scrolls/filters";
import { scrollQueries } from "@/features/scrolls/queries";
import { CATEGORY_ICON, STATUS_LABEL } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

const VIEW_PILLS = [
  { label: "All Scrolls", value: "all" },
  { label: "My Scrolls", value: "mine" },
] as const;

const STATUS_PILLS = [
  { label: "All Status", value: undefined },
  ...(["draft", "pending", "published", "archived"] as const).map((value) => ({
    label: STATUS_LABEL[value],
    value,
  })),
];

const TIER_PILLS = [
  { label: "All Tiers", value: undefined },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;

const pressed = (active: boolean) => ({ "aria-pressed": active });

const pillClass = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
    active
      ? `bg-[#3B82F6] text-white neu-raised-sm font-bold`
      : `bg-base text-[#6B7280] neu-raised-sm neu-hover`
  }`;

export default function ScrollsPage() {
  const me = useMe();
  const { filters, setFilters } = useScrollFilters();
  const [search, setSearch] = useState(filters.q ?? "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: categories } = useQuery({ ...categoriesQuery, select: leafCategories });
  const { data, isPending, isError, isPlaceholderData } = useQuery(
    scrollQueries.list({ ...filters, limit: PAGE_SIZE })
  );


  const activeSecondaryFilterCount = [
    filters.category,
    filters.tier,
    filters.status,
  ].filter(Boolean).length;

  const hasAnyFilter = !!(
    filters.q ||
    filters.category ||
    filters.tier ||
    filters.status ||
    filters.view !== "all"
  );

  const handleClearAllFilters = () => {
    setSearch("");
    setFilters({
      q: undefined,
      category: undefined,
      tier: undefined,
      status: undefined,
      view: "all",
      page: 1,
    });
  };

  return (
    <div className="w-full space-y-6 bg-base text-[#4B5563] font-sans">

      <section className="bg-base neu-raised rounded-[24px] p-4 sm:p-5 space-y-4">

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">

          <form
            role="search"
            className="relative flex-1 min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters({ q: search.trim() || undefined, page: 1 });
            }}
          >
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
            />
            <input
              type="text"
              aria-label="Filter scrolls by title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scrolls by title..."
              className="w-full bg-base neu-pressed rounded-[16px] pl-11 pr-10 py-2.5 text-[13px] font-semibold text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear Search"
                onClick={() => {
                  setSearch("");
                  setFilters({ q: undefined, page: 1 });
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] p-1 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between md:justify-end shrink-0">

            <div className="flex items-center gap-1 bg-base neu-pressed p-1 rounded-full">
              {VIEW_PILLS.map((view) => {
                const isActive = (filters.view ?? "all") === view.value;
                return (
                  <button
                    key={view.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilters({ view: view.value, page: 1 })}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      isActive
                        ? "bg-[#3B82F6] text-white neu-raised-sm"
                        : "text-[#6B7280] hover:text-[#1F2937]"
                    }`}
                  >
                    {view.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[14px] text-[12px] font-bold transition-all ${
                isFilterOpen || activeSecondaryFilterCount > 0
                  ? "bg-[#3B82F6] text-white neu-raised-sm"
                  : "bg-base text-[#4B5563] neu-raised-sm neu-hover"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeSecondaryFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-[#3B82F6] text-[10px] font-extrabold flex items-center justify-center">
                  {activeSecondaryFilterCount}
                </span>
              )}
            </button>

            <div className="relative min-w-[140px] sm:min-w-[160px]">
              <select
                id="sort-select"
                aria-label="Sort scrolls"
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value, page: 1 })}
                className="w-full appearance-none pl-3.5 pr-8 py-2 bg-base neu-pressed rounded-[14px] text-[12px] font-semibold text-[#1F2937] focus:outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7280]"
              />
            </div>


            <Link
              to="/dashboard/scrolls/new"
              className="md:hidden p-2.5 bg-[#3B82F6] text-white rounded-[14px] neu-raised-sm active:scale-95 transition-all"
              title="New Scroll"
            >
              <CirclePlus size={18} />
            </Link>
          </div>
        </div>

        {isFilterOpen && (
          <div className="pt-4 border-t border-[#E5E7EB] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

            <div className="space-y-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Category
              </span>
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilters({ category: undefined, page: 1 })}
                  {...pressed(!filters.category)}
                  className={pillClass(!filters.category)}
                >
                  <div className="flex items-center gap-1.5">
                    <InfinityIcon size={14} />
                    <span>All Categories</span>
                  </div>
                </button>
                {categories?.map((category) => {
                  const Icon = CATEGORY_ICON[category.slug] ?? BookOpen;
                  const isActive = filters.category === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFilters({ category: category.id, page: 1 })}
                      {...pressed(isActive)}
                      className={pillClass(isActive)}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon size={14} />
                        <span>{category.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#6B7280] uppercase mr-1">
                  Difficulty:
                </span>
                {TIER_PILLS.map((tier) => (
                  <button
                    key={tier.label}
                    type="button"
                    onClick={() => setFilters({ tier: tier.value, page: 1 })}
                    {...pressed(filters.tier === tier.value)}
                    className={pillClass(filters.tier === tier.value)}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>

              {filters.view === "mine" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-[#6B7280] uppercase mr-1">
                    Status:
                  </span>
                  {STATUS_PILLS.map((status) => (
                    <button
                      key={status.label}
                      type="button"
                      onClick={() => setFilters({ status: status.value, page: 1 })}
                      {...pressed(filters.status === status.value)}
                      className={pillClass(filters.status === status.value)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              )}

              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-[11px] font-bold text-[#EF4444] hover:underline flex items-center gap-1 ml-auto pt-1"
                >
                  <RotateCcw size={12} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between text-[11px] text-[#6B7280] px-1 pt-1 border-t border-[#E5E7EB]/50">
            <span className="font-medium">
              Showing <strong className="text-[#1F2937]">{data.items.length}</strong> of{" "}
              <strong className="text-[#1F2937]">{formatNumber(data.pagination.total)}</strong>{" "}
              scrolls
            </span>
            {hasAnyFilter && !isFilterOpen && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[#3B82F6] font-bold hover:underline"
              >
                Clear active filters
              </button>
            )}
          </div>
        )}
      </section>

      <section
        aria-label="Scrolls"
        aria-busy={isPlaceholderData}
        className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 transition-opacity ${
          isPlaceholderData ? "opacity-60" : ""
        }`}
      >
        {isPending &&
          Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-80 sm:h-96 rounded-[24px]" />
          ))}
        {data?.items.map((scroll, i) => (
          <ScrollCard
            key={scroll.id}
            index={i}
            scroll={scroll}
            isYours={scroll.author.id === me.id}
          />
        ))}
      </section>

      {isError && (
        <EmptyState
          title="Couldn't load scrolls"
          message="Please try again in a moment."
        />
      )}
      {data?.items.length === 0 && (
        <EmptyState
          title="No scrolls found"
          message={
            hasAnyFilter
              ? "Try adjusting or clearing your active filters."
              : "Be the first to write one."
          }
          action={
            hasAnyFilter ? (
              <button
                onClick={handleClearAllFilters}
                className="text-[13px] font-bold text-[#3B82F6] hover:underline"
              >
                Clear all filters
              </button>
            ) : undefined
          }
        />
      )}

      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={(page) => setFilters({ page })}
        />
      )}

      <section
        id="new-scroll"
        className="bg-base neu-raised rounded-[24px] p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <ScrollText size={22} className="text-[#3B82F6]" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-[#6B7280]">
                Share Your Knowledge
              </span>
            </div>
            <h3 className="text-[18px] sm:text-[20px] leading-snug text-[#1F2937] font-extrabold">
              Have knowledge to share?
            </h3>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#6B7280] max-w-xl">
              Write a scroll to earn <strong className="text-[#1F2937]">+50 XP</strong> once
              it is approved, unlock badges, and climb the leaderboard!
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/dashboard/scrolls/new"
              className="w-full sm:w-auto text-center justify-center bg-[#3B82F6] text-white text-[13px] px-6 py-2.5 rounded-[14px] neu-raised-sm font-bold hover:bg-[#2563EB] active:scale-95 transition-all flex items-center gap-2"
            >
              <PenLine size={18} />
              <span>+ Write a Scroll</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}