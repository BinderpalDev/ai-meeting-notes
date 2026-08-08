import { useState } from 'react';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDarkMode = false 
}) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const t = isDarkMode ? {
    bg: '#0f0f1a',
    card: '#1a1a2e',
    text: '#fff',
    muted: 'rgba(255,255,255,0.6)',
    border: 'rgba(139,92,246,0.2)',
    danger: '#ef4444',
    dangerBg: 'rgba(239,68,68,0.1)',
    dangerBorder: 'rgba(239,68,68,0.3)',
  } : {
    bg: '#fff',
    card: '#f8fafc',
    text: '#1a1a2e',
    muted: '#64748b',
    border: '#e2e8f0',
    danger: '#dc2626',
    dangerBg: 'rgba(220,38,38,0.1)',
    dangerBorder: 'rgba(220,38,38,0.3)',
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
    >
      <div style={{ background: t.bg, borderRadius: 20, width: '100%', maxWidth: 420, border: `2px solid ${t.border}`, overflow: 'hidden', animation: 'scaleIn 0.2s ease-out' }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={24} color={t.danger} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: t.text, fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ color: t.muted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{message}</p>
          </div>
          <button onClick={onClose} disabled={isLoading} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${t.border}`, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, flexShrink: 0, opacity: isLoading ? 0.5 : 1 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={isLoading} style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: 'transparent', border: `1.5px solid ${t.border}`, color: t.text, fontWeight: 600, fontSize: '0.9rem', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isLoading ? 0.5 : 1 }}
            onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.background = t.card; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {cancelText}
          </button>
          <button onClick={handleConfirm} disabled={isLoading} style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: isLoading ? t.dangerBg : `linear-gradient(135deg, ${t.danger} 0%, #b91c1c 100%)`, border: 'none', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: isLoading ? 'none' : '0 4px 15px rgba(239,68,68,0.3)' }}
            onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : <><Trash2 size={16} /> {confirmText}</>}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}