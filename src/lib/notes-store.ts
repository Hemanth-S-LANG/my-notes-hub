// localStorage-backed store for folders + notes
export type Attachment = {
  id: string;
  name: string;
  type: string; // mime
  dataUrl: string; // base64 data URL
  size: number;
  kind: "image" | "pdf" | "file";
};

export type Note = {
  id: string;
  folderId: string | null;
  title: string;
  content: string; // HTML
  attachments: Attachment[];
  createdAt: number;
  updatedAt: number;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

const NOTES_KEY = "lov.notes.v1";
const FOLDERS_KEY = "lov.folders.v1";
const THEME_KEY = "lov.theme";

export const uid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  return safeParse<Note[]>(localStorage.getItem(NOTES_KEY), []);
}
export function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
export function loadFolders(): Folder[] {
  if (typeof window === "undefined") return [];
  return safeParse<Folder[]>(localStorage.getItem(FOLDERS_KEY), []);
}
export function saveFolders(folders: Folder[]) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function attachmentKind(type: string): Attachment["kind"] {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return "file";
}

export const themeStorage = {
  get(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  set(v: "light" | "dark") {
    localStorage.setItem(THEME_KEY, v);
  },
};
