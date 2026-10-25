import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Flame, SquarePlus, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import StreakTip from "@/components/gamification/StreakTip";
import Tooltip from "@/components/ui/Tooltip";
import { dashboardQuery } from "@/features/dashboard/queries";
import { useHotkey } from "@/lib/hotkey";

interface NavbarProps {
  onMenuClick?: () => void;
}

const BG_BASE = "bg-[#F0F2F5]";
const NEU_RAISED_SM = "shadow-[-2px_-2px_5px_#ffffff,2px_2px_5px_#d1d5db]";
const NEU_PRESSED = "shadow-[inset_-2px_-2px_4px_#ffffff,inset_2px_2px_4px_#d1d5db]";

export default function Navbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkey("k", () => searchRef.current?.focus());
  const { data: streak } = useQuery({ ...dashboardQuery, select: (d) => d.stats });

  return (

    <header className={`w-full ${BG_BASE} border-b border-[#E5E7EB]/70 px-4 md:px-8 py-3 sticky top-0 z-20 shrink-0 flex items-center justify-between gap-3 md:gap-6`}>
      <div className="flex items-center gap-3.5 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onMenuClick}
          className={`lg:hidden p-2 ${BG_BASE} ${NEU_RAISED_SM} rounded-[12px] text-[#4B5563]`}
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <form
          role="search"
          className="relative flex-1 items-center hidden sm:flex"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            navigate(q ? `/dashboard/scrolls?q=${encodeURIComponent(q)}` : "/dashboard/scrolls");
          }}
        >
          <Search
            size={16}
            className="absolute left-3.5 text-[#6B7280] pointer-events-none"
          />
          <input
            ref={searchRef}
            name="q"
            type="text"
            aria-label="Search scrolls"
            placeholder="Search scrolls..."
            className={`w-full ${BG_BASE} ${NEU_PRESSED} rounded-[14px] py-2 pl-10 pr-12 text-[12px] font-semibold text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none`}
          />
          <kbd className={`absolute right-3 px-2 py-0.5 ${BG_BASE} ${NEU_RAISED_SM} rounded-[6px] font-mono font-bold text-[10px] text-[#6B7280] hidden md:block`}>
            ⌘K
          </kbd>
        </form>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <Tooltip align="right" content={<StreakTip warn streaks={streak?.streaks ?? []} />}>
          <div className={`flex items-center gap-1.5 ${BG_BASE} ${NEU_RAISED_SM} px-3 py-1.5 rounded-full`}>
            <Flame size={15} className={streak?.streaks.some((s) => s.atRisk) ? "text-[#F59E0B] flame-warn" : "text-[#EF4444]"} fill="currentColor" />
            <span className="text-[11px] md:text-[12px] font-bold text-[#1F2937] whitespace-nowrap">
              {streak?.currentStreak ?? 0}d <span className="hidden sm:inline text-[#6B7280] font-normal">STREAK</span>
            </span>
          </div>
        </Tooltip>

        <Link
          to="/dashboard/scrolls/new"
          className={`bg-[#3B82F6] text-white px-3.5 py-2 md:px-4 md:py-2 rounded-[12px] ${NEU_RAISED_SM} text-[13px] font-bold flex items-center gap-2 hover:bg-[#2563EB] active:scale-95 transition-all whitespace-nowrap`}
        >
          <SquarePlus size={17} />
          <span>
            <span className="hidden sm:inline">Forge New Scroll</span>
            <span className="inline sm:hidden">Forge</span>
          </span>
        </Link>
      </div>
    </header>
  );
}