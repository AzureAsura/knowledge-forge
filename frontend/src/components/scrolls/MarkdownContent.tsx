import { isValidElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const textOf = (node: ReactNode): string =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : isValidElement<{ children?: ReactNode }>(node)
        ? textOf(node.props.children)
        : "";

// react-markdown renders a fenced block as <pre><code class="language-x">: handled here as one unit.
function CodeBlock({ children }: { children?: ReactNode }) {
  const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children : null;
  const language = /language-([\w-]+)/.exec(code?.props.className ?? "")?.[1] ?? "text";

  const copy = () =>
    navigator.clipboard.writeText(textOf(code?.props.children)).then(
      () => toast.success("Code copied"),
      () => toast.error("Couldn't copy the code"),
    );

  return (
    <div className={`rounded-[20px] overflow-hidden bg-base neu-pressed`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span className="font-mono text-xs font-bold text-[#3B82F6] ml-2">{language}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className={`px-3 py-1 bg-base neu-raised-sm neu-hover rounded-[10px] text-[11px] font-bold text-[#1F2937] flex items-center gap-1 transition-all`}
        >
          <Copy size={13} />
          <span>Copy</span>
        </button>
      </div>
      <div className="p-5 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed text-[#1F2937]">
        <pre>
          <code className={code?.props.className}>{code?.props.children}</code>
        </pre>
      </div>
    </div>
  );
}

const headingH2 = "text-[24px] sm:text-[28px] leading-tight text-[#1F2937] font-extrabold tracking-tight";

const components: Components = {
  // The page title is the only h1; headings in the body start at h2.
  h1: ({ children }) => <h2 className={headingH2}>{children}</h2>,
  h2: ({ children }) => <h2 className={headingH2}>{children}</h2>,
  h3: ({ children }) => (
    <h3 className="text-[18px] sm:text-[20px] leading-snug text-[#1F2937] font-extrabold">{children}</h3>
  ),
  h4: ({ children }) => <h4 className="text-[17px] leading-snug text-[#1F2937] font-extrabold">{children}</h4>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#3B82F6] font-semibold hover:underline"
    >
      {children}
    </a>
  ),
  pre: CodeBlock,
  // Block code never reaches here (CodeBlock renders its own <code>), so this is inline code only.
  code: ({ children }) => (
    <code className={`px-2 py-0.5 bg-base neu-pressed text-[#3B82F6] rounded-[8px] font-mono text-xs font-semibold`}>
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className={`p-5 bg-base neu-pressed rounded-[18px] border-l-4 border-l-[#3B82F6] text-[15px] sm:text-[16px] leading-relaxed italic text-[#1F2937]`}
    >
      {children}
    </blockquote>
  ),
  ul: ({ className, children }) => (
    <ul className={`${className?.includes("contains-task-list") ? "list-none" : "list-disc pl-6"} space-y-1.5`}>
      {children}
    </ul>
  ),
  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1.5">{children}</ol>,
  input: ({ checked, disabled, type }) => (
    <input type={type} checked={checked} disabled={disabled} readOnly className="accent-[#3B82F6] mr-2 align-middle" />
  ),
  table: ({ children }) => (
    <div className={`bg-base neu-pressed rounded-[20px] overflow-x-auto p-1`}>
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-[#E5E7EB] text-[13px] text-[#1F2937] font-extrabold">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="text-[12px] sm:text-[13px] divide-y divide-[#E5E7EB]/60">{children}</tbody>
  ),
  th: ({ children }) => <th className="p-3.5">{children}</th>,
  td: ({ children }) => <td className="p-3.5">{children}</td>,
  hr: () => <hr className="border-[#E5E7EB]" />,
  img: ({ src, alt }) =>
    typeof src === "string" && src.startsWith("https://") ? (
      <img src={src} alt={alt ?? ""} loading="lazy" className="rounded-[20px] max-w-full" />
    ) : null,
};

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-[16px] sm:text-[17px] leading-relaxed text-[#4B5563]">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
