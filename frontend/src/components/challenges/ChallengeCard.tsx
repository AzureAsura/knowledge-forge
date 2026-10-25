import type { CSSProperties } from "react";
import { Send } from "lucide-react";
import Countdown from "@/components/ui/Countdown";
import { canSubmitChallenge } from "@/features/challenges/permissions";
import type { Challenge } from "@/features/challenges/schemas";
import { SUBMISSION_STATE } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";

// Quiet card: title, two lines of text, one meta line and one button. The whole card opens the detail dialog.
export default function ChallengeCard({ challenge, onOpen, index = 0 }: { challenge: Challenge; onOpen: () => void; index?: number }) {
  const state = challenge.mySubmissionStatus ? SUBMISSION_STATE[challenge.mySubmissionStatus] : null;
  const submit = canSubmitChallenge(challenge);

  return (
    <article style={{ "--i": index } as CSSProperties} className="stagger-in card-lift group relative bg-base neu-raised rounded-[24px] p-6 neu-hover transition-all duration-300 flex flex-col gap-4">
      <div className="space-y-2 flex-1">
        <h2 className="text-[17px] leading-snug tracking-tight text-[#1F2937] font-extrabold">
          <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 group-hover:text-[#3B82F6] transition-colors">
            {challenge.title}
          </button>
        </h2>
        {challenge.description && <p className="text-[13px] leading-relaxed text-[#6B7280] line-clamp-2">{challenge.description}</p>}
      </div>

      <p className="text-[12px] font-semibold text-[#6B7280]">
        <span className="text-[#1F2937]">+{formatNumber(challenge.xpReward)} XP</span>
        <span aria-hidden> · </span>
        {challenge.status === "upcoming" ? (
          <>Starts {formatDate(challenge.startDate, true)}</>
        ) : (
          <>
            <Countdown to={challenge.endDate} /> left
          </>
        )}
      </p>

      <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between gap-3 min-h-[52px]">
        {state ? (
          <span className="flex items-center gap-2 text-[12px] font-bold text-[#4B5563]">
            <span className={`w-2 h-2 rounded-full ${state.dot}`} aria-hidden />
            {state.text}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onOpen}
          className={`relative z-10 px-4 py-2 rounded-[12px] text-[12px] font-bold neu-raised-sm active:scale-95 transition-all flex items-center gap-2 ${
            submit ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]" : "bg-base text-[#1F2937] neu-hover"
          }`}
        >
          {submit && <Send size={14} />}
          {submit ? (challenge.mySubmissionStatus === "rejected" ? "Re-submit" : "Submit") : "View"}
        </button>
      </div>
    </article>
  );
}
