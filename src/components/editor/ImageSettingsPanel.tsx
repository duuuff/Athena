'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';

interface ImageSettingsPanelProps {
  imgElement: HTMLImageElement;
  editor: Editor;
  onClose: () => void;
  position: { x: number; y: number };
  className?: string;
}

type FloatType = 'none' | 'left' | 'right' | 'center' | 'full';

function buildStyle(w: string, f: FloatType): string {
  let s = '';
  if (f === 'left')   s = 'float:left;margin:0 16px 8px 0;';
  else if (f === 'right')  s = 'float:right;margin:0 0 8px 16px;';
  else if (f === 'center') s = 'display:block;margin:0 auto;';
  else if (f === 'full')   s = 'width:100%;display:block;margin:0 auto;';
  if (w && f !== 'full') s += `width:${w};`;
  return s;
}

export default function ImageSettingsPanel({ imgElement, editor, onClose, position, className }: ImageSettingsPanelProps) {
  const [width, setWidth] = useState('');
  const [float, setFloat] = useState<FloatType>('none');
  const [alt, setAlt] = useState('');

  useEffect(() => {
    const styleStr = imgElement.getAttribute('style') || '';
    setAlt(imgElement.alt || '');
    if (/float:\s*left/.test(styleStr))    setFloat('left');
    else if (/float:\s*right/.test(styleStr)) setFloat('right');
    else if (/margin:0 auto/.test(styleStr))  setFloat('center');
    else if (/width:\s*100%/.test(styleStr))  setFloat('full');
    else setFloat('none');
    const wm = styleStr.match(/width:([^;]+)/);
    setWidth(wm ? wm[1] : '');
  }, [imgElement]);

  function applyWidth(w: string) {
    setWidth(w);
    editor.commands.updateAttributes('image', { style: buildStyle(w, float) });
  }

  function applyFloat(f: FloatType) {
    setFloat(f);
    const w = f === 'full' ? '100%' : width;
    if (f === 'full') setWidth('100%');
    editor.commands.updateAttributes('image', { style: buildStyle(w, f) });
  }

  function applyAlt(a: string) {
    setAlt(a);
    editor.commands.updateAttributes('image', { alt: a });
  }

  const label = (txt: string) => (
    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px', fontFamily: "'DM Mono', monospace" }}>{txt}</div>
  );

  const fieldStyle: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '5px', padding: '5px 8px', color: 'var(--text)', fontSize: '12px', outline: 'none', fontFamily: "'Syne', sans-serif" };

  return (
    <div className={className} onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', left: position.x, top: position.y, width: '250px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200, fontFamily: "'Syne', sans-serif" }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>🖼 Paramètres image</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
      </div>

      <div style={{ padding: '14px' }}>
        {/* Alignment / Float */}
        <div style={{ marginBottom: '12px' }}>
          {label('Position dans le texte')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
            {([
              { v: 'none'   as FloatType, icon: '▪', tip: 'Inline' },
              { v: 'left'   as FloatType, icon: '◧', tip: 'Flotte à gauche (texte enroule à droite)' },
              { v: 'center' as FloatType, icon: '◼', tip: 'Centré' },
              { v: 'right'  as FloatType, icon: '◨', tip: 'Flotte à droite (texte enroule à gauche)' },
              { v: 'full'   as FloatType, icon: '↔', tip: 'Pleine largeur' },
            ]).map(({ v, icon, tip }) => (
              <button key={v} onClick={() => applyFloat(v)} title={tip}
                style={{ height: '30px', background: float === v ? 'var(--accent2)' : 'var(--surface2)', border: `1px solid ${float === v ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: '5px', color: float === v ? 'white' : 'var(--text2)', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '5px', fontSize: '10px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
            {float === 'left' ? 'Le texte s\'enroule à droite' : float === 'right' ? 'Le texte s\'enroule à gauche' : float === 'center' ? 'Image centrée sur la ligne' : float === 'full' ? 'Pleine largeur du document' : 'Position normale dans le texte'}
          </div>
        </div>

        {/* Quick size */}
        <div style={{ marginBottom: '12px' }}>
          {label('Taille rapide')}
          <div style={{ display: 'flex', gap: '5px' }}>
            {[['25%', '¼'], ['50%', '½'], ['75%', '¾'], ['100%', 'Max']].map(([v, l]) => (
              <button key={v} onClick={() => applyWidth(v)}
                style={{ flex: 1, padding: '5px 4px', background: width === v ? 'var(--accent2)' : 'var(--surface2)', border: `1px solid ${width === v ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: '5px', color: width === v ? 'white' : 'var(--text2)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Custom width */}
        <div style={{ marginBottom: '12px' }}>
          {label('Largeur personnalisée')}
          <input value={width} onChange={e => setWidth(e.target.value)} onBlur={e => applyWidth(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyWidth(width)} placeholder="ex: 300px ou 60%" style={{ ...fieldStyle, fontFamily: "'DM Mono', monospace" }} />
        </div>

        {/* Alt text */}
        <div style={{ marginBottom: '12px' }}>
          {label('Texte alternatif')}
          <input value={alt} onChange={e => setAlt(e.target.value)} onBlur={e => applyAlt(e.target.value)} placeholder="Description de l'image…" style={fieldStyle} />
        </div>

        {/* Delete */}
        <button onClick={() => { editor.chain().focus().deleteSelection().run(); onClose(); }}
          style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid rgba(235,87,87,0.3)', borderRadius: '6px', color: 'var(--red)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>
          Supprimer l'image
        </button>
      </div>
    </div>
  );
}
