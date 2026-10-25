import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { CheckSquare, Settings2, XCircle } from "lucide-react";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import ChallengeDialog from "@/components/challenges/ChallengeDialog";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useMe } from "@/features/auth/queries";
import { challengesQuery, pendingSubmissionsQuery } from "@/features/challenges/queries";
import { formatDate, formatNumber } from "@/lib/format";

const ARCHIVE_FILTERS = [
  { value: "all", label: "All Past" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
] as const;
type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number]["value"];

const th = "p-3.5 text-[11px] font-extrabold uppercase tracking-wider text-[#6B7280]";

export default function ChallengesPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const { data: challenges, isPending, isError } = useQuery(challengesQuery);
  const isAdmin = me.role === "admin";
  const { data: pendingReviews = 0 } = useQuery({ ...pendingSubmissionsQuery, enabled: isAdmin, select: (d) => d.length });

  const archiveParam = params.get("archive");
  const archive: ArchiveFilter = ARCHIVE_FILTERS.find((f) => f.value === archiveParam)?.value ?? "all";
  const update = (patch: { archive?: ArchiveFilter; open?: number | null }) => {
    const out = new URLSearchParams(params);
    if (patch.archive === "all") out.delete("archive");
    else if (patch.archive) out.set("archive", patch.archive);
    if (patch.open === null) out.delete("challenge");
    else if (patch.open) out.set("challenge", String(patch.open));
    setParams(out, { replace: true });
  };

  const all = challenges ?? [];
  const open = all
    .filter((c) => c.isPublished && c.status !== "completed")
    .sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || a.startDate.localeCompare(b.startDate));
  const opened = open.find((c) => String(c.id) === params.get("challenge"));
  const past = all.filter((c) => c.status === "completed" && c.isPublished);
  const expired = past.filter((c) => c.mySubmissionStatus !== "approved");
  const completed = past.filter((c) => c.mySubmissionStatus === "approved");
  const archiveRows = archive === "completed" ? completed : archive === "expired" ? expired : past;

  return (
    <div className="w-full space-y-8 bg-base text-[#4B5563] font-sans">
      {isAdmin && (
        <div className="flex justify-end">
          <Link
            to="/dashboard/challenges/manage"
            className="bg-base text-[#1F2937] px-4 py-2.5 rounded-[14px] text-[13px] font-bold neu-raised-sm neu-hover transition-all flex items-center gap-2"
          >
            <Settings2 size={16} className="text-[#3B82F6]" />
            Manage
            {pendingReviews > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold flex items-center justify-center">
                <span aria-hidden>{pendingReviews}</span>
                <span className="sr-only">{pendingReviews} submissions waiting</span>
              </span>
            )}
          </Link>
        </div>
      )}

      {isPending && <Skeleton className="h-64 rounded-[24px]" />}
      {isError && <EmptyState title="Couldn't load challenges" message="Please try again in a moment." />}

      {challenges && open.length === 0 && <EmptyState title="No active challenge right now" message="Check back soon." />}

      {open.length > 0 && (
        <section aria-label="Challenges" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {open.map((c, i) => (
            <ChallengeCard key={c.id} index={i} challenge={c} onOpen={() => update({ open: c.id })} />
          ))}
        </section>
      )}

      {opened && <ChallengeDialog key={opened.id} challenge={opened} onClose={() => update({ open: null })} />}

      {past.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[18px] sm:text-[20px] leading-snug text-[#1F2937] font-extrabold">Past Challenges Archive</h3>
              <p className="text-[12px] sm:text-[13px] text-[#6B7280]">Finished challenges and how you did.</p>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-2 px-1 min-w-0">
              {ARCHIVE_FILTERS.map((f) => {
                const count = f.value === "all" ? past.length : f.value === "completed" ? completed.length : expired.length;
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={f.value === archive}
                    onClick={() => update({ archive: f.value })}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 whitespace-nowrap transition-all duration-200 ${
                      f.value === archive
                        ? "bg-[#3B82F6] text-white neu-raised-sm"
                        : "bg-base text-[#6B7280] neu-raised-sm hover:shadow-[-2px_-2px_5px_#ffffff,2px_2px_5px_#d1d5db]"
                    }`}
                  >
                    {f.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-base neu-raised rounded-[20px] overflow-x-auto scrollbar-none p-2">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className={th}>Challenge Title</th>
                  <th className={th}>XP Earned</th>
                  <th className={th}>Ended</th>
                  <th className={`${th} text-right`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/70 text-[12px]">
                {archiveRows.map((c) => {
                  const done = c.mySubmissionStatus === "approved";
                  return (
                    <tr key={c.id} className="hover:bg-[#EAEFF5]/50 transition-colors">
                      <td className={`p-3.5 font-semibold ${done ? "text-[#1F2937]" : "text-[#9CA3AF]"}`}>
                        <div className="flex items-center gap-2">
                          {done ? <CheckSquare size={15} className="text-[#10B981] shrink-0" /> : <XCircle size={15} className="text-[#EF4444] shrink-0" />}
                          <span className={done ? "" : "line-through"}>{c.title}</span>
                        </div>
                      </td>
                      <td className={`p-3.5 font-bold ${done ? "text-[#1F2937]" : "text-[#9CA3AF]"}`}>{done ? `+${formatNumber(c.xpReward)} XP` : "0 XP"}</td>
                      <td className="p-3.5 text-[#6B7280] font-medium">{formatDate(c.endDate, true)}</td>
                      <td className="p-3.5 text-right text-[11px] font-semibold text-[#6B7280]">{done ? "Completed" : "Expired"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
