'use client';

import { DocStats } from '@/lib/types';

interface StatsModalProps {
  stats: DocStats;
  title: string;
  onClose: () => void;
}

export default function StatsModal({ stats, title, onClose }: StatsModalProps) {
  const rows: Array<{ label: string; value: string | number; mono?: boolean }> = [
    { label: 'Mots', value: stats.words.toLocaleString('fr-FR') },
    { label: 'Caractères (avec espaces)', value: stats.chars.toLocaleString('fr-FR') },
    { label: 'Caractères (sans espaces)', value: stats.charsNoSpaces.toLocaleString('fr-FR') },
    { label: 'Paragraphes', value: stats.paragraphs },
    { label: 'Titres', value: stats.headings },
    { label: 'Temps de lecture estimé', value: `${stats.readingMinutes} min` },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800, fontFamily: "'Syne', sans-serif" }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', width: '400px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Statistiques</h2>
            <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{title || 'Sans titre'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>

        {/* Stats rows */}
        <div style={{ padding: '14px 22px 20px' }}>
          {rows.map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
