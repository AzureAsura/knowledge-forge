import {
  LayoutDashboard,
  BookOpen,
  GitBranch,
  Trophy,
  Award,
  Swords,
  Settings,
  LogOut,
  ClipboardCheck,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserAvatar from "@/components/ui/UserAvatar";
import { useMe } from "@/features/auth/queries";
import { logoutMutation } from "@/features/auth/mutations";
import { xpStatsQuery } from "@/features/gamification/queries";
import { scrollQueries } from "@/features/scrolls/queries";
import { formatNumber } from "@/lib/format";

const NAVIGATION = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Scrolls", href: "/dashboard/scrolls", icon: BookOpen },
  { name: "Review", href: "/dashboard/review", icon: ClipboardCheck, reviewerOnly: true },
  { name: "Topic Tree", href: "/dashboard/tree", icon: GitBranch },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "Badges", href: "/dashboard/badges", icon: Award },
  { name: "Challenges", href: "/dashboard/challenges", icon: Swords },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset Neumorphic Helper Constants
const BG_BASE = "bg-[#F0F2F5]";
const NEU_RAISED = "shadow-[-6px_-6px_14px_#ffffff,6px_6px_14px_#d1d5db]";
const NEU_RAISED_SM = "shadow-[-4px_-4px_10px_#ffffff,4px_4px_10px_#d1d5db]";
const NEU_PRESSED = "shadow-[inset_-3px_-3px_7px_#ffffff,inset_3px_3px_7px_#d1d5db]";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const me = useMe();
  const { data: xp } = useQuery(xpStatsQuery);
  const logout = useMutation(logoutMutation);
  // Scrolls waiting for a reviewer; refreshed whenever a scroll is submitted, approved or rejected.
  const { data: pending = 0 } = useQuery({
    ...scrollQueries.list({ status: "pending", limit: 1 }),
    enabled: me.role !== "scholar",
    select: (d) => d.pagination.total,
  });

  // xpForNextLevel is the XP span of the current level; it is 0 at max level.
  const atMaxLevel = xp?.xpForNextLevel === 0;
  const xpPercentage = xp ? Math.min(xp.progressPercentage, 100) : 0;
  const xpLabel = !xp
    ? "—"
    : atMaxLevel
      ? `${formatNumber(xp.totalXp)} XP`
      : `${formatNumber(xp.xpForNextLevel - xp.xpNeeded)} / ${formatNumber(xp.xpForNextLevel)}`;

  return (
    <>

      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#1F2937]/30 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`w-[260px] ${BG_BASE} ${NEU_RAISED} flex-shrink-0 flex flex-col justify-between min-h-[100dvh] fixed lg:sticky top-0 left-0 z-50 transition-transform duration-300 ease-in-out border-r border-[#E5E7EB]/50 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 flex flex-col gap-6 overflow-y-auto">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-[14px] ${BG_BASE} ${NEU_RAISED_SM} p-1.5 shrink-0`}>
                <img src="/knofo-logo.png" alt="" width={330} height={350} className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-[16px] font-black uppercase tracking-tight leading-none text-[#1F2937]">
                  Knofo
                </div>
                <div className="text-[10px] tracking-wider uppercase font-bold text-[#6B7280] mt-0.5">
                  Knowledge Forge
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`lg:hidden p-2 rounded-full ${BG_BASE} ${NEU_RAISED_SM} text-[#6B7280] hover:text-[#1F2937] transition-all`}
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          </div>

          <div className={`${BG_BASE} ${NEU_RAISED_SM} p-4 rounded-[20px] space-y-2.5`}>
            <div className="flex items-center justify-between">
              <span className={`bg-[#3B82F6] text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-[0_2px_6px_rgba(59,130,246,0.3)]`}>
                Lv. {me.currentLevel} {me.title}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold text-[#1F2937] pt-1">
              <span>XP Progress</span>
              <span className="text-[#3B82F6]">{xpLabel}</span>
            </div>

            <div className={`w-full h-3 ${BG_BASE} ${NEU_PRESSED} rounded-full overflow-hidden p-0.5`}>
              <div
                className="h-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] rounded-full transition-all duration-300 shadow-[0_1px_4px_rgba(59,130,246,0.3)]"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
          </div>

          <nav className="flex flex-col gap-2 mt-1">
            {NAVIGATION.filter((item) => !item.reviewerOnly || me.role !== "scholar").map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-[16px] text-[13px] tracking-wide font-semibold transition-all duration-200 ${
                    isActive
                      ? `bg-[#3B82F6] text-white ${NEU_RAISED_SM} font-bold` : `${BG_BASE} text-[#4B5563] hover:text-[#1F2937] hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#d1d5db] active:shadow-[inset_-2px_-2px_4px_#ffffff,inset_2px_2px_4px_#d1d5db]`
                  }`}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.name}</span>
                  {item.reviewerOnly && pending > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold flex items-center justify-center">
                      <span aria-hidden>{pending > 99 ? "99+" : pending}</span>
                      <span className="sr-only">{pending} awaiting review</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#E5E7EB]">
          <Link
            to={`/dashboard/profile/${me.username}`}
            onClick={onClose}
            className={`flex items-center gap-3 p-3 ${BG_BASE} ${NEU_RAISED_SM} rounded-[20px]`}
          >
            <div className={`w-10 h-10 rounded-[14px] ${BG_BASE} ${NEU_RAISED_SM} p-0.5 overflow-hidden shrink-0`}>
              <UserAvatar src={me.avatarUrl} name={me.fullName} className="rounded-[12px]" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[14px] font-extrabold text-[#1F2937] truncate leading-tight">
                {me.fullName}
              </div>
              <div className="text-[11px] text-[#6B7280] font-medium truncate mt-0.5">
                {me.title}
              </div>
            </div>
          </Link>

          <div className="flex justify-end items-center mt-3 px-1 text-[11px] font-bold text-[#6B7280]">
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/auth", { replace: true }) })}
              className="hover:text-[#EF4444] transition-colors flex items-center gap-1.5"
            >
              <LogOut size={15} /> Exit
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}