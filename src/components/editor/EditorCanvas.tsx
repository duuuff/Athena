'use client';

import React, { useEffect, useCallback, useRef, useState, RefObject } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Dropcursor from '@tiptap/extension-dropcursor';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { EditorMode } from '@/lib/types';
import ImageSettingsPanel from './ImageSettingsPanel';

const PAGE_W    = 794;
const PAGE_H    = 1123;
const PAGE_GAP  = 48;
const PAD_V     = 80;
const PAD_H     = 90;
const CONTENT_H = PAGE_H - PAD_V * 2;

const GRID_SCALE = 0.22;
const THUMB_W    = Math.round(PAGE_W * GRID_SCALE);
const THUMB_H    = Math.round(PAGE_H * GRID_SCALE);

export function parsePages(raw: string): string[] {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p) && p.length > 0) return p.map(String);
  } catch {}
  return raw ? [raw] : ['<p></p>'];
}

export function serializePages(pages: string[]): string {
  return JSON.stringify(pages);
}

const TabHandler = Extension.create({
  name: 'tabHandler',
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { $from } = editor.state.selection;
        let depth = $from.depth;
        while (depth > 0) {
          const name = $from.node(depth).type.name;
          if (name === 'listItem') return editor.commands.sinkListItem('listItem');
          if (name === 'taskItem') return editor.commands.sinkListItem('taskItem');
          depth--;
        }
        return editor.commands.insertContent('\u00a0\u00a0\u00a0\u00a0');
      },
      'Shift-Tab': ({ editor }) => {
        const { $from } = editor.state.selection;
        let depth = $from.depth;
        while (depth > 0) {
          const name = $from.node(depth).type.name;
          if (name === 'listItem') return editor.commands.liftListItem('listItem');
          if (name === 'taskItem') return editor.commands.liftListItem('taskItem');
          depth--;
        }
        return false;
      },
    };
  },
});

const FloatImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
        parseHTML: (el) => el.getAttribute('style'),
      },
    };
  },
}).configure({ inline: true, allowBase64: true });

interface EditorCanvasProps {
  content: string;
  onChange: (serialized: string) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  mode: EditorMode;
  focusMode?: boolean;
  canvasDark?: boolean;
  editorRef: RefObject<{
    getHTML: () => string;
    setContent: (h: string) => void;
    editor?: Editor | null;
    insertImage?: (file: File) => void;
  } | null>;
}

