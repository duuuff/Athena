'use client';

import { DocumentVersion } from '@/lib/types';

interface VersionHistoryModalProps {
  versions: DocumentVersion[];
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export default function VersionHistoryModal({ versions, currentContent, onRestore, onClose }: VersionHistoryModalProps) {
  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: "'Syne', sans-serif",
    }}
      onClick={onClose}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
        width: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Historique des versions</h2>
            <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
              {versions.length} version{versions.length !== 1 ? 's' : ''} sauvegardée{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {/* Version list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {versions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              Aucune version sauvegardée.<br />
              <span style={{ fontSize: '11px' }}>Utilisez le bouton "💾 Version" pour créer des points de sauvegarde.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {versions.map((v, i) => (
                <div key={v.id} style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>
                      {v.label ?? `Version ${versions.length - i}`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
                      {formatDate(v.savedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => onRestore(v.content)}
                    style={{
                      background: 'var(--accent2)', border: 'none', borderRadius: '7px',
                      padding: '7px 14px', color: 'white', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'Syne', sans-serif", flexShrink: 0,
                    }}
                  >
                    Restaurer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
