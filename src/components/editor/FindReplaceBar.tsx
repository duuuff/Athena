'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Editor } from '@tiptap/react';

interface FindReplaceBarProps {
  editorRef: RefObject<{ getHTML: () => string; setContent: (html: string) => void; editor?: Editor | null } | null>;
  content: string;
  onReplace: (search: string, replacement: string, replaceAll: boolean) => void;
  onClose: () => void;
}

// Walk all text nodes in a DOM subtree.
function getTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodes.push(node);
  }
  return nodes;
}

type MatchRange = { node: Text; start: number; end: number };

function findMatches(root: HTMLElement, search: string): MatchRange[] {
  if (!search) return [];
  const textNodes = getTextNodes(root);
  const results: MatchRange[] = [];
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');

  for (const node of textNodes) {
    const text = node.textContent ?? '';
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      results.push({ node, start: m.index, end: m.index + m[0].length });
    }
  }
  return results;
}

// Use CSS Custom Highlight API if available, otherwise no-op.
const SEARCH_HL = 'find-search';
const ACTIVE_HL = 'find-active';

function supportsHighlight(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS;
}

function clearHighlights() {
  if (!supportsHighlight()) return;
  (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete(SEARCH_HL);
  (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete(ACTIVE_HL);
}

function applyHighlights(matches: MatchRange[], activeIndex: number) {
  if (!supportsHighlight() || matches.length === 0) return;
  const HighlightCtor = (window as unknown as { Highlight: new (...ranges: StaticRange[]) => unknown }).Highlight;
  if (!HighlightCtor) return;

  const allRanges = matches.map(({ node, start, end }) => {
    const r = new StaticRange({ startContainer: node, startOffset: start, endContainer: node, endOffset: end });
    return r;
  });

  const activeRanges = activeIndex >= 0 && matches[activeIndex]
    ? [new StaticRange({ startContainer: matches[activeIndex].node, startOffset: matches[activeIndex].start, endContainer: matches[activeIndex].node, endOffset: matches[activeIndex].end })]
    : [];

  const hl = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
  hl.set(SEARCH_HL, new (HighlightCtor as new (...r: StaticRange[]) => unknown)(...allRanges));
  hl.set(ACTIVE_HL, new (HighlightCtor as new (...r: StaticRange[]) => unknown)(...activeRanges));
}

export default function FindReplaceBar({ editorRef, content, onReplace, onClose }: FindReplaceBarProps) {
  const [search, setSearch] = useState('');
  const [replacement, setReplacement] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<MatchRange[]>([]);

  useEffect(() => { searchInputRef.current?.focus(); }, []);

  // Cleanup highlights on unmount
  useEffect(() => () => { clearHighlights(); }, []);

  const refreshMatches = useCallback((searchTerm: string, activeIdx: number) => {
    const editorEl = editorRef.current?.editor?.view?.dom as HTMLElement | undefined;
    if (!editorEl) { setMatchCount(0); return; }

    const matches = findMatches(editorEl, searchTerm);
    matchesRef.current = matches;
    setMatchCount(matches.length);

    clearHighlights();
    applyHighlights(matches, activeIdx);

    // Scroll active match into view via Selection
    const active = matches[activeIdx];
    if (active) {
      try {
        const range = document.createRange();
        range.setStart(active.node, active.start);
        range.setEnd(active.node, active.end);
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        range.startContainer.parentElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch { /* ignore */ }
    }
  }, [editorRef]);

  useEffect(() => {
    refreshMatches(search, currentIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, content]);

  useEffect(() => {
    if (matchesRef.current.length === 0) return;
    clearHighlights();
    applyHighlights(matchesRef.current, currentIdx);

    const active = matchesRef.current[currentIdx];
    if (active) {
      try {
        const range = document.createRange();
        range.setStart(active.node, active.start);
        range.setEnd(active.node, active.end);
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        range.startContainer.parentElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch { /* ignore */ }
    }
  }, [currentIdx]);

  function navigate(dir: 1 | -1) {
    if (matchCount === 0) return;
    setCurrentIdx(prev => (prev + dir + matchCount) % matchCount);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') handleClose();
    if (e.key === 'Enter') { e.preventDefault(); navigate(e.shiftKey ? -1 : 1); }
  }

  function handleReplaceCurrent() {
    if (!search || matchCount === 0) return;
    clearHighlights();
    onReplace(search, replacement, false);
  }

  function handleReplaceAll() {
    if (!search) return;
    clearHighlights();
    onReplace(search, replacement, true);
  }

  function handleClose() {
    clearHighlights();
    onClose();
  }

  return (
    <>
      <style>{`
        ::highlight(${SEARCH_HL}) { background-color: rgba(242,153,74,0.35); }
        ::highlight(${ACTIVE_HL}) { background-color: rgba(242,153,74,0.8); color: #111; }
      `}</style>
      <div style={{
        height: '42px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px 0 calc(var(--sidebar-w) + 12px)',
        gap: '8px',
        flexShrink: 0,
        fontFamily: "'Syne', sans-serif",
      }}>
        {/* Search field */}
        <input
          ref={searchInputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentIdx(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher…"
          style={{
            width: '200px', height: '26px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: '5px', padding: '0 8px',
            color: 'var(--text)', fontSize: '12px',
            fontFamily: "'Syne', sans-serif", outline: 'none',
          }}
        />

        {/* Match counter */}
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace", minWidth: '54px', whiteSpace: 'nowrap' }}>
          {search ? (matchCount === 0 ? 'Aucun' : `${currentIdx + 1} / ${matchCount}`) : ''}
        </span>

        {/* Navigation */}
        <button onClick={() => navigate(-1)} disabled={matchCount === 0} title="Précédent (Maj+Entrée)" style={navBtnStyle(matchCount === 0)}>↑</button>
        <button onClick={() => navigate(1)} disabled={matchCount === 0} title="Suivant (Entrée)" style={navBtnStyle(matchCount === 0)}>↓</button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0 }} />

        {/* Replace field */}
        <input
          value={replacement}
          onChange={e => setReplacement(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') handleClose(); }}
          placeholder="Remplacer par…"
          style={{
            width: '180px', height: '26px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: '5px', padding: '0 8px',
            color: 'var(--text)', fontSize: '12px',
            fontFamily: "'Syne', sans-serif", outline: 'none',
          }}
        />

        <button
          onClick={handleReplaceCurrent}
          disabled={!search || matchCount === 0}
          style={actionBtnStyle(!search || matchCount === 0)}
        >
          Remplacer
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={!search || matchCount === 0}
          style={actionBtnStyle(!search || matchCount === 0)}
        >
          Tout remplacer
        </button>

        <div style={{ flex: 1 }} />

        {/* Close */}
        <button onClick={handleClose} title="Fermer (Échap)" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', borderRadius: '4px', lineHeight: 1 }}>✕</button>
      </div>
    </>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '24px', height: '24px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', color: disabled ? 'var(--text3)' : 'var(--text2)',
    cursor: disabled ? 'default' : 'pointer', fontSize: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, opacity: disabled ? 0.4 : 1,
  };
}

function actionBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '26px', padding: '0 10px',
    background: disabled ? 'var(--surface2)' : 'var(--surface3)',
    border: '1px solid var(--border)', borderRadius: '5px',
    color: disabled ? 'var(--text3)' : 'var(--text2)',
    cursor: disabled ? 'default' : 'pointer', fontSize: '11px', fontWeight: 600,
    fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1,
  };
}
