import { ArrowLeft, ArrowRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function pageItems(page: number, total: number) {
  const pages = [...new Set([1, total, page - 1, page, page + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // The page scrolls inside <main>, so a new page must scroll it back to the top.
  const go = (target: number, from: HTMLElement) => {
    onPageChange(target);
    from.closest("main")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`bg-base neu-raised rounded-[20px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4`}>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <button
          type="button"
          disabled={page <= 1}
          onClick={(e) => go(page - 1, e.currentTarget)}
          className={`px-3 py-1.5 bg-base neu-raised-sm rounded-[10px] text-[11px] font-bold text-[#6B7280] disabled:opacity-50 flex items-center gap-1 shrink-0`}
        >
          <ArrowLeft size={15} />
          <span className="hidden xs:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1.5">
          {pageItems(page, totalPages).map((item, i) =>
            item === "gap" ? (
              <span key={`gap-${i}`} className="px-0.5 text-[#6B7280] text-xs">...</span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? "page" : undefined}
                onClick={(e) => go(item, e.currentTarget)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] text-[11px] sm:text-[12px] flex items-center justify-center transition-all ${
                  item === page
                    ? `bg-[#3B82F6] text-white neu-raised-sm font-bold`
                    : `bg-base text-[#4B5563] neu-raised-sm neu-hover font-semibold`
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={(e) => go(page + 1, e.currentTarget)}
          className={`px-3 py-1.5 bg-base neu-raised-sm neu-hover rounded-[10px] text-[11px] sm:text-[12px] font-bold text-[#4B5563] disabled:opacity-50 flex items-center gap-1 shrink-0`}
        >
          <span className="hidden xs:inline">Next</span>
          <ArrowRight size={15} />
        </button>
      </div>

      <form
        className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(new FormData(e.currentTarget).get("page"));
          if (Number.isInteger(value) && value >= 1 && value <= totalPages) go(value, e.currentTarget);
        }}
      >
        <label htmlFor="jump-page" className="text-[12px] font-medium text-[#6B7280] whitespace-nowrap">
          Jump to page:
        </label>
        <input
          id="jump-page"
          name="page"
          type="number"
          min={1}
          max={totalPages}
          placeholder={String(page)}
          className={`w-12 sm:w-14 bg-base neu-pressed rounded-[10px] px-2 py-1 text-center text-[12px] font-semibold text-[#1F2937] focus:outline-none`}
        />
        <button
          type="submit"
          className={`bg-[#3B82F6] text-white text-[12px] font-bold px-3 py-1 rounded-[10px] neu-raised-sm hover:bg-[#2563EB] transition-all`}
        >
          Go
        </button>
      </form>
    </div>
  );
}
