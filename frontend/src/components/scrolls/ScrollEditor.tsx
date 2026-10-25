import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import {
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Terminal,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/errors";
import { MAX_IMAGE_BYTES, uploadEditorImage } from "@/features/scrolls/upload";

interface ScrollEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
}

const group = "flex items-center gap-1 bg-base p-1 rounded-[14px] neu-pressed shrink-0";
const square = "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[10px] transition-all";
const on = "bg-[#3B82F6] text-white neu-raised-sm";
const off = "text-[#6B7280] hover:text-[#1F2937]";
const history = "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-base neu-raised-sm neu-hover rounded-[10px] text-[#6B7280] transition-all disabled:opacity-40";

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  const setLink = () => {
    const href = window.prompt("Link URL (https://…)", editor.getAttributes("link").href ?? "");
    if (href === null) return;
    if (href === "") chain().extendMarkRange("link").unsetLink().run();
    else if (/^https?:\/\//i.test(href)) chain().extendMarkRange("link").setLink({ href }).run();
    else toast.error("Links must start with http:// or https://");
  };

  const insertImage = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) return void toast.error("Images must be 4 MB or smaller");
    try {
      chain().setImage({ src: await uploadEditorImage(file) }).run();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const formatting = [
    { title: "Bold (⌘B)", label: "B", active: state.bold, run: () => chain().toggleBold().run() },
    { title: "Italic (⌘I)", label: "I", italic: true, active: state.italic, run: () => chain().toggleItalic().run() },
    { title: "Strikethrough", icon: Strikethrough, active: state.strike, run: () => chain().toggleStrike().run() },
    { title: "Inline Code", icon: Code, active: state.code, run: () => chain().toggleCode().run() },
  ];
  const headings = [
    { level: 1, active: state.h1 },
    { level: 2, active: state.h2 },
    { level: 3, active: state.h3 },
  ] as const;
  const blocks = [
    { title: "Bullet List", icon: List, active: state.bullet, run: () => chain().toggleBulletList().run() },
    { title: "Ordered List", icon: ListOrdered, active: state.ordered, run: () => chain().toggleOrderedList().run() },
    { title: "Blockquote", icon: Quote, active: state.quote, run: () => chain().toggleBlockquote().run() },
    { title: "Code Block", icon: Terminal, active: state.codeBlock, run: () => chain().toggleCodeBlock().run() },
  ];
  const media = [
    { title: "Insert Link", icon: LinkIcon, active: state.link, run: setLink },
    { title: "Insert Table", icon: TableIcon, run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="p-2.5 border-b border-[#E5E7EB] flex items-center gap-2 overflow-x-auto scrollbar-none select-none"
    >
      <div className={group}>
        {formatting.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            aria-label={item.title}
            aria-pressed={item.active}
            onClick={item.run}
            className={`${square} ${item.active ? `${on} font-bold` : off} ${item.italic ? "italic" : ""}`}
          >
            {item.label ? <span className="text-xs sm:text-sm font-extrabold">{item.label}</span> : item.icon && <item.icon size={15} />}
          </button>
        ))}
      </div>

      <div className={group}>
        {headings.map(({ level, active }) => (
          <button
            key={level}
            type="button"
            title={`Heading ${level}`}
            aria-label={`Heading ${level}`}
            aria-pressed={active}
            onClick={() => chain().toggleHeading({ level }).run()}
            className={`px-2.5 h-7 sm:h-8 text-[11px] sm:text-[12px] font-bold rounded-[10px] transition-all ${active ? on : off}`}
          >
            H{level}
          </button>
        ))}
      </div>

      <div className={group}>
        {blocks.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            aria-label={item.title}
            aria-pressed={item.active}
            onClick={item.run}
            className={`${square} ${item.active ? on : off}`}
          >
            <item.icon size={15} />
          </button>
        ))}
      </div>

      <div className={group}>
        {media.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            aria-label={item.title}
            aria-pressed={item.active}
            onClick={item.run}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#6B7280] hover:text-[#3B82F6] rounded-[10px] transition-all font-bold text-xs"
          >
            <item.icon size={15} />
          </button>
        ))}
        <label
          title="Insert Image"
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#6B7280] hover:text-[#3B82F6] rounded-[10px] transition-all cursor-pointer focus-within:ring-2 focus-within:ring-[#3B82F6]"
        >
          <ImageIcon size={15} />
          <span className="sr-only">Insert image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              void insertImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <button type="button" title="Undo" aria-label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()} className={history}>
          <Undo2 size={15} />
        </button>
        <button type="button" title="Redo" aria-label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()} className={history}>
          <Redo2 size={15} />
        </button>
      </div>
    </div>
  );
}

// Lazy-loaded by ScrollForm so TipTap stays out of the main bundle.
export default function ScrollEditor({ initialContent, onChange }: ScrollEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Markdown,
      Image,
      Table,
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    contentType: "markdown",
    editorProps: { attributes: { "aria-label": "Scroll body", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: e }) => onChange(e.getMarkdown()),
  });

  return (
    <>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="scroll-editor p-5 sm:p-7 md:p-8 min-h-[380px] sm:min-h-[420px]" />
    </>
  );
}
