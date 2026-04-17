'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Document, TAG_PRESETS } from '@/lib/types';
import { getDocuments, saveDocument, deleteDocument } from '@/lib/storage';
import { DEFAULT_CONTENT, DEMO_THESIS_CONTENT, DEMO_REPORT_CONTENT, DEMO_ARTICLE_CONTENT, DEMO_CV_CONTENT } from '@/lib/defaultContent';

const TEMPLATES = [
  { id: 'blank',   icon: '📄', label: 'Document vierge',     description: 'Commencer de zéro',              content: DEFAULT_CONTENT },
  { id: 'thesis',  icon: '🎓', label: 'Thèse / Mémoire',     description: 'Structure académique complète',   content: DEMO_THESIS_CONTENT },
  { id: 'report',  icon: '📊', label: 'Rapport technique',    description: 'Format professionnel structuré',  content: DEMO_REPORT_CONTENT },
  { id: 'article', icon: '📰', label: 'Article scientifique', description: 'Format IEEE / ACM',               content: DEMO_ARTICLE_CONTENT },
  { id: 'cv',      icon: '👤', label: 'CV académique',        description: 'Curriculum vitae structuré',      content: DEMO_CV_CONTENT },
];

type SortKey = 'newest' | 'oldest' | 'alpha' | 'words';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Plus récent',
  oldest: 'Plus ancien',
  alpha: 'A → Z',
  words: 'Plus long',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function sortDocuments(docs: Document[], key: SortKey): Document[] {
  const copy = [...docs];
  switch (key) {
    case 'newest': return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case 'oldest': return copy.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    case 'alpha':  return copy.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    case 'words':  return copy.sort((a, b) => b.wordCount - a.wordCount);
  }
}

function getTagPreset(label: string) {
  return TAG_PRESETS.find(t => t.label === label);
}

