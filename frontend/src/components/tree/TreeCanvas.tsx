import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useRef } from "react";
import { Background, BackgroundVariant, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow, type Edge } from "@xyflow/react";
import { Lock, Maximize, Maximize2, Minus, Plus, Star } from "lucide-react";
import { GroupNode, HubNode, TopicNode } from "@/components/tree/TreeNodes";
import type { Category } from "@/features/categories/queries";
import type { TreeData } from "@/features/gamification/queries";
import { buildTreeLayout, type Celebration, type Filter, type Status, type TreeFlowNode } from "@/features/tree/layout";
import { STATUS_STYLE } from "@/lib/constants";
import { useMediaQuery } from "@/lib/media";

const nodeTypes = { hub: HubNode, group: GroupNode, topic: TopicNode };

interface TreeCanvasProps {
  data: TreeData;
  categories: Category[];
  filter: Filter;
  selected?: string;
  celebrations: Map<string, Celebration>;
  onSelect: (slug?: string) => void;
}

const tool = "w-11 h-11 bg-base neu-raised-sm neu-hover rounded-[10px] text-[#4B5563] hover:text-[#3B82F6] flex items-center justify-center transition-all";

function Canvas({ data, categories, filter, selected, celebrations, onSelect }: TreeCanvasProps) {
  const flow = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const duration = reduceMotion ? 0 : 400;

  const base = useMemo(() => buildTreeLayout(data, categories), [data, categories]);
  const focus = useCallback((ids: string[]) => void flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.4, duration }), [flow, duration]);

  // Layer selection, filter dimming and handlers on top of the fixed layout.
  const { nodes, edges } = useMemo(() => {
    const matches = (status: Status) => filter === "all" || status === filter;
    const topicStatus = new Map(base.nodes.flatMap((n) => (n.type === "topic" ? [[n.id, n.data.status] as const] : [])));

    const nodes: TreeFlowNode[] = base.nodes.map((n) => {
      if (n.type === "topic") return { ...n, data: { ...n.data, dimmed: !matches(n.data.status), selected: n.data.topic.slug === selected, celebrate: celebrations.get(n.data.topic.slug), onSelect } };
      if (n.type === "group") return { ...n, data: { ...n.data, dimmed: !n.data.childIds.some((id) => matches(topicStatus.get(id)!)), onFocus: focus } };
      return n;
    });
    const dimmed = new Set(nodes.flatMap((n) => (n.type !== "hub" && n.data.dimmed ? [n.id] : [])));

    const edges: Edge[] = base.edges.map((e) => {
      const status = e.data!.status as Status;
      return {
        ...e,
        animated: status !== "locked",
        style: {
          stroke: status === "locked" ? STATUS_STYLE.locked.color : (e.data!.color as string),
          strokeWidth: status === "mastered" ? 3 : 2,
          strokeDasharray: status === "locked" ? "6 6" : undefined,
          opacity: dimmed.has(e.target) ? 0.2 : 1,
        },
      };
    });
    return { nodes, edges };
  }, [base, filter, selected, celebrations, onSelect, focus]);

  const toggleFullscreen = () => (document.fullscreenElement ? void document.exitFullscreen() : void wrapper.current?.requestFullscreen());

  return (
    <div ref={wrapper} className="relative h-[72vh] min-h-[520px] rounded-[24px] overflow-hidden bg-base neu-pressed">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        attributionPosition="top-right"
        onPaneClick={() => onSelect(undefined)}
        aria-label="Topic mastery tree"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#CBD5E1" />
        <MiniMap
          pannable
          zoomable
          className="!hidden md:!block !bg-base !rounded-[12px]"
          maskColor="rgba(59,130,246,0.08)"
          nodeColor={(n) => (n.type === "hub" ? "#3B82F6" : (n.data as { status: Status; color: string }).status === "locked" ? STATUS_STYLE.locked.color : (n.data as { color: string }).color)}
        />

        <Panel position="bottom-left" className="flex items-center gap-1.5 bg-base neu-raised rounded-[14px] p-1.5">
          <button type="button" className={tool} aria-label="Zoom in" title="Zoom in" onClick={() => void flow.zoomIn({ duration })}>
            <Plus size={18} />
          </button>
          <button type="button" className={tool} aria-label="Zoom out" title="Zoom out" onClick={() => void flow.zoomOut({ duration })}>
            <Minus size={18} />
          </button>
          <button type="button" className={tool} aria-label="Fit to screen" title="Fit to screen" onClick={() => void flow.fitView({ padding: 0.12, duration })}>
            <Maximize size={18} />
          </button>
          <button type="button" className={tool} aria-label="Toggle fullscreen" title="Fullscreen" onClick={toggleFullscreen}>
            <Maximize2 size={18} />
          </button>
        </Panel>

        <Panel position="bottom-center" className="hidden lg:flex items-center gap-4 bg-base neu-raised rounded-full px-4 py-2 text-[13px] font-bold text-[#4B5563]">
          <span className="flex items-center gap-1.5">
            <Lock size={14} className="text-[#9CA3AF]" />
            Locked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#10B981]" />
            Unlocked (category colour)
          </span>
          <span className="flex items-center gap-1.5">
            <Star size={14} className="text-[#F59E0B]" fill="currentColor" />
            Mastered
          </span>
          <span className="text-[#9CA3AF] font-medium">Drag to pan · scroll to zoom</span>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function TreeCanvas(props: TreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
