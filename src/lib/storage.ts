import { Document, DocumentVersion, DocStats, Reference } from './types';

const DOCUMENTS_KEY = 'scripta_documents';
const VERSIONS_KEY = 'scripta_versions';
const REFS_PREFIX = 'scripta_refs_';
const NOTES_PREFIX = 'scripta_notes_';
const MAX_VERSIONS_PER_DOC = 20;

export function getDocuments(): Document[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Document[];
  } catch {
    return [];
  }
}

export function getDocument(id: string): Document | null {
  const docs = getDocuments();
  return docs.find(d => d.id === id) ?? null;
}

export function saveDocument(doc: Document): void {
  const docs = getDocuments();
  const idx = docs.findIndex(d => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = doc;
  } else {
    docs.unshift(doc);
  }
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
}

export function deleteDocument(id: string): void {
  const docs = getDocuments().filter(d => d.id !== id);
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  const allVersions = getAllVersions().filter(v => v.documentId !== id);
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(allVersions));
  localStorage.removeItem(REFS_PREFIX + id);
}

export function getAllVersions(): DocumentVersion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DocumentVersion[];
  } catch {
    return [];
  }
}

export function getVersions(documentId: string): DocumentVersion[] {
  return getAllVersions()
    .filter(v => v.documentId === documentId)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export function saveVersion(version: DocumentVersion): void {
  const all = getAllVersions();
  all.unshift(version);

  // Prune old versions
  const docVersions = all.filter(v => v.documentId === version.documentId);
  const toKeep = new Set(docVersions.slice(0, MAX_VERSIONS_PER_DOC).map(v => v.id));
  const pruned = all.filter(v => v.documentId !== version.documentId || toKeep.has(v.id));

  localStorage.setItem(VERSIONS_KEY, JSON.stringify(pruned));
}

// ===== REFERENCES =====

export function getReferences(documentId: string): Reference[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REFS_PREFIX + documentId);
    if (!raw) return [];
    return (JSON.parse(raw) as Reference[]).sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

export function saveReferences(documentId: string, refs: Reference[]): void {
  localStorage.setItem(REFS_PREFIX + documentId, JSON.stringify(refs));
}

// ===== NOTES =====

export function getNotes(documentId: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NOTES_PREFIX + documentId) ?? '';
}

export function saveNotes(documentId: string, notes: string): void {
  localStorage.setItem(NOTES_PREFIX + documentId, notes);
}

export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

export function computeStats(html: string): DocStats {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').filter(Boolean).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const paragraphs = (html.match(/<p[^>]*>/gi) ?? []).length;
  const headings = (html.match(/<h[1-4][^>]*>/gi) ?? []).length;
  const readingMinutes = Math.max(1, Math.round(words / 200));
  return { words, chars, charsNoSpaces, paragraphs, headings, readingMinutes };
}
