import { lazy, Suspense, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, CircleCheckBig, Image as ImageIcon, RefreshCw, Save, Trash2, Award, Code2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import { categoriesQuery, leafCategories } from "@/features/categories/queries";
import { DIFFICULTY } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { markdownToPlain } from "@/features/scrolls/markdown";
import { saveScrollMutation, scrollActionMutation } from "@/features/scrolls/mutations";
import { scrollFormSchema, type ScrollDetail, type ScrollForm as ScrollFormValues } from "@/features/scrolls/schemas";
import { cloudinaryWidth } from "@/lib/image";
import { MAX_IMAGE_BYTES } from "@/features/scrolls/upload";

const ScrollEditor = lazy(() => import("@/components/scrolls/ScrollEditor"));

const TITLE_MAX = 120;
const EXCERPT_MAX = 200;
const WORDS_PER_MINUTE = 200;

export default function ScrollForm({ scroll }: { scroll?: ScrollDetail }) {
  const navigate = useNavigate();
  // Suspends until loaded: a <select> mounted before its options would lose the saved category.
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const leaves = leafCategories(categories);
  // `?category=<id>` (from the topic tree) preselects a topic for a new scroll.
  const preset = Number(useSearchParams()[0].get("category"));
  const parents = categories.filter((c) => leaves.every((l) => l.id !== c.id));

  const [savedId, setSavedId] = useState(scroll?.id);
  const [cover, setCover] = useState<{ file: File; previewUrl: string } | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useMutation(saveScrollMutation);
  const submit = useMutation(scrollActionMutation);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ScrollFormValues>({
    resolver: zodResolver(scrollFormSchema),
    defaultValues: {
      title: scroll?.title ?? "",
      categoryId: scroll?.categoryId ?? (leaves.some((l) => l.id === preset) ? preset : undefined),
      difficulty: scroll?.difficulty ?? "beginner",
      content: scroll?.content ?? "",
      excerpt: scroll?.excerpt ?? "",
    },
  });
  const [title, difficulty, content, excerpt] = useWatch({ control, name: ["title", "difficulty", "content", "excerpt"] });

  const plain = markdownToPlain(content);
  const words = plain ? plain.split(" ").length : 0;
  const isDraft = !scroll || scroll.status === "draft";
  const titleOk = title.trim().length > 0 && title.length <= TITLE_MAX;
  const coverUrl = cover?.previewUrl ?? (removeCover ? "" : (scroll?.coverImageUrl ? cloudinaryWidth(scroll.coverImageUrl, 640) : ""));
  const busy = save.isPending || submit.isPending;
  const savedLabel = save.isSuccess
    ? `Saved ${timeAgo(new Date(save.submittedAt).toISOString())}`
    : scroll
      ? `Saved ${timeAgo(scroll.updatedAt)}`
      : "New draft";

  const pickCover = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) return void toast.error("Cover images must be 4 MB or smaller");
    if (cover) URL.revokeObjectURL(cover.previewUrl);
    setCover({ file, previewUrl: URL.createObjectURL(file) });
    setRemoveCover(false);
  };

  const clearCover = () => {
    if (cover) URL.revokeObjectURL(cover.previewUrl);
    setCover(null);
    setRemoveCover(true);
  };

  // Saving always comes first; "Submit for Review" then moves the saved draft to pending.
  const run = (andSubmit: boolean) =>
    handleSubmit((values) =>
      save.mutate(
        { id: savedId, values, cover: cover?.file ?? null, removeCover },
        {
          onSuccess: (saved) => {
            setSavedId(saved.id);
            setCover(null);
            setRemoveCover(false);
            if (andSubmit) {
              submit.mutate({ id: saved.id, action: "submit" }, { onSuccess: () => navigate(`/dashboard/scrolls/${saved.slug}`) });
              return;
            }
            toast.success(scroll ? "Changes saved" : "Draft saved");
            if (!scroll) navigate(`/dashboard/scrolls/${saved.slug}/edit`, { replace: true });
          },
        },
      ),
    );

  return (
    <form onSubmit={run(false)} noValidate className="w-full space-y-6 bg-base text-[#4B5563] font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-base neu-raised p-5 sm:p-6 rounded-[24px] space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <label htmlFor="scroll-title" className="text-[17px] sm:text-[18px] leading-snug font-extrabold text-[#1F2937]">
                  Scroll Title <span className="text-[#EF4444]">*</span>
                </label>

                <div className="flex items-center gap-2 bg-base neu-pressed px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#6B7280]">{savedLabel}</span>
                </div>
              </div>

              <span className={`text-[10px] sm:text-[11px] flex items-center gap-1 font-bold ${titleOk ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {titleOk && <CircleCheckBig size={14} />}
                {titleOk ? "Valid Length" : "Title length"} ({title.length} / {TITLE_MAX})
              </span>
            </div>

            <input
              id="scroll-title"
              type="text"
              aria-invalid={!!errors.title}
              {...register("title")}
              placeholder="e.g. Architecting Distributed Memory in Rust"
              className="w-full bg-base neu-pressed text-[15px] sm:text-[17px] leading-relaxed text-[#1F2937] px-4 py-3 rounded-[16px] focus:outline-none transition-all font-bold"
            />
            {errors.title && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.title.message}</p>}
          </div>

          <div className="bg-base neu-raised rounded-[24px] overflow-hidden flex flex-col">
            <Suspense fallback={<Skeleton className="m-5 h-[420px] rounded-[18px]" />}>
              <ScrollEditor
                initialContent={content}
                onChange={(markdown) => setValue("content", markdown, { shouldValidate: !!errors.content })}
              />
            </Suspense>

            <div className="border-t border-[#E5E7EB] px-5 py-2.5 flex flex-wrap justify-between items-center text-[11px] text-[#6B7280] gap-2">
              <div className="flex items-center gap-3 flex-wrap font-medium">
                <span className="text-[#1F2937] font-bold">{words.toLocaleString("id-ID")} Words</span>
                <span>·</span>
                <span>{plain.length.toLocaleString("id-ID")} Characters</span>
                <span>·</span>
                <span>~{Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))} min read</span>
              </div>
              {errors.content && (
                <div className="flex items-center gap-1.5 text-[#EF4444] font-bold">
                  <Code2 size={13} />
                  <span>{errors.content.message}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-base neu-raised p-5 sm:p-6 rounded-[24px] space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <label htmlFor="scroll-excerpt" className="text-[15px] sm:text-[16px] leading-snug font-extrabold text-[#1F2937]">
                  Scroll Excerpt &amp; Summary
                </label>
                <span className="text-[11px] text-[#6B7280] block mt-0.5">
                  Left empty, it is filled from the first 200 characters of the body
                </span>
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-base neu-pressed ${
                  excerpt.length > EXCERPT_MAX ? "text-[#EF4444]" : "text-[#3B82F6]"
                }`}
              >
                {excerpt.length} / {EXCERPT_MAX} chars
              </span>
            </div>

            <textarea
              id="scroll-excerpt"
              rows={3}
              aria-invalid={!!errors.excerpt}
              {...register("excerpt")}
              className="w-full bg-base neu-pressed text-[13px] sm:text-[14px] leading-relaxed text-[#1F2937] p-3.5 rounded-[16px] focus:outline-none transition-all resize-none font-medium"
            />
            {errors.excerpt && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.excerpt.message}</p>}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setValue("excerpt", plain.slice(0, EXCERPT_MAX), { shouldValidate: true })}
                className="bg-base neu-raised-sm neu-hover px-3 py-1.5 rounded-[12px] transition-all text-[11px] font-bold text-[#4B5563] flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Sync with Editor Body</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-base neu-raised p-5 sm:p-6 rounded-[24px] space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <span className="text-[15px] sm:text-[16px] leading-snug font-extrabold text-[#1F2937]">Cover Image</span>
              <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-medium">16:9 Recommended</span>
            </div>

            <div className="bg-base neu-pressed p-3.5 rounded-[18px] flex flex-col gap-3">
              <div className="relative w-full h-36 rounded-[14px] overflow-hidden bg-base neu-pressed">
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover opacity-90" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
                    <ImageIcon size={36} />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="overflow-hidden min-w-0">
                  <p className="text-[11px] text-[#1F2937] truncate font-bold">{cover?.file.name ?? (coverUrl ? "Current cover" : "No cover yet")}</p>
                  {cover && <p className="text-[10px] text-[#6B7280]">{(cover.file.size / 1024 / 1024).toFixed(1)} MB</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="bg-base neu-raised-sm neu-hover text-[#1F2937] text-[11px] px-3 py-1 rounded-[10px] transition-all font-bold cursor-pointer focus-within:ring-2 focus-within:ring-[#3B82F6]">
                    {coverUrl ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        pickCover(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    title="Remove Cover"
                    aria-label="Remove cover"
                    disabled={!coverUrl}
                    onClick={clearCover}
                    className="bg-base neu-raised-sm neu-hover text-[#EF4444] p-1.5 rounded-[10px] transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-base neu-raised p-5 sm:p-6 rounded-[24px] space-y-3">
            <label htmlFor="category-select" className="text-[15px] sm:text-[16px] leading-snug font-extrabold text-[#1F2937] block">
              Category <span className="text-[#EF4444]">*</span>
            </label>

            <div className="relative">
              <select
                id="category-select"
                aria-invalid={!!errors.categoryId}
                {...register("categoryId", { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) })}
                className="w-full appearance-none bg-base neu-pressed text-[13px] sm:text-[14px] leading-relaxed text-[#1F2937] px-4 py-2.5 rounded-[14px] focus:outline-none cursor-pointer font-bold"
              >
                <option value="">Select a category…</option>
                {parents.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    {leaves
                      .filter((leaf) => leaf.parentId === parent.id)
                      .map((leaf) => (
                        <option key={leaf.id} value={leaf.id}>
                          {leaf.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
                {leaves
                  .filter((leaf) => leaf.parentId === null)
                  .map((leaf) => (
                    <option key={leaf.id} value={leaf.id}>
                      {leaf.name}
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7280]" />
            </div>
            {errors.categoryId && <p className="text-[11px] font-semibold text-[#EF4444]">{errors.categoryId.message}</p>}
          </div>

          <fieldset className="bg-base neu-raised p-5 sm:p-6 rounded-[24px] space-y-3">
            <legend className="sr-only">Difficulty</legend>
            <span className="text-[15px] sm:text-[16px] leading-snug font-extrabold text-[#1F2937] block" aria-hidden>
              Difficulty <span className="text-[#EF4444]">*</span>
            </span>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {(Object.keys(DIFFICULTY) as (keyof typeof DIFFICULTY)[]).map((value) => {
                const selected = difficulty === value;
                return (
                  <label
                    key={value}
                    className={`flex items-center p-3 rounded-[16px] cursor-pointer transition-all ${
                      selected ? "bg-base neu-raised-sm border border-[#3B82F6]/50" : "bg-base neu-pressed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" value={value} {...register("difficulty")} className="w-4 h-4 text-[#3B82F6] focus:ring-0 accent-[#3B82F6]" />
                      <span className={`text-[13px] sm:text-[14px] text-[#1F2937] ${selected ? "font-extrabold" : "font-semibold"}`}>
                        {DIFFICULTY[value]}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="bg-base neu-raised p-5 sm:p-6 rounded-[24px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-[#3B82F6]" />
              <h3 className="text-[15px] leading-snug text-[#1F2937] font-extrabold">Reward</h3>
            </div>
            <span className="bg-[#3B82F6] text-white px-3 py-1 rounded-full font-extrabold text-[13px] neu-raised-sm">+50 XP when approved</span>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-base neu-raised-sm neu-hover px-4 py-3 rounded-[16px] text-[13px] font-bold text-[#4B5563] transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              <Save size={16} />
              <span>{isDraft ? "Save Draft" : "Save Changes"}</span>
            </button>

            {scroll && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-base neu-raised-sm neu-hover px-4 py-3 rounded-[16px] text-[13px] font-bold text-[#EF4444] transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                disabled={busy}
                onClick={run(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-[#3B82F6] text-white px-5 py-3.5 rounded-[16px] neu-raised-sm text-[15px] font-extrabold hover:bg-[#2563EB] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                <span>Submit for Review ➔</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {confirmingDelete && scroll && (
        <ConfirmDialog
          title="Delete this scroll?"
          message="This permanently removes the scroll and cannot be undone."
          confirmLabel="Delete"
          pending={submit.isPending}
          onConfirm={() => submit.mutate({ id: scroll.id, action: "delete" }, { onSuccess: () => navigate("/dashboard/scrolls") })}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </form>
  );
}
