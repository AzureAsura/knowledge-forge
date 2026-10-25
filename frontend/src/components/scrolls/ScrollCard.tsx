import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, ScrollText, Star } from "lucide-react";
import StatusChip from "@/components/scrolls/StatusChip";
import UserAvatar from "@/components/ui/UserAvatar";
import { DIFFICULTY } from "@/lib/constants";
import { cloudinaryWidth } from "@/lib/image";
import { formatDate, formatNumber } from "@/lib/format";
import type { ScrollItem } from "@/features/scrolls/schemas";

// Quiet card: a clean cover, one muted meta line, title, excerpt, and a light footer (author left, counts right).
export default function ScrollCard({ scroll, isYours, index = 0 }: { scroll: ScrollItem; isYours: boolean; index?: number }) {
  const href = `/dashboard/scrolls/${scroll.slug}`;

  return (
    <article
      style={{ "--i": index } as CSSProperties}
      className={`stagger-in card-lift group relative bg-base neu-raised rounded-[24px] overflow-hidden neu-hover transition-all duration-300 flex flex-col justify-between`}
    >
      <div>
        <div className={`aspect-video w-full relative overflow-hidden bg-base neu-pressed`}>
          {scroll.coverImageUrl ? (
            <img
              src={cloudinaryWidth(scroll.coverImageUrl, 640)}
              alt={scroll.title}
              loading="lazy"
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
              <ScrollText size={40} />
            </div>
          )}
        </div>

        <div className="p-5 space-y-2.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#6B7280]">
            {scroll.status !== "published" && <StatusChip status={scroll.status} />}
            <span>{scroll.category.name}</span>
            <span aria-hidden>·</span>
            <span>{DIFFICULTY[scroll.difficulty]}</span>
          </p>

          <h2 className="text-[16px] sm:text-[17px] leading-snug text-[#1F2937] font-extrabold group-hover:text-[#3B82F6] transition-colors line-clamp-2">
            {scroll.isFeatured && <Star size={14} className="inline -mt-0.5 mr-1.5 text-[#F59E0B]" fill="currentColor" aria-label="Featured" />}
            <Link to={href} className="after:absolute after:inset-0">
              {scroll.title}
            </Link>
          </h2>

          <p className="text-[12px] leading-relaxed text-[#6B7280] line-clamp-3 font-normal">
            {scroll.excerpt}
          </p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-[#E5E7EB] flex items-center justify-between gap-3">
        <Link to={`/dashboard/profile/${scroll.author.username}`} className="relative z-10 flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-[10px] bg-base neu-raised-sm overflow-hidden shrink-0`}>
            <UserAvatar src={scroll.author.avatarUrl} name={scroll.author.fullName} className="text-[11px]" />
          </div>
          <div className="truncate">
            <span className="text-[12px] font-bold text-[#1F2937] flex items-center gap-1 truncate">
              <span className="truncate">{scroll.author.fullName}</span>
              {isYours && (
                <span className="bg-[#3B82F6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  YOU
                </span>
              )}
            </span>
            <span className="text-[10px] text-[#9CA3AF] font-medium block truncate">
              {formatDate(scroll.publishedAt ?? scroll.createdAt, true)}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#6B7280] shrink-0">
          <span className="flex items-center gap-1">
            <Heart size={15} className="text-[#EF4444]" fill="currentColor" />
            {formatNumber(scroll.likesCount)}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark size={15} />
            {formatNumber(scroll.bookmarksCount)}
          </span>
        </div>
      </div>
    </article>
  );
}
