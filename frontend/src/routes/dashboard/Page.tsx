import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useMe } from "@/features/auth/queries";
import Mentoring from "@/components/analytics/Mentoring";
import MyActivity from "@/components/analytics/MyActivity";
import Platform from "@/components/analytics/Platform";
import RangeTabs from "@/components/analytics/RangeTabs";
import { parseRange, type Range } from "@/features/analytics/queries";

// Lazy: keeps the animation library out of the main bundle.
const ChallengeSpotlight = lazy(() => import("@/components/challenges/ChallengeSpotlight"));

const VIEWS = {
  activity: { label: "My Activity", hint: "How your scrolls and profile are doing" },
  mentoring: { label: "Mentoring", hint: "Your apprentices and the review queue" },
  platform: { label: "Platform", hint: "How KnoFo is used across the team" },
} as const;
type View = keyof typeof VIEWS;

// Each role sees its own set of views; the first one is the default.
const VIEWS_BY_ROLE: Record<string, View[]> = {
  scholar: ["activity"],
  senior: ["activity", "mentoring"],
  admin: ["platform", "mentoring", "activity"],
};

export default function DashboardPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const range = parseRange(params.get("range"));
  const available = VIEWS_BY_ROLE[me.role];
  const view = available.find((v) => v === params.get("view")) ?? available[0];

  // The URL is the single source of truth; only non-default values are written back.
  const update = (patch: { range?: Range; view?: View }) => {
    const next = { range, view, ...patch };
    const out = new URLSearchParams();
    if (next.range !== "month") out.set("range", next.range);
    if (next.view !== available[0]) out.set("view", next.view);
    setParams(out, { replace: true });
  };

  return (
    <div className="w-full space-y-6 bg-base text-[#4B5563] font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[28px] leading-tight font-extrabold text-[#1F2937]">Analytics</h1>
          <p className="text-[12px] sm:text-[13px] text-[#6B7280] mt-0.5">{VIEWS[view].hint}</p>
        </div>
        <RangeTabs value={range} onChange={(next) => update({ range: next })} />
      </header>

      {available.length > 1 && (
        <div role="tablist" aria-label="Dashboard views" className="flex items-center gap-2 sm:gap-3 border-b border-[#E5E7EB] pb-3 overflow-x-auto scrollbar-none">
          {available.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === view}
              onClick={() => update({ view: v })}
              className={`px-4 py-2.5 rounded-full text-[13px] sm:text-[14px] shrink-0 whitespace-nowrap transition-all duration-200 ${
                v === view ? "bg-[#3B82F6] text-white neu-raised-sm font-bold" : "bg-base text-[#4B5563] neu-raised-sm neu-hover font-medium"
              }`}
            >
              {VIEWS[v].label}
            </button>
          ))}
        </div>
      )}

      {view === "activity" && <MyActivity range={range} />}
      {view === "mentoring" && <Mentoring range={range} />}
      {view === "platform" && <Platform range={range} />}

      <Suspense fallback={null}>
        <ChallengeSpotlight />
      </Suspense>
    </div>
  );
}
