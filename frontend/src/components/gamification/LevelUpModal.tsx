import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { Trophy } from "lucide-react";
import { celebrate, useLevelUp } from "@/lib/celebrations";
import { fireConfetti } from "@/lib/confetti";

// Ref callback: runs once when the modal mounts.
function onOpen(el: HTMLButtonElement | null) {
  if (!el) return;
  el.focus();
  void fireConfetti();
}

export default function LevelUpModal() {
  const levelUp = useLevelUp();
  if (!levelUp) return null;

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div
          key={levelUp.level}
          role="dialog"
          aria-modal="true"
          aria-label={`Level up: level ${levelUp.level}`}
          onKeyDown={(e) => e.key === "Escape" && celebrate.closeLevelUp()}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1F2937]/40 p-4"
        >
          <m.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="w-full max-w-sm rounded-[28px] bg-[#F0F2F5] neu-raised p-8 text-center space-y-5"
          >
            <Trophy size={36} className="mx-auto text-[#F59E0B]" aria-hidden />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-[#6B7280]">Level up</p>
              <p className="text-[84px] leading-none font-extrabold text-[#3B82F6]">{levelUp.level}</p>
              <p className="mt-2 text-[20px] font-extrabold text-[#1F2937]">{levelUp.title}</p>
            </div>
            {levelUp.xpGained > 0 && <p className="text-[15px] font-bold text-[#10B981]">+{levelUp.xpGained} XP</p>}
            <div className="h-3 rounded-full bg-[#F0F2F5] neu-pressed overflow-hidden" aria-hidden>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${levelUp.percent}%` }}
                transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
                className="h-full rounded-full bg-[#3B82F6]"
              />
            </div>
            <button
              ref={onOpen}
              type="button"
              onClick={celebrate.closeLevelUp}
              className="w-full px-4 py-2.5 bg-[#3B82F6] text-white rounded-[14px] neu-raised-sm text-[14px] font-bold hover:bg-[#2563EB] active:scale-95 transition-all"
            >
              Continue
            </button>
          </m.div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
