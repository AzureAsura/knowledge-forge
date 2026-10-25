import { Award } from "lucide-react";
import { BADGE_ICON } from "@/lib/constants";
import { celebrate, useBadgeCard } from "@/lib/celebrations";

// Ref callback with cleanup: auto-dismisses the card after 5s.
function autoDismiss(el: HTMLElement | null) {
  if (!el) return;
  const timer = setTimeout(celebrate.nextBadge, 5000);
  return () => clearTimeout(timer);
}

export default function BadgeUnlockCard() {
  const badge = useBadgeCard();
  if (!badge) return null;
  const Icon = BADGE_ICON[badge.icon] ?? Award;

  return (
    <button
      key={badge.slug}
      ref={autoDismiss}
      type="button"
      onClick={celebrate.nextBadge}
      aria-label={`Badge unlocked: ${badge.name}. Dismiss`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1F2937]/30 p-4"
    >
      <span className="w-full max-w-xs rounded-[28px] bg-[#F0F2F5] neu-raised p-8 text-center space-y-4 block">
        <span className="badge-pop mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#F0F2F5] text-[#F59E0B]">
          <Icon size={44} aria-hidden />
        </span>
        <span className="block text-[12px] font-bold uppercase tracking-widest text-[#6B7280]">Badge unlocked</span>
        <span className="block text-[20px] font-extrabold text-[#1F2937]">{badge.name}</span>
        {badge.xpReward > 0 && <span className="block text-[15px] font-bold text-[#10B981]">+{badge.xpReward} XP</span>}
      </span>
    </button>
  );
}
