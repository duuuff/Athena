'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Document } from '@/lib/types';
import { getDocuments, saveDocument, deleteDocument } from '@/lib/storage';
import { DEFAULT_CONTENT, DEMO_THESIS_CONTENT, DEMO_REPORT_CONTENT } from '@/lib/defaultContent';

const TEMPLATES = [
  {
    id: 'blank',
    icon: '📄',
    label: 'Document vierge',
    description: 'Commencer de zéro',
    content: DEFAULT_CONTENT,
  },
  {
    id: 'thesis',
    icon: '🎓',
    label: 'Thèse / Mémoire',
    description: 'Structure académique complète',
    content: DEMO_THESIS_CONTENT,
  },
  {
    id: 'report',
    icon: '📊',
    label: 'Rapport technique',
    description: 'Format professionnel structuré',
    content: DEMO_REPORT_CONTENT,
  },
  {
    id: 'article',
    icon: '📰',
    label: 'Article scientifique',
    description: 'Format IEEE / ACM',
    content: DEFAULT_CONTENT,
  },
  {
    id: 'cv',
    icon: '👤',
    label: 'CV académique',
    description: 'Curriculum vitae structuré',
    content: DEFAULT_CONTENT,
  },
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
    case 'alpha': return copy.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    case 'words': return copy.sort((a, b) => b.wordCount - a.wordCount);
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    setDocuments(getDocuments());
  }, []);

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const handler = () => setShowSortMenu(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showSortMenu]);

  const filtered = sortDocuments(
    documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase())),
    sortKey,
  );

  const totalWords = documents.reduce((sum, d) => sum + d.wordCount, 0);

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

  function handleDelete(id: string) {
    deleteDocument(id);
    setDocuments(getDocuments());
    setDeleteId(null);
  }

  function handleDuplicate(doc: Document, e: React.MouseEvent) {
    e.stopPropagation();
    const copy: Document = {
      ...doc,
      id: uuidv4(),
      title: `${doc.title} (Copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDocument(copy);
    setDocuments(getDocuments());
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
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
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ color: 'var(--text3)', fontSize: '13px' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un document…"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: "'Syne', sans-serif",
                width: '220px',
              }}
            />
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: 'white',
            cursor: 'pointer',
          }}>ML</div>
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
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '20px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  color: 'var(--text)',
                  fontFamily: "'Syne', sans-serif",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent2)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
                }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
              Documents récents {documents.length > 0 && <span>({filtered.length})</span>}
            </h2>

            {/* Sort dropdown */}
            {documents.length > 1 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px',
                    padding: '5px 10px', color: 'var(--text2)', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Syne', sans-serif",,
                  }}
                >
                  ↕ {SORT_LABELS[sortKey]}
                </button>
                {showSortMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', overflow: 'hidden', zIndex: 50,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: '140px',
                  }}
                    onClick={e => e.stopPropagation()}
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                      <button
                        key={key}
                        onClick={() => { setSortKey(key); setShowSortMenu(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 14px', background: sortKey === key ? 'var(--surface2)' : 'transparent',
                          border: 'none', color: sortKey === key ? 'var(--accent2)' : 'var(--text2)',
                          fontSize: '12px', fontWeight: sortKey === key ? 700 : 400,
                          cursor: 'pointer', fontFamily: "'Syne', sans-serif",
                        }}
                        onMouseEnter={e => { if (sortKey !== key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
                        onMouseLeave={e => { if (sortKey !== key) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px dashed var(--border)',
              borderRadius: '10px',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text3)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>
                {search ? 'Aucun résultat' : 'Aucun document pour l\'instant'}
              </div>
              <div style={{ fontSize: '12px' }}>
                {search ? `Aucun document ne correspond à "${search}"` : 'Créez votre premier document ci-dessus'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filtered.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '18px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                  onClick={() => router.push(`/editor/${doc.id}`)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text3)';
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)';
                  }}
                >
                  {/* Doc preview thumbnail */}
                  <div style={{
                    background: 'var(--doc-bg)',
                    borderRadius: '6px',
                    height: '80px',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    padding: '10px 12px',
                    border: '1px solid var(--doc-border)',
                  }}>
                    <div
                      style={{
                        fontSize: '8px',
                        lineHeight: 1.6,
                        color: '#333',
                        fontFamily: "'Crimson Pro', serif",
                        overflow: 'hidden',
                        height: '100%',
                        pointerEvents: 'none',
                      }}
                      dangerouslySetInnerHTML={{ __html: doc.content }}
                    />
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
                      {formatDate(doc.updatedAt)}
                    </span>
                    {doc.wordCount > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
                        {doc.wordCount} mots
                      </span>
                    )}
                  </div>

                  {/* Action buttons (shown on hover) */}
                  <div className="doc-actions" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.1s' }}>
                    <button
                      onClick={e => handleDuplicate(doc, e)}
                      title="Dupliquer le document"
                      style={{
                        width: '24px', height: '24px',
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        borderRadius: '4px', color: 'var(--text3)',
                        cursor: 'pointer', fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,106,255,0.4)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                    >⧉</button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(doc.id); }}
                      title="Supprimer le document"
                      style={{
                        width: '24px', height: '24px',
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        borderRadius: '4px', color: 'var(--text3)',
                        cursor: 'pointer', fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(235,87,87,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDeleteId(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '360px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Supprimer le document</h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: 1.5 }}>
              Cette action est irréversible. Le document et tout son historique seront supprimés définitivement.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 16px', color: 'var(--text2)', fontSize: '13px', fontFamily: "'Syne', sans-serif", cursor: 'pointer', fontWeight: 600 }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                style={{ background: 'var(--red)', border: 'none', borderRadius: '7px', padding: '8px 16px', color: 'white', fontSize: '13px', fontFamily: "'Syne', sans-serif", cursor: 'pointer', fontWeight: 600 }}
              >
                Supprimer
              </button>
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
