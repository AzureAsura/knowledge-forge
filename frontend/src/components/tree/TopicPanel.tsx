import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { Filter } from "@/features/tree/layout";
import { useAnimatedClose } from "@/lib/dialog";
import { formatNumber } from "@/lib/format";
import { STATUS_STYLE } from "@/lib/constants";
import type { TreeData } from "@/features/gamification/queries";

const closeButton =
  "p-2 rounded-full bg-base neu-raised-sm neu-hover text-[#6B7280] hover:text-[#1F2937] transition-all shrink-0";

// Desktop: the card that sits next to the graph. Shows one topic, or the overview when nothing is selected.
export function TopicPanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="panel-slide-in bg-base neu-raised rounded-[24px] p-5 relative max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <button type="button" aria-label="Close topic details" onClick={onClose} className={`${closeButton} absolute top-4 right-4`}>
        <X size={17} />
      </button>
      <div className="pr-10">{children}</div>
    </div>
  );
}

export function TreeOverview({ data, counts }: { data: TreeData; counts: Record<Filter, number> }) {
  return (
    <div className="bg-base neu-raised rounded-[24px] p-5 space-y-4">
      <h2 className="text-[18px] font-extrabold text-[#1F2937]">Your topics at a glance</h2>
      <p className="text-[14px] leading-relaxed text-[#6B7280]">
        <strong className="text-[#1F2937]">
          {counts.unlocked + counts.mastered} of {counts.all}
        </strong>{" "}
        topics unlocked. Pick one in the tree to see what it takes to reach the next level and which scrolls help.
      </p>
      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-base neu-pressed rounded-[14px] py-3">
          <dt className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280]">Total level</dt>
          <dd className="text-[24px] font-extrabold text-[#1F2937]">{data.center.totalLevel}</dd>
        </div>
        <div className="bg-base neu-pressed rounded-[14px] py-3">
          <dt className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280]">Total XP</dt>
          <dd className="text-[24px] font-extrabold text-[#1F2937]">{formatNumber(data.center.totalXp)}</dd>
        </div>
        <div className="bg-base neu-pressed rounded-[14px] py-3">
          <dt className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280]">Scrolls written</dt>
          <dd className="text-[24px] font-extrabold text-[#1F2937]">{formatNumber(data.nodes.reduce((sum, n) => sum + n.scrollsContributed, 0))}</dd>
        </div>
        <div className="bg-base neu-pressed rounded-[14px] py-3">
          <dt className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280]">Scrolls read</dt>
          <dd className="text-[24px] font-extrabold text-[#1F2937]">{formatNumber(data.nodes.reduce((sum, n) => sum + n.scrollsRead, 0))}</dd>
        </div>
      </dl>
      <ul className="space-y-2 text-[14px] font-semibold text-[#4B5563]">
        {(["mastered", "unlocked", "locked"] as const).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_STYLE[status].color }} />
            {STATUS_STYLE[status].label}
            <span className="ml-auto font-extrabold text-[#1F2937]">{counts[status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Small screens: the same details in a bottom sheet.
export function TopicSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const { requestClose, dialogProps } = useAnimatedClose(onClose);
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      {...dialogProps}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
      aria-label="Topic details"
      className="dialog-pop m-0 mt-auto w-full max-w-full max-h-[88dvh] overflow-y-auto bg-base neu-raised rounded-t-[24px] rounded-b-none p-5 text-[#4B5563] backdrop:bg-[#1F2937]/30"
    >
      <button type="button" aria-label="Close topic details" onClick={requestClose} className={`${closeButton} absolute top-4 right-4`}>
        <X size={17} />
      </button>
      <div className="pr-10">{children}</div>
    </dialog>
  );
}
