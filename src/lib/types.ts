export interface Document {
  id: string;
  title: string;
  content: string; // TipTap JSON string
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  savedAt: string;
  label?: string;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export type EditorMode = 'visual' | 'split' | 'latex';

export type PanelId = 'ai' | 'org' | 'latex' | 'toc' | 'refs' | null;

export interface DocStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  paragraphs: number;
  headings: number;
  readingMinutes: number;
}
