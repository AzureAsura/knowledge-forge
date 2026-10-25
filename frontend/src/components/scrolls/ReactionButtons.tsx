import { useMutation } from "@tanstack/react-query";
import { Bookmark, Heart, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatNumber } from "@/lib/format";
import { reactionMutation } from "@/features/scrolls/mutations";
import type { ScrollDetail } from "@/features/scrolls/schemas";

const base = "h-9 px-3 rounded-[12px] bg-base flex items-center gap-1.5 text-[12px] font-bold transition-all";

// Like / save buttons with their counts, shown under the article.
export default function ReactionButtons({ idOrSlug, scroll }: { idOrSlug: string; scroll: ScrollDetail }) {
  const like = useMutation(reactionMutation("like", idOrSlug, scroll.id));
  const bookmark = useMutation(reactionMutation("bookmark", idOrSlug, scroll.id));

  return (
    <>
      <button
        type="button"
        aria-pressed={scroll.isLiked}
        aria-label={`Like, ${scroll.likesCount} likes`}
        title="Like"
        disabled={like.isPending}
        onClick={() => like.mutate(!scroll.isLiked)}
        className={`${base} text-[#EF4444] ${scroll.isLiked ? "neu-pressed" : "neu-raised-sm neu-hover"}`}
      >
        <Heart size={16} className={like.isSuccess && like.variables ? "anim-pop" : ""} fill={scroll.isLiked ? "currentColor" : "none"} />
        <span>{scroll.isLiked ? "Liked" : "Like"}</span>
        <span className="opacity-70">{formatNumber(scroll.likesCount)}</span>
      </button>

      <button
        type="button"
        aria-pressed={scroll.isBookmarked}
        aria-label={`Save, ${scroll.bookmarksCount} saves`}
        title="Save"
        disabled={bookmark.isPending}
        onClick={() => bookmark.mutate(!scroll.isBookmarked)}
        className={`${base} text-[#3B82F6] ${scroll.isBookmarked ? "neu-pressed" : "neu-raised-sm neu-hover"}`}
      >
        <Bookmark size={16} className={bookmark.isSuccess && bookmark.variables ? "anim-hop" : ""} fill={scroll.isBookmarked ? "currentColor" : "none"} />
        <span>{scroll.isBookmarked ? "Saved" : "Save"}</span>
        <span className="opacity-70">{formatNumber(scroll.bookmarksCount)}</span>
      </button>
    </>
  );
}

export function CopyLinkButton() {
  const copy = () =>
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Link copied"),
      () => toast.error("Couldn't copy the link"),
    );

  return (
    <button type="button" aria-label="Copy link" title="Copy link" onClick={copy} className={`${base} text-[#6B7280] neu-raised-sm neu-hover`}>
      <Link2 size={16} />
      <span>Copy link</span>
    </button>
  );
}
