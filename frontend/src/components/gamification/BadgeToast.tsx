import { Award } from "lucide-react";
import { toast } from "sonner";
import type { MyBadge } from "@/features/gamification/queries";
import { BADGE_ICON } from "@/lib/constants";

export function showBadgeToast(badge: MyBadge) {
  const Icon = BADGE_ICON[badge.icon] ?? Award;
  toast.custom(() => (
    <div className="flex w-[320px] items-center gap-3 rounded-[18px] bg-[#F0F2F5] neu-raised-sm p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0F2F5] neu-pressed text-[#F59E0B]">
        <Icon size={22} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Badge unlocked</span>
        <span className="block truncate text-[15px] font-extrabold text-[#1F2937]">{badge.name}</span>
        {badge.xpReward > 0 && <span className="block text-[12px] font-bold text-[#10B981]">+{badge.xpReward} XP</span>}
      </span>
    </div>
  ));
}
