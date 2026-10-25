import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BookOpen, Lock, Star } from "lucide-react";
import { CATEGORY_ICON, LEVEL_TITLE } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { GroupFlowNode, HubFlowNode, TopicFlowNode } from "@/features/tree/layout";
import { unlockHint } from "@/features/tree/progress";

// Edges run centre to centre and are hidden behind the opaque cards, so the handles sit in the middle and are invisible.
const CENTER = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 } as const;
const Anchors = () => (
  <>
    <Handle type="target" position={Position.Top} isConnectable={false} style={CENTER} />
    <Handle type="source" position={Position.Top} isConnectable={false} style={CENTER} />
  </>
);

const LOCKED = "#9CA3AF";
// Page load: nodes fade in one after another, 100 ms apart.
const stagger = (order: number) => ({ animationDelay: `${order * 100}ms` });

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2.5 bg-base neu-pressed rounded-full overflow-hidden p-0.5">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

export function HubNode({ data }: NodeProps<HubFlowNode>) {
  return (
    <div className="tree-fade-in w-[330px] bg-base neu-raised rounded-[26px] p-5 text-center space-y-2" style={stagger(data.order)}>
      <Anchors />
      <div className="w-16 h-16 mx-auto rounded-[20px] bg-base neu-raised-sm p-1.5">
        <img src="/knofo-logo.png" alt="" width={330} height={350} className="w-full h-full object-contain" />
      </div>
      <h3 className="text-[20px] font-extrabold uppercase tracking-tight text-[#1F2937]">{data.center.name}</h3>
      <p className="text-[14px] font-semibold text-[#6B7280]">
        Total level <span className="text-[#3B82F6] font-extrabold">{data.center.totalLevel}</span> · {formatNumber(data.center.totalXp)} XP
      </p>
    </div>
  );
}

export function GroupNode({ data }: NodeProps<GroupFlowNode>) {
  const color = data.status === "locked" ? LOCKED : data.color;
  return (
    <div className={`tree-fade-in transition-opacity duration-200 ${data.dimmed ? "opacity-30" : ""}`} style={stagger(data.order)}>
      <Anchors />
      <button
        type="button"
        onClick={() => data.onFocus(data.childIds)}
        aria-label={`${data.name}, ${data.percent} percent across ${data.topicCount} topics. Focus on its topics`}
        className="w-[250px] bg-base neu-raised-sm neu-hover rounded-[18px] p-4 text-left space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-extrabold text-[#1F2937] truncate">{data.name}</span>
          <span className="text-[13px] font-bold shrink-0" style={{ color }}>
            {data.percent}%
          </span>
        </div>
        <Bar percent={data.percent} color={color} />
      </button>
    </div>
  );
}

// locked: grey with a lock · unlocked: category colour with a level badge · mastered: colour, glow and a star.
export function TopicNode({ data }: NodeProps<TopicFlowNode>) {
  const { topic, status, percent, selected, dimmed, celebrate } = data;
  const color = status === "locked" ? LOCKED : data.color;
  const Icon = CATEGORY_ICON[topic.slug] ?? BookOpen;
  const surface = status === "locked" ? "neu-pressed border border-dashed border-[#9CA3AF]" : "neu-raised";
  const effect = celebrate === "unlock" ? "tree-unlock" : celebrate === "levelup" ? "tree-levelup" : "";

  return (
    <div className={`tree-fade-in transition-opacity duration-200 ${dimmed ? "opacity-30" : ""}`} style={stagger(data.order)}>
      <Anchors />
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => data.onSelect(topic.slug)}
        aria-label={`${topic.name}, ${status === "locked" ? "locked, not started" : `level ${topic.level} ${LEVEL_TITLE[topic.level]}`}, ${percent} percent to the next level`}
        className={`${effect} w-[300px] bg-base ${surface} neu-hover rounded-[20px] p-4 text-left space-y-3.5 transition-all ${selected ? "ring-2 ring-[#3B82F6]" : ""}`}
        style={{
          ...({ "--node-color": color } as object),
          ...(effect ? { animationDelay: `${data.order * 100 + 400}ms` } : {}),
          ...(status === "mastered" ? { boxShadow: `0 0 0 2px ${color}, 0 0 26px 4px ${color}66` } : {}),
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-base neu-raised-sm flex items-center justify-center shrink-0" style={{ color }}>
            <Icon size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[16px] font-extrabold text-[#1F2937] truncate">{topic.name}</h4>
            <p className="text-[13px] font-medium text-[#6B7280] truncate">{status === "locked" ? "Not started" : LEVEL_TITLE[topic.level]}</p>
          </div>
          {status === "locked" ? (
            <Lock size={18} className="text-[#9CA3AF] shrink-0" aria-hidden />
          ) : (
            <span className="flex items-center gap-1 text-[13px] font-extrabold px-2.5 py-1 rounded-full text-white shrink-0" style={{ background: color }}>
              {status === "mastered" && <Star size={13} fill="currentColor" aria-hidden />}
              Lv. {topic.level}
            </span>
          )}
        </div>

        {data.description && <p className="text-[13px] leading-snug text-[#6B7280] line-clamp-1">{data.description}</p>}

        <div className="space-y-1.5">
          <Bar percent={percent} color={color} />
          <p className="flex justify-between text-[13px] font-semibold text-[#6B7280]">
            <span>{status === "mastered" ? "Max level" : `${percent}% to next`}</span>
            <span>{topic.scrollsContributed} scrolls</span>
          </p>
          {status === "locked" && <p className="text-[13px] font-semibold text-[#6B7280]">{unlockHint(topic)}</p>}
        </div>
      </button>
    </div>
  );
}
