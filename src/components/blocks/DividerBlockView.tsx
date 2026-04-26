import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DividerBlock } from "@/lib/notes-store";

interface Props {
  block: DividerBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (b: DividerBlock) => void;
  onDelete: () => void;
}

export function DividerBlockView({ block, isSelected, onSelect, onChange, onDelete }: Props) {
  return (
    <div onMouseDown={onSelect} className="py-2">
      {isSelected && (
        <div className="mb-2 flex items-center gap-2">
          <Select value={block.style} onValueChange={(v) => onChange({ ...block, style: v as DividerBlock["style"] })}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete divider">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}
      <hr style={{ borderTopStyle: block.style, borderTopWidth: 2, borderColor: "var(--border)" }} />
    </div>
  );
}
