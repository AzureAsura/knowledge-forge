import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { categoriesQuery, leafCategories } from "@/features/categories/queries";
import { useAnimatedClose } from "@/lib/dialog";
import { formatDate, formatNumber } from "@/lib/format";
import { reviewSubmissionMutation, saveChallengeMutation } from "@/features/challenges/mutations";
import { challengesQuery, pendingSubmissionsQuery } from "@/features/challenges/queries";
import { challengeFormSchema, type Challenge, type ChallengeForm } from "@/features/challenges/schemas";

const field = "w-full bg-base neu-pressed rounded-[14px] px-4 py-2.5 text-[13px] font-semibold text-[#1F2937] focus:outline-none transition-all";
const labelClass = "text-[13px] font-semibold text-[#1F2937]";
const primary =
  "bg-[#3B82F6] text-white px-5 py-2.5 rounded-[14px] text-[13px] font-bold neu-raised-sm hover:bg-[#2563EB] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none";
const secondary = "bg-base text-[#4B5563] px-4 py-2 rounded-[12px] text-[12px] font-bold neu-raised-sm neu-hover transition-all";

// <input type="datetime-local"> wants local time without a zone.
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function ChallengeFormDialog({ editing, onClose }: { editing: Challenge | null; onClose: () => void }) {
  const { requestClose, dialogProps } = useAnimatedClose(onClose)
  const { data: categories } = useQuery({ ...categoriesQuery, select: leafCategories });
  const save = useMutation(saveChallengeMutation);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChallengeForm>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          description: editing.description,
          categoryId: editing.categoryId ?? undefined,
          xpReward: editing.xpReward,
          startDate: toLocalInput(editing.startDate),
          endDate: toLocalInput(editing.endDate),
          isPublished: editing.isPublished,
        }
      : { title: "", description: "", xpReward: undefined, startDate: "", endDate: "", isPublished: false },
  });

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      {...dialogProps}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
      aria-labelledby="challenge-form-title"
      className="dialog-pop m-auto w-[min(92vw,640px)] max-h-[90dvh] overflow-y-auto bg-base neu-raised rounded-[24px] p-0 text-[#4B5563] backdrop:bg-[#1F2937]/30"
    >
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        save.mutate(
          { id: editing?.id, values },
          {
            onSuccess: () => {
              toast.success(editing ? "Challenge updated" : "Challenge created");
              requestClose();
            },
          },
        ),
      )}
      className="p-6 space-y-5"
    >
      <h3 id="challenge-form-title" className="text-[17px] text-[#1F2937] font-extrabold border-b border-[#E5E7EB] pb-3">{editing ? "Edit Challenge" : "New Challenge"}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <label htmlFor="c-title" className={labelClass}>Title</label>
          <input id="c-title" type="text" aria-invalid={!!errors.title} {...register("title")} className={field} />
          {errors.title && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.title.message}</p>}
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label htmlFor="c-desc" className={labelClass}>Description</label>
          <textarea id="c-desc" rows={3} {...register("description")} className={`${field} resize-none`} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="c-xp" className={labelClass}>XP Reward</label>
          <input id="c-xp" type="number" min={1} aria-invalid={!!errors.xpReward} {...register("xpReward", { valueAsNumber: true })} className={field} />
          {errors.xpReward && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.xpReward.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="c-cat" className={labelClass}>Category <span className="text-[11px] font-normal text-[#6B7280]">(Optional)</span></label>
          <select
            id="c-cat"
            {...register("categoryId", { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) })}
            className={`${field} appearance-none cursor-pointer`}
          >
            <option value="">No category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="c-start" className={labelClass}>Starts</label>
          <input id="c-start" type="datetime-local" aria-invalid={!!errors.startDate} {...register("startDate")} className={field} />
          {errors.startDate && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.startDate.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="c-end" className={labelClass}>Ends</label>
          <input id="c-end" type="datetime-local" aria-invalid={!!errors.endDate} {...register("endDate")} className={field} />
          {errors.endDate && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.endDate.message}</p>}
        </div>

        <label className="md:col-span-2 flex items-center gap-2.5 text-[13px] font-medium text-[#4B5563] cursor-pointer">
          <input type="checkbox" {...register("isPublished")} className="w-4 h-4 accent-[#3B82F6]" />
          Publish (visible to everyone)
        </label>
      </div>

      <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap gap-3">
        <button type="submit" disabled={save.isPending} className={primary}>
          {editing ? <Pencil size={15} /> : <Plus size={15} />}
          <span>{editing ? "Save Changes" : "Create Challenge"}</span>
        </button>
        <button type="button" onClick={requestClose} className={secondary}>
          Cancel
        </button>
      </div>
    </form>
    </dialog>
  );
}