export default function EditorCanvas({
  content, onChange, zoom, onZoomChange, mode, focusMode, canvasDark, editorRef,
}: EditorCanvasProps) {
  const [pages, setPages]       = useState<string[]>(() => parsePages(content));
  const [activeIdx, setActiveIdx] = useState(0);
  const [showGrid, setShowGrid]   = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ src: string; element: HTMLImageElement } | null>(null);
  const [imagePanelPos, setImagePanelPos] = useState({ x: 0, y: 0 });

  const pagesRef      = useRef(pages);
  const activeIdxRef  = useRef(activeIdx);
  const swapping      = useRef(false);
  const lastContent   = useRef(content);
  const overflowGuard = useRef(false);

  pagesRef.current    = pages;
  activeIdxRef.current = activeIdx;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } } as any,
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily, TextStyle, Color,
      Highlight.configure({ multicolor: true }),
      FloatImage,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Commencez à écrire votre document…' }),
      Dropcursor.configure({ color: '#7c6aff', width: 2 }),
      Subscript, Superscript,
      TaskList, TaskItem.configure({ nested: true }),
      Typography,
      TabHandler,
      Underline,
    ],
    content: pages[0] ?? '<p></p>',
    onUpdate({ editor: ed }) {
      if (swapping.current) return;
      const html = ed.getHTML();
      const next = [...pagesRef.current];
      next[activeIdxRef.current] = html;
      pagesRef.current = next;
      setPages(next);
      onChange(serializePages(next));
    },
    immediatelyRender: false,
  });

  const switchPage = useCallback((idx: number) => {
    if (!editor || idx === activeIdxRef.current || swapping.current) return;
    swapping.current = true;
    const snap = [...pagesRef.current];
    snap[activeIdxRef.current] = editor.getHTML();
    pagesRef.current = snap;
    setPages(snap);
    editor.commands.setContent(snap[idx] ?? '<p></p>', false);
    setActiveIdx(idx);
    activeIdxRef.current = idx;
    swapping.current = false;
    requestAnimationFrame(() => editor.commands.focus('end'));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const check = () => {
      if (swapping.current || overflowGuard.current) return;
      if (dom.offsetHeight <= CONTENT_H) return;
      const { doc, selection } = editor.state;
      if (selection.$to.pos < doc.content.size - 2) return;
      if (activeIdxRef.current < pagesRef.current.length - 1) return;
      overflowGuard.current = true;
      const next = [...pagesRef.current, '<p></p>'];
      pagesRef.current = next;
      setPages(next);
      onChange(serializePages(next));
      setTimeout(() => {
        switchPage(next.length - 1);
        overflowGuard.current = false;
      }, 60);
    };
    editor.on('update', check);
    return () => editor.off('update', check);
  }, [editor, onChange, switchPage]);

  const insertImage = useCallback((file: File) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      if (src) editor.chain().focus().setImage({ src, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const ref = editorRef as React.MutableRefObject<typeof editorRef['current']>;
    ref.current = {
      getHTML: () => {
        const snap = [...pagesRef.current];
        snap[activeIdxRef.current] = editor.getHTML();
        return snap.join('\n<div style="page-break-after:always;"></div>\n');
      },
      setContent: (h: string) => {
        const np = parsePages(h);
        pagesRef.current = np;
        swapping.current = true;
        editor.commands.setContent(np[0] ?? '<p></p>', { emitUpdate: true });
        swapping.current = false;
        setPages(np);
        setActiveIdx(0);
        activeIdxRef.current = 0;
        onChange(serializePages(np));
      },
      editor,
      insertImage,
    };
    return () => { ref.current = null; };
  }, [editor, editorRef, insertImage, onChange]);

  useEffect(() => {
    if (content === lastContent.current) return;
    lastContent.current = content;
    const np = parsePages(content);
    pagesRef.current = np;
    swapping.current = true;
    if (editor) editor.commands.setContent(np[0] ?? '<p></p>', false);
    swapping.current = false;
    setPages(np);
    setActiveIdx(0);
    activeIdxRef.current = 0;
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG') {
        const img = t as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        setSelectedImage({ src: img.src, element: img });
        setImagePanelPos({ x: Math.min(rect.right + 10, window.innerWidth - 270), y: Math.min(rect.top, window.innerHeight - 420) });
      } else if (!t.closest('.image-settings-panel')) {
        setSelectedImage(null);
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [editor]);

  const addPage = useCallback((afterIdx: number) => {
    if (!editor) return;
    const snap = [...pagesRef.current];
    snap[activeIdxRef.current] = editor.getHTML();
    snap.splice(afterIdx + 1, 0, '<p></p>');
    pagesRef.current = snap;
    setPages(snap);
    onChange(serializePages(snap));
    setTimeout(() => switchPage(afterIdx + 1), 0);
  }, [editor, onChange, switchPage]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, []);
  const handleDrop     = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith('image/')) {
      e.preventDefault(); insertImage(e.dataTransfer.files[0]);
    }
  }, [insertImage]);

  if (!editor) return null;

  if (showGrid) {
    const snap = [...pagesRef.current];
    snap[activeIdx] = editor.getHTML();
    return (
      <GridView
        pages={snap}
        activeIdx={activeIdx}
        canvasDark={canvasDark}
        onPageClick={i => { setShowGrid(false); switchPage(i); }}
        onAddPage={addPage}
        onClose={() => setShowGrid(false)}
        zoom={zoom}
        onZoomChange={onZoomChange}
      />
    );
  }

  return (
    <NormalView
      pages={pages}
      activeIdx={activeIdx}
      editor={editor}
      zoom={zoom}
      onZoomChange={onZoomChange}
      canvasDark={canvasDark}
      onPageClick={switchPage}
      onAddPage={addPage}
      onShowGrid={() => setShowGrid(true)}
      selectedImage={selectedImage}
      imagePanelPos={imagePanelPos}
      onCloseImage={() => setSelectedImage(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}

interface NormalViewProps {
  pages: string[];
  activeIdx: number;
  editor: Editor;
  zoom: number;
  onZoomChange: (z: number) => void;
  canvasDark?: boolean;
  onPageClick: (i: number) => void;
  onAddPage: (afterIdx: number) => void;
  onShowGrid: () => void;
  selectedImage: { src: string; element: HTMLImageElement } | null;
  imagePanelPos: { x: number; y: number };
  onCloseImage: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function NormalView({
  pages, activeIdx, editor, zoom, onZoomChange, canvasDark,
  onPageClick, onAddPage, onShowGrid, selectedImage, imagePanelPos, onCloseImage,
  onDragOver, onDrop,
}: NormalViewProps) {
  const totalH = pages.length * (PAGE_H + PAGE_GAP) - PAGE_GAP;
  const scaleCompensation = zoom < 100 ? `${(100 - zoom) * -(totalH * 0.01)}px` : '0px';

  return (
    <div
      style={{ flex: 1, overflowY: 'auto', background: canvasDark ? '#111115' : '#dddcda', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 100px', position: 'relative' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', marginBottom: scaleCompensation }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {pages.map((pageHtml, i) => (
            <React.Fragment key={i}>
              <PageSheet
                html={pageHtml}
                index={i}
                total={pages.length}
                isActive={i === activeIdx}
                canvasDark={canvasDark}
                editor={editor}
                onActivate={() => onPageClick(i)}
              />
              {i < pages.length - 1 && (
                <AddPageGap onClick={() => onAddPage(i)} canvasDark={canvasDark} />
              )}
            </React.Fragment>
          ))}
          <AddPageEndBtn onClick={() => onAddPage(pages.length - 1)} canvasDark={canvasDark} />
        </div>
      </div>

      {selectedImage && (
        <ImageSettingsPanel
          className="image-settings-panel"
          imgElement={selectedImage.element}
          editor={editor}
          onClose={onCloseImage}
          position={imagePanelPos}
        />
      )}

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
        <button
          onClick={onShowGrid}
          style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 600, padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >⊞ Vue grille · {pages.length} page{pages.length > 1 ? 's' : ''}</button>
      </div>

      <div style={{ position: 'fixed', bottom: 16, right: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', zIndex: 30 }}>
        <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>−</button>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text2)', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
        <button onClick={() => onZoomChange(Math.min(150, zoom + 10))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>+</button>
      </div>
    </div>
  );
}

interface PageSheetProps {
  html: string;
  index: number;
  total: number;
  isActive: boolean;
  canvasDark?: boolean;
  editor: Editor;
  onActivate: () => void;
}

function PageSheet({ html, index, total, isActive, canvasDark, editor, onActivate }: PageSheetProps) {
  return (
    <div
      style={{
        width: PAGE_W,
        height: PAGE_H,
        background: canvasDark ? '#1e1e2e' : '#faf9f7',
        boxShadow: canvasDark
          ? '0 2px 12px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)'
          : '0 2px 8px rgba(0,0,0,0.12), 0 6px 24px rgba(0,0,0,0.18)',
        borderRadius: '3px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        cursor: isActive ? 'text' : 'pointer',
        outline: isActive ? '2px solid var(--accent2)' : 'none',
        outlineOffset: '1px',
        transition: 'outline 0.15s',
      }}
      onClick={!isActive ? onActivate : undefined}
    >
      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: canvasDark ? '#444460' : '#ccc', pointerEvents: 'none', zIndex: 5, userSelect: 'none' }}>
        — {index + 1} / {total} —
      </div>

      <div
        className={`doc-print-area${canvasDark ? ' canvas-dark' : ''}`}
        style={{ position: 'absolute', top: PAD_V, left: PAD_H, right: PAD_H, bottom: PAD_V, overflow: 'hidden' }}
      >
        {isActive ? (
          <EditorContent editor={editor} />
        ) : (
          <div
            className={`ProseMirror${canvasDark ? '' : ''}`}
            style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Crimson Pro', serif", fontSize: '14px', lineHeight: 1.7, color: canvasDark ? '#e8e8f0' : '#222' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}

function AddPageGap({ onClick, canvasDark }: { onClick: () => void; canvasDark?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ width: PAGE_W, height: PAGE_GAP, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      title="Ajouter une page ici"
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: hover ? 'var(--accent2)' : 'transparent',
        border: `2px solid ${hover ? 'var(--accent2)' : (canvasDark ? 'rgba(100,100,140,0.4)' : 'rgba(160,155,150,0.4)')}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hover ? 'white' : (canvasDark ? 'rgba(100,100,140,0.5)' : 'rgba(160,155,150,0.5)'),
        fontSize: 18, lineHeight: 1,
        transition: 'all 0.15s',
      }}>+</div>
    </div>
  );
}

function AddPageEndBtn({ onClick, canvasDark }: { onClick: () => void; canvasDark?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="Ajouter une page"
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: hover ? 'var(--accent2)' : 'var(--surface)',
          border: `2px solid ${hover ? 'var(--accent2)' : (canvasDark ? 'rgba(100,100,140,0.5)' : 'rgba(160,155,150,0.5)')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hover ? 'white' : (canvasDark ? 'rgba(130,130,170,0.7)' : 'rgba(140,135,130,0.7)'),
          fontSize: 22, lineHeight: 1,
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.15s',
        }}
      >+</button>
    </div>
  );
}

interface GridViewProps {
  pages: string[];
  activeIdx: number;
  canvasDark?: boolean;
  onPageClick: (i: number) => void;
  onAddPage: (afterIdx: number) => void;
  onClose: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
}

function GridView({ pages, activeIdx, canvasDark, onPageClick, onAddPage, onClose, zoom, onZoomChange }: GridViewProps) {
  const [hoverInsert, setHoverInsert] = useState<number | null>(null);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: canvasDark ? '#0b0b10' : '#c8c7c4', padding: '32px 32px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--text2)', letterSpacing: '-0.2px' }}>
          {pages.length} page{pages.length > 1 ? 's' : ''}
        </span>
        <button
          onClick={onClose}
          style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
        >✕ Vue normale</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 0 }}>
        {pages.map((pageHtml, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, margin: '0 6px' }}>
              <div
                onClick={() => onPageClick(i)}
                style={{
                  width: THUMB_W, height: THUMB_H,
                  background: canvasDark ? '#1e1e2e' : '#faf9f7',
                  boxShadow: i === activeIdx
                    ? '0 0 0 2.5px var(--accent2), 0 4px 20px rgba(0,0,0,0.4)'
                    : '0 2px 10px rgba(0,0,0,0.28)',
                  borderRadius: '2px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { if (i !== activeIdx) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 18px rgba(0,0,0,0.38)'; }}
                onMouseLeave={e => { if (i !== activeIdx) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.28)'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H, transform: `scale(${GRID_SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                  <div style={{ padding: `${PAD_V}px ${PAD_H}px` }}>
                    <div
                      className="ProseMirror"
                      style={{ fontSize: '14px', lineHeight: 1.7, color: canvasDark ? '#e8e8f0' : '#222', fontFamily: "'Crimson Pro', serif" }}
                      dangerouslySetInnerHTML={{ __html: pageHtml }}
                    />
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 3, left: 0, right: 0, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: '7px', color: '#aaa', pointerEvents: 'none' }}>{i + 1}</div>
                {i === activeIdx && (
                  <div style={{ position: 'absolute', top: 3, right: 3, background: 'var(--accent2)', borderRadius: '2px', padding: '1px 4px', fontSize: '7px', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>EN COURS</div>
                )}
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--text3)' }}>{i + 1}</span>
            </div>

            <div
              style={{ width: 28, height: THUMB_H, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              onMouseEnter={() => setHoverInsert(i)}
              onMouseLeave={() => setHoverInsert(null)}
              onClick={() => onAddPage(i)}
              title="Insérer une page ici"
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: hoverInsert === i ? 'var(--accent2)' : 'transparent',
                border: `2px solid ${hoverInsert === i ? 'var(--accent2)' : 'rgba(140,135,160,0.35)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: hoverInsert === i ? 'white' : 'rgba(140,135,160,0.4)',
                fontSize: 14, lineHeight: 1,
                transition: 'all 0.15s',
              }}>+</div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, margin: '0 6px' }}>
          <GridAddEndBtn onClick={() => onAddPage(pages.length - 1)} canvasDark={canvasDark} />
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 16, right: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', zIndex: 30 }}>
        <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>−</button>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text2)', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
        <button onClick={() => onZoomChange(Math.min(150, zoom + 10))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>+</button>
      </div>
    </div>
  );
}

function GridAddEndBtn({ onClick, canvasDark }: { onClick: () => void; canvasDark?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Ajouter une page"
      style={{
        width: THUMB_W, height: THUMB_H,
        border: `2px dashed ${hover ? 'var(--accent2)' : 'rgba(140,135,160,0.35)'}`,
        borderRadius: '3px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: hover ? 'rgba(124,106,255,0.06)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `2px solid ${hover ? 'var(--accent2)' : 'rgba(140,135,160,0.4)'}`,
        background: hover ? 'var(--accent2)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: hover ? 'white' : 'rgba(140,135,160,0.5)',
        transition: 'all 0.15s',
      }}>+</div>
      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '9px', fontWeight: 600, color: hover ? 'var(--accent2)' : 'rgba(140,135,160,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'color 0.15s' }}>Nouvelle page</span>
    </div>
  );
}
