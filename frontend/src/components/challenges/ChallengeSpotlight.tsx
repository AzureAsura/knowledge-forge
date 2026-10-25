import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { Send, Timer, X } from "lucide-react";
import Countdown from "@/components/ui/Countdown";
import { formatNumber } from "@/lib/format";
import { challengesQuery } from "@/features/challenges/queries";
import type { Challenge } from "@/features/challenges/schemas";

const SEEN_KEY = "knofo.challenge.seen";
// Ease-out with no overshoot: the card glides to the corner and settles without bouncing.
const FLIGHT = { duration: 0.55, ease: [0.32, 0.72, 0, 1] } as const;

interface Corner {
  x: number;
  y: number;
}

// Offset from the viewport centre (where the card sits) to the floating button's centre.
function cornerOffset(): Corner {
  const buttonWidth = window.innerWidth >= 640 ? 128 : 48;
  return { x: window.innerWidth / 2 - 24 - buttonWidth / 2, y: window.innerHeight / 2 - 24 - 22 };
}

// The card scales uniformly (no layout stretching, so text never distorts) toward the button position and fades out at the end.
const cardVariants = {
  corner: ({ x, y }: Corner) => ({ opacity: 0, x, y, scale: 0.12 }),
  rise: { opacity: 0, y: 24, scale: 0.96 },
  center: { opacity: 1, x: 0, y: 0, scale: 1 },
};

// Once per browser session and challenge. Storage can be blocked, in which case the popup simply shows each mount.
function markSeen(id: number) {
  try {
    const seen = sessionStorage.getItem(SEEN_KEY) === String(id);
    sessionStorage.setItem(SEEN_KEY, String(id));
    return seen;
  } catch {
    return false;
  }
}

function Spotlight({ challenge }: { challenge: Challenge }) {
  // Lazy initializer on purpose: the first mount decides "popup or button" and records the visit (idempotent).
  const [open, setOpen] = useState(() => !markSeen(challenge.id));
  const [focusButton, setFocusButton] = useState(false);
  // First popup rises in softly; after the user has seen the button, the card flies to and from it.
  const [fromCorner, setFromCorner] = useState(false);
  const [corner, setCorner] = useState<Corner>({ x: 0, y: 0 });

  const close = () => {
    setCorner(cornerOffset());
    setFromCorner(true);
    setFocusButton(true);
    setOpen(false);
  };
  const reopen = () => {
    setCorner(cornerOffset());
    setOpen(true);
  };

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <AnimatePresence custom={corner}>
          {open && (
            <m.div
              key="backdrop"
              className="fixed inset-0 z-[60] bg-[#1F2937]/30 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={close}
            >
              <m.div
                custom={corner}
                variants={cardVariants}
                initial={fromCorner ? "corner" : "rise"}
                animate="center"
                exit="corner"
                transition={FLIGHT}
                role="dialog"
                aria-modal="true"
                aria-labelledby="challenge-spotlight-title"
                tabIndex={-1}
                ref={(el) => {
                  if (el && !el.contains(document.activeElement)) el.focus();
                }}
                onKeyDown={(e) => e.key === "Escape" && close()}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] bg-base neu-raised rounded-[24px] p-6 space-y-4 text-[#4B5563] focus:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-base neu-pressed text-[#EF4444]">
                    WEEKLY CHALLENGE
                  </span>
                  <button
                    type="button"
                    aria-label="Close challenge"
                    onClick={close}
                    className="p-2 rounded-full bg-base neu-raised-sm neu-hover text-[#6B7280] hover:text-[#1F2937] transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 id="challenge-spotlight-title" className="text-[20px] sm:text-[22px] leading-snug font-extrabold text-[#1F2937]">
                    {challenge.title}
                  </h2>
                  {challenge.description && <p className="text-[13px] leading-relaxed text-[#6B7280] line-clamp-4">{challenge.description}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-base neu-pressed text-[#3B82F6]">
                    +{formatNumber(challenge.xpReward)} XP
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-base neu-pressed text-[#1F2937] flex items-center gap-1.5">
                    <Timer size={13} className="text-[#3B82F6]" />
                    <Countdown to={challenge.endDate} />
                  </span>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2.5 bg-base neu-raised-sm neu-hover rounded-[14px] text-[13px] font-bold text-[#4B5563] transition-all"
                  >
                    Later
                  </button>
                  <Link
                    to={`/dashboard/challenges?challenge=${challenge.id}`}
                    onClick={close}
                    className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-[14px] text-[13px] font-bold neu-raised-sm hover:bg-[#2563EB] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    Submit Proof
                  </Link>
                </div>
              </m.div>
            </m.div>
          )}

          {!open && (
            <m.button
              key="button"
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.3, duration: 0.25, ease: "easeOut" } }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Open weekly challenge"
              ref={(el) => {
                if (el && focusButton) el.focus();
              }}
              onClick={reopen}
              className="fixed bottom-6 right-6 z-30 bg-[#3B82F6] text-white px-4 py-3 rounded-full neu-raised-sm hover:bg-[#2563EB] flex items-center gap-2 text-[13px] font-bold"
            >
              <Timer size={18} />
              <span className="hidden sm:inline">Challenge</span>
            </m.button>
          )}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}

// Shown only while there is an active published challenge the user can still submit to.
export default function ChallengeSpotlight() {
  const { data } = useQuery(challengesQuery);
  const challenge = data?.find((c) => c.status === "active" && c.isPublished);
  if (!challenge) return null;
  if (challenge.mySubmissionStatus && challenge.mySubmissionStatus !== "rejected") return null;
  return <Spotlight key={challenge.id} challenge={challenge} />;
}
