'use client';

import { useState } from 'react';
import { PanelId, Reference } from '@/lib/types';
import { getReferences, saveReferences } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

interface SidebarPanelProps {
  panelId: PanelId;
  activePanel: PanelId;
  title: string;
  icon: string;
  accentColor?: string;
  latexContent?: string;
  content?: string;
  documentId?: string;
  onInsertCitation?: (text: string) => void;
  onClose?: () => void;
  inline?: boolean;
}

export default function SidebarPanel({
  panelId,
  activePanel,
  title,
  icon,
  accentColor,
  latexContent,
  content,
  documentId,
  onInsertCitation,
  onClose,
  inline,
}: SidebarPanelProps) {
  const isOpen = activePanel === panelId;

  const panelContent = (
    <>
      {panelId === 'ai' && <AIPanel onClose={onClose} />}
      {panelId === 'latex' && <LaTeXPanel content={latexContent ?? ''} onClose={onClose} />}
      {panelId === 'toc' && <TOCPanel content={content ?? ''} onClose={onClose} />}
      {panelId === 'refs' && (
        <RefsPanel
          documentId={documentId ?? ''}
          onInsertCitation={onInsertCitation}
          onClose={onClose}
        />
      )}
    </>
  );

  if (inline) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>
        {panelContent}
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      left: 'var(--sidebar-w)',
      top: 0,
      bottom: 0,
      width: '360px',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: isOpen ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
      pointerEvents: isOpen ? 'all' : 'none',
    }}>
      {panelContent}
    </div>
  );
}

// ===== AI PANEL =====
function AIPanel({ onClose }: { onClose?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="ScriptaAI" icon="✦" accentColor="var(--accent2)" onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={msgStyle('ai')}>
          <strong style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>ScriptaAI</strong>
          Bonjour ! J'ai analysé votre document. Que souhaitez-vous améliorer ?
        </div>
        <SuggestionBtn>Reformuler l'introduction pour la rendre plus percutante</SuggestionBtn>
        <SuggestionBtn>Générer la transition vers la section suivante</SuggestionBtn>
        <SuggestionBtn>Corriger la grammaire de ce paragraphe</SuggestionBtn>
      </div>
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <textarea
            rows={2}
            placeholder="Demandez à l'IA…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '8px 10px',
              fontFamily: "'Syne', sans-serif",
              fontSize: '12px',
              color: 'var(--text)',
              resize: 'none',
            }}
          />
          <button style={{ width: '34px', background: 'var(--accent2)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '6px', fontFamily: "'DM Mono', monospace" }}>
          IA non connectée en Phase 1 — intégration Anthropic en Phase 3
        </p>
      </div>
    </div>
  );
}

