import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useMe } from "@/features/auth/queries";
import { timeAgo } from "@/lib/format";
import { createCommentMutation, deleteCommentMutation } from "@/features/comments/mutations";
import { canDeleteComment } from "@/features/comments/permissions";
import { commentQueries } from "@/features/comments/queries";
import { commentFormSchema, type Comment, type CommentForm } from "@/features/comments/schemas";

interface CommentItemProps {
  comment: Comment;
  isScrollAuthor: boolean;
  pending?: boolean;
  onDelete?: () => void;
}

function CommentItem({ comment, isScrollAuthor, pending, onDelete }: CommentItemProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={`stagger-in bg-base neu-raised-sm rounded-[20px] p-5 space-y-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <Link to={`/dashboard/profile/${comment.author.username}`} className="group flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-[12px] bg-base neu-raised-sm overflow-hidden text-xs shrink-0`}>
            <UserAvatar src={comment.author.avatarUrl} name={comment.author.fullName} className="text-xs font-extrabold" />
          </div>
          <div className="min-w-0">
            <span className="block text-[15px] font-extrabold text-[#1F2937] group-hover:text-[#3B82F6] transition-colors truncate">{comment.author.fullName}</span>
            <span className="block text-[11px] text-[#6B7280] truncate">@{comment.author.username}</span>
          </div>
        </Link>

        <div className="flex flex-col items-end gap-1.5 shrink-0 self-start">
          <span className="text-[11px] text-[#6B7280] whitespace-nowrap">{pending ? "Posting…" : timeAgo(comment.createdAt)}</span>
          {isScrollAuthor && (
            <span className={`px-2.5 py-0.5 bg-base neu-pressed text-[#10B981] rounded-full text-[10px] font-bold`}>
              AUTHOR
            </span>
          )}
        </div>
      </div>

      <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#4B5563] whitespace-pre-wrap break-words">
        {comment.content}
      </p>

      {onDelete && (
        <div className="flex items-center gap-3 pt-1 text-[12px]">
          {confirming ? (
            <>
              <button type="button" onClick={onDelete} className="text-[#EF4444] font-bold hover:underline">
                Confirm delete
              </button>
              <span className="text-[#D1D5DB]">•</span>
              <button type="button" onClick={() => setConfirming(false)} className="text-[#6B7280] font-bold hover:underline">
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 text-[#6B7280] hover:text-[#EF4444] font-bold transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentSectionProps {
  scrollId: number;
  scrollAuthorId: number;
  commentsCount: number;
}

export default function CommentSection({ scrollId, scrollAuthorId, commentsCount }: CommentSectionProps) {
  const me = useMe();
  const comments = useInfiniteQuery(commentQueries.list(scrollId));
  const create = useMutation(createCommentMutation(scrollId));
  const remove = useMutation(deleteCommentMutation(scrollId));
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CommentForm>({ resolver: zodResolver(commentFormSchema), defaultValues: { content: "" } });
  const length = useWatch({ control, name: "content" }).length;

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  // A just-posted comment belongs at the very end of the list; only show it there once every page is loaded.
  const showPending = create.isPending && create.variables !== undefined && !comments.hasNextPage;

  return (
    <section className={`bg-base neu-raised rounded-[24px] p-6 lg:p-8 space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-[#3B82F6]" />
          <h2 className="text-[17px] sm:text-[18px] leading-snug text-[#1F2937] font-extrabold">
            Discussion ({commentsCount} Comments)
          </h2>
        </div>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => create.mutate(values.content, { onSuccess: () => reset() }))}
        className={`bg-base neu-raised-sm rounded-[20px] p-5 space-y-3`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[10px] bg-base neu-raised-sm overflow-hidden text-xs`}>
            <UserAvatar src={me.avatarUrl} name={me.fullName} className="font-extrabold text-xs" />
          </div>
          <span className="text-[14px] text-[#1F2937] font-semibold">
            Comment as <strong>{me.fullName}</strong>
          </span>
        </div>

        <textarea
          rows={3}
          aria-label="Your comment"
          aria-invalid={!!errors.content}
          {...register("content")}
          placeholder="Share your thoughts, questions, or improvements..."
          className={`w-full bg-base neu-pressed rounded-[14px] p-3.5 text-[13px] text-[#1F2937] focus:outline-none transition-all resize-none`}
        />

        <div className="flex items-center justify-between pt-1">
          <span className={`text-[11px] font-semibold ${errors.content || length > 2000 ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
            {errors.content?.message ?? `${length} / 2000`}
          </span>

          <button
            type="submit"
            disabled={create.isPending}
            className={`px-4 py-2 bg-[#3B82F6] text-white rounded-[12px] neu-raised-sm text-[13px] font-bold hover:bg-[#2563EB] active:scale-95 disabled:opacity-60 disabled:pointer-events-none transition-all flex items-center gap-1.5`}
          >
            <Send size={15} />
            Post Comment
          </button>
        </div>
      </form>

      <div className="space-y-4 pt-2">
        {comments.isPending && (
          <>
            <Skeleton className="h-24 rounded-[20px]" />
            <Skeleton className="h-24 rounded-[20px]" />
          </>
        )}
        {comments.isError && <p className="text-[13px] text-[#EF4444]">Couldn&apos;t load comments.</p>}
        {comments.isSuccess && items.length === 0 && !showPending && (
          <p className="text-[13px] text-[#6B7280]">No comments yet. Be the first to comment.</p>
        )}
        {items.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isScrollAuthor={comment.authorId === scrollAuthorId}
            onDelete={canDeleteComment(me, comment) ? () => remove.mutate(comment.id) : undefined}
          />
        ))}
        {showPending && (
          <CommentItem
            pending
            isScrollAuthor={me.id === scrollAuthorId}
            comment={{
              id: -1,
              scrollId,
              authorId: me.id,
              content: create.variables,
              createdAt: new Date(create.submittedAt).toISOString(),
              updatedAt: new Date(create.submittedAt).toISOString(),
              author: { id: me.id, fullName: me.fullName, username: me.username, avatarUrl: me.avatarUrl, role: me.role, level: me.currentLevel, title: me.title },
            }}
          />
        )}
        {comments.hasNextPage && (
          <button
            type="button"
            disabled={comments.isFetchingNextPage}
            onClick={() => comments.fetchNextPage()}
            className={`px-4 py-2 bg-base neu-raised-sm neu-hover rounded-[12px] text-[12px] font-bold text-[#1F2937] disabled:opacity-60 transition-all`}
          >
            {comments.isFetchingNextPage ? "Loading…" : "Load more comments"}
          </button>
        )}
      </div>
    </section>
  );
}
