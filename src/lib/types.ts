export interface Document {
  id: string;
  title: string;
  content: string; // TipTap JSON string
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  tags?: string[];
  pinned?: boolean;
  wordGoal?: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  savedAt: string;
  label?: string;
}

export interface Reference {
  id: string;
  documentId: string;
  authors: string;
  title: string;
  year: string;
  venue: string; // journal, conférence, éditeur
  url?: string;
  order: number; // numéro de citation [N]
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export type EditorMode = 'visual' | 'split' | 'latex';

export type PanelId = 'ai' | 'org' | 'latex' | 'toc' | 'refs' | 'notes' | null;

export interface DocStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  paragraphs: number;
  headings: number;
  readingMinutes: number;
}

export const TAG_PRESETS: { label: string; color: string; bg: string }[] = [
  { label: 'Thèse',    color: '#c8b4f0', bg: 'rgba(200,180,240,0.15)' },
  { label: 'Rapport',  color: '#7c6aff', bg: 'rgba(124,106,255,0.15)' },
  { label: 'Article',  color: '#f0d090', bg: 'rgba(240,208,144,0.15)' },
  { label: 'CV',       color: '#6fcf97', bg: 'rgba(111,207,151,0.15)' },
  { label: 'Brouillon',color: '#9090a8', bg: 'rgba(144,144,168,0.15)' },
  { label: 'Travail',  color: '#f2994a', bg: 'rgba(242,153,74,0.15)'  },
  { label: 'Perso',    color: '#56ccf2', bg: 'rgba(86,204,242,0.15)'  },
  { label: 'Urgent',   color: '#eb5757', bg: 'rgba(235,87,87,0.15)'   },
];