// ===== LaTeX PANEL =====
function LaTeXPanel({ content, onClose }: { content: string; onClose?: () => void }) {
  const [copied, setCopied] = useState(false);

  const latex = content
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, t) => `\\title{${stripTags(t)}}\n`)
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, t) => `\n\\section{${stripTags(t)}}\n`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, t) => `\n\\subsection{${stripTags(t)}}\n`)
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, (_, t) => `\n\\subsubsection{${stripTags(t)}}\n`)
    .replace(/<strong>(.*?)<\/strong>/gi, (_, t) => `\\textbf{${t}}`)
    .replace(/<em>(.*?)<\/em>/gi, (_, t) => `\\textit{${t}}`)
    .replace(/<code>(.*?)<\/code>/gi, (_, t) => `\\texttt{${t}}`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t: string) => `\n\\begin{quote}\n${stripTags(t)}\n\\end{quote}\n`)
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_, t) => `\n${stripTags(t)}\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

  const fullLatex = `% Généré automatiquement par ScriptaAI\n\\documentclass[12pt,a4paper]{article}\n\\usepackage{amsmath, amssymb}\n\\usepackage{parallel}\n\\usepackage{graphicx}\n\n\\begin{document}\n\n${latex}\n\n\\end{document}`;

  function handleCopy() {
    navigator.clipboard.writeText(fullLatex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 10px 0 14px', borderBottom: '1px solid var(--border)', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '13px' }}>{'{}'}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', fontWeight: 700, color: 'var(--accent3)', flex: 1 }}>LaTeX Source</span>
        <button
          onClick={handleCopy}
          style={{ fontSize: '11px', fontWeight: 600, fontFamily: "'Syne', sans-serif", padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border)', background: copied ? 'var(--green)' : 'var(--surface2)', color: copied ? 'white' : 'var(--text2)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
        >
          {copied ? '✓ Copié' : 'Copier'}
        </button>
        {onClose && (
          <button onClick={onClose} style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
          >✕</button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        <pre style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '11px',
          lineHeight: 1.7,
          color: 'var(--text2)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
        }}>
          {fullLatex}
        </pre>
      </div>
    </div>
  );
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

// ===== TOC PANEL =====
function TOCPanel({ content, onClose }: { content: string; onClose?: () => void }) {
  const headings: Array<{ level: number; text: string; id: number }> = [];
  let counter = 0;
  const regex = /<h([1-4])[^>]*>(.*?)<\/h[1-4]>/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: stripTags(match[2]),
      id: counter++,
    });
  }

  const levelStyles: Record<number, React.CSSProperties> = {
    1: { fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 700, color: 'var(--text)', paddingLeft: '14px' },
    2: { fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 500, color: 'var(--text2)', paddingLeft: '28px' },
    3: { fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)', paddingLeft: '42px' },
    4: { fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)', paddingLeft: '56px' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="Plan du document" icon="☰" accentColor="var(--accent)" onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {headings.length === 0 ? (
          <div style={{ padding: '20px 16px', color: 'var(--text3)', fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>
            Aucun titre détecté dans le document
          </div>
        ) : (
          headings.map((h) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                cursor: 'pointer',
                transition: 'background 0.1s',
                ...levelStyles[h.level],
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)', minWidth: '18px', flexShrink: 0 }}>
                {'H' + h.level}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===== REFS PANEL (fonctionnel) =====

const EMPTY_FORM = { authors: '', title: '', year: '', venue: '', url: '' };

function RefsPanel({
  documentId,
  onInsertCitation,
  onClose,
}: {
  documentId: string;
  onInsertCitation?: (text: string) => void;
  onClose?: () => void;
}) {
  const [refs, setRefs] = useState<Reference[]>(() =>
    documentId ? getReferences(documentId) : []
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function persist(updated: Reference[]) {
    setRefs(updated);
    if (documentId) saveReferences(documentId, updated);
  }

  function handleAdd() {
    if (!form.authors.trim() || !form.title.trim()) return;
    const order = refs.length + 1;
    const newRef: Reference = {
      id: uuidv4(),
      documentId,
      authors: form.authors.trim(),
      title: form.title.trim(),
      year: form.year.trim(),
      venue: form.venue.trim(),
      url: form.url.trim() || undefined,
      order,
    };
    persist([...refs, newRef]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleEdit(ref: Reference) {
    setEditingId(ref.id);
    setForm({ authors: ref.authors, title: ref.title, year: ref.year, venue: ref.venue, url: ref.url ?? '' });
    setShowForm(true);
  }

  function handleSaveEdit() {
    if (!form.authors.trim() || !form.title.trim()) return;
    const updated = refs.map(r =>
      r.id === editingId
        ? { ...r, authors: form.authors.trim(), title: form.title.trim(), year: form.year.trim(), venue: form.venue.trim(), url: form.url.trim() || undefined }
        : r
    );
    persist(updated);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const updated = refs
      .filter(r => r.id !== id)
      .map((r, i) => ({ ...r, order: i + 1 }));
    persist(updated);
    setConfirmDelete(null);
  }

  function handleInsert(ref: Reference) {
    onInsertCitation?.(`[${ref.order}]`);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 10px 0 14px', borderBottom: '1px solid var(--border)', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '13px' }}>①</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flex: 1 }}>Bibliographie</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)' }}>{refs.length} réf.</span>
        {onClose && (
          <button onClick={onClose} style={closeBtnStyle}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
          >✕</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {refs.length === 0 && !showForm && (
          <div style={{ padding: '20px 0', color: 'var(--text3)', fontSize: '12px', fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>
            Aucune référence. Ajoutez-en une ci-dessous.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {refs.map(ref => (
            <div
              key={ref.id}
              style={{
                background: 'var(--surface2)',
                border: `1px solid ${confirmDelete === ref.id ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '11px',
                color: 'var(--text2)',
                lineHeight: 1.5,
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '10px',
                  background: 'rgba(124,106,255,0.15)',
                  color: 'var(--accent2)',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>[{ref.order}]</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '1px' }}>{ref.authors}{ref.year ? `, ${ref.year}` : ''}</div>
                  <div style={{ fontStyle: 'italic' }}>{ref.title}</div>
                  {ref.venue && <div style={{ color: 'var(--text3)', fontSize: '10px', marginTop: '1px' }}>{ref.venue}</div>}
                  {ref.url && (
                    <div style={{ fontSize: '10px', color: 'var(--accent2)', marginTop: '2px', wordBreak: 'break-all' }}>{ref.url}</div>
                  )}
                </div>
              </div>

              {confirmDelete === ref.id ? (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button onClick={() => handleDelete(ref.id)} style={actionBtnStyle('var(--red)')}>Supprimer</button>
                  <button onClick={() => setConfirmDelete(null)} style={actionBtnStyle('var(--surface3)')}>Annuler</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {onInsertCitation && (
                    <button onClick={() => handleInsert(ref)} style={actionBtnStyle('var(--accent2)')}>↩ Insérer [{ref.order}]</button>
                  )}
                  <button onClick={() => handleEdit(ref)} style={actionBtnStyle('var(--surface3)')}>✎ Éditer</button>
                  <button onClick={() => setConfirmDelete(ref.id)} style={actionBtnStyle('var(--surface3)')}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ marginTop: '10px', background: 'var(--surface2)', border: '1px solid var(--accent2)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px' }}>
              {editingId ? 'Modifier la référence' : 'Nouvelle référence'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <RefInput placeholder="Auteurs *" value={form.authors} onChange={v => setForm(f => ({ ...f, authors: v }))} />
              <RefInput placeholder="Titre *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <RefInput placeholder="Année" value={form.year} onChange={v => setForm(f => ({ ...f, year: v }))} style={{ flex: '0 0 70px' }} />
                <RefInput placeholder="Journal / Conférence / Éditeur" value={form.venue} onChange={v => setForm(f => ({ ...f, venue: v }))} />
              </div>
              <RefInput placeholder="URL (optionnel)" value={form.url} onChange={v => setForm(f => ({ ...f, url: v }))} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button
                onClick={editingId ? handleSaveEdit : handleAdd}
                disabled={!form.authors.trim() || !form.title.trim()}
                style={{
                  ...actionBtnStyle('var(--accent2)'),
                  opacity: (!form.authors.trim() || !form.title.trim()) ? 0.4 : 1,
                  cursor: (!form.authors.trim() || !form.title.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button onClick={cancelForm} style={actionBtnStyle('var(--surface3)')}>Annuler</button>
            </div>
          </div>
        )}
      </div>

      {!showForm && (
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: '6px',
              color: 'var(--text3)',
              fontSize: '11px',
              fontFamily: "'Syne', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; }}
          >
            + Ajouter une référence
          </button>
        </div>
      )}
    </div>
  );
}

