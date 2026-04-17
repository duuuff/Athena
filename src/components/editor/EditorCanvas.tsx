'use client';

import { useEffect, useCallback, useRef, useState, RefObject } from 'react';
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
import { EditorMode } from '@/lib/types';
import ImageSettingsPanel from './ImageSettingsPanel';

// ── Page dimensions ──────────────────────────────────────────────────────────
const PAGE_W   = 794;   // A4 at 96dpi
const PAGE_H   = 1123;
const PAGE_GAP = 24;    // gap between pages
const PAD_V    = 80;    // top / bottom margin inside each page
const PAD_H    = 90;    // left / right margin inside each page
const CONTENT_H = PAGE_H - PAD_V * 2; // 963 px of content per page

// ── Tab handler extension ────────────────────────────────────────────────────
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

// ── Inline image with float/style attribute ──────────────────────────────────
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

// ── Props ────────────────────────────────────────────────────────────────────
interface EditorCanvasProps {
  content: string;
  onChange: (html: string) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  mode: EditorMode;
  focusMode?: boolean;
  canvasDark?: boolean;
  editorRef: RefObject<{
    getHTML: () => string;
    setContent: (html: string) => void;
    editor?: Editor | null;
    insertImage?: (file: File) => void;
  } | null>;
}

export default function EditorCanvas({ content, onChange, zoom, onZoomChange, mode, focusMode, canvasDark, editorRef }: EditorCanvasProps) {
  const isInitialized = useRef(false);
  const [pageCount, setPageCount] = useState(1);
  const [selectedImage, setSelectedImage] = useState<{ src: string; element: HTMLImageElement } | null>(null);
  const [imagePanelPos, setImagePanelPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // ── Editor ────────────────────────────────────────────────────────────────
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
    ],
    content,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    editorProps: {
      attributes: { class: 'ProseMirror' },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                  const src = e.target?.result as string;
                  if (src) view.dispatch(view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src, alt: 'Image collée' })
                  ));
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // ── Expose ref ────────────────────────────────────────────────────────────
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
    ref.current = { getHTML: () => editor.getHTML(), setContent: (h) => editor.commands.setContent(h, { emitUpdate: true }), editor, insertImage };
    return () => { ref.current = null; };
  }, [editor, editorRef, insertImage]);

  useEffect(() => {
    if (editor && !isInitialized.current) isInitialized.current = true;
  }, [editor]);

  // ── Page break spacing engine ─────────────────────────────────────────────
  // Pushes block elements that start past a page boundary downward so they
  // land in the content area of the next page. Dead zone per boundary =
  // bottom margin + gap + top margin = PAD_V + PAGE_GAP + PAD_V = 184 px.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const DEAD = PAGE_H - CONTENT_H + PAGE_GAP; // 80+24+80 = 184 px

    const applyBreaks = () => {
      const children = Array.from(dom.children) as HTMLElement[];
      if (!children.length) return;

      // ① Strip all previously-added extras so DOM reflects natural positions.
      children.forEach(c => {
        const extra = parseFloat((c as HTMLElement & { dataset: DOMStringMap }).dataset.pgExtra || '0');
        if (extra > 0) {
          const cur = parseFloat(c.style.marginTop) || 0;
          c.style.marginTop = (cur - extra) > 0 ? `${cur - extra}px` : '';
        }
        delete (c as HTMLElement & { dataset: DOMStringMap }).dataset.pgExtra;
      });

      // ② Read natural offsetTop values — all at once to avoid repeated reflows.
      //    These are TRUE natural positions (no extras) because we stripped above.
      const tops = children.map(c => c.offsetTop);

      // ③ Apply page-break margins.
      //    For a block at natural y, its page index = floor(y / CONTENT_H).
      //    The total extra needed for page N = N * DEAD.
      //    We only add the DIFFERENCE vs. what previous blocks already pushed.
      let cumExtra = 0;
      for (let i = 0; i < children.length; i++) {
        const page   = Math.floor(tops[i] / CONTENT_H);
        const needed = page * DEAD;
        if (needed > cumExtra) {
          const extra = needed - cumExtra;
          const cur   = parseFloat(children[i].style.marginTop) || 0;
          children[i].style.marginTop = `${cur + extra}px`;
          (children[i] as HTMLElement & { dataset: DOMStringMap }).dataset.pgExtra = String(extra);
          cumExtra = needed;
        }
      }

      // ④ Page count from total DOM height after extras are applied.
      //    domH ≈ N*CONTENT_H + (N-1)*DEAD  →  N = ceil((domH + PAD_V) / (PAGE_H + PAGE_GAP))
      const domH  = dom.offsetHeight;
      const pages = Math.max(1, Math.ceil((domH + PAD_V) / (PAGE_H + PAGE_GAP)));
      setPageCount(pages);
    };

    const schedule = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyBreaks);
    };

    // Trigger on every TipTap content change (typing, paste, formatting…)
    editor.on('update', schedule);

    // Also watch for structural DOM changes (image load, table resize, etc.)
    const mo = new MutationObserver(schedule);
    mo.observe(dom, { childList: true, subtree: false });

    schedule(); // initial run

    return () => {
      editor.off('update', schedule);
      mo.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [editor]);

  // ── Image click handler ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const editorEl = editor.view.dom as HTMLElement;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        setSelectedImage({ src: img.src, element: img });
        setImagePanelPos({ x: Math.min(rect.right + 10, window.innerWidth - 270), y: Math.min(rect.top, window.innerHeight - 420) });
      } else if (!target.closest('.image-settings-panel')) {
        setSelectedImage(null);
      }
    };
    editorEl.addEventListener('click', handleClick);
    return () => editorEl.removeEventListener('click', handleClick);
  }, [editor]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) { e.preventDefault(); insertImage(files[0]); }
  }, [insertImage]);

  if (!editor) return null;

  // ── Layout geometry ───────────────────────────────────────────────────────
  // Total height of all pages + gaps
  const totalH = pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP;

  return (
    <div
      style={{ flex: 1, overflowY: 'auto', background: canvasDark ? '#111115' : '#e8e7e3', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 80px', position: 'relative' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Scaled wrapper ── */}
      <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', marginBottom: zoom < 100 ? `${(100 - zoom) * -(totalH * 0.01)}px` : 0 }}>

        {/* ── Page layout container ── */}
        <div style={{ position: 'relative', width: PAGE_W, height: totalH }}>

          {/* Page frame backgrounds (z-index 0) */}
          {Array.from({ length: pageCount }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: i * (PAGE_H + PAGE_GAP),
              height: PAGE_H,
              background: canvasDark ? '#1e1e2e' : 'var(--doc-bg)',
              boxShadow: canvasDark ? '0 4px 32px rgba(0,0,0,0.6)' : '0 4px 32px rgba(0,0,0,0.3)',
              borderRadius: '2px',
              zIndex: 0,
            }}>
              {/* Page number */}
              <div style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#bbb', whiteSpace: 'nowrap' }}>
                — {i + 1} —
              </div>
            </div>
          ))}

          {/* Inter-page gaps — visual separator between sheets (z-index 20) */}
          {Array.from({ length: pageCount - 1 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: -60, right: -60,
              top: (i + 1) * PAGE_H + i * PAGE_GAP,
              height: PAGE_GAP,
              background: canvasDark ? '#111115' : '#e8e7e3',
              zIndex: 20,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                fontSize: '9px',
                fontFamily: "'DM Mono', monospace",
                color: canvasDark ? '#444460' : '#bbb',
                letterSpacing: '1px',
                userSelect: 'none',
              }}>· · ·</div>
            </div>
          ))}

          {/* Content — spans all pages (z-index 10) */}
          <div
            className={`doc-print-area${canvasDark ? ' canvas-dark' : ''}`}
            style={{
              position: 'absolute',
              left: PAD_H, right: PAD_H,
              top: PAD_V,
              zIndex: 10,
              minHeight: totalH - PAD_V,
            }}
          >
            <EditorContent editor={editor} />
          </div>

        </div>
      </div>

      {/* Image settings panel */}
      {selectedImage && (
        <ImageSettingsPanel
          className="image-settings-panel"
          imgElement={selectedImage.element}
          editor={editor}
          onClose={() => setSelectedImage(null)}
          position={imagePanelPos}
        />
      )}

      {/* Zoom controls */}
      <div style={{ position: 'fixed', bottom: 16, right: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', zIndex: 30 }}>
        <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>−</button>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text2)', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
        <button onClick={() => onZoomChange(Math.min(150, zoom + 10))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>+</button>
      </div>

      {/* Drag hint */}
      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text3)', pointerEvents: 'none' }}>
        Glissez une image ici · Cliquez sur une image pour la régler
      </div>
    </div>
  );
}
