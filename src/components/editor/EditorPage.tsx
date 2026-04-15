'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDocument, saveDocument, saveVersion, getVersions, countWords } from '@/lib/storage';
import { Document, DocumentVersion, SaveStatus, EditorMode, PanelId } from '@/lib/types';
import EditorToolbar from './EditorToolbar';
import EditorCanvas from './EditorCanvas';
import SidebarPanel from './SidebarPanel';
import VersionHistoryModal from './VersionHistoryModal';
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<{ getHTML: () => string; setContent: (html: string) => void; editor?: Editor | null } | null>(null);

  useEffect(() => {
    const loaded = getDocument(documentId);
    if (!loaded) { router.push('/'); return; }
    setDoc(loaded);
    setTitle(loaded.title);
    setContent(loaded.content);
    setLiveWordCount(loaded.wordCount);
  }, [documentId, router]);

  const triggerSave = useCallback((newContent: string, newTitle: string) => {
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
    const label = `Version — ${new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    saveVersion({ id: uuidv4(), documentId, content, savedAt: new Date().toISOString(), label });
    setVersions(getVersions(documentId));
  }, [documentId, content]);

  const handleRestoreVersion = useCallback((versionContent: string) => {
    setContent(versionContent);
    editorRef.current?.setContent(versionContent);
    triggerSave(versionContent, title);
    setShowVersions(false);
  }, [title, triggerSave]);

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

  if (!doc) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontFamily: "'DM Mono', monospace", fontSize: '13px' }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', fontFamily: "'Syne', sans-serif" }}>
      <TopBar
        title={title}
        saveStatus={saveStatus}
        mode={mode}
        onTitleChange={handleTitleChange}
        onModeChange={handleModeChange}
        onBack={() => router.push('/')}
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

          // Use a hidden iframe to print without opening a new window
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
        wordCount={liveWordCount}
      />

      <EditorToolbar editorRef={editorRef} />

      {/* MAIN AREA: sidebar icons | panel (in-flow) | editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftSidebar activePanel={activePanel} onTogglePanel={togglePanel} />

        {/* In-flow panel — pushes the editor canvas */}
        {activePanel && (
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
              title={activePanel === 'ai' ? 'ScriptaAI' : activePanel === 'latex' ? 'LaTeX Source' : activePanel === 'toc' ? 'Plan du document' : 'Bibliographie'}
              icon={activePanel === 'ai' ? '✦' : activePanel === 'latex' ? '{}' : activePanel === 'toc' ? '☰' : '①'}
              accentColor={activePanel === 'ai' ? 'var(--accent2)' : activePanel === 'latex' ? 'var(--accent3)' : 'var(--accent)'}
              latexContent={content}
              content={content}
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
  onTitleChange: (t: string) => void;
  onModeChange: (m: EditorMode) => void;
  onBack: () => void;
  onSaveVersion: () => void;
  onShowVersions: () => void;
  onExportPDF: () => void;
  wordCount: number;
}

function TopBar({ title, saveStatus, mode, onTitleChange, onModeChange, onBack, onSaveVersion, onShowVersions, onExportPDF, wordCount }: TopBarProps) {
  const statusConfig = {
    saved: { color: 'var(--green)', label: 'Enregistré', pulse: true },
    saving: { color: 'var(--accent3)', label: 'Enregistrement…', pulse: false },
    unsaved: { color: 'var(--orange)', label: 'Non sauvegardé', pulse: false },
    error: { color: 'var(--red)', label: 'Erreur', pulse: false },
  }[saveStatus];

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
      {wordCount > 0 && <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0 }}>{wordCount} mots</span>}
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
        <button onClick={onSaveVersion} title="Sauvegarder une version" style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>💾 Version</button>
        <button onClick={onShowVersions} style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer' }}>Historique</button>
        <button onClick={onExportPDF} style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '6px', border: 'none', background: 'var(--accent2)', color: 'white', cursor: 'pointer' }}>Exporter PDF</button>
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
