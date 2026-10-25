import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Send, X } from "lucide-react";
import Countdown from "@/components/ui/Countdown";
import { submitChallengeMutation } from "@/features/challenges/mutations";
import { canSubmitChallenge } from "@/features/challenges/permissions";
import { submitFormSchema, type Challenge, type SubmitForm } from "@/features/challenges/schemas";
import { SUBMISSION_STATE } from "@/lib/constants";
import { useAnimatedClose } from "@/lib/dialog";
import { formatDate, formatNumber } from "@/lib/format";

// Native modal: details first, then (when allowed) the short submit form with the main call to action.
export default function ChallengeDialog({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  const submit = useMutation(submitChallengeMutation(challenge.id));
  const open = canSubmitChallenge(challenge);
  const { requestClose, dialogProps } = useAnimatedClose(onClose);
  const state = challenge.mySubmissionStatus ? SUBMISSION_STATE[challenge.mySubmissionStatus] : null;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmitForm>({ resolver: zodResolver(submitFormSchema), defaultValues: { proofUrl: "", notes: "" } });

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      {...dialogProps}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
      aria-labelledby="challenge-dialog-title"
      className="dialog-pop m-auto w-[min(92vw,560px)] max-h-[90dvh] overflow-y-auto bg-base neu-raised rounded-[24px] p-0 text-[#4B5563] backdrop:bg-[#1F2937]/30"
    >
      <form
        noValidate
        className="p-6 space-y-5"
        onSubmit={handleSubmit((values) =>
          submit.mutate(values, {
            onSuccess: () => {
              toast.success("Submission received");
              requestClose();
            },
          }),
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="challenge-dialog-title" className="text-[20px] leading-snug text-[#1F2937] font-extrabold">
            {challenge.title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={requestClose}
            className="p-2 rounded-full bg-base neu-raised-sm neu-hover text-[#6B7280] hover:text-[#1F2937] transition-all shrink-0"
          >
            <X size={15} />
          </button>
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
          {state && (
            <>
              <span aria-hidden> · </span>
              <span className="inline-flex items-center gap-1.5 text-[#4B5563]">
                <span className={`w-2 h-2 rounded-full ${state.dot}`} aria-hidden />
                {state.text}
              </span>
            </>
          )}
        </p>

        {challenge.description && <p className="text-[14px] leading-relaxed text-[#4B5563] whitespace-pre-wrap">{challenge.description}</p>}

        {open && (
          <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
            <div className="space-y-1.5">
              <label htmlFor="proofUrl" className="text-[13px] font-semibold text-[#1F2937]">
                Proof URL <span className="text-[#EF4444]">*</span>
              </label>
              <input
                id="proofUrl"
                type="url"
                aria-invalid={!!errors.proofUrl}
                placeholder="https://github.com/you/your-work"
                {...register("proofUrl")}
                className="w-full bg-base neu-pressed rounded-[14px] px-4 py-2.5 text-[13px] font-semibold text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none transition-all"
              />
              {errors.proofUrl && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.proofUrl.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-[13px] font-semibold text-[#1F2937]">
                Notes <span className="text-[11px] font-normal text-[#6B7280]">(Optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                {...register("notes")}
                className="w-full bg-base neu-pressed rounded-[16px] p-4 text-[13px] font-medium text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={requestClose}
            className="px-4 py-2.5 bg-base neu-raised-sm neu-hover rounded-[14px] text-[13px] font-bold text-[#4B5563] transition-all"
          >
            {open ? "Cancel" : "Close"}
          </button>
          {open && (
            <button
              type="submit"
              disabled={submit.isPending}
              className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-[14px] text-[13px] font-bold neu-raised-sm hover:bg-[#2563EB] active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:pointer-events-none"
            >
              <Send size={15} />
              <span>{challenge.mySubmissionStatus === "rejected" ? "Re-submit Proof" : "Submit Proof"}</span>
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
