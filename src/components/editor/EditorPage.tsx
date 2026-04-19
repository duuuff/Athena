'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDocument, saveDocument, saveVersion, getVersions, countWords, computeStats } from '@/lib/storage';
import { Document, DocumentVersion, SaveStatus, EditorMode, PanelId, DocStats } from '@/lib/types';
import { htmlToMarkdown } from '@/lib/htmlToMarkdown';
import { markdownToHtml } from '@/lib/markdownToHtml';
import EditorToolbar from './EditorToolbar';
import EditorCanvas from './EditorCanvas';
import SidebarPanel from './SidebarPanel';
import VersionHistoryModal from './VersionHistoryModal';
import FindReplaceBar from './FindReplaceBar';
import StatsModal from './StatsModal';
import { v4 as uuidv4 } from 'uuid';
import { Editor } from '@tiptap/react';

interface EditorPageProps {
  documentId: string;
}

const AUTOSAVE_DELAY = 2000;

export default function EditorPage({ documentId }: EditorPageProps) {
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [mode, setMode] = useState<EditorMode>('visual');
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [zoom, setZoom] = useState(100);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [canvasDark, setCanvasDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('scripta_canvas_dark') === 'true';
    return false;
  });
  const [wordGoal, setWordGoalState] = useState<number | undefined>(undefined);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<{ getHTML: () => string; setContent: (html: string) => void; editor?: Editor | null } | null>(null);

  useEffect(() => {
    const loaded = getDocument(documentId);
    if (!loaded) { router.push('/'); return; }
    setDoc(loaded);
    setTitle(loaded.title);
    setContent(loaded.content);
    setLiveWordCount(loaded.wordCount);
    setWordGoalState(loaded.wordGoal);
  }, [documentId, router]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
        return;
      }
      if (mod && e.key === 'f') {
        e.preventDefault();
        if (focusMode) return;
        setShowFindReplace(prev => !prev);
        return;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusMode]);

  const triggerSave = useCallback((newContent: string, newTitle: string, goal?: number | undefined) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('unsaved');
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      const wc = countWords(newContent);
      const updated: Document = {
        id: documentId,
        title: newTitle,
        content: newContent,
        createdAt: doc?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: wc,
        tags: doc?.tags,
        pinned: doc?.pinned,
        wordGoal: goal !== undefined ? goal : doc?.wordGoal,
      };
      saveDocument(updated);
      setDoc(updated);
      setSaveStatus('saved');
    }, AUTOSAVE_DELAY);
  }, [documentId, doc]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setLiveWordCount(countWords(newContent));
    triggerSave(newContent, title);
  }, [title, triggerSave]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    triggerSave(content, newTitle);
  }, [content, triggerSave]);

  const handleSaveVersion = useCallback(() => {
    const label = versionLabel.trim()
      || `Version — ${new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    saveVersion({ id: uuidv4(), documentId, content, savedAt: new Date().toISOString(), label });
    setVersions(getVersions(documentId));
    setVersionLabel('');
  }, [documentId, content, versionLabel]);

  const handleExportMarkdown = useCallback(() => {
    const html = editorRef.current?.getHTML() ?? content;
    const md = htmlToMarkdown(html);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }, [content, title]);

  const handleRestoreVersion = useCallback((versionContent: string) => {
    setContent(versionContent);
    editorRef.current?.setContent(versionContent);
    triggerSave(versionContent, title);
    setShowVersions(false);
  }, [title, triggerSave]);

  const handleInsertCitation = useCallback((text: string) => {
    editorRef.current?.editor?.commands.insertContent(text);
  }, []);

  const handleScrollToHeading = useCallback((index: number) => {
    const proseMirror = document.querySelector('.ProseMirror');
    if (!proseMirror) return;
    const headings = proseMirror.querySelectorAll('h1, h2, h3, h4');
    const target = headings[index] as HTMLElement | undefined;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleImportMarkdown = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const md = ev.target?.result as string;
      const html = markdownToHtml(md);
      editorRef.current?.setContent(html);
      handleContentChange(html);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, [handleContentChange]);

  const handleSetWordGoal = useCallback((goal: number | undefined) => {
    setWordGoalState(goal);
    const wc = countWords(content);
    const updated: Document = {
      id: documentId,
      title,
      content,
      createdAt: doc?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: wc,
      tags: doc?.tags,
      pinned: doc?.pinned,
      wordGoal: goal,
    };
    saveDocument(updated);
    setDoc(updated);
  }, [documentId, title, content, doc]);

  function toggleCanvasDark() {
    setCanvasDark(prev => {
      const next = !prev;
      localStorage.setItem('scripta_canvas_dark', String(next));
      return next;
    });
  }

  function togglePanel(panel: PanelId) {
    setActivePanel(prev => prev === panel ? null : panel);
  }

  function handleModeChange(newMode: EditorMode) {
    setMode(newMode);
    if (newMode === 'split' || newMode === 'latex') {
      setActivePanel('latex');
    } else if (activePanel === 'latex') {
      setActivePanel(null);
    }
  }

  function handleReplace(search: string, replacement: string, replaceAll: boolean) {
    const html = editorRef.current?.getHTML() ?? '';
    if (!search) return;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, replaceAll ? 'gi' : 'i');
    const newHtml = html.replace(regex, replacement);
    editorRef.current?.setContent(newHtml);
    handleContentChange(newHtml);
  }

  if (!doc) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontFamily: "'DM Mono', monospace", fontSize: '13px' }}>Chargement…</div>
      </div>
    );
  }

  const stats: DocStats = computeStats(content);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', fontFamily: "'Syne', sans-serif" }}>
      <input
        ref={importInputRef}
        type="file"
        accept=".md,.txt"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <TopBar
        title={title}
        saveStatus={saveStatus}
        mode={mode}
        focusMode={focusMode}
        wordCount={liveWordCount}
        wordGoal={wordGoal}
        onTitleChange={handleTitleChange}
        onModeChange={handleModeChange}
        onBack={() => router.push('/')}
        onToggleFocus={() => {
          setFocusMode(f => {
            const next = !f;
            if (next) { setActivePanel(null); setShowFindReplace(false); }
            return next;
          });
        }}
        onShowStats={() => setShowStats(true)}
        canvasDark={canvasDark}
        onToggleCanvasDark={toggleCanvasDark}
        onImportMarkdown={handleImportMarkdown}
        onSetWordGoal={handleSetWordGoal}
        onExportPDF={() => {
          const html = editorRef.current?.getHTML() ?? '';
          const docHTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 20mm 25mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.8; color: #222; background: white; margin: 0; padding: 0; }
  h1 { font-size: 22px; font-weight: 700; color: #111; margin: 32px 0 8px; line-height: 1.3; }
  h1:first-child { margin-top: 0; }
  h2 { font-size: 16px; font-weight: 600; color: #333; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1.5px solid #ddd; }
  h3 { font-size: 14px; font-weight: 600; color: #444; margin: 20px 0 8px; }
  h4 { font-size: 13px; font-weight: 600; color: #555; margin: 16px 0 6px; }
  p { margin: 0 0 12px; }
  ul { list-style: disc; padding-left: 24px; margin: 0 0 12px; }
  ol { list-style: decimal; padding-left: 24px; margin: 0 0 12px; }
  ul ul { list-style: circle; }
  li { margin-bottom: 4px; }
  li p { margin: 0; }
  blockquote { background: #f0ede8; border-left: 3px solid #c0b8b0; padding: 12px 16px; margin: 14px 0; color: #555; font-style: italic; }
  blockquote p { margin: 0; }
  code { font-family: monospace; font-size: 12px; background: #f0ede8; padding: 1px 5px; border-radius: 3px; color: #555; }
  pre { background: #1e1e24; color: #e8e8f0; font-family: monospace; font-size: 12px; padding: 16px; margin-bottom: 12px; }
  pre code { background: none; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; font-size: 13px; vertical-align: top; }
  th { background: #f0ede8; font-weight: 600; font-size: 12px; text-align: left; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1.5px solid #ddd; margin: 20px 0; }
  a { color: #7c6aff; }
</style></head><body>${html}</body></html>`;

          const iframe = document.createElement('iframe');
          iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
          document.body.appendChild(iframe);
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) { document.body.removeChild(iframe); return; }
          iframeDoc.open();
          iframeDoc.write(docHTML);
          iframeDoc.close();
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 500);
        }}
        onSaveVersion={handleSaveVersion}
        onShowVersions={() => { setVersions(getVersions(documentId)); setShowVersions(true); }}
        onExportMarkdown={handleExportMarkdown}
        versionLabel={versionLabel}
        onVersionLabelChange={setVersionLabel}
      />

      {!focusMode && <EditorToolbar editorRef={editorRef} />}
      {!focusMode && showFindReplace && (
        <FindReplaceBar
          editorRef={editorRef}
          content={content}
          onReplace={handleReplace}
          onClose={() => setShowFindReplace(false)}
        />
      )}

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!focusMode && <LeftSidebar activePanel={activePanel} onTogglePanel={togglePanel} />}

        {!focusMode && activePanel && (
          <div style={{
            width: '320px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideIn 0.2s ease',
          }}>
            <SidebarPanel
              panelId={activePanel}
              activePanel={activePanel}
              title={activePanel === 'ai' ? 'ScriptaAI' : activePanel === 'latex' ? 'LaTeX Source' : activePanel === 'toc' ? 'Plan du document' : activePanel === 'notes' ? 'Notes rapides' : 'Bibliographie'}
              icon={activePanel === 'ai' ? '✦' : activePanel === 'latex' ? '{}' : activePanel === 'toc' ? '☰' : activePanel === 'notes' ? '✏' : '①'}
              accentColor={activePanel === 'ai' ? 'var(--accent2)' : activePanel === 'latex' ? 'var(--accent3)' : activePanel === 'notes' ? 'var(--accent3)' : 'var(--accent)'}
              latexContent={content}
              content={content}
              documentId={documentId}
              onInsertCitation={handleInsertCitation}
              onScrollToHeading={handleScrollToHeading}
              onClose={() => setActivePanel(null)}
              inline
            />
          </div>
        )}

        <EditorCanvas
          content={content}
          onChange={handleContentChange}
          zoom={zoom}
          onZoomChange={setZoom}
          mode={mode}
          editorRef={editorRef}
          focusMode={focusMode}
          canvasDark={canvasDark}
        />
      </div>

      {showVersions && (
        <VersionHistoryModal
          versions={versions}
          currentContent={content}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}

      {showStats && (
        <StatsModal stats={stats} title={title} onClose={() => setShowStats(false)} />
      )}

      <style>{`
        @keyframes slideIn { from { width: 0; opacity: 0; } to { width: 320px; opacity: 1; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ============ TOP BAR ============
interface TopBarProps {
  title: string;
  saveStatus: SaveStatus;
  mode: EditorMode;
  focusMode: boolean;
  versionLabel: string;
  canvasDark: boolean;
  wordCount: number;
  wordGoal?: number;
  onVersionLabelChange: (v: string) => void;
  onTitleChange: (t: string) => void;
  onModeChange: (m: EditorMode) => void;
  onBack: () => void;
  onSaveVersion: () => void;
  onShowVersions: () => void;
  onExportPDF: () => void;
  onExportMarkdown: () => void;
  onImportMarkdown: () => void;
  onToggleFocus: () => void;
  onToggleCanvasDark: () => void;
  onShowStats: () => void;
  onSetWordGoal: (goal: number | undefined) => void;
}

function TopBar({ title, saveStatus, mode, focusMode, versionLabel, canvasDark, onVersionLabelChange, onTitleChange, onModeChange, onBack, onSaveVersion, onShowVersions, onExportPDF, onExportMarkdown, onImportMarkdown, onToggleFocus, onToggleCanvasDark, onShowStats, onSetWordGoal, wordCount, wordGoal }: TopBarProps) {
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(wordGoal ?? ''));
  const statusConfig = {
    saved: { color: 'var(--green)', label: 'Enregistré', pulse: true },
    saving: { color: 'var(--accent3)', label: 'Enregistrement…', pulse: false },
    unsaved: { color: 'var(--orange)', label: 'Non sauvegardé', pulse: false },
    error: { color: 'var(--red)', label: 'Erreur', pulse: false },
  }[saveStatus];

  if (focusMode) {
    return (
      <div style={{ height: '36px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px', flexShrink: 0, opacity: 0.7 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Sans titre'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: statusConfig.color, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusConfig.color, display: 'inline-block', animation: statusConfig.pulse ? 'pulse 2s infinite' : 'none' }} />
          {statusConfig.label}
        </div>
        <button onClick={onToggleFocus} title="Quitter le mode focus (Échap)" style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text3)', cursor: 'pointer' }}>✕ Focus</button>
      </div>
    );
  }

  return (
    <div style={{ height: '48px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px 0 calc(var(--sidebar-w) + 16px)', gap: '10px', flexShrink: 0 }}>
      <button onClick={onBack} title="Tableau de bord" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 4px', borderRadius: '4px' }}>←</button>
      <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
        Scripta<span style={{ color: 'var(--accent3)' }}>AI</span>
      </span>
      <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />
      <input
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', minWidth: '160px', flex: 1, fontFamily: "'Syne', sans-serif" }}
        placeholder="Sans titre"
      />
      <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: statusConfig.color, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0 }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusConfig.color, display: 'inline-block', animation: statusConfig.pulse ? 'pulse 2s infinite' : 'none' }} />
        {statusConfig.label}
      </div>
      {wordCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>
            {wordGoal ? `${wordCount} / ${wordGoal} mots · ${Math.min(100, Math.round(wordCount / wordGoal * 100))}%` : `${wordCount} mots · ~${Math.ceil(wordCount / 200)} min`}
          </span>
          {wordGoal && (
            <div style={{ width: '120px', height: '3px', background: 'var(--surface3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, wordCount / wordGoal * 100)}%`, background: wordCount >= wordGoal ? 'var(--green)' : 'var(--accent2)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
            </div>
          )}
        </div>
      )}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
          {(['visual', 'split', 'latex'] as EditorMode[]).map((m, i) => (
            <button key={m} onClick={() => onModeChange(m)} style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 600, padding: '5px 12px', background: mode === m ? 'var(--surface3)' : 'transparent', border: 'none', color: mode === m ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer' }}>
              {['Visuel', 'Split', 'LaTeX'][i]}
            </button>
          ))}
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
        <button onClick={onShowStats} title="Statistiques du document" style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>≡ Stats</button>
        <button onClick={onToggleCanvasDark} title={canvasDark ? 'Passer en fond clair' : 'Passer en fond sombre'} style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: canvasDark ? 'var(--surface3)' : 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>{canvasDark ? '☀' : '🌙'}</button>
        <button onClick={onToggleFocus} title="Mode focus (distraction-free)" style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>⛶ Focus</button>
        <input
          value={versionLabel}
          onChange={e => onVersionLabelChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSaveVersion(); }}
          placeholder="Nom de version…"
          style={{ width: '130px', fontFamily: "'Syne', sans-serif", fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', outline: 'none' }}
        />
        <button onClick={onSaveVersion} title="Sauvegarder une version (Enter)" style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>💾</button>
        <button onClick={onShowVersions} style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>Historique</button>
        <button onClick={onImportMarkdown} title="Importer un fichier Markdown (.md)" style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>↑ MD</button>
        <button onClick={onExportMarkdown} title="Télécharger en Markdown" style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>↓ MD</button>
        <button onClick={onExportPDF} style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '6px', border: 'none', background: 'var(--accent2)', color: 'white', cursor: 'pointer' }}>↓ PDF</button>
        {showGoalInput ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              autoFocus
              type="number"
              min="1"
              value={goalDraft}
              onChange={e => setGoalDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const n = parseInt(goalDraft);
                  onSetWordGoal(isNaN(n) || n <= 0 ? undefined : n);
                  setShowGoalInput(false);
                }
                if (e.key === 'Escape') setShowGoalInput(false);
              }}
              placeholder="Objectif…"
              style={{ width: '90px', fontFamily: "'Syne', sans-serif", fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--accent2)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none' }}
            />
            <button onClick={() => { const n = parseInt(goalDraft); onSetWordGoal(isNaN(n) || n <= 0 ? undefined : n); setShowGoalInput(false); }} style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'var(--accent2)', color: 'white', cursor: 'pointer' }}>✓</button>
            {wordGoal && <button onClick={() => { onSetWordGoal(undefined); setShowGoalInput(false); }} style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--red)', cursor: 'pointer' }}>✕</button>}
          </div>
        ) : (
          <button onClick={() => { setGoalDraft(String(wordGoal ?? '')); setShowGoalInput(true); }} title={wordGoal ? `Objectif : ${wordGoal} mots` : 'Définir un objectif de mots'} style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: wordGoal ? 'rgba(124,106,255,0.12)' : 'var(--surface2)', color: wordGoal ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer' }}>⊙</button>
        )}
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent2), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0 }}>ML</div>
      </div>
    </div>
  );
}

