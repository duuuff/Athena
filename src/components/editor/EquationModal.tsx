'use client';
import { useState, useRef, useEffect } from 'react';

const SYMBOL_GROUPS = [
  { group: 'Modèles', items: [
    { sym: 'a/b', label: 'Fraction' },
    { sym: '√(x)', label: 'Racine' },
    { sym: '∫_a^b f(x)dx', label: 'Intégrale' },
    { sym: '∑_{i=1}^{n} aᵢ', label: 'Somme' },
    { sym: 'lim_{x→∞} f(x)', label: 'Limite' },
    { sym: 'df/dx', label: 'Dérivée' },
    { sym: 'f\'\'(x)', label: 'Dérivée 2' },
    { sym: '∂f/∂x', label: 'Partielle' },
  ]},
  { group: 'Lettres grecques', items: [
    'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ',
    'ν','ξ','π','ρ','σ','τ','υ','φ','χ','ψ','ω',
    'Γ','Δ','Θ','Λ','Ξ','Π','Σ','Φ','Ψ','Ω',
  ]},
  { group: 'Opérateurs', items: [
    '±','∓','×','÷','·','∘','⊕','⊗','≈','≠','≡','≜',
    '≤','≥','≪','≫','∝','∼','≃','≅','∞',
  ]},
  { group: 'Calcul', items: [
    '∂','∇','∆','∫','∬','∭','∮','∑','∏','√','∛','∜',
  ]},
  { group: 'Ensembles / Logique', items: [
    '∈','∉','⊂','⊃','⊆','⊇','∪','∩','∅','∀','∃','¬','∧','∨','⊢','⊨',
    'ℕ','ℤ','ℚ','ℝ','ℂ',
  ]},
  { group: 'Flèches', items: ['→','←','↔','⇒','⇐','⇔','↦','↑','↓','⇑','⇓','↗','↘'] },
  { group: 'Exposants / Indices', items: [
    '⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹','⁺','⁻',
    '₀','₁','₂','₃','₄','₅','₆','₇','₈','₉','₊','₋',
  ]},
  { group: 'Divers', items: ['∴','∵','⊥','∥','∠','°','′','″','‰','℃','℉','…','⟨','⟩','|','‖'] },
];

interface Props {
  onInsert: (eq: string) => void;
  onClose: () => void;
}

export default function EquationModal({ onInsert, onClose }: Props) {
  const [eq, setEq] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  function insertSym(sym: string) {
    const ta = textareaRef.current;
    if (!ta) { setEq(prev => prev + sym); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = eq.slice(0, start) + sym + eq.slice(end);
    setEq(newVal);
    setTimeout(() => { ta.setSelectionRange(start + sym.length, start + sym.length); ta.focus(); }, 0);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', fontFamily: "'Syne', sans-serif" }}>
        {/* Header */}
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '13px' }}>∑ Insérer une équation</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Scrollable symbol palette */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {SYMBOL_GROUPS.map(group => (
            <div key={group.group} style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '7px', fontFamily: "'DM Mono', monospace" }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {group.items.map((item, idx) => {
                  const isTemplate = typeof item === 'object';
                  const sym = isTemplate ? item.sym : item;
                  const label = isTemplate ? item.label : item;
                  return (
                    <button
                      key={idx}
                      onClick={() => insertSym(sym)}
                      title={isTemplate ? sym : undefined}
                      style={{
                        minWidth: isTemplate ? 'auto' : '30px',
                        height: '28px',
                        padding: isTemplate ? '0 10px' : '0',
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text)',
                        fontSize: isTemplate ? '11px' : '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: isTemplate ? "'Syne', sans-serif" : 'inherit',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: textarea + preview + buttons */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>Votre équation</div>
          <textarea
            ref={textareaRef}
            value={eq}
            onChange={e => setEq(e.target.value)}
            placeholder="Cliquez sur les symboles ou saisissez directement…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (eq.trim()) { onInsert(eq.trim()); onClose(); } } }}
            style={{
              width: '100%', height: '56px',
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px',
              padding: '8px 10px', color: 'var(--text)',
              fontFamily: "'DM Mono', monospace", fontSize: '13px',
              outline: 'none', resize: 'none', marginBottom: '10px',
            }}
          />
          {eq && (
            <div style={{ padding: '10px 14px', background: '#faf9f7', borderRadius: '6px', border: '1px solid #e0ddd8', fontFamily: "'DM Mono', monospace", fontSize: '15px', color: '#333', textAlign: 'center', marginBottom: '10px', wordBreak: 'break-all' }}>
              {eq}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>Entrée pour insérer</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEq('')} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>Effacer</button>
              <button onClick={onClose} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>Annuler</button>
              <button
                onClick={() => { if (eq.trim()) { onInsert(eq.trim()); onClose(); } }}
                disabled={!eq.trim()}
                style={{ padding: '6px 16px', background: eq.trim() ? 'var(--accent2)' : 'var(--surface3)', border: 'none', borderRadius: '6px', color: eq.trim() ? 'white' : 'var(--text3)', fontSize: '12px', fontWeight: 600, cursor: eq.trim() ? 'pointer' : 'default', fontFamily: "'Syne', sans-serif" }}
              >
                Insérer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
