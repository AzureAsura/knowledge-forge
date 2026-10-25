import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import FollowMentorButton from "@/components/apprentice/FollowMentorButton";
import CommentSection from "@/components/comments/CommentSection";
import MarkdownContent from "@/components/scrolls/MarkdownContent";
import ReactionButtons, { CopyLinkButton } from "@/components/scrolls/ReactionButtons";
import ScrollActionBar from "@/components/scrolls/ScrollActionBar";
import StatusChip from "@/components/scrolls/StatusChip";
import UserAvatar from "@/components/ui/UserAvatar";
import { scrollQueries } from "@/features/scrolls/queries";
import { DIFFICULTY } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cloudinaryWidth } from "@/lib/image";

// Two columns inside the normal page container: the scroll on the left, the author and the discussion on the right.
export default function ScrollDetailPage() {
  const { id = "" } = useParams();
  const { data: scroll } = useSuspenseQuery(scrollQueries.detail(id));
  const isPublished = scroll.status === "published";

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-[#4B5563] font-sans">
      <article className="lg:col-span-8 bg-base neu-raised rounded-[24px] p-6 lg:p-8 space-y-6 min-w-0">
        <ScrollActionBar scroll={scroll} />

        <header className="space-y-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[#6B7280]">
            <span>{scroll.category.name}</span>
            <span aria-hidden>·</span>
            <span>{DIFFICULTY[scroll.difficulty]}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(scroll.publishedAt ?? scroll.createdAt, true)}</span>
            {!isPublished && <StatusChip status={scroll.status} />}
          </p>

          <h1 className="text-[28px] leading-tight sm:text-[36px] tracking-tight text-[#1F2937] font-extrabold">{scroll.title}</h1>
          {scroll.excerpt && <p className="text-[16px] sm:text-[17px] leading-relaxed text-[#6B7280]">{scroll.excerpt}</p>}
        </header>

        {scroll.coverImageUrl && (
          <div className="w-full aspect-video rounded-[20px] overflow-hidden bg-base neu-pressed">
            <img src={cloudinaryWidth(scroll.coverImageUrl, 1280)} alt={scroll.title} className="w-full h-full object-cover opacity-90" />
          </div>
        )}

        <MarkdownContent content={scroll.content} />

        {isPublished && (
          <footer className="pt-6 border-t border-[#E5E7EB] flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-bold text-[#1F2937] mr-auto">Enjoyed this scroll?</span>
            <ReactionButtons idOrSlug={id} scroll={scroll} />
            <CopyLinkButton />
          </footer>
        )}
      </article>

      <aside className="lg:col-span-4 space-y-6 min-w-0">
        <section aria-label="Author" className="bg-base neu-raised rounded-[24px] p-5 space-y-4">
          <Link to={`/dashboard/profile/${scroll.author.username}`} className="group flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-[16px] bg-base neu-raised-sm p-0.5 overflow-hidden shrink-0 text-lg">
              <UserAvatar src={scroll.author.avatarUrl} name={scroll.author.fullName} className="rounded-[14px]" />
            </div>
            <div className="min-w-0">
              <span className="block text-[16px] font-extrabold text-[#1F2937] group-hover:text-[#3B82F6] truncate transition-colors">{scroll.author.fullName}</span>
              <span className="block text-[12px] text-[#6B7280] truncate">
                Lv. {scroll.author.level} · {scroll.author.title}
              </span>
            </div>
          </Link>

          <FollowMentorButton target={scroll.author} />
        </section>

        {isPublished && <CommentSection scrollId={scroll.id} scrollAuthorId={scroll.authorId} commentsCount={scroll.commentsCount} />}
      </aside>
    </div>
  );
}
