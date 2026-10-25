import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Inbox, ListChecks } from "lucide-react";
import { ChallengeFormDialog, ChallengeList, SubmissionQueue } from "@/components/challenges/AdminChallenges";
import { pendingSubmissionsQuery } from "@/features/challenges/queries";
import type { Challenge } from "@/features/challenges/schemas";

const TABS = [
  { id: "submissions", label: "Submissions", icon: Inbox },
  { id: "challenges", label: "Challenges", icon: ListChecks },
] as const;

export default function ManageChallengesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "challenges" ? "challenges" : "submissions";
  // `null` = closed, `{ editing: null }` = new challenge, otherwise editing that one.
  const [form, setForm] = useState<{ editing: Challenge | null } | null>(null);
  const { data: pending } = useQuery({ ...pendingSubmissionsQuery, select: (d) => d.length });

  return (
    <div className="w-full space-y-6 bg-base text-[#4B5563] font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#1F2937]">Manage Challenges</h1>
        <Link
          to="/dashboard/challenges"
          className="bg-base text-[#4B5563] px-4 py-2 rounded-[12px] text-[12px] font-bold neu-raised-sm neu-hover transition-all flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Back to challenges
        </Link>
      </div>

      <div role="tablist" aria-label="Challenge admin sections" className="flex items-center gap-2 sm:gap-3 border-b border-[#E5E7EB] pb-3 overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams(t.id === "submissions" ? {} : { tab: t.id }, { replace: true })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] sm:text-[14px] shrink-0 whitespace-nowrap transition-all duration-200 ${
                active ? "bg-[#3B82F6] text-white neu-raised-sm font-bold" : "bg-base text-[#4B5563] neu-raised-sm neu-hover font-medium"
              }`}
            >
              <t.icon size={17} />
              <span>{t.label}</span>
              {t.id === "submissions" && !!pending && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold flex items-center justify-center">
                  <span aria-hidden>{pending}</span>
                  <span className="sr-only">{pending} pending</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "submissions" ? <SubmissionQueue /> : <ChallengeList onNew={() => setForm({ editing: null })} onEdit={(c) => setForm({ editing: c })} />}

      {form && <ChallengeFormDialog key={form.editing?.id ?? "new"} editing={form.editing} onClose={() => setForm(null)} />}
    </div>
  );
}
