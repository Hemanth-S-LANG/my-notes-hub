import { useEffect, useRef } from "react";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type TextBlock, FONT_OPTIONS, FONT_SIZES } from "@/lib/notes-store";

interface Props {
  block: TextBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (b: TextBlock) => void;
  onDelete: () => void;
}

export function TextBlockView({ block, isSelected, onSelect, onChange, onDelete }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== block.html) {
      ref.current.innerHTML = block.html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    if (ref.current) onChange({ ...block, html: ref.current.innerHTML });
  };

  return (
    <div onMouseDown={onSelect}>
      {isSelected && (
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 shadow-sm">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec("underline")} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec("insertUnorderedList")} title="Bullet list"><List className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></Button>
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
        onInput={(e) => onChange({ ...block, html: (e.target as HTMLDivElement).innerHTML })}
      />
    </div>
  );
}
