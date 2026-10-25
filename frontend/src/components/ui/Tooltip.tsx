import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
}

const ALIGN = { left: "left-0", right: "right-0", center: "left-1/2 -translate-x-1/2" };

export default function Tooltip({ content, children, align = "center" }: TooltipProps) {
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full mt-2 ${ALIGN[align]} z-30 w-max max-w-[240px] rounded-[14px] bg-[#F0F2F5] neu-raised-sm px-3.5 py-2.5 text-[12px] text-[#1F2937] opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0`}
      >
        {content}
      </span>
    </span>
  );
}
