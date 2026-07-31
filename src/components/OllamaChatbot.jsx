import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Bot,
    User,
    Sparkles,
    StopCircle,
    Copy,
    Check,
    Trash2,
    MessageSquare
} from 'lucide-react';
import { answerMeetingQuestion } from '../services/ollamaService';

const SUGGESTED_QUESTIONS = [
    "Summarize this meeting",
    "What are the action items?",
    "Who said what?",
    "What decisions were made?",
    "What are the key topics?",
    "Any follow-ups needed?",
];

export default function OllamaChatbot({ transcription, isDarkMode, selectedModel }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '👋 Hi! I\'m your local AI assistant powered by Ollama.\n\nI can answer questions about this meeting or any general questions. What would you like to know?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [copied, setCopied] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(false);

    const t = isDarkMode ? {
        bg: 'rgba(15,23,42,0.6)',
        messageUser: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        messageBot: 'rgba(22,33,62,0.95)',
        text: '#f8fafc',
        inputBg: 'rgba(15,23,42,0.9)',
        border: 'rgba(139,92,246,0.25)',
        accent: '#a78bfa',
        muted: 'rgba(167,139,250,0.7)',
        success: '#34d399',
        suggBg: 'rgba(139,92,246,0.1)',
        suggBorder: 'rgba(139,92,246,0.25)',
        headerBg: 'rgba(15,23,42,0.8)',
    } : {
        bg: 'rgba(248,250,252,0.9)',
        messageUser: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        messageBot: '#ffffff',
        text: '#1e293b',
        inputBg: '#ffffff',
        border: 'rgba(99,102,241,0.2)',
        accent: '#6366f1',
        muted: 'rgba(99,102,241,0.7)',
        success: '#10b981',
        suggBg: 'rgba(99,102,241,0.08)',
        suggBorder: 'rgba(99,102,241,0.2)',
        headerBg: 'rgba(248,250,252,0.95)',
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    useEffect(() => {
        setMessages([{
            role: 'assistant',
            content: '👋 Hi! I\'m your local AI assistant powered by Ollama.\n\nI can answer questions about this meeting or any general questions. What would you like to know?'
        }]);
        setStreamingText('');
        setInput('');
    }, [transcription]);

    const sendMessage = async (messageText) => {
        const text = messageText || input;
        if (!text.trim() || isLoading) return;

        const userMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setStreamingText('');
        abortRef.current = false;

        try {
            const history = messages.slice(1);
            let fullResponse = '';

            await answerMeetingQuestion(
                text,
                transcription || '',
                history,
                selectedModel || 'llama3.2:1b',
                (chunk, full) => {
                    if (abortRef.current) return;
                    setStreamingText(full);
                    fullResponse = full;
                }
            );

            if (!abortRef.current) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: fullResponse || 'No response received. Make sure Ollama is running.'
                }]);
            }

        } catch (err) {
            console.error('Chat error:', err);
            let errorMsg = 'Error connecting to Ollama. ';

            if (err.message?.includes('fetch') || err.message?.includes('Failed')) {
                errorMsg += 'Make sure Ollama is running (run "ollama serve" in terminal).';
            } else if (err.message?.includes('model')) {
                errorMsg += `Model "${selectedModel}" not found. Run "ollama pull ${selectedModel}" in terminal.`;
            } else {
                errorMsg += err.message;
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMsg
            }]);
        } finally {
            setIsLoading(false);
            setStreamingText('');
            inputRef.current?.focus();
        }
    };

    const handleStop = () => {
        abortRef.current = true;
        setIsLoading(false);
        if (streamingText) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: streamingText + ' [stopped]'
            }]);
            setStreamingText('');
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: '👋 Chat cleared! Ask me anything about the meeting.'
        }]);
        setStreamingText('');
        inputRef.current?.focus();
    };

    const copyMessage = async (text, idx) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(idx);
            setTimeout(() => setCopied(null), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    };

    const formatMessage = (text) => {
        if (!text) return null;

        // Split into lines and format
        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Bold text **text**
            const boldFormatted = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            );

            // Bullet points
            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                return (
                    <div key={i} style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.3rem',
                        paddingLeft: '0.5rem'
                    }}>
                        <span style={{ color: t.accent, flexShrink: 0 }}>•</span>
                        <span>{boldFormatted}</span>
                    </div>
                );
            }

            // Numbered list
            if (/^\d+\.\s/.test(line.trim())) {
                return (
                    <div key={i} style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.3rem',
                        paddingLeft: '0.5rem'
                    }}>
                        <span style={{ color: t.accent, flexShrink: 0, fontWeight: 700 }}>
                            {line.match(/^\d+/)?.[0]}.
                        </span>
                        <span>{line.replace(/^\d+\.\s/, '')}</span>
                    </div>
                );
            }

            // Empty line
            if (line.trim() === '') {
                return <div key={i} style={{ height: '0.4rem' }} />;
            }

            // Regular line
            return (
                <div key={i} style={{ marginBottom: '0.2rem' }}>
                    {boldFormatted}
                </div>
            );
        });
    };

    const hasTranscript = transcription && transcription.trim().length > 10;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: t.bg,
            borderRadius: 20,
            border: `1.5px solid ${t.border}`,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.25rem',
                borderBottom: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: t.headerBg,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${t.accent}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Bot size={20} color={t.accent} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: t.text }}>
                            Local AI Assistant
                        </div>
                        <div style={{ fontSize: '0.72rem', color: t.muted, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                            Ollama • {selectedModel || 'No model'}
                            {hasTranscript && <span style={{ color: t.accent }}>• Meeting loaded</span>}
                        </div>
                    </div>
                </div>

                <button
                    onClick={clearChat}
                    disabled={isLoading}
                    style={{
                        padding: '0.4rem 0.75rem',
                        background: 'transparent',
                        border: `1px solid ${t.border}`,
                        borderRadius: 8,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        color: t.muted,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                        if (!isLoading) {
                            e.currentTarget.style.borderColor = '#f87171';
                            e.currentTarget.style.color = '#f87171';
                        }
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = t.border;
                        e.currentTarget.style.color = t.muted;
                    }}
                >
                    <Trash2 size={14} /> Clear
                </button>
            </div>

            {/* No transcript warning */}
            {!hasTranscript && (
                <div style={{
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(251,191,36,0.1)',
                    borderBottom: `1px solid rgba(251,191,36,0.2)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0
                }}>
                    <Sparkles size={16} color="#fbbf24" />
                    <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                        No transcript yet. Generate AI insights first for better answers. I can still answer general questions!
                    </span>
                </div>
            )}

            {/* Messages */}
            <div style={{
                flex: 1,
                padding: '1.25rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minHeight: 0
            }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            animation: 'fadeIn 0.3s ease-out'
                        }}
                    >
                        {/* Avatar */}
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: msg.role === 'user' ? t.messageUser : `${t.accent}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: msg.role === 'user' ? `0 4px 12px ${t.accent}40` : 'none'
                        }}>
                            {msg.role === 'user'
                                ? <User size={16} color="white" />
                                : <Bot size={17} color={t.accent} />
                            }
                        </div>

                        {/* Bubble */}
                        <div style={{ maxWidth: '78%', position: 'relative' }}>
                            <div style={{
                                background: msg.role === 'user' ? t.messageUser : t.messageBot,
                                padding: '0.85rem 1.1rem',
                                borderRadius: 16,
                                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                                color: msg.role === 'user' ? 'white' : t.text,
                                fontSize: '0.9rem',
                                lineHeight: 1.65,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: msg.role === 'assistant' ? `1px solid ${t.border}` : 'none'
                            }}>
                                {formatMessage(msg.content)}
                            </div>

                            {/* Copy for assistant */}
                            {msg.role === 'assistant' && (
                                <button
                                    onClick={() => copyMessage(msg.content, idx)}
                                    style={{
                                        position: 'absolute',
                                        bottom: -24,
                                        left: 4,
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: t.muted,
                                        padding: '0.2rem 0.4rem',
                                        opacity: 0.6,
                                        fontSize: '0.7rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        transition: 'opacity 0.2s',
                                        borderRadius: 4
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = 0.6}
                                >
                                    {copied === idx
                                        ? <><Check size={11} color={t.success} /> Copied</>
                                        : <><Copy size={11} /> Copy</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Streaming */}
                {streamingText && (
                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: `${t.accent}20`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Sparkles size={16} color={t.accent} style={{ animation: 'pulse 1s infinite' }} />
                        </div>
                        <div style={{
                            background: t.messageBot,
                            padding: '0.85rem 1.1rem',
                            borderRadius: 16,
                            borderTopLeftRadius: 4,
                            border: `1px solid ${t.border}`,
                            maxWidth: '78%',
                            color: t.text,
                            fontSize: '0.9rem',
                            lineHeight: 1.65
                        }}>
                            {formatMessage(streamingText)}
                            <span style={{
                                display: 'inline-block',
                                width: 2,
                                height: 14,
                                background: t.accent,
                                marginLeft: 2,
                                animation: 'blink 0.8s infinite',
                                borderRadius: 1,
                                verticalAlign: 'middle'
                            }} />
                        </div>
                    </div>
                )}

                {/* Typing dots (before streaming starts) */}
                {isLoading && !streamingText && (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: `${t.accent}20`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Bot size={17} color={t.accent} />
                        </div>
                        <div style={{
                            background: t.messageBot,
                            padding: '0.85rem 1.1rem',
                            borderRadius: 16,
                            borderTopLeftRadius: 4,
                            border: `1px solid ${t.border}`
                        }}>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                {[0, 0.2, 0.4].map((delay, i) => (
                                    <span key={i} style={{
                                        width: 7, height: 7,
                                        background: t.accent,
                                        borderRadius: '50%',
                                        display: 'inline-block',
                                        animation: `bounce 1.2s infinite ease-in-out ${delay}s`
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 1 && !isLoading && (
                <div style={{
                    padding: '0 1.25rem 0.75rem',
                    flexShrink: 0
                }}>
                    <p style={{
                        fontSize: '0.75rem',
                        color: t.muted,
                        margin: '0 0 0.5rem 0',
                        fontWeight: 600
                    }}>
                        Suggested questions:
                    </p>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem'
                    }}>
                        {SUGGESTED_QUESTIONS.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => sendMessage(q)}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    background: t.suggBg,
                                    border: `1px solid ${t.suggBorder}`,
                                    borderRadius: 20,
                                    cursor: 'pointer',
                                    color: t.accent,
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = `${t.accent}25`;
                                    e.currentTarget.style.borderColor = t.accent;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = t.suggBg;
                                    e.currentTarget.style.borderColor = t.suggBorder;
                                }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                style={{
                    padding: '1rem',
                    borderTop: `1px solid ${t.border}`,
                    background: t.inputBg,
                    flexShrink: 0
                }}
            >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={isLoading ? "AI is thinking..." : "Ask anything about the meeting... (Enter to send, Shift+Enter for new line)"}
                        disabled={isLoading}
                        rows={1}
                        style={{
                            flex: 1,
                            padding: '0.9rem 1.1rem',
                            borderRadius: 14,
                            border: `1.5px solid ${t.border}`,
                            background: 'transparent',
                            color: t.text,
                            fontSize: '0.9rem',
                            outline: 'none',
                            fontFamily: '"Inter", sans-serif',
                            resize: 'none',
                            lineHeight: 1.5,
                            transition: 'border-color 0.2s',
                            opacity: isLoading ? 0.7 : 1,
                            minHeight: 46,
                            maxHeight: 120,
                            overflow: 'auto'
                        }}
                        onFocus={(e) => e.target.style.borderColor = t.accent}
                        onBlur={(e) => e.target.style.borderColor = t.border}
                    />

                    {isLoading ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            style={{
                                width: 46,
                                height: 46,
                                flexShrink: 0,
                                padding: 0,
                                background: 'rgba(239,68,68,0.1)',
                                border: '1.5px solid rgba(239,68,68,0.4)',
                                borderRadius: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            title="Stop generation"
                        >
                            <StopCircle size={22} color="#f87171" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            style={{
                                width: 46,
                                height: 46,
                                flexShrink: 0,
                                padding: 0,
                                background: input.trim()
                                    ? `linear-gradient(135deg, ${t.accent}, #6366f1)`
                                    : 'transparent',
                                border: `1.5px solid ${input.trim() ? 'transparent' : t.border}`,
                                borderRadius: 12,
                                cursor: input.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: input.trim() ? `0 4px 12px ${t.accent}50` : 'none'
                            }}
                            onMouseOver={(e) => {
                                if (input.trim()) e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Send (Enter)"
                        >
                            <Send size={20} color={input.trim() ? 'white' : t.muted} />
                        </button>
                    )}
                </div>

                <div style={{
                    fontSize: '0.7rem',
                    color: t.muted,
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    opacity: 0.6
                }}>
                    Powered by Ollama • 100% Local • No data leaves your device
                </div>
            </form>

            <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}