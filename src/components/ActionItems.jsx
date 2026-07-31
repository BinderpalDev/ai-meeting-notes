import { useState } from "react";
import { extractActionItems } from "../services/mlActionItemService";
import { ListTodo, Loader2, AlertCircle } from "lucide-react";

export default function ActionItems({ transcript, isDarkMode = true, isLoading: externalLoading = false, onLoadingChange }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState(null);
    const [hasRun, setHasRun] = useState(false);

    const theme = {
        dark: {
            bg: 'rgba(22,33,62,0.5)',
            border: 'rgba(139,92,246,0.2)',
            text: '#f8fafc',
            textMuted: 'rgba(167,139,250,0.8)',
            accent: '#a78bfa',
            accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
            buttonBg: 'rgba(139,92,246,0.15)',
        },
        light: {
            bg: 'rgba(255,255,255,0.5)',
            border: 'rgba(99,102,241,0.2)',
            text: '#1e293b',
            textMuted: 'rgba(99,102,241,0.85)',
            accent: '#6366f1',
            accentGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            buttonBg: 'rgba(99,102,241,0.1)',
        }
    };

    const t = isDarkMode ? theme.dark : theme.light;

    const handleExtract = async () => {
        if (!transcript || transcript.length < 10) {
            setError("No transcript available for analysis");
            return;
        }

        setLoading(true);
        setError(null);
        setItems([]);
        onLoadingChange?.(true);

        const result = await extractActionItems(transcript, setProgress);

        if (result.success) {
            setItems(result.data);
            setHasRun(true);
        } else {
            setError(result.error);
        }

        setLoading(false);
        setProgress("");
        onLoadingChange?.(false);
    };

    return (
        <div style={{
            background: t.bg,
            borderRadius: 16,
            padding: '1.5rem',
            border: `1.5px solid ${t.border}`,
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: t.text, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ListTodo size={18} style={{ color: t.accent }} />
                    AI Action Items
                </h3>
                <button
                    onClick={handleExtract}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        background: t.accentGradient,
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Analyzing...
                        </>
                    ) : (
                        <>🔍 Extract</>
                    )}
                </button>
            </div>

            {/* Progress */}
            {loading && progress && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: t.accent, padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ animation: 'pulse 2s infinite' }}>●</span>
                    {progress}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Empty State */}
            {!loading && !hasRun && !error && (
                <p style={{ color: t.textMuted, fontSize: '0.9rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
                    Click "Extract" to analyze action items from this meeting
                </p>
            )}

            {/* No Results */}
            {!loading && hasRun && items.length === 0 && !error && (
                <p style={{ color: t.textMuted, fontSize: '0.9rem', margin: 0, textAlign: 'center', padding: '1rem 0', fontStyle: 'italic' }}>
                    No action items found in this transcript
                </p>
            )}

            {/* Results */}
            {items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map((item, i) => (
                        <div
                            key={i}
                            style={{
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: `1px solid ${t.border}`,
                                borderRadius: 10,
                                padding: '0.9rem',
                                fontSize: '0.9rem'
                            }}
                        >
                            {/* Task */}
                            <p style={{ color: t.text, fontWeight: 600, margin: '0 0 0.4rem 0' }}>
                                ✅ {item.task}
                            </p>

                            {/* Meta */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.8rem' }}>
                                {item.person && (
                                    <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: t.accent, padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                                        👤 {item.person}
                                    </span>
                                )}
                                {item.deadline && (
                                    <span style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                                        📅 {item.deadline}
                                    </span>
                                )}
                                <span style={{ color: t.textMuted }}>
                                    {(item.confidence * 100).toFixed(0)}% confident
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Summary */}
                    <div style={{ fontSize: '0.75rem', color: t.textMuted, paddingTop: '0.5rem', borderTop: `1px solid ${t.border}`, marginTop: '0.5rem' }}>
                        Found {items.length} action item{items.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
        </div>
    );
}