function SubmissionRow({ submission }: { submission: { id: number; challengeTitle: string; username: string; proofUrl: string; notes: string } }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const review = useMutation(reviewSubmissionMutation);

  const send = (status: "approved" | "rejected") =>
    review.mutate(
      { id: submission.id, status, rejectReason: status === "rejected" ? reason.trim() : undefined },
      {
        onSuccess: (result) => {
          if (status === "approved") {
            toast.success(`+${formatNumber(result.xpGained)} XP awarded to @${submission.username}${result.levelUp ? ` (level ${result.newLevel}!)` : ""}`);
          } else {
            toast.success("Submission rejected");
          }
        },
      },
    );

  return (
    <div className="bg-base neu-raised-sm rounded-[18px] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#1F2937] truncate">{submission.challengeTitle}</p>
          <Link to={`/dashboard/profile/${submission.username}`} className="text-[11px] font-semibold text-[#3B82F6] hover:underline">
            @{submission.username}
          </Link>
        </div>
        <a href={submission.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-[#3B82F6] hover:underline flex items-center gap-1">
          Open proof <ExternalLink size={13} />
        </a>
      </div>
      {submission.notes && <p className="text-[12px] text-[#6B7280] whitespace-pre-wrap">{submission.notes}</p>}

      {rejecting ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor={`reason-${submission.id}`} className="sr-only">Reject reason</label>
          <input
            id={`reason-${submission.id}`}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, max 500 characters)"
            className={`${field} py-2`}
          />
          <div className="flex gap-2">
            <button type="button" disabled={review.isPending} onClick={() => send("rejected")} className={`${secondary} text-[#EF4444]`}>
              Confirm reject
            </button>
            <button type="button" onClick={() => setRejecting(false)} className={secondary}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={review.isPending} onClick={() => send("approved")} className={`${primary} !px-4 !py-2 !text-[12px] !rounded-[12px]`}>
            <Check size={14} />
            Approve
          </button>
          <button type="button" disabled={review.isPending} onClick={() => setRejecting(true)} className={`${secondary} flex items-center gap-1.5 text-[#EF4444]`}>
            <X size={14} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export function SubmissionQueue() {
  const { data: submissions, isPending } = useQuery(pendingSubmissionsQuery);

  return (
    <div className="bg-base neu-raised rounded-[24px] p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h2 className="text-[17px] text-[#1F2937] font-extrabold">Submission Queue</h2>
        {submissions && <span className="bg-base neu-pressed text-[#6B7280] px-3 py-1 rounded-full text-[11px] font-bold">{submissions.length} pending</span>}
      </div>
      {isPending && <p className="text-[13px] text-[#6B7280]">Loading…</p>}
      {submissions?.length === 0 && <p className="text-[13px] text-[#6B7280]">No submissions waiting for review.</p>}
      <div className="space-y-3">
        {submissions?.map((s) => (
          <SubmissionRow key={s.id} submission={s} />
        ))}
      </div>
    </div>
  );
}

export function ChallengeList({ onEdit, onNew }: { onEdit: (challenge: Challenge) => void; onNew: () => void }) {
  const { data: challenges, isPending } = useQuery(challengesQuery);

  return (
    <div className="bg-base neu-raised rounded-[24px] p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
        <h2 className="text-[17px] text-[#1F2937] font-extrabold">All Challenges</h2>
        <button type="button" onClick={onNew} className={`${primary} !px-4 !py-2 !text-[12px] !rounded-[12px]`}>
          <Plus size={14} />
          New Challenge
        </button>
      </div>
      {isPending && <p className="text-[13px] text-[#6B7280]">Loading…</p>}
      {challenges?.length === 0 && <p className="text-[13px] text-[#6B7280]">No challenges yet.</p>}
      <div className="space-y-2">
        {challenges?.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-base neu-raised-sm rounded-[16px]">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#1F2937] truncate">{c.title}</p>
              <p className="text-[11px] text-[#6B7280] capitalize">
                {c.isPublished ? c.status : "draft"} · ends {formatDate(c.endDate, true)} · +{formatNumber(c.xpReward)} XP
              </p>
            </div>
            <button type="button" onClick={() => onEdit(c)} className={`${secondary} flex items-center gap-1.5 shrink-0`}>
              <Pencil size={13} />
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
