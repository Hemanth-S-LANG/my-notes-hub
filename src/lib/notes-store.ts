// localStorage-backed store for folders + notes
export type Attachment = {
  id: string;
  name: string;
  type: string; // mime
  dataUrl: string; // base64 data URL
  size: number;
  kind: "image" | "pdf" | "file";
};

export type TextBlock = {
  id: string;
  type: "text";
  html: string;
  fontFamily: string; // CSS font-family stack key, see FONT_OPTIONS
  fontSize: number; // px
};

export type ImageBlock = {
  id: string;
  type: "image";
  dataUrl: string;
  name: string;
  width: number;   // px
  height: number;  // px
  x: number;       // px offset within canvas row
  rotation: number; // deg
  cropX?: number;  // 0-1 normalized crop origin
  cropY?: number;
  cropW?: number;  // 0-1 normalized crop size
  cropH?: number;
};

export type DividerBlock = {
  id: string;
  type: "divider";
  style: "solid" | "dashed" | "dotted";
};

export type Block = TextBlock | ImageBlock | DividerBlock;

export type Note = {
  id: string;
  folderId: string | null;
  title: string;
  content: string; // legacy HTML (kept for backwards compat / search)
  blocks?: Block[]; // new block-based body
  attachments: Attachment[];
  createdAt: number;
  updatedAt: number;
};

export const FONT_OPTIONS: { label: string; value: string; preview?: string }[] = [
  { label: "Sans (default)", value: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, Cambria, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Caveat (handwriting)", value: "'Caveat', cursive" },
  { label: "Dancing Script", value: "'Dancing Script', cursive" },
  { label: "Shadows Into Light", value: "'Shadows Into Light', cursive" },
  { label: "Patrick Hand", value: "'Patrick Hand', cursive" },
  { label: "Architects Daughter", value: "'Architects Daughter', cursive" },
  { label: "Kalam", value: "'Kalam', cursive" },
];

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

export const newTextBlock = (html = ""): TextBlock => ({
  id: uid(), type: "text", html,
  fontFamily: FONT_OPTIONS[0].value, fontSize: 16,
});
export const newImageBlock = (dataUrl: string, name: string, w = 480, h = 320): ImageBlock => ({
  id: uid(), type: "image", dataUrl, name, width: w, height: h, x: 0, rotation: 0,
});
export const newDividerBlock = (): DividerBlock => ({
  id: uid(), type: "divider", style: "solid",
});

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
