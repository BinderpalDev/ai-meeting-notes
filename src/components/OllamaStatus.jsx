import { useState, useEffect } from 'react';
import {
    Wifi,
    WifiOff,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Cpu,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { checkOllamaStatus } from '../services/ollamaService';

export default function OllamaStatus({ isDarkMode, selectedModel, onModelChange }) {
    const [status, setStatus] = useState({ isRunning: false, models: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [showModels, setShowModels] = useState(false);

    const t = isDarkMode ? {
        bg: 'rgba(22,33,62,0.9)',
        border: 'rgba(139,92,246,0.2)',
        text: '#f8fafc',
        muted: 'rgba(167,139,250,0.8)',
        accent: '#a78bfa',
        success: '#34d399',
        danger: '#f87171',
        card: 'rgba(15,23,42,0.8)',
    } : {
        bg: 'rgba(255,255,255,0.95)',
        border: 'rgba(99,102,241,0.2)',
        text: '#1e293b',
        muted: 'rgba(99,102,241,0.9)',
        accent: '#6366f1',
        success: '#10b981',
        danger: '#ef4444',
        card: '#f8fafc',
    };

    const checkStatus = async () => {
        setIsLoading(true);
        const result = await checkOllamaStatus();
        setStatus(result);

        // Auto select first model if none selected
        if (result.models.length > 0 && !selectedModel) {
            onModelChange(result.models[0].name);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        checkStatus();
        // Check every 30 seconds
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatSize = (bytes) => {
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1) return `${gb.toFixed(1)}GB`;
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(0)}MB`;
    };

    return (
        <div style={{
            background: t.bg,
            border: `1.5px solid ${status.isRunning ? t.success + '40' : t.danger + '40'}`,
            borderRadius: 16,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
        }}>
            {/* Status Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: status.isRunning ? `${t.success}20` : `${t.danger}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {isLoading ? (
                            <RefreshCw size={18} color={t.muted} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : status.isRunning ? (
                            <Wifi size={18} color={t.success} />
                        ) : (
                            <WifiOff size={18} color={t.danger} />
                        )}
                    </div>
                    <div>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: t.text,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            Ollama
                            <span style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 6,
                                background: status.isRunning ? `${t.success}20` : `${t.danger}20`,
                                color: status.isRunning ? t.success : t.danger,
                                fontWeight: 700
                            }}>
                                {isLoading ? 'Checking...' : status.isRunning ? 'Running' : 'Offline'}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: t.muted }}>
                            {status.isRunning
                                ? `${status.models.length} model${status.models.length !== 1 ? 's' : ''} available`
                                : 'Start Ollama to use local AI'
                            }
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        onClick={checkStatus}
                        disabled={isLoading}
                        style={{
                            padding: '0.4rem',
                            background: 'transparent',
                            border: `1px solid ${t.border}`,
                            borderRadius: 8,
                            cursor: isLoading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: t.muted,
                        }}
                    >
                        <RefreshCw size={14} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                    </button>

                    {status.isRunning && status.models.length > 0 && (
                        <button
                            onClick={() => setShowModels(!showModels)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                background: t.card,
                                border: `1px solid ${t.border}`,
                                borderRadius: 8,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                color: t.text,
                                fontSize: '0.8rem',
                                fontWeight: 600
                            }}
                        >
                            <Cpu size={14} />
                            {selectedModel || 'Select Model'}
                            {showModels ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Model Selector */}
            {showModels && status.models.length > 0 && (
                <div style={{
                    marginTop: '1rem',
                    borderTop: `1px solid ${t.border}`,
                    paddingTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: t.muted, marginBottom: '0.25rem' }}>
                        Available Models:
                    </div>
                    {status.models.map(model => (
                        <div
                            key={model.name}
                            onClick={() => { onModelChange(model.name); setShowModels(false); }}
                            style={{
                                padding: '0.75rem',
                                borderRadius: 10,
                                background: selectedModel === model.name ? `${t.accent}20` : t.card,
                                border: `1px solid ${selectedModel === model.name ? t.accent : t.border}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {selectedModel === model.name && <CheckCircle2 size={16} color={t.accent} />}
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: selectedModel === model.name ? t.accent : t.text
                                }}>
                                    {model.name}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: t.muted }}>
                                {model.size ? formatSize(model.size) : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Not running message */}
            {!status.isRunning && !isLoading && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: `${t.danger}10`,
                    borderRadius: 10,
                    border: `1px solid ${t.danger}20`,
                    fontSize: '0.8rem',
                    color: t.muted,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                }}>
                    <AlertCircle size={16} color={t.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                        Ollama is not running. Open terminal and run: <code style={{ background: `${t.accent}20`, padding: '0.1rem 0.3rem', borderRadius: 4, color: t.accent }}>ollama serve</code>
                    </span>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}