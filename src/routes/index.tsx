import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  Folder, Note, loadFolders, loadNotes, saveFolders, saveNotes, uid, themeStorage,
} from "@/lib/notes-store";
import { Sidebar } from "@/components/NotesSidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notable — Your personal notes" },
      { name: "description", content: "A clean personal notes app. Write, organize folders, attach images and PDFs, and export your notes." },
      { property: "og:title", content: "Notable — Your personal notes" },
      { property: "og:description", content: "Write, organize, attach files, and export notes as PDF." },
    ],
  }),
  component: Index,
});

function Index() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null | "all">("all");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Init theme + load data
  useEffect(() => {
    const t = themeStorage.get();
    document.documentElement.classList.toggle("dark", t === "dark");
    setFolders(loadFolders());
    setNotes(loadNotes());
  }, []);

  // Persist
  useEffect(() => { saveFolders(folders); }, [folders]);
  useEffect(() => { saveNotes(notes); }, [notes]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  const createNote = () => {
    const folderId = activeFolderId === "all" ? null : (activeFolderId as string | null);
    const n: Note = {
      id: uid(),
      folderId,
      title: "",
      content: "",
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [n, ...prev]);
    setActiveNoteId(n.id);
  };

  const updateNote = (n: Note) => {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    toast.success("Note deleted");
  };

  const createFolder = (name: string) => {
    const f: Folder = { id: uid(), name, createdAt: Date.now() };
    setFolders((prev) => [...prev, f]);
    toast.success(`Folder “${name}” created`);
  };

  const deleteFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setNotes((prev) => prev.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)));
    if (activeFolderId === id) setActiveFolderId("all");
    toast.success("Folder deleted (notes moved to Unfiled)");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = () => {
    setNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    if (activeNoteId && selectedIds.has(activeNoteId)) setActiveNoteId(null);
    toast.success(`${selectedIds.size} note(s) deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const bulkMove = (folderId: string | null) => {
    setNotes((prev) => prev.map((n) => (selectedIds.has(n.id) ? { ...n, folderId, updatedAt: Date.now() } : n)));
    toast.success(`${selectedIds.size} note(s) moved`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        folders={folders}
        notes={notes}
        activeFolderId={activeFolderId}
        activeNoteId={activeNoteId}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onSelectFolder={(id) => { setActiveFolderId(id); }}
        onSelectNote={setActiveNoteId}
        onCreateNote={createNote}
        onCreateFolder={createFolder}
        onDeleteFolder={deleteFolder}
        onToggleSelect={toggleSelect}
        onSetSelectMode={setSelectMode}
        onBulkDelete={bulkDelete}
        onBulkMove={bulkMove}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <main className="flex-1 overflow-hidden">
        {activeNote ? (
          <NoteEditor note={activeNote} onChange={updateNote} onDelete={deleteNote} />
        ) : (
          <EmptyState onCreate={createNote} />
        )}
      </main>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Your notebook awaits</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create notes, organize them in folders, attach images or PDFs, and export to PDF anytime.
        </p>
        <Button onClick={onCreate} className="mt-6">Create your first note</Button>
      </div>
    </div>
  );
}
