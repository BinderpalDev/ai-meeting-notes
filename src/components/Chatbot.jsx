import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { chatWithMeeting } from '../services/geminiService';

export default function Chatbot({ transcription, isDarkMode }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hi! I analyzed this meeting. Ask me anything about it! 🤖' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const theme = {
    dark: {
      bg: 'rgba(15,23,42,0.6)',
      messageUser: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      messageBot: 'rgba(30,41,59,0.8)',
      text: '#f8fafc',
      inputBg: 'rgba(15,23,42,0.8)',
      border: 'rgba(139,92,246,0.3)',
    },
    light: {
      bg: 'rgba(248,250,252,0.8)',
      messageUser: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      messageBot: '#ffffff',
      text: '#1e293b',
      inputBg: '#ffffff',
      border: 'rgba(99,102,241,0.2)',
    }
  };

  const t = isDarkMode ? theme.dark : theme.light;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Reset chat when transcription changes (new recording selected)
  useEffect(() => {
    setMessages([{ role: 'model', text: 'Hi! I analyzed this meeting. Ask me anything about it! 🤖' }]);
  }, [transcription]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Format history for Gemini
      const history = messages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithMeeting(history, input, transcription);
      
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Messages Area */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              background: msg.role === 'user' ? t.messageUser : t.border,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {msg.role === 'user' ? <User size={16} color="white" /> : <Bot size={18} color={isDarkMode ? '#a78bfa' : '#6366f1'} />}
            </div>
            
            <div style={{ 
              background: msg.role === 'user' ? t.messageUser : t.messageBot,
              padding: '0.8rem 1.2rem', 
              borderRadius: 16, 
              borderTopLeftRadius: msg.role === 'model' ? 4 : 16,
              borderTopRightRadius: msg.role === 'user' ? 4 : 16,
              color: msg.role === 'user' ? 'white' : t.text,
              maxWidth: '80%',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              border: msg.role === 'model' ? `1px solid ${t.border}` : 'none'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} className="spin" color={isDarkMode ? '#a78bfa' : '#6366f1'} />
            </div>
            <div style={{ background: t.messageBot, padding: '0.8rem 1.2rem', borderRadius: 16, borderTopLeftRadius: 4, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ width: 6, height: 6, background: isDarkMode ? '#a78bfa' : '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0s' }} />
                <span style={{ width: 6, height: 6, background: isDarkMode ? '#a78bfa' : '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0.16s' }} />
                <span style={{ width: 6, height: 6, background: isDarkMode ? '#a78bfa' : '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0.32s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ padding: '1.25rem', background: t.inputBg, borderTop: `1px solid ${t.border}` }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the meeting..."
            style={{
              width: '100%',
              padding: '1rem 3.5rem 1rem 1.25rem',
              borderRadius: 14,
              border: `1.5px solid ${t.border}`,
              background: 'transparent',
              color: t.text,
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: '"Inter", sans-serif'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#a78bfa' : '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = t.border}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              position: 'absolute',
              right: 8,
              background: input.trim() ? (isDarkMode ? '#8b5cf6' : '#6366f1') : 'transparent',
              border: 'none',
              borderRadius: 10,
              padding: '0.5rem',
              cursor: input.trim() ? 'pointer' : 'default',
              color: input.trim() ? 'white' : t.border,
              transition: 'all 0.2s'
            }}
          >
            {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); } 
          40% { transform: scale(1); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}