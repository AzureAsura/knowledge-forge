import type { Streak } from "@/features/users/schemas";

const LABEL = { daily_login: ["Daily login", "day"], weekly_scroll: ["Weekly scroll", "week"], daily_read: ["Daily reading", "day"] } as const;
const WARNING = {
  daily_login: "Log in today to keep your login streak",
  weekly_scroll: "Publish a scroll before Sunday to keep your weekly streak",
  daily_read: "1 day left to keep your reading streak",
} as const;

// `warn` is only passed for the viewer's own streaks.
export default function StreakTip({ streaks, warn }: { streaks: Streak[]; warn?: boolean }) {
  const risky = warn ? streaks.filter((s) => s.atRisk) : [];
  return (
    <span className="block space-y-1">
      {streaks.map((s) => (
        <span key={s.type} className="flex justify-between gap-4">
          <span className="text-[#6B7280]">{LABEL[s.type][0]}</span>
          <span className="font-bold">
            {s.count} {LABEL[s.type][1]}{s.count === 1 ? "" : "s"}
          </span>
        </span>
      ))}
      {risky.map((s) => (
        <span key={s.type} className="block pt-1 font-bold text-[#D97706]">
          {WARNING[s.type]}
        </span>
      ))}
    </span>
  );
}
