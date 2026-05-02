import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Type, Image as ImageIcon, Minus, Paperclip, Download, Trash2, GripVertical, FileText, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Note, Block, Attachment, fileToDataUrl, attachmentKind, uid,
  newTextBlock, newImageBlock, newDividerBlock,
} from "@/lib/notes-store";
import { uploadAttachment } from "@/lib/cloud-store";
import { TextBlockView } from "./blocks/TextBlockView";
import { ImageBlockView } from "./blocks/ImageBlockView";
import { DividerBlockView } from "./blocks/DividerBlockView";
import { toast } from "sonner";

interface Props {
  note: Note;
  onChange: (n: Note) => void;
  onDelete: (id: string) => void;
  userId?: string | null;
}

// Migrate legacy notes (HTML content -> single text block)
function getBlocks(note: Note): Block[] {
  if (note.blocks && note.blocks.length) return note.blocks;
  if (note.content) return [newTextBlock(note.content)];
  return [newTextBlock("")];
}

export function NoteEditor({ note, onChange, onDelete, userId }: Props) {
  const [title, setTitle] = useState(note.title);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const blocks = useMemo(() => getBlocks(note), [note]);

  useEffect(() => {
    setTitle(note.title);
    setSelectedId(null);
  }, [note.id]);

  const update = (patch: Partial<Note>) => {
    onChange({ ...note, ...patch, updatedAt: Date.now() });
  };

  const setBlocks = (next: Block[]) => update({ blocks: next });

  const updateBlock = (id: string, b: Block) =>
    setBlocks(blocks.map((x) => (x.id === id ? b : x)));

  const deleteBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next.length ? next : [newTextBlock("")]);
  };

  const addBlock = (b: Block, afterId?: string) => {
    if (!afterId) { setBlocks([...blocks, b]); return; }
    const idx = blocks.findIndex((x) => x.id === afterId);
    const next = [...blocks];
    next.splice(idx + 1, 0, b);
    setBlocks(next);
    setSelectedId(b.id);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b.id === active.id);
    const newIdx = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, oldIdx, newIdx));
  };

  const onAttachFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const newAtts: Attachment[] = [];
    for (const file of Array.from(files)) {
      try {
        const kind = attachmentKind(file.type);

        // Use cloud storage when a user is signed in
        if (userId) {
          const { path, signedUrl } = await uploadAttachment(userId, file);
          if (kind === "image") {
            const img = new Image();
            img.src = signedUrl;
            await new Promise((r) => (img.onload = r));
            const maxW = 520;
            const w = Math.min(img.naturalWidth, maxW);
            const h = (img.naturalHeight * w) / img.naturalWidth;
            const block = { ...newImageBlock(signedUrl, file.name, w, h), storagePath: path };
            addBlock(block, selectedId ?? blocks[blocks.length - 1]?.id);
            continue;
          }
          newAtts.push({
            id: uid(), name: file.name, type: file.type, dataUrl: signedUrl,
            size: file.size, kind, storagePath: path,
          });
          continue;
        }

        // Fallback: local data URL (no auth)
        const dataUrl = await fileToDataUrl(file);
        if (kind === "image") {
          const img = new Image();
          img.src = dataUrl;
          await new Promise((r) => (img.onload = r));
          const maxW = 520;
          const w = Math.min(img.naturalWidth, maxW);
          const h = (img.naturalHeight * w) / img.naturalWidth;
          addBlock(newImageBlock(dataUrl, file.name, w, h), selectedId ?? blocks[blocks.length - 1]?.id);
          continue;
        }
        newAtts.push({ id: uid(), name: file.name, type: file.type, dataUrl, size: file.size, kind });
      } catch (e) {
        console.error(e);
        toast.error(`Failed to attach ${file.name}`);
      }
    }
    if (newAtts.length) update({ attachments: [...note.attachments, ...newAtts] });
  };

  const downloadAttachment = (a: Attachment) => {
    const link = document.createElement("a");
    link.href = a.dataUrl; link.download = a.name; link.click();
  };
  const removeAttachment = (id: string) =>
    update({ attachments: note.attachments.filter((a) => a.id !== id) });

  const exportPdf = async () => {
    const node = exportRef.current;
    if (!node) return;
    toast.loading("Generating PDF…", { id: "pdf" });
    try {
      const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let left = imgH; let pos = 10;
      pdf.addImage(imgData, "PNG", 10, pos, imgW, imgH);
      left -= pageH - 20;
      while (left > 0) {
        pdf.addPage();
        pos = 10 - (imgH - left);
        pdf.addImage(imgData, "PNG", 10, pos, imgW, imgH);
        left -= pageH - 20;
      }
      pdf.save(`${note.title || "note"}.pdf`);
      toast.success("PDF downloaded", { id: "pdf" });
    } catch {
      toast.error("PDF export failed", { id: "pdf" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); update({ title: e.target.value }); }}
          placeholder="Untitled note"
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 sm:text-lg"
        />
        <Button variant="outline" size="sm" onClick={exportPdf}>
          <Download className="mr-1.5 h-4 w-4" /> PDF
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} aria-label="Delete note">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Insert toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 sm:px-4">
        <span className="text-xs font-medium text-muted-foreground">Add block:</span>
        <Button variant="outline" size="sm" onClick={() => addBlock(newTextBlock(""), selectedId ?? undefined)}>
          <Type className="mr-1.5 h-3.5 w-3.5" /> Text
        </Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
          <ImageIcon className="h-3.5 w-3.5" /> Image
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { onAttachFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <Button variant="outline" size="sm" onClick={() => addBlock(newDividerBlock(), selectedId ?? undefined)}>
          <Minus className="mr-1.5 h-3.5 w-3.5" /> Divider
        </Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
          <Paperclip className="h-3.5 w-3.5" /> Attach file
          <input type="file" multiple className="hidden"
            onChange={(e) => { onAttachFiles(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      {/* Blocks editor */}
      <div className="flex-1 overflow-auto" onMouseDown={(e) => {
        if (e.target === e.currentTarget) setSelectedId(null);
      }}>
        <div className="mx-auto max-w-3xl px-3 py-4 sm:px-8 sm:py-6 md:px-12 md:py-8">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {blocks.map((b) => (
                  <SortableBlock
                    key={b.id}
                    block={b}
                    isSelected={selectedId === b.id}
                    onSelect={() => setSelectedId(b.id)}
                    onChange={(nb) => updateBlock(b.id, nb)}
                    onDelete={() => deleteBlock(b.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground"
            onClick={() => addBlock(newTextBlock(""))}>
            <Plus className="mr-1.5 h-4 w-4" /> Add block
          </Button>

          {note.attachments.length > 0 && (
            <div className="mt-10 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</h3>
              <div className="grid gap-2">
                {note.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(1)} KB · {a.kind}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => downloadAttachment(a)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeAttachment(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden export */}
      <div className="pointer-events-none fixed -left-[9999px] top-0">
        <div ref={exportRef} style={{ width: 800, padding: 32, background: "#fff", color: "#111" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{title || "Untitled"}</h1>
          {blocks.map((b) => <ExportBlock key={b.id} block={b} />)}
        </div>
      </div>
    </div>
  );
}

function SortableBlock({
  block, isSelected, onSelect, onChange, onDelete,
}: {
  block: Block; isSelected: boolean; onSelect: () => void;
  onChange: (b: Block) => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={`block-wrapper ${isSelected ? "is-selected" : ""}`}>
      <button {...attributes} {...listeners} className="block-handle" aria-label="Drag to reorder">
        <GripVertical className="h-5 w-5" />
      </button>
      {block.type === "text" && (
        <TextBlockView block={block} isSelected={isSelected} onSelect={onSelect}
          onChange={(b) => onChange(b)} onDelete={onDelete} />
      )}
      {block.type === "image" && (
        <ImageBlockView block={block} isSelected={isSelected} onSelect={onSelect}
          onChange={(b) => onChange(b)} onDelete={onDelete} />
      )}
      {block.type === "divider" && (
        <DividerBlockView block={block} isSelected={isSelected} onSelect={onSelect}
          onChange={(b) => onChange(b)} onDelete={onDelete} />
      )}
    </div>
  );
}

function ExportBlock({ block }: { block: Block }) {
  if (block.type === "text") {
    return (
      <div
        style={{ fontFamily: block.fontFamily, fontSize: block.fontSize, lineHeight: 1.6, margin: "8px 0" }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  if (block.type === "image") {
    return (
      <div style={{ margin: "16px 0", textAlign: "center" }}>
        <img src={block.dataUrl} alt={block.name}
          style={{ maxWidth: "100%", width: block.width, height: block.height,
            transform: `rotate(${block.rotation}deg)`, borderRadius: 6 }} />
      </div>
    );
  }
  return <hr style={{ borderTopStyle: block.style, borderTopWidth: 2, borderColor: "#ddd", margin: "12px 0" }} />;
}
