import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import ScrollCard from "@/components/scrolls/ScrollCard";
import { PAGE_SIZE } from "@/features/scrolls/filters";
import { scrollQueries } from "@/features/scrolls/queries";
import { useMe } from "@/features/auth/queries";

export default function ReviewPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = params.get("q") ?? "";
  const { data, isPending, isError, isPlaceholderData } = useQuery(
    scrollQueries.list({ status: "pending", q: q || undefined, page, limit: PAGE_SIZE, sort: "created_at" }),
  );

  const update = (next: { q?: string; page?: number }) => {
    const out = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? 1;
    if (nextQ) out.set("q", nextQ);
    if (nextPage > 1) out.set("page", String(nextPage));
    setParams(out);
  };

  return (
    <div className="w-full space-y-6 bg-base text-[#4B5563] font-sans">
      <section className="bg-base neu-raised rounded-[24px] p-4 sm:p-5 space-y-3">
        <h1 className="text-[18px] sm:text-[20px] font-extrabold text-[#1F2937]">Review Queue</h1>
        <form
          role="search"
          key={q}
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
          }}
        >
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
          <input
            name="q"
            type="text"
            defaultValue={q}
            aria-label="Filter pending scrolls by title"
            placeholder="Search pending scrolls by title..."
            className="w-full bg-base neu-pressed rounded-[16px] pl-11 pr-4 py-2.5 text-[13px] font-semibold text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none"
          />
        </form>
        {data && (
          <p className="text-[11px] text-[#6B7280] font-medium">
            <strong className="text-[#1F2937]">{data.pagination.total}</strong> awaiting review
          </p>
        )}
      </section>

      <section
        aria-label="Pending scrolls"
        aria-busy={isPlaceholderData}
        className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
      >
        {isPending && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-80 sm:h-96 rounded-[24px]" />)}
        {data?.items.map((scroll, i) => (
          <ScrollCard key={scroll.id} index={i} scroll={scroll} isYours={scroll.author.id === me.id} />
        ))}
      </section>

      {isError && <EmptyState title="Couldn't load the queue" message="Please try again in a moment." />}
      {data?.items.length === 0 && <EmptyState title="Nothing to review" message="No scrolls are waiting for review." />}
      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(p) => update({ page: p })} />
      )}
    </div>
  );
}
