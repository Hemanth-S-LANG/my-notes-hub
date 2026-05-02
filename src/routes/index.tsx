import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Menu, X, Loader2 } from "lucide-react";
import {
  Folder, Note, themeStorage,
} from "@/lib/notes-store";
import {
  fetchFolders, fetchNotes, createFolderRow, deleteFolderRow,
  createNoteRow, upsertNoteRow, deleteNoteRow, deleteAttachmentFile,
  migrateLocalToCloud,
} from "@/lib/cloud-store";
import { useAuth } from "@/lib/auth-context";
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
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null | "all">("all");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Init theme
  useEffect(() => {
    const t = themeStorage.get();
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  // Redirect to /login when not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  // Load cloud data + migrate localStorage on first sign-in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const migrated = await migrateLocalToCloud(user.id);
        if (migrated.notes > 0 || migrated.folders > 0) {
          toast.success(`Imported ${migrated.notes} note(s) and ${migrated.folders} folder(s) from this device.`);
        }
        const [f, n] = await Promise.all([fetchFolders(user.id), fetchNotes(user.id)]);
        if (cancelled) return;
        setFolders(f);
        setNotes(n);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load your notes.");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Debounced auto-save per note
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const queueSave = (n: Note) => {
    if (!user) return;
    const timers = saveTimers.current;
    const existing = timers.get(n.id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      try { await upsertNoteRow(user.id, n); }
      catch (e) { console.error(e); toast.error("Couldn't save note."); }
    }, 600);
    timers.set(n.id, t);
  };

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  const createNote = async () => {
    if (!user) return;
    const folderId = activeFolderId === "all" ? null : (activeFolderId as string | null);
    try {
      const n = await createNoteRow(user.id, folderId);
      setNotes((prev) => [n, ...prev]);
      setActiveNoteId(n.id);
    } catch (e) {
      console.error(e); toast.error("Couldn't create note.");
    }
  };

  const updateNote = (n: Note) => {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
    queueSave(n);
  };

  const deleteNote = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    try {
      await deleteNoteRow(id);
      // Best-effort cleanup of storage objects
      if (note) {
        const paths = [
          ...(note.blocks ?? []).filter((b) => b.type === "image" && b.storagePath).map((b) => (b as { storagePath: string }).storagePath),
          ...(note.attachments ?? []).filter((a) => a.storagePath).map((a) => a.storagePath as string),
        ];
        await Promise.all(paths.map((p) => deleteAttachmentFile(p).catch(() => {})));
      }
      toast.success("Note deleted");
    } catch (e) {
      console.error(e); toast.error("Couldn't delete note.");
    }
  };

  const createFolder = async (name: string) => {
    if (!user) return;
    try {
      const f = await createFolderRow(user.id, name);
      setFolders((prev) => [...prev, f]);
      toast.success(`Folder “${name}” created`);
    } catch (e) {
      console.error(e); toast.error("Couldn't create folder.");
    }
  };

  const deleteFolder = async (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setNotes((prev) => prev.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)));
    if (activeFolderId === id) setActiveFolderId("all");
    try {
      await deleteFolderRow(id);
      toast.success("Folder deleted (notes moved to Unfiled)");
    } catch (e) {
      console.error(e); toast.error("Couldn't delete folder.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    setNotes((prev) => prev.filter((n) => !ids.includes(n.id)));
    if (activeNoteId && ids.includes(activeNoteId)) setActiveNoteId(null);
    setSelectedIds(new Set());
    setSelectMode(false);
    try {
      await Promise.all(ids.map((id) => deleteNoteRow(id)));
      toast.success(`${ids.length} note(s) deleted`);
    } catch (e) {
      console.error(e); toast.error("Some notes couldn't be deleted.");
    }
  };

  const bulkMove = async (folderId: string | null) => {
    if (!user) return;
    const ids = [...selectedIds];
    const updated: Note[] = [];
    setNotes((prev) =>
      prev.map((n) => {
        if (!ids.includes(n.id)) return n;
        const next = { ...n, folderId, updatedAt: Date.now() };
        updated.push(next);
        return next;
      })
    );
    setSelectedIds(new Set());
    setSelectMode(false);
    try {
      await Promise.all(updated.map((n) => upsertNoteRow(user.id, n)));
      toast.success(`${ids.length} note(s) moved`);
    } catch (e) {
      console.error(e); toast.error("Some notes couldn't be moved.");
    }
  };

  if (authLoading || (user && dataLoading)) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your notes…
      </div>
    );
  }

  if (!user) return null; // redirecting

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div
        className={
          "fixed inset-y-0 left-0 z-40 w-[85vw] max-w-sm transform transition-transform duration-200 md:static md:z-auto md:w-80 md:max-w-none md:translate-x-0 " +
          (sidebarOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <Sidebar
          folders={folders}
          notes={notes}
          activeFolderId={activeFolderId}
          activeNoteId={activeNoteId}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onSelectFolder={(id) => { setActiveFolderId(id); }}
          onSelectNote={(id) => { setActiveNoteId(id); setSidebarOpen(false); }}
          onCreateNote={() => { createNote(); setSidebarOpen(false); }}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onToggleSelect={toggleSelect}
          onSetSelectMode={setSelectMode}
          onBulkDelete={bulkDelete}
          onBulkMove={bulkMove}
          onClearSelection={() => setSelectedIds(new Set())}
          userEmail={user.email ?? null}
          onSignOut={async () => { await signOut(); navigate({ to: "/login" }); }}
        />
      </div>

      {sidebarOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-2 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="truncate text-sm font-semibold">
            {activeNote?.title || "Notable"}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeNote ? (
            <NoteEditor note={activeNote} onChange={updateNote} onDelete={deleteNote} userId={user.id} />
          ) : (
            <EmptyState onCreate={createNote} />
          )}
        </div>
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
