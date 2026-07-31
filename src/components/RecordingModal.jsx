import { useState } from 'react';
import {
  X, Sparkles, Loader2, FileText, Trash2, CheckCircle2,
  Copy, Check, Globe, Users, Tag, BookOpen, Download,
  Edit3, Save, AlertCircle
} from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import ConfirmModal from './ConfirmModal';
import { transcribeWithGroq, checkGroqStatus } from '../services/groqService';
import { analyzeTranscription } from '../services/ollamaService';

export default function RecordingModal({
  recording, isDarkMode, onClose, onUpdate, onDelete, onTranscribe
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(recording.title);
  const [isSavingName, setIsSavingName] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');

  const t = isDarkMode ? {
    bg: '#0f0f1a', card: '#1a1a2e', text: '#fff',
    muted: 'rgba(255,255,255,0.6)', accent: '#a78bfa',
    border: 'rgba(139,92,246,0.2)',
    accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    success: '#34d399', warning: '#fbbf24',
    inputBg: 'rgba(15,23,42,0.8)',
    cardBg: 'rgba(15,23,42,0.6)',
    suggBg: 'rgba(139,92,246,0.1)',
  } : {
    bg: '#fff', card: '#f8fafc', text: '#1a1a2e',
    muted: '#64748b', accent: '#6366f1', border: '#e2e8f0',
    accentGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    success: '#10b981', warning: '#f59e0b',
    inputBg: '#f1f5f9',
    cardBg: 'rgba(248,250,252,0.8)',
    suggBg: 'rgba(99,102,241,0.08)',
  };

  const LANGUAGES = [
    { code: 'en-IN', label: '🇮🇳 English / Hinglish' },
    { code: 'en-US', label: '🇺🇸 English (US)' },
    { code: 'hi-IN', label: '🇮🇳 Hindi' },
  ];

  const handleGenerateAI = async () => {
    setIsProcessing(true);
    setError('');
    setProcessingStep('Checking Groq API...');

    try {
      const groqStatus = await checkGroqStatus();
      if (!groqStatus.isConfigured) {
        throw new Error('Groq API key missing! Get free key at console.groq.com');
      }

      // Fetch audio
      setProcessingStep('Fetching audio file...');
      const response = await fetch(recording.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      const audioBlob = await response.blob();
      console.log('Audio fetched:', { size: audioBlob.size, type: audioBlob.type });

      // Transcribe with Groq
      setProcessingStep('Transcribing audio with Groq Whisper...');
      const whisperResult = await transcribeWithGroq(audioBlob, selectedLang);

      console.log('=== TRANSCRIPT RECEIVED ===');
      console.log('Text:', whisperResult.transcript);
      console.log('Language:', whisperResult.language);

      if (!whisperResult.transcript?.trim()) {
        throw new Error('No speech detected. Record clear audio and try again.');
      }

      // Analyze with Ollama
      setProcessingStep('Analyzing transcript with Ollama AI...');
      let analysis = {
        summary: whisperResult.transcript.slice(0, 200),
        actionItems: [],
        keyTopics: [],
        speakerCount: 1,
        language: whisperResult.language || 'Unknown',
        sentiment: 'neutral'
      };

      try {
        console.log('Sending to Ollama:', whisperResult.transcript);
        analysis = await analyzeTranscription(whisperResult.transcript);
        console.log('=== OLLAMA ANALYSIS ===', analysis);
      } catch (ollamaErr) {
        console.warn('Ollama failed:', ollamaErr.message);
        setError('Ollama analysis failed: ' + ollamaErr.message + '. Transcript saved.');
      }

      // Save to database
      setProcessingStep('Saving results...');
      await onUpdate(recording.id, {
        transcription: whisperResult.transcript,
        summary: analysis.summary || whisperResult.transcript.slice(0, 200),
        action_items: analysis.actionItems || [],
        key_topics: analysis.keyTopics || [],
        language: whisperResult.language || analysis.language || 'Unknown',
        speaker_count: analysis.speakerCount || 1,
      });

      setActiveTab('summary');

    } catch (err) {
      console.error('Generate AI error:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };
  const handleDeleteConfirm = async () => {
    await onDelete(recording.id, recording.file_name);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === recording.title) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await onUpdate(recording.id, { title: editedName.trim() });
      setIsEditingName(false);
    } catch (err) {
      setError('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Copy failed');
    }
  };

  const downloadAsText = () => {
    const content = `Meeting: ${recording.title}
Date: ${new Date(recording.created_at).toLocaleString()}
Language: ${recording.language || 'Unknown'}
Speakers: ${recording.speaker_count || 1}

=== SUMMARY ===
${recording.summary || 'No summary'}

=== ACTION ITEMS ===
${recording.action_items?.length ? recording.action_items.map((item, i) => `${i + 1}. ${item}`).join('\n') : 'None'}

=== KEY TOPICS ===
${recording.key_topics?.length ? recording.key_topics.join(', ') : 'None'}

=== TRANSCRIPT ===
${recording.transcription || 'No transcription'}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'transcript', label: 'Transcript', icon: BookOpen },
    { id: 'actions', label: 'Actions', icon: CheckCircle2 },
  ];

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
      >
        <div style={{ background: t.bg, borderRadius: 24, width: '100%', maxWidth: 900, maxHeight: '95vh', overflow: 'hidden', border: `2px solid ${t.border}`, display: 'flex', flexDirection: 'column', animation: 'modalIn 0.3s ease-out' }}>

          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') { setIsEditingName(false); setEditedName(recording.title); }
                    }}
                    autoFocus
                    style={{ flex: 1, background: t.inputBg, border: `2px solid ${t.accent}`, borderRadius: 10, padding: '0.5rem 0.75rem', color: t.text, fontSize: '1.1rem', fontWeight: 700, outline: 'none' }}
                  />
                  <button onClick={handleSaveName} disabled={isSavingName} style={{ padding: '0.5rem', background: t.accentGradient, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {isSavingName ? <Loader2 size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} color="#fff" />}
                  </button>
                  <button onClick={() => { setIsEditingName(false); setEditedName(recording.title); }} style={{ padding: '0.5rem', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={18} color={t.muted} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ color: t.text, fontWeight: 800, fontSize: '1.2rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {recording.title}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    style={{ padding: '0.35rem', background: 'transparent', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', color: t.muted, transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = t.card; e.currentTarget.style.color = t.accent; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.muted; }}
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              )}
              <p style={{ color: t.muted, fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                {new Date(recording.created_at).toLocaleString()}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              {recording.summary && (
                <button
                  onClick={downloadAsText}
                  style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: t.muted, fontSize: '0.8rem', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = t.border; e.currentTarget.style.color = t.text; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = t.card; e.currentTarget.style.color = t.muted; }}
                >
                  <Download size={16} /> Export
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1, transition: 'all 0.2s' }}
                onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              >
                <Trash2 size={18} color="#f87171" />
              </button>
              <button
                onClick={onClose}
                disabled={isProcessing}
                style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '0.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1, transition: 'all 0.2s' }}
                onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.background = t.border; }}
                onMouseOut={(e) => { e.currentTarget.style.background = t.card; }}
              >
                <X size={18} color={t.text} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

            <AudioPlayer src={recording.audio_url} isDarkMode={isDarkMode} />

            {/* Metadata */}
            {recording.summary && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ background: t.card, padding: '0.5rem 0.75rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${t.border}` }}>
                  <Globe size={14} color={t.accent} />
                  <span style={{ color: t.text, fontSize: '0.8rem', fontWeight: 600 }}>{recording.language || 'Unknown'}</span>
                </div>
                <div style={{ background: t.card, padding: '0.5rem 0.75rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${t.border}` }}>
                  <Users size={14} color={t.accent} />
                  <span style={{ color: t.text, fontSize: '0.8rem', fontWeight: 600 }}>
                    {recording.speaker_count || 1} Speaker{(recording.speaker_count || 1) > 1 ? 's' : ''}
                  </span>
                </div>
                {recording.key_topics?.slice(0, 3).map((topic, idx) => (
                  <div key={idx} style={{ background: `${t.accent}15`, padding: '0.5rem 0.75rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${t.accent}30` }}>
                    <Tag size={12} color={t.accent} />
                    <span style={{ color: t.accent, fontSize: '0.8rem', fontWeight: 600 }}>{topic}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ color: '#f87171', margin: 0, fontSize: '0.9rem' }}>{error}</p>
                  {error.includes('Groq') && (
                    <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', fontSize: '0.85rem' }}>
                      → Get free Groq API key
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* No Summary - Generate */}
            {!recording.summary && !isProcessing && (
              <div style={{ textAlign: 'center', padding: '2.5rem 2rem', border: `2px dashed ${t.border}`, borderRadius: 20, marginTop: '1.5rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: `${t.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Sparkles size={36} color={t.accent} />
                </div>
                <h3 style={{ color: t.text, marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.2rem' }}>
                  Generate AI Insights
                </h3>
                <p style={{ color: t.muted, marginBottom: '1.5rem', maxWidth: 420, margin: '0 auto 1.25rem', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  Uses <strong style={{ color: t.accent }}>Groq Whisper</strong> to transcribe your audio, then <strong style={{ color: t.accent }}>Ollama</strong> to generate summary, action items and topics.
                </p>

                {/* How it works */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { icon: '🎙️', label: 'Groq Whisper', desc: 'Transcribes audio' },
                    { icon: '🤖', label: 'Ollama AI', desc: 'Analyzes text' },
                    { icon: '🔒', label: 'Private', desc: 'Analysis is local' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: '0.75rem 1rem', minWidth: 110 }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                      <div style={{ color: t.text, fontSize: '0.82rem', fontWeight: 700 }}>{item.label}</div>
                      <div style={{ color: t.muted, fontSize: '0.75rem' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Language */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <Globe size={16} color={t.muted} />
                  <span style={{ color: t.muted, fontSize: '0.85rem', fontWeight: 600 }}>Language:</span>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '0.5rem 0.75rem', color: t.text, cursor: 'pointer', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleGenerateAI}
                  style={{ padding: '0.9rem 2.5rem', background: t.accentGradient, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(139,92,246,0.3)', fontSize: '1rem', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Sparkles size={20} /> Generate with AI
                </button>

                <p style={{ color: t.muted, fontSize: '0.78rem', marginTop: '1rem', opacity: 0.7 }}>
                  Requires: Groq API key + Ollama running
                </p>
              </div>
            )}

            {/* Processing */}
            {isProcessing && (
              <div style={{ textAlign: 'center', padding: '2.5rem', marginTop: '1rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: `${t.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Loader2 size={36} color={t.accent} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <p style={{ color: t.text, fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Processing your recording...
                </p>
                <p style={{ color: t.accent, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {processingStep}
                </p>
                <p style={{ color: t.muted, fontSize: '0.82rem' }}>
                  Please keep this window open
                </p>
              </div>
            )}

            {/* Results */}
            {recording.summary && !isProcessing && (
              <div style={{ marginTop: '1.5rem' }}>
                {/* Re-analyze */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '0.4rem 0.6rem', color: t.text, fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGenerateAI}
                    style={{ padding: '0.5rem 1rem', background: t.suggBg, border: `1px solid ${t.border}`, borderRadius: 10, color: t.accent, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = t.accent}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = t.border}
                  >
                    <Sparkles size={14} /> Re-analyze
                  </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: t.card, padding: '0.35rem', borderRadius: 12, border: `1px solid ${t.border}` }}>
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: 1, padding: '0.6rem', background: activeTab === tab.id ? t.accentGradient : 'transparent', border: 'none', borderRadius: 8, color: activeTab === tab.id ? '#fff' : t.muted, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                      >
                        <Icon size={16} /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Summary */}
                {activeTab === 'summary' && (
                  <div style={{ background: t.card, padding: '1.5rem', borderRadius: 16, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ color: t.accent, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <FileText size={18} /> Summary
                      </h4>
                      <button
                        onClick={() => copyToClipboard(recording.summary, 'summary')}
                        style={{ background: copied === 'summary' ? `${t.success}20` : 'transparent', border: `1px solid ${copied === 'summary' ? t.success : t.border}`, borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer', color: copied === 'summary' ? t.success : t.muted, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >
                        {copied === 'summary' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                    <p style={{ color: t.text, lineHeight: 1.8, margin: 0, fontSize: '0.95rem' }}>
                      {recording.summary}
                    </p>
                  </div>
                )}

                {/* Transcript */}
                {activeTab === 'transcript' && (
                  <div style={{ background: t.card, padding: '1.5rem', borderRadius: 16, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ color: t.accent, fontWeight: 700, margin: 0 }}>Full Transcript</h4>
                      <button
                        onClick={() => copyToClipboard(recording.transcription, 'transcript')}
                        style={{ background: copied === 'transcript' ? `${t.success}20` : 'transparent', border: `1px solid ${copied === 'transcript' ? t.success : t.border}`, borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer', color: copied === 'transcript' ? t.success : t.muted, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >
                        {copied === 'transcript' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                    <div style={{ color: t.text, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.8, maxHeight: 300, overflowY: 'auto' }}>
                      {recording.transcription || 'No transcription available'}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {activeTab === 'actions' && (
                  <div style={{ background: t.card, padding: '1.5rem', borderRadius: 16, border: `1px solid ${t.border}` }}>
                    <h4 style={{ color: t.accent, fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} /> Action Items
                    </h4>
                    {recording.action_items?.length > 0 ? (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {recording.action_items.map((item, idx) => (
                          <li key={idx} style={{ color: t.text, marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: `${t.success}08`, borderRadius: 10, border: `1px solid ${t.success}20` }}>
                            <CheckCircle2 size={16} color={t.success} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontSize: '0.9rem' }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: t.muted, margin: 0, fontSize: '0.9rem' }}>No action items identified.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Recording"
        message={`Delete "${recording.title}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDarkMode={isDarkMode}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}