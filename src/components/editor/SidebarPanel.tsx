'use client';

import { PanelId } from '@/lib/types';

interface SidebarPanelProps {
  panelId: PanelId;
  activePanel: PanelId;
  title: string;
  icon: string;
  accentColor?: string;
  latexContent?: string;
  content?: string;
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
  onClose,
  inline,
}: SidebarPanelProps) {
  const isOpen = activePanel === panelId;

  if (inline) {
    // In-flow mode: fill parent container
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>
        {panelId === 'ai' && <AIPanel onClose={onClose} />}
        {panelId === 'latex' && <LaTeXPanel content={latexContent ?? ''} onClose={onClose} />}
        {panelId === 'toc' && <TOCPanel content={content ?? ''} onClose={onClose} />}
        {panelId === 'refs' && <RefsPanel onClose={onClose} />}
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
      {panelId === 'ai' && <AIPanel onClose={onClose} />}
      {panelId === 'latex' && <LaTeXPanel content={latexContent ?? ''} onClose={onClose} />}
      {panelId === 'toc' && <TOCPanel content={content ?? ''} onClose={onClose} />}
      {panelId === 'refs' && <RefsPanel onClose={onClose} />}
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
  // Convert HTML to pseudo-LaTeX for display
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="LaTeX Source" icon="{}" accentColor="var(--accent3)" monoTitle onClose={onClose} />
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
          {`% Généré automatiquement par ScriptaAI\n\\documentclass[12pt,a4paper]{article}\n\\usepackage{amsmath, amssymb}\n\\usepackage{parallel}\n\\usepackage{graphicx}\n\n\\begin{document}\n\n${latex}\n\n\\end{document}`}
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
  // Extract headings from HTML content
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

// ===== REFS PANEL =====
const DEMO_REFS = [
  { key: '[1]', authors: 'Vaswani et al., 2017', title: 'Attention Is All You Need. NeurIPS 2017.' },
  { key: '[2]', authors: 'Brown et al., 2020', title: 'Language Models are Few-Shot Learners. NeurIPS 2020.' },
  { key: '[3]', authors: 'Och & Ney, 2003', title: 'A Systematic Comparison of Various Statistical Alignment Models.' },
];

function RefsPanel({ onClose }: { onClose?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader title="Bibliographie" icon="①" accentColor="var(--accent)" onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DEMO_REFS.map(ref => (
            <div
              key={ref.key}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '11px',
                color: 'var(--text2)',
                lineHeight: 1.5,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent2)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
            >
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '11px', marginBottom: '2px' }}>{ref.authors}</div>
              {ref.title}
              <span style={{
                display: 'inline-block',
                fontFamily: "'DM Mono', monospace",
                fontSize: '9px',
                background: 'rgba(124,106,255,0.15)',
                color: 'var(--accent2)',
                borderRadius: '3px',
                padding: '1px 5px',
                marginTop: '4px',
              }}>{ref.key}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', padding: '10px', background: 'var(--surface2)', borderRadius: '6px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text3)', fontSize: '11px', cursor: 'pointer' }}>
          + Ajouter une référence
        </div>
      </div>
    </div>
  );
}

// ===== SHARED COMPONENTS =====
function PanelHeader({ title, icon, accentColor, monoTitle, onClose }: { title: string; icon: string; accentColor?: string; monoTitle?: boolean; onClose?: () => void }) {
  return (
    <div style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 10px 0 14px', borderBottom: '1px solid var(--border)', gap: '8px', flexShrink: 0 }}>
      <span style={{ fontSize: '13px' }}>{icon}</span>
      <span style={{ fontFamily: monoTitle ? "'DM Mono', monospace" : "'Syne', sans-serif", fontSize: '12px', fontWeight: 700, color: accentColor ?? 'var(--text)', flex: 1 }}>{title}</span>
      {onClose && (
        <button onClick={onClose} style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: 0 }}
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
