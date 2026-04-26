import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2,
  Quote, Code as CodeIcon, Link as LinkIcon, Image as ImageIcon, Paperclip,
  Download, Trash2, Undo2, Redo2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Note, Attachment, fileToDataUrl, attachmentKind, uid,
} from "@/lib/notes-store";
import { toast } from "sonner";

interface Props {
  note: Note;
  onChange: (n: Note) => void;
  onDelete: (id: string) => void;
}

export function NoteEditor({ note, onChange, onDelete }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(note.title);

  // Sync editor content when note changes (switching notes)
  useEffect(() => {
    setTitle(note.title);
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content || "";
    }
  }, [note.id]);

  const update = (patch: Partial<Note>) => {
    onChange({ ...note, ...patch, updatedAt: Date.now() });
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) update({ content: editorRef.current.innerHTML });
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) update({ content: editorRef.current.innerHTML });
  };

  const insertLink = () => {
    const url = window.prompt("Enter URL (include https://)");
    if (!url) return;
    exec("createLink", url);
  };

  const insertImage = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    exec("insertImage", dataUrl);
    const att: Attachment = {
      id: uid(), name: file.name, type: file.type, dataUrl,
      size: file.size, kind: "image",
    };
    update({ attachments: [...note.attachments, att] });
  };

  const onAttachFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newAtts: Attachment[] = [];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const kind = attachmentKind(file.type);
        if (kind === "image") {
          await insertImage(file);
          continue;
        }
        newAtts.push({
          id: uid(), name: file.name, type: file.type, dataUrl,
          size: file.size, kind,
        });
      } catch {
        toast.error(`Failed to attach ${file.name}`);
      }
    }
    if (newAtts.length) {
      update({ attachments: [...note.attachments, ...newAtts] });
      toast.success(`${newAtts.length} file(s) attached`);
    }
  };

  const removeAttachment = (id: string) => {
    update({ attachments: note.attachments.filter((a) => a.id !== id) });
  };

  const downloadAttachment = (a: Attachment) => {
    const link = document.createElement("a");
    link.href = a.dataUrl;
    link.download = a.name;
    link.click();
  };

  const exportPdf = async () => {
    const node = exportRef.current;
    if (!node) return;
    toast.loading("Generating PDF…", { id: "pdf" });
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        pdf.addPage();
        position = 10 - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      pdf.save(`${note.title || "note"}.pdf`);
      toast.success("PDF downloaded", { id: "pdf" });
    } catch (e) {
      toast.error("PDF export failed", { id: "pdf" });
    }
  };

  const tools = [
    { icon: Undo2, cmd: "undo", label: "Undo" },
    { icon: Redo2, cmd: "redo", label: "Redo" },
    { sep: true },
    { icon: Heading1, cmd: "formatBlock", val: "H1", label: "Heading 1" },
    { icon: Heading2, cmd: "formatBlock", val: "H2", label: "Heading 2" },
    { sep: true },
    { icon: Bold, cmd: "bold", label: "Bold" },
    { icon: Italic, cmd: "italic", label: "Italic" },
    { icon: UnderlineIcon, cmd: "underline", label: "Underline" },
    { sep: true },
    { icon: List, cmd: "insertUnorderedList", label: "Bullet list" },
    { icon: ListOrdered, cmd: "insertOrderedList", label: "Numbered list" },
    { icon: Quote, cmd: "formatBlock", val: "BLOCKQUOTE", label: "Quote" },
    { icon: CodeIcon, cmd: "formatBlock", val: "PRE", label: "Code block" },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card/50 px-4 py-3 backdrop-blur">
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); update({ title: e.target.value }); }}
          placeholder="Untitled note"
          className="h-9 border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <Button variant="outline" size="sm" onClick={exportPdf}>
          <Download className="mr-1.5 h-4 w-4" /> PDF
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} aria-label="Delete note">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-3 py-1.5">
        {tools.map((t, i) =>
          "sep" in t ? (
            <Separator key={i} orientation="vertical" className="mx-1 h-5" />
          ) : (
            <Button
              key={i}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t.label}
              onClick={() => exec(t.cmd, "val" in t ? (t as any).val : undefined)}
            >
              <t.icon className="h-4 w-4" />
            </Button>
          )
        )}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert link" onClick={insertLink}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <label title="Insert image" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent">
          <ImageIcon className="h-4 w-4" />
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }}
          />
        </label>
        <label title="Attach file (PDF, etc.)" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent">
          <Paperclip className="h-4 w-4" />
          <input
            type="file" multiple className="hidden"
            onChange={(e) => { onAttachFiles(e.target.files); e.target.value = ""; }}
          />
        </label>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div
            ref={editorRef}
            className="note-editor min-h-[400px] outline-none text-foreground"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Start writing your note…"
            onInput={handleInput}
          />

          {note.attachments.length > 0 && (
            <div className="mt-8 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attachments
              </h3>
              <div className="grid gap-2">
                {note.attachments.map((a) => (
                  <div key={a.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(a.size / 1024).toFixed(1)} KB · {a.kind}
                      </p>
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

      {/* Hidden export node — always light background for clean PDF */}
      <div className="pointer-events-none fixed -left-[9999px] top-0">
        <div ref={exportRef} style={{ width: 800, padding: 32, background: "#fff", color: "#111" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{title || "Untitled"}</h1>
          <div className="note-editor" dangerouslySetInnerHTML={{ __html: note.content }} />
        </div>
      </div>
    </div>
  );
}
