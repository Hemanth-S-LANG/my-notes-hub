# Notable — Personal Notes Hub

A modern personal note-taking app built with React, TypeScript, Vite, Supabase, and Tailwind CSS.



## Overview

Notable is a cloud-backed personal notes workspace with rich block-based editing, folder organization, attachments, search, dark mode, and PDF export.

It includes user authentication, automatic cloud sync, and a mobile-friendly sidebar experience for managing notes on any device.

## Key Features

- Email/password and Google authentication via Supabase
- Sync notes and folders to Supabase for cross-device access
- Block-based note editor with:
  - rich text blocks
  - image blocks
  - divider blocks
- Attach files and images to notes
- Search notes by title and content
- Folder organization with All / Unfiled / custom folders
- Bulk selection for deleting and moving notes
- Auto-save with debounce and cloud persistence
- LocalStorage fallback with one-time migration to Supabase
- Dark/light theme toggle
- Export notes to PDF using `html2canvas` + `jsPDF`

## Technology Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- TanStack Router
- Supabase (Auth, Database, Storage)
- @lovable.dev cloud auth integration
- Radix UI components
- @dnd-kit for drag-and-drop note blocks
- jsPDF + html2canvas for PDF export
- Sonner for toast notifications
- React Hook Form for form inputs

## Project Structure

- `src/routes/` — application routes and page components
- `src/components/` — UI components, note editor, sidebar, theme toggle
- `src/lib/` — note storage, cloud sync, auth context, utilities
- `src/integrations/` — Supabase and Lovable integration configuration
- `supabase/` — Supabase configuration and database migrations

## Setup

1. Install dependencies:

```bash
bun install
```

or using npm:

```bash
npm install
```

2. Set required environment variables in a `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

3. Start the development server:

```bash
bun run dev
```

or:

```bash
npm run dev
```

4. Open the app in your browser at `http://localhost:5173`

## Deployment Notes

- The app expects a Supabase project with:
  - `folders` and `notes` tables
  - a storage bucket named `attachments`
- Auth state is persisted in local storage and automatically refreshed via Supabase

## Notes

- When a user signs in, the app migrates any existing local notes and folders into the cloud store.
- Image and file attachments are uploaded to Supabase Storage and served with signed URLs.
- Notes are rendered as draggable blocks so users can reorder text, image, and divider content.

## License

This repository is private. Customize this README as needed for open source or deployment.
