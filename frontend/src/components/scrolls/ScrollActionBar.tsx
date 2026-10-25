import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useMe } from "@/features/auth/queries";
import { formatNumber } from "@/lib/format";
import { scrollActionMutation, type ScrollAction } from "@/features/scrolls/mutations";
import { scrollPermissions } from "@/features/scrolls/permissions";
import type { ScrollItem } from "@/features/scrolls/schemas";

const CONFIRM: Partial<Record<ScrollAction, { title: string; message: string; label: string }>> = {
  delete: { title: "Delete this scroll?", message: "This permanently removes the scroll and cannot be undone.", label: "Delete" },
  archive: { title: "Archive this scroll?", message: "It will disappear from the public list.", label: "Archive" },
  reject: { title: "Send back to draft?", message: "The author can edit it and submit again.", label: "Reject" },
};

const base = "px-3.5 py-1.5 rounded-[12px] text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none";
const neutral = `${base} bg-base neu-raised-sm neu-hover text-[#1F2937]`;
const primary = `${base} bg-[#3B82F6] text-white neu-raised-sm hover:bg-[#2563EB]`;
const danger = `${base} bg-base neu-raised-sm neu-hover text-[#EF4444]`;

interface ActionButton {
  action: ScrollAction;
  label: string;
  show: boolean;
  className: string;
}

// Main actions stay visible; the rarer ones (archive, feature, delete) live in the ⋯ menu to keep the page quiet.
export default function ScrollActionBar({ scroll }: { scroll: ScrollItem }) {
  const me = useMe();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<ScrollAction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const act = useMutation(scrollActionMutation);
  const can = scrollPermissions(me, scroll);

  const run = (action: ScrollAction) =>
    act.mutate(
      { id: scroll.id, action },
      {
        onSuccess: (result) => {
          setConfirming(null);
          if (action === "delete") navigate("/dashboard/scrolls");
          // A reviewed scroll leaves the reviewer's view (rejected drafts are hidden from others), so go back to the queue.
          if (action === "approve" || action === "reject") navigate("/dashboard/review");
          if (action === "approve" && result.gamification) {
            toast.info(`Author earned +${formatNumber(result.gamification.xpGained)} XP`);
          }
        },
      },
    );

  const ask = (action: ScrollAction) => (CONFIRM[action] ? setConfirming(action) : run(action));

  const main: ActionButton[] = [
    { action: "submit", label: "Submit for Review", show: can.submit, className: primary },
    { action: "approve", label: "Approve", show: can.approve, className: primary },
    { action: "reject", label: "Reject", show: can.reject, className: danger },
  ];
  const more: ActionButton[] = [
    { action: "archive", label: "Archive", show: can.archive, className: "" },
    { action: "feature", label: "Feature", show: can.feature, className: "" },
    { action: "unfeature", label: "Unfeature", show: can.unfeature, className: "" },
    { action: "delete", label: "Delete", show: can.edit, className: "text-[#EF4444]" },
  ];
  const shownMain = main.filter((b) => b.show);
  const shownMore = more.filter((b) => b.show);
  if (!can.edit && shownMain.length === 0 && shownMore.length === 0) return null;

  const confirm = confirming ? CONFIRM[confirming] : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {can.edit && (
        <Link to={`/dashboard/scrolls/${scroll.id}/edit`} className={neutral}>
          Edit
        </Link>
      )}
      {shownMain.map((b) => (
        <button key={b.action} type="button" disabled={act.isPending} onClick={() => ask(b.action)} className={b.className}>
          {b.label}
        </button>
      ))}

      {shownMore.length > 0 && (
        <div className="relative">
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`${neutral} !px-2.5`}
          >
            <Ellipsis size={16} />
          </button>

          {menuOpen && (
            <>
              {/* Click-away layer: closes the menu without a document-level listener. */}
              <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div
                role="menu"
                ref={(el) => {
                  if (el && !el.contains(document.activeElement)) el.querySelector("button")?.focus();
                }}
                onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
                className="absolute left-0 top-full mt-2 z-20 min-w-[150px] bg-base neu-raised rounded-[14px] p-1.5 flex flex-col"
              >
                {shownMore.map((b) => (
                  <button
                    key={b.action}
                    type="button"
                    role="menuitem"
                    disabled={act.isPending}
                    onClick={() => {
                      setMenuOpen(false);
                      ask(b.action);
                    }}
                    className={`text-left px-3 py-2 rounded-[10px] text-[12px] font-bold hover:bg-[#EAEFF5] transition-colors ${b.className || "text-[#1F2937]"}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {confirming && confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          pending={act.isPending}
          onConfirm={() => run(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
