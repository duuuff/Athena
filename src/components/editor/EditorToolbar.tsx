'use client';

import { RefObject, useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import EquationModal from './EquationModal';

interface EditorToolbarProps {
  editorRef: RefObject<{
    getHTML: () => string;
    setContent: (html: string) => void;
    editor?: Editor | null;
    insertImage?: (file: File) => void;
  } | null>;
}

function useEditorWithUpdates(editorRef: EditorToolbarProps['editorRef']): Editor | null {
  const [editor, setEditor] = useState<Editor | null>(null);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const tryAttach = () => {
      const e = (editorRef.current as unknown as { editor?: Editor | null })?.editor ?? null;
      if (e) {
        setEditor(e);
        clearInterval(interval);
        e.on('selectionUpdate', () => setEditor(prev => prev));
        e.on('transaction', () => setEditor(prev => prev));
      }
    };
    interval = setInterval(tryAttach, 50);
    tryAttach();
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return editor;
}

export default function EditorToolbar({ editorRef }: EditorToolbarProps) {
  const editor = useEditorWithUpdates(editorRef);
  const [showEquation, setShowEquation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sep = <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />;

  function btn(
    label: React.ReactNode,
    action: () => void,
    active?: boolean,
    title?: string,
    style?: React.CSSProperties,
  ) {
    return (
      <button
        key={title}
        onMouseDown={e => { e.preventDefault(); action(); }}
        title={title}
        style={{
          width: '30px', height: '28px',
          background: active ? 'var(--accent2)' : 'transparent',
          border: 'none', borderRadius: '4px',
          color: active ? 'white' : 'var(--text2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', transition: 'all 0.1s', flexShrink: 0, fontFamily: 'inherit',
          ...style,
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface3)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        {label}
      </button>
    );
  }

  function wideBtn(label: string, action: () => void, active?: boolean, title?: string) {
    return (
      <button
        key={title ?? label}
        onMouseDown={e => { e.preventDefault(); action(); }}
        title={title}
        style={{
          height: '28px', padding: '0 8px',
          background: active ? 'var(--accent2)' : 'transparent',
          border: 'none', borderRadius: '4px',
          color: active ? 'white' : 'var(--text2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 600, transition: 'all 0.1s', flexShrink: 0,
          fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface3)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        {label}
      </button>
    );
  }

  function StyleSelect() {
    const current = editor?.isActive('heading', { level: 1 }) ? '1'
      : editor?.isActive('heading', { level: 2 }) ? '2'
      : editor?.isActive('heading', { level: 3 }) ? '3'
      : editor?.isActive('heading', { level: 4 }) ? '4'
      : editor?.isActive('blockquote') ? 'bq'
      : editor?.isActive('codeBlock') ? 'code'
      : 'p';

    return (
      <select value={current} onChange={e => {
        const v = e.target.value;
        if (v === 'p') editor?.chain().focus().setParagraph().run();
        else if (v === 'bq') editor?.chain().focus().setBlockquote().run();
        else if (v === 'code') editor?.chain().focus().setCodeBlock().run();
        else editor?.chain().focus().setHeading({ level: parseInt(v) as 1|2|3|4 }).run();
      }} style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 500, padding: '3px 6px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text2)', cursor: 'pointer', outline: 'none', flexShrink: 0, height: '26px' }}>
        <option value="p">Corps du texte</option>
        <option value="1">Titre 1</option>
        <option value="2">Titre 2</option>
        <option value="3">Titre 3</option>
        <option value="4">Titre 4</option>
        <option value="bq">Citation</option>
        <option value="code">Code</option>
      </select>
    );
  }

  function FontSelect() {
    const fonts = ['Crimson Pro', 'Syne', 'DM Mono', 'Arial', 'Georgia', 'Times New Roman'];
    return (
      <select onChange={e => editor?.chain().focus().setFontFamily(e.target.value).run()}
        style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', padding: '3px 6px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text2)', cursor: 'pointer', outline: 'none', flexShrink: 0, height: '26px', width: '110px' }}>
        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
    );
  }

  function FontSizeInput() {
    return (
      <input type="number" min={8} max={72} defaultValue={14}
        onChange={e => {
          const size = parseInt(e.target.value);
          if (size >= 8 && size <= 72)
            (editor?.chain().focus() as unknown as { setFontSize: (s: string) => { run: () => void } })?.setFontSize?.(`${size}px`)?.run?.();
        }}
        style={{ width: '40px', fontFamily: "'DM Mono', monospace", fontSize: '11px', textAlign: 'center', padding: '3px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', outline: 'none', flexShrink: 0, height: '26px' }}
      />
    );
  }

  function ColorPicker() {
    return (
      <label title="Couleur du texte" style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <input type="color" defaultValue="#222222" onChange={e => editor?.chain().focus().setColor(e.target.value).run()} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        <div style={{ width: '30px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', cursor: 'pointer', transition: 'background 0.1s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface3)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>A</div>
      </label>
    );
  }

  function HighlightPicker() {
    return (
      <label title="Surlignage" style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <input type="color" defaultValue="#fef08a" onChange={e => editor?.chain().focus().setHighlight({ color: e.target.value }).run()} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        <div style={{ width: '30px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', cursor: 'pointer', transition: 'background 0.1s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface3)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>🖊</div>
      </label>
    );
  }

  return (
    <>
      <div style={{ height: '40px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px 0 calc(var(--sidebar-w) + 10px)', gap: '2px', flexShrink: 0, overflowX: 'auto' }}>

        <StyleSelect />
        <div style={{ width: '6px' }} />
        <FontSelect />
        <div style={{ width: '4px' }} />
        <FontSizeInput />

        {sep}

        {/* Basic formatting */}
        {btn(<b style={{ fontFamily: "'Crimson Pro', serif", fontSize: '15px' }}>B</b>, () => editor?.chain().focus().toggleBold().run(), editor?.isActive('bold'), 'Gras (Ctrl+B)')}
        {btn(<i style={{ fontFamily: "'Crimson Pro', serif", fontSize: '15px' }}>I</i>, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive('italic'), 'Italique (Ctrl+I)')}
        {btn(<u style={{ fontFamily: "'Crimson Pro', serif", fontSize: '15px' }}>U</u>, () => editor?.chain().focus().toggleUnderline().run(), editor?.isActive('underline'), 'Souligné (Ctrl+U)')}
        {btn(<s style={{ fontFamily: "'Crimson Pro', serif", fontSize: '15px' }}>S</s>, () => editor?.chain().focus().toggleStrike().run(), editor?.isActive('strike'), 'Barré')}
        <ColorPicker />
        <HighlightPicker />

        {sep}

        {/* Alignment */}
        {btn('⬛', () => editor?.chain().focus().setTextAlign('left').run(), editor?.isActive({ textAlign: 'left' }), 'Aligner à gauche', { fontSize: '11px' })}
        {btn('⬛', () => editor?.chain().focus().setTextAlign('center').run(), editor?.isActive({ textAlign: 'center' }), 'Centrer', { fontSize: '11px' })}
        {btn('⬛', () => editor?.chain().focus().setTextAlign('right').run(), editor?.isActive({ textAlign: 'right' }), 'Aligner à droite', { fontSize: '11px' })}
        {btn('⬛', () => editor?.chain().focus().setTextAlign('justify').run(), editor?.isActive({ textAlign: 'justify' }), 'Justifier', { fontSize: '11px' })}

        {sep}

        {/* Lists */}
        {btn('•≡', () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive('bulletList'), 'Liste à puces', { fontSize: '12px', letterSpacing: '-1px' })}
        {btn('1.', () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive('orderedList'), 'Liste numérotée', { fontSize: '12px' })}
        {btn('☑', () => editor?.chain().focus().toggleTaskList().run(), editor?.isActive('taskList'), 'Liste de tâches', { fontSize: '13px' })}

        {sep}

        {/* Indent */}
        {btn('⇥', () => editor?.chain().focus().sinkListItem('listItem').run(), false, 'Augmenter le retrait', { fontSize: '15px' })}
        {btn('⇤', () => editor?.chain().focus().liftListItem('listItem').run(), false, 'Diminuer le retrait', { fontSize: '15px' })}

        {sep}

        {/* Insert image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              const insertFn = (editorRef.current as unknown as { insertImage?: (f: File) => void })?.insertImage;
              if (insertFn) insertFn(file);
            }
            e.target.value = '';
          }}
        />
        {btn('🖼', () => fileInputRef.current?.click(), false, 'Insérer une image', { fontSize: '14px' })}

        {/* Equation modal */}
        {wideBtn('∑ Éq.', () => setShowEquation(true), false, 'Insérer une équation')}

        {btn('⊞', () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), false, 'Insérer un tableau', { fontSize: '14px' })}
        {btn('—', () => editor?.chain().focus().setHorizontalRule().run(), false, 'Séparateur horizontal', { fontSize: '16px' })}
        {btn('🔗', () => {
          const url = window.prompt('URL du lien :');
          if (url) editor?.chain().focus().setLink({ href: url }).run();
        }, editor?.isActive('link'), 'Insérer un lien', { fontSize: '13px' })}
        {btn('x₂', () => editor?.chain().focus().toggleSubscript().run(), editor?.isActive('subscript'), 'Indice', { fontSize: '12px' })}
        {btn('x²', () => editor?.chain().focus().toggleSuperscript().run(), editor?.isActive('superscript'), 'Exposant', { fontSize: '12px' })}

        {sep}

        {/* Table controls (contextual) */}
        {editor?.isActive('table') && (
          <>
            {wideBtn('+ Col', () => editor?.chain().focus().addColumnAfter().run(), false, 'Ajouter une colonne')}
            {wideBtn('− Col', () => editor?.chain().focus().deleteColumn().run(), false, 'Supprimer la colonne')}
            {wideBtn('+ Lig', () => editor?.chain().focus().addRowAfter().run(), false, 'Ajouter une ligne')}
            {wideBtn('− Lig', () => editor?.chain().focus().deleteRow().run(), false, 'Supprimer la ligne')}
            {wideBtn('✕ Tab', () => editor?.chain().focus().deleteTable().run(), false, 'Supprimer le tableau')}
            {sep}
          </>
        )}

        {btn('↩', () => editor?.chain().focus().undo().run(), false, 'Annuler (Ctrl+Z)', { fontSize: '16px' })}
        {btn('↪', () => editor?.chain().focus().redo().run(), false, 'Rétablir (Ctrl+Y)', { fontSize: '16px' })}
        {btn('✕', () => editor?.chain().focus().unsetAllMarks().clearNodes().run(), false, 'Effacer la mise en forme', { fontSize: '12px', marginLeft: '2px' })}
      </div>

      {/* Equation Modal */}
      {showEquation && (
        <EquationModal
          onInsert={eq => {
            editor?.chain().focus().insertContent(
              `<code class="equation">${eq}</code>&nbsp;`
            ).run();
          }}
          onClose={() => setShowEquation(false)}
        />
      )}
    </>
  );
}
