import { lazy, Suspense, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import TopicDetail from "@/components/tree/TopicDetail";
import TopicList from "@/components/tree/TopicList";
import { TopicPanel, TopicSheet, TreeOverview } from "@/components/tree/TopicPanel";
import TreeToolbar, { type View } from "@/components/tree/TreeToolbar";
import Skeleton from "@/components/ui/Skeleton";
import { useMe } from "@/features/auth/queries";
import { categoriesQuery } from "@/features/categories/queries";
import type { Category } from "@/features/categories/queries";
import { treeQuery, type TreeData } from "@/features/gamification/queries";
import { readCelebrations, saveLevels } from "@/features/tree/celebrations";
import { fireConfetti } from "@/lib/confetti";
import type { Filter } from "@/features/tree/layout";
import { userQueries } from "@/features/users/queries";
import type { PublicUser } from "@/features/users/schemas";
import { topicStatus } from "@/lib/constants";
import { useMediaQuery } from "@/lib/media";

// Lazy: React Flow is only needed on this page.
const TreeCanvas = lazy(() => import("@/components/tree/TreeCanvas"));

const FILTERS: Filter[] = ["all", "mastered", "unlocked", "locked"];

export default function TopicTreePage() {
  const { username } = useParams();
  const me = useMe();
  const { data: profile } = useSuspenseQuery(userQueries.profile(username ?? me.username));
  const { data: tree } = useSuspenseQuery(treeQuery(profile.id));
  const { data: categories } = useSuspenseQuery(categoriesQuery);

  // Keyed by owner so switching from one tree to another starts fresh (celebrations are per tree).
  return <TreeView key={profile.id} profile={profile} tree={tree} categories={categories} isOwn={profile.id === me.id} userId={me.id} />;
}

interface TreeViewProps {
  profile: PublicUser;
  tree: TreeData;
  categories: Category[];
  isOwn: boolean;
  userId: number;
}

function TreeView({ profile, tree, categories, isOwn, userId }: TreeViewProps) {
  const [params, setParams] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWide = useMediaQuery("(min-width: 640px)");

  // What changed since the owner last looked at the tree (read once; saved after the first paint below).
  const [celebrations] = useState(() => (isOwn ? readCelebrations(userId, tree.nodes) : new Map()));
  const started = useRef(false);

  // Small screens default to the list: a drag-and-zoom graph is a poor fit for a phone.
  const view: View = params.get("view") === "graph" ? "graph" : params.get("view") === "list" ? "list" : isWide ? "graph" : "list";
  const filter = FILTERS.find((f) => f === params.get("filter")) ?? "all";
  const selected = tree.nodes.find((n) => n.slug === params.get("topic"));

  // The URL is the single source of truth for view, filter and the open topic.
  const update = (patch: { view?: View; filter?: Filter; topic?: string | null }) => {
    const out = new URLSearchParams(params);
    if (patch.view) out.set("view", patch.view);
    if (patch.filter === "all") out.delete("filter");
    else if (patch.filter) out.set("filter", patch.filter);
    if (patch.topic === null) out.delete("topic");
    else if (patch.topic) out.set("topic", patch.topic);
    setParams(out, { replace: true });
  };
  const select = (slug?: string) => update({ topic: slug ?? null });

  const counts: Record<Filter, number> = {
    all: tree.nodes.length,
    mastered: tree.nodes.filter((n) => topicStatus(n.level) === "mastered").length,
    unlocked: tree.nodes.filter((n) => topicStatus(n.level) === "unlocked").length,
    locked: tree.nodes.filter((n) => topicStatus(n.level) === "locked").length,
  };

  const detail = selected && (
    <TopicDetail
      key={selected.id}
      topic={selected}
      description={categories.find((c) => c.id === selected.id)?.description ?? ""}
      owner={profile}
      isOwn={isOwn}
    />
  );

  return (
    <div
      ref={(el) => {
        // Runs once when the page appears: remember today's levels and celebrate anything new with confetti.
        if (!el || started.current || !isOwn) return;
        started.current = true;
        saveLevels(userId, tree.nodes);
        if (celebrations.size > 0) setTimeout(() => void fireConfetti(), 700);
      }}
      className="w-full space-y-6 text-[#4B5563] font-sans"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] sm:text-[32px] leading-tight font-extrabold text-[#1F2937]">{isOwn ? "Topic Mastery Tree" : `${profile.fullName}'s tree`}</h1>
          <p className="text-[14px] sm:text-[15px] text-[#6B7280] mt-0.5">{isOwn ? "Your progress across every topic" : "Topic mastery and progress"}</p>
        </div>
        {!isOwn && (
          <Link
            to={`/dashboard/profile/${profile.username}`}
            className="bg-base text-[#4B5563] px-4 py-2 rounded-[12px] text-[14px] font-bold neu-raised-sm neu-hover transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to profile
          </Link>
        )}
      </header>

      <TreeToolbar view={view} filter={filter} counts={counts} onView={(v) => update({ view: v })} onFilter={(f) => update({ filter: f })} />

      {counts.locked === counts.all && (
        <p className="bg-base neu-pressed rounded-[16px] px-4 py-3 text-[15px] font-medium text-[#6B7280]">
          {isOwn ? "Nothing is unlocked yet. Publish a scroll or read one in a topic to start levelling it up." : `${profile.fullName} hasn't unlocked any topic yet.`}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 min-w-0">
          {view === "graph" ? (
            <Suspense fallback={<Skeleton className="h-[72vh] min-h-[520px] rounded-[24px]" />}>
              <TreeCanvas data={tree} categories={categories} filter={filter} selected={selected?.slug} celebrations={celebrations} onSelect={select} />
            </Suspense>
          ) : (
            <TopicList data={tree} categories={categories} filter={filter} selected={selected?.slug} onSelect={select} />
          )}
        </div>

        {isDesktop && (
          <aside className="lg:col-span-4 lg:sticky lg:top-0" aria-label="Topic details">
            {detail ? <TopicPanel key={selected!.id} onClose={() => select()}>{detail}</TopicPanel> : <TreeOverview data={tree} counts={counts} />}
          </aside>
        )}
      </div>

      {!isDesktop && detail && <TopicSheet onClose={() => select()}>{detail}</TopicSheet>}
    </div>
  );
}