function RefInput({ placeholder, value, onChange, style }: { placeholder: string; value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '5px 8px',
        fontSize: '11px',
        fontFamily: "'Syne', sans-serif",
        color: 'var(--text)',
        outline: 'none',
        flex: 1,
        ...style,
      }}
    />
  );
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '3px 8px',
    fontSize: '10px',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 600,
    background: bg,
    border: 'none',
    borderRadius: '4px',
    color: 'var(--text)',
    cursor: 'pointer',
    flexShrink: 0,
  };
}

const closeBtnStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text3)',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  flexShrink: 0,
};

// ===== SHARED COMPONENTS =====
function PanelHeader({ title, icon, accentColor, monoTitle, onClose }: { title: string; icon: string; accentColor?: string; monoTitle?: boolean; onClose?: () => void }) {
  return (
    <div style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 10px 0 14px', borderBottom: '1px solid var(--border)', gap: '8px', flexShrink: 0 }}>
      <span style={{ fontSize: '13px' }}>{icon}</span>
      <span style={{ fontFamily: monoTitle ? "'DM Mono', monospace" : "'Syne', sans-serif", fontSize: '12px', fontWeight: 700, color: accentColor ?? 'var(--text)', flex: 1 }}>{title}</span>
      {onClose && (
        <button onClick={onClose} style={closeBtnStyle}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
        >✕</button>
      )}
    </div>
  );
}

function msgStyle(type: 'ai' | 'user'): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    lineHeight: 1.6,
    fontFamily: "'Syne', sans-serif",
    ...(type === 'ai' ? {
      background: 'linear-gradient(135deg, rgba(124,106,255,0.12), rgba(200,180,240,0.08))',
      border: '1px solid rgba(124,106,255,0.2)',
      color: 'var(--text)',
      borderBottomLeftRadius: '2px',
    } : {
      background: 'var(--surface3)',
      color: 'var(--text2)',
      alignSelf: 'flex-end',
      borderBottomRightRadius: '2px',
    }),
  };
}

function SuggestionBtn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '8px 10px',
      fontSize: '11px',
      fontFamily: "'Syne', sans-serif",
      color: 'var(--text2)',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent2)';
        (e.currentTarget as HTMLDivElement).style.color = 'var(--text)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.color = 'var(--text2)';
      }}
    >
      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent2)', display: 'block', marginBottom: '2px' }}>✦ Suggestion</span>
      {children}
    </div>
  );
}