export default function Dashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagPopoverId, setTagPopoverId] = useState<string | null>(null);
  const tagPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setDocuments(getDocuments()); }, []);

  useEffect(() => {
    if (!showSortMenu && !tagPopoverId) return;
    function handler(e: MouseEvent) {
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(e.target as Node)) {
        setTagPopoverId(null);
      }
      setShowSortMenu(false);
    }
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showSortMenu, tagPopoverId]);

  function updateDoc(updated: Document) {
    saveDocument(updated);
    setDocuments(getDocuments());
  }

  function handleTogglePin(doc: Document, e: React.MouseEvent) {
    e.stopPropagation();
    updateDoc({ ...doc, pinned: !doc.pinned });
  }

  function handleToggleTag(doc: Document, tagLabel: string, e: React.MouseEvent) {
    e.stopPropagation();
    const tags = doc.tags ?? [];
    const next = tags.includes(tagLabel) ? tags.filter(t => t !== tagLabel) : [...tags, tagLabel];
    updateDoc({ ...doc, tags: next });
  }

  function handleDelete(id: string) {
    deleteDocument(id);
    setDocuments(getDocuments());
    setDeleteId(null);
  }

  function handleDuplicate(doc: Document, e: React.MouseEvent) {
    e.stopPropagation();
    const copy: Document = { ...doc, id: uuidv4(), title: `${doc.title} (Copie)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false };
    saveDocument(copy);
    setDocuments(getDocuments());
  }

  function createDocument(templateContent: string, templateLabel: string) {
    const doc: Document = {
      id: uuidv4(),
      title: templateLabel === 'Document vierge' ? 'Sans titre' : templateLabel,
      content: templateContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0,
    };
    saveDocument(doc);
    router.push(`/editor/${doc.id}`);
  }

  function toggleTagFilter(tag: string) {
    setTagFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  const allUsedTags = Array.from(new Set(documents.flatMap(d => d.tags ?? [])));

  // Filter + sort — pinned always first
  const base = documents.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchTags = tagFilter.length === 0 || tagFilter.every(t => (d.tags ?? []).includes(t));
    return matchSearch && matchTags;
  });
  const sorted = sortDocuments(base, sortKey);
  const pinned = sorted.filter(d => d.pinned);
  const unpinned = sorted.filter(d => !d.pinned);
  const filtered = [...pinned, ...unpinned];

  const totalWords = documents.reduce((sum, d) => sum + d.wordCount, 0);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--accent)' }}>
            Scripta<span style={{ color: 'var(--accent3)' }}>AI</span>
          </span>
          {documents.length > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
              {documents.length} doc{documents.length > 1 ? 's' : ''} · {totalWords.toLocaleString('fr-FR')} mots
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text3)', fontSize: '13px' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un document…"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '13px', fontFamily: "'Syne', sans-serif", width: '220px' }}
            />
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent2), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>ML</div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' }}>
        {/* Stats banner */}
        {documents.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {[
              { label: 'Documents', value: documents.length, icon: '📄' },
              { label: 'Mots au total', value: totalWords.toLocaleString('fr-FR'), icon: '✍️' },
              { label: 'Temps de lecture', value: `~${Math.ceil(totalWords / 200)} min`, icon: '⏱' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)', fontFamily: "'Syne', sans-serif", lineHeight: 1.2 }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New document section */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '16px', fontFamily: "'DM Mono', monospace" }}>
            Nouveau document
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => createDocument(t.content, t.label)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', color: 'var(--text)', fontFamily: "'Syne', sans-serif" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{t.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Recent documents */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
              Documents récents {documents.length > 0 && <span>({filtered.length})</span>}
            </h2>

            {documents.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {documents.length > 1 && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', color: 'var(--text2)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                    >
                      ↕ {SORT_LABELS[sortKey]}
                    </button>
                    {showSortMenu && (
                      <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: '140px' }} onClick={e => e.stopPropagation()}>
                        {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                          <button key={key} onClick={() => { setSortKey(key); setShowSortMenu(false); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: sortKey === key ? 'var(--surface2)' : 'transparent', border: 'none', color: sortKey === key ? 'var(--accent2)' : 'var(--text2)', fontSize: '12px', fontWeight: sortKey === key ? 700 : 400, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                            onMouseEnter={e => { if (sortKey !== key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
                            onMouseLeave={e => { if (sortKey !== key) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                          >{SORT_LABELS[key]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  {(['grid', 'list'] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} title={mode === 'grid' ? 'Vue grille' : 'Vue liste'}
                      style={{ width: '28px', height: '26px', background: viewMode === mode ? 'var(--surface3)' : 'transparent', border: 'none', color: viewMode === mode ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
                    >{mode === 'grid' ? '⊞' : '≡'}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tag filter bar */}
          {allUsedTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {allUsedTags.map(tag => {
                const preset = getTagPreset(tag);
                const active = tagFilter.includes(tag);
                return (
                  <button key={tag} onClick={() => toggleTagFilter(tag)}
                    style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'Syne', sans-serif",
                      background: active ? (preset?.bg ?? 'rgba(124,106,255,0.15)') : 'var(--surface2)',
                      border: `1px solid ${active ? (preset?.color ?? 'var(--accent2)') : 'var(--border)'}`,
                      color: active ? (preset?.color ?? 'var(--accent2)') : 'var(--text3)',
                      transition: 'all 0.1s',
                    }}
                  >{tag}</button>
                );
              })}
              {tagFilter.length > 0 && (
                <button onClick={() => setTagFilter([])} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)' }}>
                  ✕ Effacer
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '10px', padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>
                {search || tagFilter.length > 0 ? 'Aucun résultat' : "Aucun document pour l'instant"}
              </div>
              <div style={{ fontSize: '12px' }}>
                {search ? `Aucun document ne correspond à "${search}"` : tagFilter.length > 0 ? 'Aucun document avec ces tags' : 'Créez votre premier document ci-dessus'}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filtered.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  tagPopoverId={tagPopoverId}
                  tagPopoverRef={tagPopoverRef}
                  onOpen={() => router.push(`/editor/${doc.id}`)}
                  onDuplicate={e => handleDuplicate(doc, e)}
                  onDelete={e => { e.stopPropagation(); setDeleteId(doc.id); }}
                  onTogglePin={e => handleTogglePin(doc, e)}
                  onToggleTag={(tag, e) => handleToggleTag(doc, tag, e)}
                  onOpenTagPopover={e => { e.stopPropagation(); setTagPopoverId(prev => prev === doc.id ? null : doc.id); }}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.map(doc => (
                <DocListItem
                  key={doc.id}
                  doc={doc}
                  tagPopoverId={tagPopoverId}
                  tagPopoverRef={tagPopoverRef}
                  onOpen={() => router.push(`/editor/${doc.id}`)}
                  onDuplicate={e => handleDuplicate(doc, e)}
                  onDelete={e => { e.stopPropagation(); setDeleteId(doc.id); }}
                  onTogglePin={e => handleTogglePin(doc, e)}
                  onToggleTag={(tag, e) => handleToggleTag(doc, tag, e)}
                  onOpenTagPopover={e => { e.stopPropagation(); setTagPopoverId(prev => prev === doc.id ? null : doc.id); }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteId(null)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', maxWidth: '360px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Supprimer le document</h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: 1.5 }}>
              Cette action est irréversible. Le document et tout son historique seront supprimés définitivement.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 16px', color: 'var(--text2)', fontSize: '13px', fontFamily: "'Syne', sans-serif", cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={() => handleDelete(deleteId)} style={{ background: 'var(--red)', border: 'none', borderRadius: '7px', padding: '8px 16px', color: 'white', fontSize: '13px', fontFamily: "'Syne', sans-serif", cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        div:hover > .doc-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

// ===== Shared sub-components =====

interface DocItemProps {
  doc: Document;
  tagPopoverId: string | null;
  tagPopoverRef: React.RefObject<HTMLDivElement | null>;
  onOpen: () => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onToggleTag: (tag: string, e: React.MouseEvent) => void;
  onOpenTagPopover: (e: React.MouseEvent) => void;
}

function TagPopover({ doc, tagPopoverRef, onToggleTag }: { doc: Document; tagPopoverRef: React.RefObject<HTMLDivElement | null>; onToggleTag: (tag: string, e: React.MouseEvent) => void }) {
  return (
    <div
      ref={tagPopoverRef}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '8px', zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex', flexWrap: 'wrap', gap: '5px', width: '200px',
      }}
    >
      {TAG_PRESETS.map(preset => {
        const active = (doc.tags ?? []).includes(preset.label);
        return (
          <button
            key={preset.label}
            onClick={e => onToggleTag(preset.label, e)}
            style={{
              padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Syne', sans-serif",
              background: active ? preset.bg : 'var(--surface2)',
              border: `1px solid ${active ? preset.color : 'var(--border)'}`,
              color: active ? preset.color : 'var(--text3)',
              transition: 'all 0.1s',
            }}
          >
            {active ? '✓ ' : ''}{preset.label}
          </button>
        );
      })}
    </div>
  );
}

function DocCard({ doc, tagPopoverId, tagPopoverRef, onOpen, onDuplicate, onDelete, onTogglePin, onToggleTag, onOpenTagPopover }: DocItemProps) {
  const isTagOpen = tagPopoverId === doc.id;
  return (
    <div
      style={{ background: 'var(--surface)', border: `1px solid ${doc.pinned ? 'rgba(200,180,240,0.4)' : 'var(--border)'}`, borderRadius: '10px', padding: '18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = doc.pinned ? 'rgba(200,180,240,0.6)' : 'var(--text3)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = doc.pinned ? 'rgba(200,180,240,0.4)' : 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; }}
    >
      {/* Pin indicator */}
      {doc.pinned && <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '11px', color: 'var(--accent)', opacity: 0.8 }}>📌</div>}

      {/* Doc preview thumbnail */}
      <div style={{ background: 'var(--doc-bg)', borderRadius: '6px', height: '80px', marginBottom: '12px', overflow: 'hidden', padding: '10px 12px', border: '1px solid var(--doc-border)' }}>
        <div style={{ fontSize: '8px', lineHeight: 1.6, color: '#333', fontFamily: "'Crimson Pro', serif", overflow: 'hidden', height: '100%', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: doc.content }} />
      </div>

      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>

      {/* Tags */}
      {(doc.tags ?? []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {(doc.tags ?? []).map(tag => {
            const p = getTagPreset(tag);
            return <span key={tag} style={{ padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: p?.bg ?? 'rgba(124,106,255,0.15)', color: p?.color ?? 'var(--accent2)', fontFamily: "'Syne', sans-serif" }}>{tag}</span>;
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>{formatDate(doc.updatedAt)}</span>
        {doc.wordCount > 0 && <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>{doc.wordCount} mots</span>}
      </div>

      {/* Action buttons */}
      <div className="doc-actions" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.1s' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={onOpenTagPopover} title="Tags" style={iconBtn(isTagOpen ? 'var(--accent)' : 'var(--text3)')}>🏷</button>
          {isTagOpen && <TagPopover doc={doc} tagPopoverRef={tagPopoverRef} onToggleTag={onToggleTag} />}
        </div>
        <button onClick={onTogglePin} title={doc.pinned ? 'Désépingler' : 'Épingler'} style={iconBtn(doc.pinned ? 'var(--accent)' : 'var(--text3)')}>📌</button>
        <button onClick={onDuplicate} title="Dupliquer" style={iconBtn('var(--text3)')}>⧉</button>
        <button onClick={onDelete} title="Supprimer" style={iconBtn('var(--text3)')} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; }}>✕</button>
      </div>
    </div>
  );
}

function DocListItem({ doc, tagPopoverId, tagPopoverRef, onOpen, onDuplicate, onDelete, onTogglePin, onToggleTag, onOpenTagPopover }: DocItemProps) {
  const isTagOpen = tagPopoverId === doc.id;
  return (
    <div
      style={{ background: 'var(--surface)', border: `1px solid ${doc.pinned ? 'rgba(200,180,240,0.4)' : 'var(--border)'}`, borderRadius: '8px', padding: '11px 14px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = doc.pinned ? 'rgba(200,180,240,0.6)' : 'var(--text3)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = doc.pinned ? 'rgba(200,180,240,0.4)' : 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; }}
    >
      <div style={{ width: '32px', height: '40px', background: 'var(--doc-bg)', border: '1px solid var(--doc-border)', borderRadius: '3px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
        {doc.pinned ? '📌' : '📄'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>{formatDate(doc.updatedAt)}{doc.wordCount > 0 && ` · ${doc.wordCount} mots`}</span>
          {(doc.tags ?? []).map(tag => {
            const p = getTagPreset(tag);
            return <span key={tag} style={{ padding: '1px 6px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: p?.bg ?? 'rgba(124,106,255,0.15)', color: p?.color ?? 'var(--accent2)', fontFamily: "'Syne', sans-serif" }}>{tag}</span>;
          })}
        </div>
      </div>
      <div className="doc-actions" style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={onOpenTagPopover} title="Tags" style={iconBtn(isTagOpen ? 'var(--accent)' : 'var(--text3)')}>🏷</button>
          {isTagOpen && <TagPopover doc={doc} tagPopoverRef={tagPopoverRef} onToggleTag={onToggleTag} />}
        </div>
        <button onClick={onTogglePin} title={doc.pinned ? 'Désépingler' : 'Épingler'} style={iconBtn(doc.pinned ? 'var(--accent)' : 'var(--text3)')}>📌</button>
        <button onClick={onDuplicate} title="Dupliquer" style={iconBtn('var(--text3)')}>⧉</button>
        <button onClick={onDelete} title="Supprimer" style={iconBtn('var(--text3)')} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; }}>✕</button>
      </div>
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    width: '24px', height: '24px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', color,
    cursor: 'pointer', fontSize: '11px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.1s',
  };
}
