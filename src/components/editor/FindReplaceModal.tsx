'use client';

import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';

interface FindReplaceModalProps {
  editor: Editor | null;
  onClose: () => void;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(editor: Editor, find: string): number {
  if (!find.trim()) return 0;
  const regex = new RegExp(escapeRegex(find), 'gi');
  let count = 0;
  editor.state.doc.descendants(node => {
    if (node.isText && node.text) {
      const m = node.text.match(regex);
      if (m) count += m.length;
    }
  });
  return count;
}

function replaceAll(editor: Editor, find: string, replace: string): number {
  if (!find.trim()) return 0;
  const regex = new RegExp(escapeRegex(find), 'gi');
  const { state } = editor;
  const { tr } = state;
  const matches: Array<{ from: number; to: number }> = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(node.text)) !== null) {
      matches.push({ from: pos + match.index, to: pos + match.index + match[0].length });
    }
  });

  // Apply in reverse order to preserve positions
  [...matches].reverse().forEach(({ from, to }) => {
    if (replace) {
      tr.replaceWith(from, to, state.schema.text(replace));
    } else {
      tr.delete(from, to);
    }
  });

  if (matches.length > 0) editor.view.dispatch(tr);
  return matches.length;
}

export default function FindReplaceModal({ editor, onClose }: FindReplaceModalProps) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [lastCount, setLastCount] = useState<number | null>(null);
  const [replaced, setReplaced] = useState<number | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleFind() {
    if (!editor) return;
    const count = countMatches(editor, find);
    setLastCount(count);
    setReplaced(null);
  }

  function handleReplaceAll() {
    if (!editor) return;
    const count = replaceAll(editor, find, replace);
    setReplaced(count);
    setLastCount(null);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '7px 10px',
    color: 'var(--text)',
    fontFamily: "'Syne', sans-serif",
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', fontFamily: "'Syne', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Rechercher & Remplacer</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '4px' }}>Rechercher</label>
            <input
              ref={findInputRef}
              value={find}
              onChange={e => { setFind(e.target.value); setLastCount(null); setReplaced(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleFind(); }}
              placeholder="Texte à rechercher…"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '4px' }}>Remplacer par</label>
            <input
              value={replace}
              onChange={e => setReplace(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReplaceAll(); }}
              placeholder="Texte de remplacement…"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Feedback */}
        <div style={{ minHeight: '20px', marginTop: '10px', fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>
          {lastCount !== null && (
            <span style={{ color: lastCount > 0 ? 'var(--accent2)' : 'var(--text3)' }}>
              {lastCount > 0 ? `${lastCount} occurrence${lastCount > 1 ? 's' : ''} trouvée${lastCount > 1 ? 's' : ''}` : 'Aucune occurrence trouvée'}
            </span>
          )}
          {replaced !== null && (
            <span style={{ color: replaced > 0 ? 'var(--green)' : 'var(--text3)' }}>
              {replaced > 0 ? `${replaced} remplacement${replaced > 1 ? 's' : ''} effectué${replaced > 1 ? 's' : ''}` : 'Aucune occurrence à remplacer'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleFind}
            disabled={!find.trim()}
            style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: find.trim() ? 'pointer' : 'not-allowed', opacity: find.trim() ? 1 : 0.5 }}
          >
            Compter
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={!find.trim()}
            style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '7px', border: 'none', background: 'var(--accent2)', color: 'white', cursor: find.trim() ? 'pointer' : 'not-allowed', opacity: find.trim() ? 1 : 0.5 }}
          >
            Tout remplacer
          </button>
        </div>
      </div>
    </div>
  );
}
