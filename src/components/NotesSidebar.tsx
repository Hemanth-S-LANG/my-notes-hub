import { useState } from "react";
import { FolderPlus, Folder as FolderIcon, FileText, Plus, Search, Trash2, ChevronRight, Inbox, MoveRight, Check, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Note } from "@/lib/notes-store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface Props {
  folders: Folder[];
  notes: Note[];
  activeFolderId: string | null | "all";
  activeNoteId: string | null;
  selectedIds: Set<string>;
  selectMode: boolean;
  onSelectFolder: (id: string | null | "all") => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSetSelectMode: (v: boolean) => void;
  onBulkDelete: () => void;
  onBulkMove: (folderId: string | null) => void;
  onClearSelection: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export function Sidebar(p: Props) {
  const [query, setQuery] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const folderNotes = p.notes.filter((n) => {
    if (p.activeFolderId === "all") return true;
    return n.folderId === (p.activeFolderId as string | null);
  });

  const filtered = folderNotes.filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.content.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  const submitFolder = () => {
    const name = folderName.trim();
    if (name) p.onCreateFolder(name);
    setFolderName("");
    setCreatingFolder(false);
  };

  const folderCounts = (id: string | null) =>
    p.notes.filter((n) => n.folderId === id).length;

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card/40 md:w-80">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">Notable</h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Search + new */}
      <div className="space-y-2 px-3 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="h-9 pl-8"
          />
        </div>
        <Button onClick={p.onCreateNote} className="w-full" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New note
        </Button>
      </div>

      {/* Folders */}
      <div className="px-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folders</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreatingFolder(true)} aria-label="New folder">
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-0.5">
          <FolderRow
            active={p.activeFolderId === "all"}
            icon={<Inbox className="h-4 w-4" />}
            label="All notes"
            count={p.notes.length}
            onClick={() => p.onSelectFolder("all")}
          />
          <FolderRow
            active={p.activeFolderId === null}
            icon={<FileText className="h-4 w-4" />}
            label="Unfiled"
            count={folderCounts(null)}
            onClick={() => p.onSelectFolder(null)}
          />
          {p.folders.map((f) => (
            <FolderRow
              key={f.id}
              active={p.activeFolderId === f.id}
              icon={<FolderIcon className="h-4 w-4" />}
              label={f.name}
              count={folderCounts(f.id)}
              onClick={() => p.onSelectFolder(f.id)}
              onDelete={() => p.onDeleteFolder(f.id)}
            />
          ))}

          {creatingFolder && (
            <div className="flex items-center gap-1 px-2 py-1">
              <Input
                autoFocus
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitFolder();
                  if (e.key === "Escape") { setCreatingFolder(false); setFolderName(""); }
                }}
                placeholder="Folder name"
                className="h-7 text-sm"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={submitFolder}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notes list */}
      <div className="mt-3 flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notes · {filtered.length}
        </span>
        {p.selectMode ? (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2" disabled={p.selectedIds.size === 0}>
                  <MoveRight className="mr-1 h-3.5 w-3.5" /> Move
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => p.onBulkMove(null)}>Unfiled</DropdownMenuItem>
                {p.folders.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => p.onBulkMove(f.id)}>{f.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={p.onBulkDelete} disabled={p.selectedIds.size === 0}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { p.onSetSelectMode(false); p.onClearSelection(); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => p.onSetSelectMode(true)}>
            Select
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notes here yet</div>
        ) : (
          filtered.map((n) => {
            const active = n.id === p.activeNoteId;
            const selected = p.selectedIds.has(n.id);
            const preview = stripHtml(n.content).slice(0, 80);
            return (
              <button
                key={n.id}
                onClick={() => p.selectMode ? p.onToggleSelect(n.id) : p.onSelectNote(n.id)}
                className={cn(
                  "group mb-1 flex w-full items-start gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors",
                  active && !p.selectMode && "border-border bg-accent/60",
                  !active && "hover:bg-accent/40",
                  selected && "border-primary bg-primary-soft"
                )}
              >
                {p.selectMode && (
                  <div className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}>
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.title || "Untitled"}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {preview || "Empty note"}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {formatDate(n.updatedAt)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {(p.userEmail || p.onSignOut) && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={p.userEmail ?? ""}>
            {p.userEmail}
          </div>
          {p.onSignOut && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={p.onSignOut}>
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sign out
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}

function FolderRow({
  active, icon, label, count, onClick, onDelete,
}: {
  active: boolean; icon: React.ReactNode; label: string; count: number;
  onClick: () => void; onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-primary-soft text-foreground" : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", active && "rotate-90 text-primary")} />
      <span className={cn("text-muted-foreground", active && "text-primary")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Delete folder"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      )}
    </div>
  );
}

function stripHtml(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || "";
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
