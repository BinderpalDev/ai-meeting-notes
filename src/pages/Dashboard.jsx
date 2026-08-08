import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { transcribeAudio } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import { extractActionItems } from '../services/mlActionItemService';
import Recorder from '../components/Recorder';
import RecordingModal from '../components/RecordingModal';
import OllamaStatus from '../components/OllamaStatus';
import OllamaChatbot from '../components/OllamaChatbot';
import ActionItems from '../components/ActionItems';
import {
  Mic, FolderOpen, FileText, Settings, LogOut, Sun, Moon, Search, Sparkles,
  Loader2, Palette, User, Clock, Zap, RefreshCw, Plus, Trash2, Edit2,
  Save, X, MessageSquare, Edit3, Check, ChevronDown, ChevronUp
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('record');
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [quickNotes, setQuickNotes] = useState([]);
  const [isEditingNote, setIsEditingNote] = useState(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [chatSelectedRecording, setChatSelectedRecording] = useState(null);

  const [editingRecordingId, setEditingRecordingId] = useState(null);
  const [editingRecordingName, setEditingRecordingName] = useState('');

  // NEW: Track expanded recording for action items
  const [expandedRecordingId, setExpandedRecordingId] = useState(null);
  const [extractingActionItemsId, setExtractingActionItemsId] = useState(null);

  useEffect(() => { loadRecordings(); }, []);
  useEffect(() => { if (activeTab === 'notes') loadNotes(); }, [activeTab]);

  const loadRecordings = async () => {
    setIsLoading(true);
    try {
      const data = await databaseService.getRecordings();
      setRecordings(data);
      if (data.length > 0 && !chatSelectedRecording) setChatSelectedRecording(data[0]);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const loadNotes = async () => {
    try {
      const data = await databaseService.getNotes();
      setQuickNotes(data);
    } catch (err) { console.error(err); }
  };

  const handleSaveOnly = async (audioBlob, transcript, analysis) => {
    setIsProcessing(true);
    setError('');
    try {
      const { fileName, audioUrl } = await databaseService.uploadAudio(audioBlob);
      const savedRecording = await databaseService.saveRecording({
        title: `Meeting ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        audioUrl,
        fileName,
        language: analysis?.language || 'Unknown',
        speakerCount: analysis?.speakerCount || 1,
        transcription: transcript || '',
        summary: analysis?.summary || '',
        actionItems: analysis?.actionItems || [],
        keyTopics: analysis?.keyTopics || [],
        notes: ''
      });
      setRecordings(prev => [savedRecording, ...prev]);
      setActiveTab('recordings');
    } catch (err) {
      console.error(err);
      setError('Failed to save recording: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranscribe = async (recording) => {
    try {
      const response = await fetch(recording.audio_url);
      const blob = await response.blob();
      const aiResult = await transcribeAudio(blob);
      const updated = await databaseService.updateRecording(recording.id, {
        transcription: aiResult.transcription,
        summary: aiResult.summary,
        action_items: aiResult.actionItems,
        key_topics: aiResult.keyTopics,
        language: aiResult.language,
        speaker_count: aiResult.speakerCount
      });
      setRecordings(prev => prev.map(r => r.id === recording.id ? updated : r));
      if (selectedRecording?.id === recording.id) setSelectedRecording(updated);
    } catch (e) {
      console.error('Transcription error:', e);
      throw e;
    }
  };

  const handleUpdateRecording = async (id, updates) => {
    try {
      const updated = await databaseService.updateRecording(id, updates);
      setRecordings(prev => prev.map(r => r.id === id ? updated : r));
      if (selectedRecording?.id === id) setSelectedRecording(updated);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteRecording = async (id, fileName) => {
    try {
      await databaseService.deleteRecording(id, fileName);
      setRecordings(prev => prev.filter(r => r.id !== id));
      setSelectedRecording(null);
      if (chatSelectedRecording?.id === id) setChatSelectedRecording(null);
    } catch (e) { console.error(e); }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      const note = await databaseService.createNote(newNoteContent);
      setQuickNotes([note, ...quickNotes]);
      setNewNoteContent('');
      setIsAddingNote(false);
    } catch (e) { console.error(e); }
  };

  const handleUpdateNote = async (id, content) => {
    try {
      const updated = await databaseService.updateNote(id, content);
      setQuickNotes(prev => prev.map(n => n.id === id ? updated : n));
      setIsEditingNote(null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteNote = async (id) => {
    try {
      await databaseService.deleteNote(id);
      setQuickNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleInlineEditSave = async (rec) => {
    if (editingRecordingName.trim() && editingRecordingName !== rec.title) {
      await handleUpdateRecording(rec.id, { title: editingRecordingName.trim() });
    }
    setEditingRecordingId(null);
  };

  const filteredRecordings = recordings.filter(rec =>
    rec.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const theme = {
    dark: {
      bg: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      card: 'rgba(22,33,62,0.9)',
      cardBorder: 'rgba(139,92,246,0.2)',
      text: '#f8fafc',
      textMuted: 'rgba(167,139,250,0.8)',
      accent: '#a78bfa',
      accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
      sidebar: 'rgba(15,15,30,0.95)',
      input: 'rgba(15,15,35,0.8)',
      shadow: 'rgba(139,92,246,0.3)',
      buttonBg: 'rgba(139,92,246,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      card: 'rgba(255,255,255,0.95)',
      cardBorder: 'rgba(99,102,241,0.2)',
      text: '#1e293b',
      textMuted: 'rgba(99,102,241,0.85)',
      accent: '#6366f1',
      accentGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
      sidebar: 'rgba(255,255,255,0.98)',
      input: 'rgba(241,245,249,0.9)',
      shadow: 'rgba(99,102,241,0.25)',
      buttonBg: 'rgba(99,102,241,0.1)',
    }
  };

  const t = isDarkMode ? theme.dark : theme.light;

  const navItems = [
    { id: 'record', icon: Mic, label: 'New Recording' },
    { id: 'recordings', icon: FolderOpen, label: 'My Library', badge: recordings.length },
    { id: 'chat', icon: MessageSquare, label: 'AI Assistant' },
    { id: 'notes', icon: FileText, label: 'Quick Notes' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>

      {/* Background Orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-15%', width: '600px', height: '600px', background: isDarkMode ? 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', animation: 'float 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-15%', width: '600px', height: '600px', background: isDarkMode ? 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', animation: 'float 15s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      {/* Sidebar */}
      <div style={{ width: '280px', background: t.sidebar, backdropFilter: 'blur(40px)', borderRight: `1px solid ${t.cardBorder}`, padding: '1.75rem 1.25rem', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', transition: 'all 0.4s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: t.accentGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${t.shadow}`, flexShrink: 0 }}>
              <Zap size={22} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: t.accent, letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}>Summarix</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ width: 42, height: 42, borderRadius: 12, background: t.buttonBg, border: `1.5px solid ${t.cardBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent, transition: 'all 0.3s', flexShrink: 0 }}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ padding: '0.85rem 1rem', background: isActive ? t.buttonBg : 'transparent', border: isActive ? `1.5px solid ${t.cardBorder}` : '1.5px solid transparent', borderRadius: 12, color: isActive ? t.accent : t.textMuted, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.background = t.buttonBg; e.currentTarget.style.color = t.accent; } }}
                onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}><Icon size={18} />{item.label}</span>
                {item.badge > 0 && <span style={{ background: t.accentGradient, color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1.25rem', background: t.card, borderRadius: 16, border: `1.5px solid ${t.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: t.accentGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ color: t.text, fontWeight: 700, fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email?.split('@')[0]}</p>
              <p style={{ color: t.textMuted, fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={signOut} style={{ width: '100%', padding: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>

        {/* Processing Overlay */}
        {isProcessing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={50} color={t.accent} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Saving your recording...</p>
          </div>
        )}

        {/* ── RECORD TAB ── */}
        {activeTab === 'record' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: t.text, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Mic size={28} style={{ color: t.accent }} />New Recording
              </h2>
              <p style={{ color: t.textMuted, fontSize: '1rem', margin: 0 }}>Hit record, speak your mind, and let AI handle the rest.</p>
            </div>
            <div style={{ background: t.card, backdropFilter: 'blur(40px)', borderRadius: 24, padding: '2.5rem', boxShadow: `0 25px 60px ${t.shadow}`, border: `1.5px solid ${t.cardBorder}` }}>
              <Recorder onSave={handleSaveOnly} isDarkMode={isDarkMode} />
            </div>
          </div>
        )}

        {/* ── RECORDINGS TAB (WITH ACTION ITEMS) ── */}
        {activeTab === 'recordings' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: t.text, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FolderOpen size={28} style={{ color: t.accent }} />My Library
                </h2>
                <p style={{ color: t.textMuted, fontSize: '1rem', margin: 0 }}>Browse and manage all your recordings</p>
              </div>
              <button
                onClick={loadRecordings}
                style={{ padding: '0.6rem', background: t.buttonBg, border: `1.5px solid ${t.cardBorder}`, borderRadius: 10, color: t.accent, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.25)'}
                onMouseOut={(e) => e.currentTarget.style.background = t.buttonBg}
              >
                <RefreshCw size={18} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: 400 }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} />
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.75rem', background: t.input, border: `1.5px solid ${t.cardBorder}`, borderRadius: 12, color: t.text, fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = t.cardBorder}
              />
            </div>

            {filteredRecordings.length === 0 ? (
              <div style={{ background: t.card, borderRadius: 24, padding: '4rem 2rem', border: `1.5px solid ${t.cardBorder}`, textAlign: 'center' }}>
                <FolderOpen size={60} style={{ color: t.textMuted, marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ color: t.text, fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>No recordings yet</h3>
                <p style={{ color: t.textMuted, fontSize: '1rem', margin: 0 }}>Start by recording your first meeting</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {filteredRecordings.map((rec) => (
                  <div key={rec.id}>
                    {/* Recording Card */}
                    <div
                      onClick={() => {
                        if (editingRecordingId !== rec.id) {
                          setSelectedRecording(rec);
                        }
                      }}
                      style={{ background: t.card, borderRadius: 18, padding: '1.75rem', border: `1.5px solid ${t.cardBorder}`, transition: 'all 0.25s', cursor: editingRecordingId === rec.id ? 'default' : 'pointer' }}
                      onMouseOver={(e) => { if (editingRecordingId !== rec.id) { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${t.shadow}`; } }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = t.cardBorder; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {editingRecordingId === rec.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingRecordingName}
                                onChange={(e) => setEditingRecordingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineEditSave(rec);
                                  else if (e.key === 'Escape') setEditingRecordingId(null);
                                }}
                                autoFocus
                                style={{ flex: 1, background: t.input, border: `2px solid ${t.accent}`, borderRadius: 8, padding: '0.4rem 0.6rem', color: t.text, fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                              />
                              <button onClick={(e) => { e.stopPropagation(); handleInlineEditSave(rec); }} style={{ padding: '0.4rem 0.6rem', background: t.accent, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                                <Check size={14} /> Save
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingRecordingId(null); }} style={{ padding: '0.4rem', background: 'transparent', border: `1px solid ${t.cardBorder}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <X size={14} color={t.textMuted} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h3 style={{ color: t.text, fontSize: '1.1rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rec.title}
                              </h3>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingRecordingId(rec.id); setEditingRecordingName(rec.title); }}
                                style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }}
                                title="Edit name"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          )}
                          <p style={{ color: t.textMuted, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.3rem 0 0 0' }}>
                            <Clock size={12} /> {new Date(rec.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div style={{ marginLeft: '1rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {!rec.summary ? (
                            <span style={{ background: t.accentGradient, color: '#fff', padding: '0.3rem 0.8rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Sparkles size={12} /> AI Ready
                            </span>
                          ) : (
                            <span style={{ background: t.buttonBg, color: t.accent, padding: '0.3rem 0.8rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>
                              Processed
                            </span>
                          )}
                          {/* Expand/Collapse Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRecordingId(expandedRecordingId === rec.id ? null : rec.id);
                            }}
                            style={{
                              padding: '0.4rem',
                              background: t.buttonBg,
                              border: `1.5px solid ${t.cardBorder}`,
                              borderRadius: 8,
                              color: t.accent,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                            title="Show action items"
                          >
                            {expandedRecordingId === rec.id ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      <p style={{ color: t.textMuted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                        {rec.summary ? rec.summary.slice(0, 120) + '...' : 'Click to view and generate AI insights.'}
                      </p>
                    </div>

                    {/* Action Items Section (Expandable) */}
                    {expandedRecordingId === rec.id && (
                      <div style={{
                        background: t.card,
                        borderRadius: '0 0 18px 18px',
                        borderLeft: `1.5px solid ${t.cardBorder}`,
                        borderRight: `1.5px solid ${t.cardBorder}`,
                        borderBottom: `1.5px solid ${t.cardBorder}`,
                        padding: '1.5rem',
                        marginTop: '-8px',
                        borderTop: `1.5px solid ${t.cardBorder}`,
                        animation: 'slideDown 0.3s ease-out'
                      }}>
                        <ActionItems
                          transcript={rec.transcription || rec.summary || ''}
                          isDarkMode={isDarkMode}
                          isLoading={extractingActionItemsId === rec.id}
                          onLoadingChange={(loading) => {
                            setExtractingActionItemsId(loading ? rec.id : null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {activeTab === 'chat' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: t.text, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MessageSquare size={28} style={{ color: t.accent }} />AI Assistant
              </h2>
              <p style={{ color: t.textMuted, fontSize: '1rem', margin: 0 }}>
                Chat with your recordings using local Ollama AI
              </p>
            </div>

            {/* Ollama Status */}
            <OllamaStatus
              isDarkMode={isDarkMode}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />

            {recordings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '6rem 2rem', color: t.textMuted, border: `2px dashed ${t.cardBorder}`, borderRadius: 24 }}>
                <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No recordings found</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>Record a meeting first to start chatting</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', height: '560px' }}>

                {/* Recording Selector */}
                <div style={{ background: t.card, borderRadius: 20, border: `1.5px solid ${t.cardBorder}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${t.cardBorder}`, fontWeight: 700, color: t.text, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FolderOpen size={16} style={{ color: t.accent }} />
                    Select Recording
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                    {recordings.map(rec => (
                      <div
                        key={rec.id}
                        onClick={() => setChatSelectedRecording(rec)}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 12,
                          background: chatSelectedRecording?.id === rec.id ? t.buttonBg : 'transparent',
                          border: chatSelectedRecording?.id === rec.id ? `1.5px solid ${t.accent}` : '1.5px solid transparent',
                          cursor: 'pointer',
                          marginBottom: '0.4rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { if (chatSelectedRecording?.id !== rec.id) { e.currentTarget.style.background = t.buttonBg; e.currentTarget.style.borderColor = t.cardBorder; } }}
                        onMouseOut={(e) => { if (chatSelectedRecording?.id !== rec.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
                      >
                        <div style={{ color: t.text, fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rec.title}
                        </div>
                        <div style={{ color: t.textMuted, fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                          {new Date(rec.created_at).toLocaleDateString()}
                        </div>
                        {!rec.transcription && !rec.summary ? (
                          <div style={{ color: '#fbbf24', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            ⚠️ No transcript yet
                          </div>
                        ) : (
                          <div style={{ color: t.accent, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            ✓ Ready to chat
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ollama Chat Window */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {chatSelectedRecording ? (
                    <OllamaChatbot
                      transcription={
                        chatSelectedRecording.transcription ||
                        chatSelectedRecording.summary ||
                        'No transcript available. Please generate AI insights first.'
                      }
                      isDarkMode={isDarkMode}
                      selectedModel={selectedModel}
                    />
                  ) : (
                    <div style={{
                      height: '100%',
                      background: t.card,
                      borderRadius: 20,
                      border: `1.5px solid ${t.cardBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '1rem',
                      padding: '2rem'
                    }}>
                      <div style={{ width: 80, height: 80, borderRadius: 20, background: t.buttonBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={36} style={{ color: t.accent, opacity: 0.7 }} />
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, color: t.text, fontSize: '1.1rem' }}>
                        Select a Recording
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: t.textMuted, textAlign: 'center', maxWidth: 300 }}>
                        Choose a recording from the left to start chatting with your local AI
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: t.text, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileText size={28} style={{ color: t.accent }} />Quick Notes
                </h2>
                <p style={{ color: t.textMuted, fontSize: '1rem', margin: 0 }}>Capture ideas instantly</p>
              </div>
              {!isAddingNote && (
                <button
                  onClick={() => setIsAddingNote(true)}
                  style={{ padding: '0.8rem 1.5rem', background: t.accentGradient, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: `0 8px 20px ${t.shadow}`, transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Plus size={20} /> Add Note
                </button>
              )}
            </div>

            {isAddingNote && (
              <div style={{ background: t.card, borderRadius: 16, padding: '1.5rem', border: `1.5px solid ${t.accent}`, marginBottom: '2rem' }}>
                <textarea
                  autoFocus
                  placeholder="Type your new note here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  style={{ width: '100%', minHeight: 120, background: t.input, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: '1rem', color: t.text, fontSize: '1rem', outline: 'none', marginBottom: '1rem', resize: 'vertical', fontFamily: '"Inter", sans-serif' }}
                  onFocus={(e) => e.target.style.borderColor = t.accent}
                  onBlur={(e) => e.target.style.borderColor = t.cardBorder}
                />
                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setIsAddingNote(false); setNewNoteContent(''); }} style={{ padding: '0.7rem 1.2rem', background: 'transparent', border: `1px solid ${t.cardBorder}`, borderRadius: 8, color: t.textMuted, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleAddNote} style={{ padding: '0.7rem 1.8rem', background: t.accentGradient, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Note</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {quickNotes.map((note, index) => (
                <div key={note.id} style={{ background: t.card, borderRadius: 16, padding: '1.5rem', border: `1.5px solid ${t.cardBorder}`, transition: 'all 0.3s', display: 'flex', flexDirection: 'column' }}>
                  {isEditingNote === note.id ? (
                    <>
                      <textarea
                        defaultValue={note.content}
                        id={`edit-note-${note.id}`}
                        autoFocus
                        style={{ width: '100%', minHeight: 150, background: t.input, border: `1px solid ${t.accent}`, borderRadius: 8, padding: '0.8rem', color: t.text, fontSize: '0.95rem', outline: 'none', resize: 'vertical', marginBottom: '1rem', fontFamily: '"Inter", sans-serif' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsEditingNote(null)} style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: `1px solid ${t.cardBorder}`, borderRadius: 6, color: t.textMuted, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleUpdateNote(note.id, document.getElementById(`edit-note-${note.id}`).value)} style={{ padding: '0.4rem 1rem', background: t.accentGradient, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: t.text, fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', flex: 1, marginBottom: '1.5rem' }}>{note.content}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${t.cardBorder}`, paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} /> {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => setIsEditingNote(note.id)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', borderRadius: 6, transition: 'all 0.2s' }} title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', borderRadius: 6, transition: 'all 0.2s' }} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {quickNotes.length === 0 && !isAddingNote && (
              <div style={{ textAlign: 'center', padding: '6rem 2rem', color: t.textMuted, border: `2px dashed ${t.cardBorder}`, borderRadius: 24, marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: t.buttonBg, padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                  <FileText size={40} style={{ color: t.accent, opacity: 0.8 }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: t.text, marginBottom: '0.5rem' }}>No notes yet</h3>
                <p style={{ opacity: 0.7, maxWidth: 300, margin: 0 }}>Click "Add Note" above to create your first quick note.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: t.text, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Settings size={28} style={{ color: t.accent }} />Settings
              </h2>
              <p style={{ color: t.textMuted, fontSize: '1rem', margin: 0 }}>Manage your account and preferences</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Account */}
              <div style={{ background: t.card, borderRadius: 20, padding: '2rem', border: `1.5px solid ${t.cardBorder}` }}>
                <h3 style={{ color: t.text, fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <User size={24} style={{ color: t.accent }} />Account Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ color: t.textMuted, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Email Address</label>
                    <input type="email" value={user?.email || ''} disabled style={{ width: '100%', maxWidth: 400, padding: '0.9rem 1.15rem', background: t.input, border: `2px solid ${t.cardBorder}`, borderRadius: 12, color: t.text, fontSize: '0.95rem', fontFamily: '"Inter", sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ color: t.textMuted, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>User ID</label>
                    <input type="text" value={user?.id || ''} disabled style={{ width: '100%', maxWidth: 400, padding: '0.9rem 1.15rem', background: t.input, border: `2px solid ${t.cardBorder}`, borderRadius: 12, color: t.text, fontSize: '0.85rem', fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div style={{ background: t.card, borderRadius: 20, padding: '2rem', border: `1.5px solid ${t.cardBorder}` }}>
                <h3 style={{ color: t.text, fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Palette size={24} style={{ color: t.accent }} />Appearance
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: t.text, fontWeight: 600 }}>
                    {isDarkMode ? <Moon size={20} style={{ color: t.accent }} /> : <Sun size={20} style={{ color: t.accent }} />}
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    style={{ width: 70, height: 38, borderRadius: 999, background: isDarkMode ? t.accentGradient : 'rgba(99,102,241,0.3)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.3s', boxShadow: `0 4px 15px ${t.shadow}` }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'white', position: 'absolute', top: 4, left: isDarkMode ? 36 : 4, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isDarkMode ? <Moon size={16} style={{ color: '#6366f1' }} /> : <Sun size={16} style={{ color: '#f59e0b' }} />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Ollama Settings */}
              <div style={{ background: t.card, borderRadius: 20, padding: '2rem', border: `1.5px solid ${t.cardBorder}` }}>
                <h3 style={{ color: t.text, fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Zap size={24} style={{ color: t.accent }} />Ollama Configuration
                </h3>
                <p style={{ color: t.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Configure your local AI settings
                </p>
                <OllamaStatus
                  isDarkMode={isDarkMode}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
                <div style={{ marginTop: '1rem', padding: '1rem', background: t.buttonBg, borderRadius: 12, border: `1px solid ${t.cardBorder}` }}>
                  <p style={{ color: t.textMuted, fontSize: '0.85rem', margin: 0 }}>
                    💡 <strong style={{ color: t.text }}>Current Model:</strong> {selectedModel}
                  </p>
                  <p style={{ color: t.textMuted, fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                    💡 <strong style={{ color: t.text }}>Ollama URL:</strong> http://localhost:11434
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recording Modal */}
      {selectedRecording && (
        <RecordingModal
          recording={selectedRecording}
          isDarkMode={isDarkMode}
          onClose={() => setSelectedRecording(null)}
          onUpdate={handleUpdateRecording}
          onDelete={handleDeleteRecording}
          onTranscribe={handleTranscribe}
        />
      )}

      <style>{`
        @keyframes float { 
          0%, 100% { transform: translateY(0) translateX(0); } 
          50% { transform: translateY(-30px) translateX(30px); } 
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(12px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 1000px; }
        }
        @keyframes slideInVertical { 
          from { opacity: 0; transform: translateY(-20px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
        .recording-card:hover .edit-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}