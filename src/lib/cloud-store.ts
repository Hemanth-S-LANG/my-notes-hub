// Cloud-backed store: folders, notes, attachments via Supabase + Storage.
import { supabase } from "@/integrations/supabase/client";
import type { Note, Folder, Block, Attachment } from "./notes-store";
import { uid } from "./notes-store";

const BUCKET = "attachments";

// ---------- Folders ----------

export async function fetchFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function createFolderRow(userId: string, name: string): Promise<Folder> {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, createdAt: new Date(data.created_at).getTime() };
}

export async function deleteFolderRow(id: string) {
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Notes ----------

type NoteRow = {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  blocks: unknown;
  attachments: unknown;
  created_at: string;
  updated_at: string;
};

function rowToNote(r: NoteRow): Note {
  return {
    id: r.id,
    folderId: r.folder_id,
    title: r.title ?? "",
    content: r.content ?? "",
    blocks: Array.isArray(r.blocks) ? (r.blocks as Block[]) : [],
    attachments: Array.isArray(r.attachments) ? (r.attachments as Attachment[]) : [],
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

export async function fetchNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, folder_id, title, content, blocks, attachments, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToNote(r as NoteRow));
}

export async function createNoteRow(userId: string, folderId: string | null): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: userId, folder_id: folderId, title: "", content: "", blocks: [], attachments: [] })
    .select("id, folder_id, title, content, blocks, attachments, created_at, updated_at")
    .single();
  if (error) throw error;
  return rowToNote(data as NoteRow);
}

export async function upsertNoteRow(userId: string, n: Note): Promise<void> {
  const { error } = await supabase.from("notes").upsert({
    id: n.id,
    user_id: userId,
    folder_id: n.folderId,
    title: n.title,
    content: n.content,
    blocks: n.blocks ?? [],
    attachments: n.attachments ?? [],
  });
  if (error) throw error;
}

export async function deleteNoteRow(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Attachments (Storage) ----------

export async function uploadAttachment(
  userId: string,
  file: File
): Promise<{ path: string; signedUrl: string }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const signed = await signAttachment(path);
  return { path, signedUrl: signed };
}

export async function signAttachment(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAttachmentFile(path: string) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// ---------- One-time migration from localStorage ----------

const MIGRATED_KEY = "lov.cloud.migrated.v1";

export async function migrateLocalToCloud(userId: string): Promise<{ folders: number; notes: number }> {
  if (typeof window === "undefined") return { folders: 0, notes: 0 };
  if (localStorage.getItem(MIGRATED_KEY)) return { folders: 0, notes: 0 };

  const localFolders: Folder[] = JSON.parse(localStorage.getItem("lov.folders.v1") || "[]");
  const localNotes: Note[] = JSON.parse(localStorage.getItem("lov.notes.v1") || "[]");

  const folderIdMap = new Map<string, string>();
  let foldersInserted = 0;
  for (const f of localFolders) {
    try {
      const created = await createFolderRow(userId, f.name);
      folderIdMap.set(f.id, created.id);
      foldersInserted++;
    } catch (e) {
      console.error("Failed migrating folder", f.name, e);
    }
  }

  let notesInserted = 0;
  for (const n of localNotes) {
    try {
      // Upload base64 image blocks
      const newBlocks: Block[] = [];
      for (const b of n.blocks ?? []) {
        if (b.type === "image" && b.dataUrl?.startsWith("data:")) {
          try {
            const file = await dataUrlToFile(b.dataUrl, b.name || "image");
            const { path } = await uploadAttachment(userId, file);
            newBlocks.push({ ...b, dataUrl: path }); // store path; resolve to URL on display
          } catch (e) {
            console.error("Image upload failed during migration", e);
            newBlocks.push(b);
          }
        } else {
          newBlocks.push(b);
        }
      }

      // Upload base64 attachments
      const newAtts: Attachment[] = [];
      for (const a of n.attachments ?? []) {
        if (a.dataUrl?.startsWith("data:")) {
          try {
            const file = await dataUrlToFile(a.dataUrl, a.name);
            const { path } = await uploadAttachment(userId, file);
            newAtts.push({ ...a, dataUrl: path });
          } catch (e) {
            console.error("Attachment upload failed", e);
          }
        } else {
          newAtts.push(a);
        }
      }

      await upsertNoteRow(userId, {
        ...n,
        id: crypto.randomUUID(),
        folderId: n.folderId ? folderIdMap.get(n.folderId) ?? null : null,
        blocks: newBlocks,
        attachments: newAtts,
      });
      notesInserted++;
    } catch (e) {
      console.error("Failed migrating note", n.title, e);
    }
  }

  localStorage.setItem(MIGRATED_KEY, "1");
  return { folders: foldersInserted, notes: notesInserted };
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type });
}