// ============ LEFT SIDEBAR ============
interface LeftSidebarProps {
  activePanel: PanelId;
  onTogglePanel: (p: PanelId) => void;
}

function LeftSidebar({ activePanel, onTogglePanel }: LeftSidebarProps) {
  const buttons: Array<{ id: PanelId; icon: string; tip: string }> = [
    { id: 'ai', icon: '✦', tip: 'Chat IA' },
    { id: 'latex', icon: '{}', tip: 'Code LaTeX' },
    { id: 'toc', icon: '☰', tip: 'Plan' },
    { id: 'refs', icon: '①', tip: 'Bibliographie' },
    { id: 'notes', icon: '✏', tip: 'Notes rapides' },
  ];

  return (
    <div style={{ width: 'var(--sidebar-w)', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: '4px', flexShrink: 0 }}>
      {buttons.map(b => (
        <button
          key={b.id}
          onClick={() => onTogglePanel(b.id)}
          title={b.tip}
          style={{
            width: '32px', height: '32px',
            background: activePanel === b.id ? 'rgba(124,106,255,0.15)' : 'transparent',
            border: 'none', borderRadius: '6px',
            color: activePanel === b.id ? 'var(--accent2)' : 'var(--text3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', transition: 'all 0.15s', position: 'relative',
          }}
        >
          {activePanel === b.id && <span style={{ position: 'absolute', left: '-1px', top: '6px', bottom: '6px', width: '2px', background: 'var(--accent2)', borderRadius: '0 2px 2px 0' }} />}
          {b.icon}
        </button>
      ))}
    </div>
  );
}
