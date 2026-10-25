import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Heart, Lock, PenLine, Star, Swords } from "lucide-react";
import Countdown from "@/components/ui/Countdown";
import Skeleton from "@/components/ui/Skeleton";
import { challengesQuery } from "@/features/challenges/queries";
import type { TopicNode } from "@/features/gamification/queries";
import { scrollQueries } from "@/features/scrolls/queries";
import type { ScrollItem } from "@/features/scrolls/schemas";
import { missingForNext, topicProgress } from "@/features/tree/progress";
import { CATEGORY_ICON, categoryColor, LEVEL_TITLE, topicStatus } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

interface TopicDetailProps {
  topic: TopicNode;
  description: string;
  owner: { id: number; username: string; fullName: string };
  isOwn: boolean;
}

function Meter({ label, current, needed, color }: { label: string; current: number; needed: number; color: string }) {
  const percent = needed <= 0 ? 100 : Math.min(100, Math.round((current / needed) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[13px] font-semibold text-[#4B5563]">
        <span>{label}</span>
        <span>
          {Math.min(current, needed)} / {needed}
        </span>
      </div>
      <div className="w-full h-2 bg-base neu-pressed rounded-full overflow-hidden p-0.5">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

function ScrollRows({ scrolls, empty }: { scrolls?: ScrollItem[]; empty: string }) {
  if (!scrolls) return <Skeleton className="h-14 rounded-[14px]" />;
  if (scrolls.length === 0) return <p className="text-[14px] text-[#9CA3AF]">{empty}</p>;
  return (
    <ul className="space-y-2">
      {scrolls.map((s) => (
        <li key={s.id}>
          <Link
            to={`/dashboard/scrolls/${s.slug}`}
            className="flex items-center justify-between gap-3 bg-base neu-raised-sm neu-hover rounded-[14px] px-3.5 py-2.5 transition-all"
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-[#1F2937] truncate">{s.title}</span>
              <span className="block text-[13px] text-[#6B7280] truncate">by {s.author.fullName}</span>
            </span>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-[#6B7280] shrink-0">
              <Heart size={15} className="text-[#EF4444]" fill="currentColor" />
              {formatNumber(s.likesCount)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Everything the backend knows about one topic for one person: progress to the next level, their scrolls there, what to read, a bounty.
export default function TopicDetail({ topic, description, owner, isOwn }: TopicDetailProps) {
  const status = topicStatus(topic.level);
  const color = status === "locked" ? "#9CA3AF" : categoryColor(topic.slug);
  const Icon = CATEGORY_ICON[topic.slug] ?? BookOpen;
  const progress = topicProgress(topic);
  const missing = missingForNext(topic);
  const next = topic.nextLevel;
  const firstName = owner.fullName.split(" ")[0];

  const written = useQuery(scrollQueries.list({ author: owner.username, category: topic.id, sort: "-created_at", limit: 3 }));
  const recent = useQuery(scrollQueries.list({ category: topic.id, sort: "-created_at", limit: 3 }));
  const { data: challenges } = useQuery(challengesQuery);
  const bounty = challenges?.find((c) => c.categoryId === topic.id && c.status === "active" && c.isPublished);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-[14px] bg-base neu-raised-sm flex items-center justify-center shrink-0" style={{ color }}>
          <Icon size={26} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[20px] leading-snug font-extrabold text-[#1F2937] flex items-center gap-1.5">
            {topic.name}
            {status === "mastered" && <Star size={18} className="text-[#F59E0B]" fill="currentColor" aria-label="Mastered" />}
          </h2>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[#6B7280]">
            {status === "locked" ? (
              <>
                <Lock size={14} aria-hidden /> Locked · not started
              </>
            ) : (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-extrabold text-white" style={{ background: color }}>
                  Lv. {topic.level}
                </span>
                {LEVEL_TITLE[topic.level]}
              </>
            )}
          </p>
        </div>
      </div>

      {description && <p className="text-[14px] leading-relaxed text-[#6B7280]">{description}</p>}

      <section className="bg-base neu-pressed rounded-[18px] p-4 space-y-3.5" aria-label="Progress to the next level">
        {next ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-extrabold uppercase tracking-wider text-[#1F2937]">
                Next: Lv. {next.level} {LEVEL_TITLE[next.level]}
              </h3>
              <span className="text-[14px] font-bold" style={{ color }}>
                {progress.overall}%
              </span>
            </div>
            <Meter label="Topic XP" current={topic.xpInTopic} needed={next.xp} color={color} />
            <Meter label="Scrolls written" current={topic.scrollsContributed} needed={next.contributed} color={color} />
            <Meter label="Scrolls read" current={topic.scrollsRead} needed={next.read} color={color} />
            <p className="text-[14px] leading-relaxed text-[#4B5563]">
              {missing.length > 0
                ? `${isOwn ? "To level up" : `${firstName} needs`}: ${missing.join(", ")}.`
                : "All requirements are met. The level is awarded on the next scroll published or read."}{" "}
              <span className="font-bold text-[#1F2937]">+{next.bonusXp} XP bonus.</span>
            </p>
          </>
        ) : (
          <p className="text-[15px] font-bold text-[#10B981]">Mastered — the maximum level in this topic.</p>
        )}
      </section>

      {topic.readableScrolls > 0 && (
        <section className="space-y-2" aria-label="Topic coverage">
          <div className="flex justify-between text-[14px] font-semibold text-[#4B5563]">
            <span>Topic coverage</span>
            <span>
              Read {Math.min(topic.scrollsRead, topic.readableScrolls)} of {topic.readableScrolls} scrolls
            </span>
          </div>
          <div className="w-full h-2.5 bg-base neu-pressed rounded-full overflow-hidden p-0.5">
            <div className="h-full rounded-full" style={{ width: `${Math.round((Math.min(topic.scrollsRead, topic.readableScrolls) / topic.readableScrolls) * 100)}%`, background: color }} />
          </div>
        </section>
      )}

      <section className="space-y-2.5" aria-label="Scrolls written in this topic">
        <h3 className="text-[14px] font-extrabold uppercase tracking-wider text-[#1F2937]">{isOwn ? "Scrolls you wrote" : `Scrolls by ${firstName}`}</h3>
        <ScrollRows scrolls={written.data?.items} empty="No published scrolls here yet." />
      </section>

      <section className="space-y-2.5" aria-label="Recent scrolls in this topic">
        <h3 className="text-[14px] font-extrabold uppercase tracking-wider text-[#1F2937]">Recent scrolls</h3>
        <ScrollRows scrolls={recent.data?.items} empty="Nothing published in this topic yet." />
      </section>

      {bounty && (
        <Link to={`/dashboard/challenges?challenge=${bounty.id}`} className="block bg-base neu-raised-sm neu-hover rounded-[16px] p-4 space-y-1.5 transition-all">
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wider text-[#F59E0B]">
            <Swords size={16} />
            Challenge in this topic
          </span>
          <span className="block text-[15px] font-bold text-[#1F2937]">{bounty.title}</span>
          <span className="block text-[13px] font-semibold text-[#6B7280]">
            +{formatNumber(bounty.xpReward)} XP · ends in <Countdown to={bounty.endDate} />
          </span>
        </Link>
      )}

      <div className="flex flex-col gap-2.5 pt-1">
        {isOwn && (
          <Link
            to={`/dashboard/scrolls/new?category=${topic.id}`}
            className="bg-[#3B82F6] text-white px-4 py-2.5 rounded-[14px] text-[15px] font-bold neu-raised-sm hover:bg-[#2563EB] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <PenLine size={18} />
            Write a scroll in this topic
          </Link>
        )}
        <Link
          to={`/dashboard/scrolls?category=${topic.id}`}
          className="bg-base text-[#1F2937] px-4 py-2.5 rounded-[14px] text-[15px] font-bold neu-raised-sm neu-hover transition-all text-center"
        >
          Explore Category{topic.publishedScrolls > 0 ? ` (${topic.publishedScrolls})` : ""}
        </Link>
      </div>
    </div>
  );
}
