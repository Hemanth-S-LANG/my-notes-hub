import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type TextBlock, FONT_OPTIONS, FONT_SIZES } from "@/lib/notes-store";
import { cn } from "@/lib/utils";

interface Props {
  block: TextBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (b: TextBlock) => void;
  onDelete: () => void;
}

const FORMAT_COMMANDS = ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"] as const;
type FormatCmd = typeof FORMAT_COMMANDS[number];

export function TextBlockView({ block, isSelected, onSelect, onChange, onDelete }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<FormatCmd, boolean>>({
    bold: false, italic: false, underline: false, insertUnorderedList: false, insertOrderedList: false,
  });

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== block.html) {
      ref.current.innerHTML = block.html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const refreshActiveFormats = () => {
    const next = {} as Record<FormatCmd, boolean>;
    for (const cmd of FORMAT_COMMANDS) {
      try { next[cmd] = document.queryCommandState(cmd); } catch { next[cmd] = false; }
    }
    setActiveFormats(next);
  };

  const exec = (cmd: FormatCmd) => {
    // Make sure the editable has focus & selection before running the command
    ref.current?.focus();
    document.execCommand(cmd, false);
    if (ref.current) onChange({ ...block, html: ref.current.innerHTML });
    refreshActiveFormats();
  };

  // Prevent toolbar mousedown from stealing focus / collapsing selection
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div onMouseDown={onSelect}>
      {isSelected && (
        <div
          className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 shadow-sm"
          onMouseDown={preventBlur}
        >
          <Select value={block.fontFamily} onValueChange={(v) => onChange({ ...block, fontFamily: v })}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <span style={{ fontFamily: f.value }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(block.fontSize)} onValueChange={(v) => onChange({ ...block, fontSize: Number(v) })}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}px</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="mx-1 h-5 w-px bg-border" />
          <FormatBtn active={activeFormats.bold} onClick={() => exec("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></FormatBtn>
          <FormatBtn active={activeFormats.italic} onClick={() => exec("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></FormatBtn>
          <FormatBtn active={activeFormats.underline} onClick={() => exec("underline")} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></FormatBtn>
          <FormatBtn active={activeFormats.insertUnorderedList} onClick={() => exec("insertUnorderedList")} title="Bullet list"><List className="h-3.5 w-3.5" /></FormatBtn>
          <FormatBtn active={activeFormats.insertOrderedList} onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></FormatBtn>
          <div className="ml-auto" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete block">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write something…"
        className="block-text outline-none"
        style={{ fontFamily: block.fontFamily, fontSize: `${block.fontSize}px`, lineHeight: 1.6, minHeight: "1.6em" }}
        onInput={(e) => { onChange({ ...block, html: (e.target as HTMLDivElement).innerHTML }); refreshActiveFormats(); }}
        onKeyUp={refreshActiveFormats}
        onMouseUp={refreshActiveFormats}
        onFocus={refreshActiveFormats}
      />
    </div>
  );
}

function FormatBtn({
  active, onClick, title, children,
}: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 transition-colors",
        active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
      )}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}
