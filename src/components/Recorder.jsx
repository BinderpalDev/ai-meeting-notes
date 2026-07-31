import { useRef, useState, useEffect } from 'react';
import {
  Mic, Square, AlertCircle, Monitor, Trash2, Save,
  Loader2, FileText, Globe
} from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { LiveTranscriber } from '../services/speechService';
import { analyzeTranscription } from '../services/ollamaService';

const STORAGE_KEY = 'pendingRecording';

const LANGUAGES = [
  { code: 'en-IN', label: 'English / Hinglish', flag: '🇮🇳' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
];

export default function Recorder({ onSave, isDarkMode = true }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [permissionError, setPermissionError] = useState('');
  const [levels, setLevels] = useState(new Array(20).fill(0));
  const [mode, setMode] = useState('mic');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasUnsavedRecording, setHasUnsavedRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');

  // Live transcription states
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const transcriberRef = useRef(null);

  const t = isDarkMode ? {
    accent: '#a78bfa',
    accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    text: '#f8fafc',
    textMuted: 'rgba(167,139,250,0.8)',
    cardBorder: 'rgba(139,92,246,0.25)',
    barGradient: 'linear-gradient(to top, #3b82f6, #8b5cf6, #a78bfa)',
    buttonBg: 'rgba(139,92,246,0.15)',
    shadow: 'rgba(139,92,246,0.4)',
    cardBg: 'rgba(15,23,42,0.6)',
    input: 'rgba(15,15,35,0.8)',
    success: '#34d399',
  } : {
    accent: '#6366f1',
    accentGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    text: '#1e293b',
    textMuted: 'rgba(99,102,241,0.9)',
    cardBorder: 'rgba(99,102,241,0.2)',
    barGradient: 'linear-gradient(to top, #6366f1, #8b5cf6, #a855f7)',
    buttonBg: 'rgba(99,102,241,0.1)',
    shadow: 'rgba(99,102,241,0.35)',
    cardBg: 'rgba(248,250,252,0.8)',
    input: 'rgba(241,245,249,0.9)',
    success: '#10b981',
  };

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { audioData, time, transcript, analysis } = JSON.parse(saved);
        const byteChars = atob(audioData);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setAudioUrl(url);
        setRecordingTime(time || 0);
        setLiveTranscript(transcript || '');
        setAnalysisResult(analysis || null);
        setHasUnsavedRecording(true);
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRecording || recordedBlob) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording, recordedBlob]);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current?.state !== 'closed') {
      try { audioContextRef.current?.close(); } catch (e) { }
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (transcriberRef.current?.isActive) {
      try { transcriberRef.current.stop(); } catch (e) { }
    }
  };

  const saveToLocalStorage = (blob, time, transcript, analysis) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        audioData: base64,
        time,
        transcript,
        analysis
      }));
    };
    reader.readAsDataURL(blob);
  };

  const clearLocalStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasUnsavedRecording(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVisualizer = (stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / 20);
        setLevels(Array.from({ length: 20 }, (_, i) => data[i * step] / 255));
        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      console.warn('Visualizer error:', e);
    }
  };

  const startRecording = async () => {
    setPermissionError('');
    setAnalysisError('');
    setAnalysisResult(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setRecordedBlob(null);
    setAudioUrl(null);
    setLiveTranscript('');
    setInterimText('');
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    clearLocalStorage();

    try {
      let stream;
      if (mode === 'tab') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        if (stream.getAudioTracks().length === 0) {
          setPermissionError('No audio. Check "Share audio" when sharing screen.');
          stream.getTracks().forEach(t => t.stop());
          return;
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      }

      streamRef.current = stream;

      // Start live transcription
      try {
        const transcriber = new LiveTranscriber(selectedLang);
        transcriberRef.current = transcriber;

        transcriber.onTranscriptUpdate = (final, interim) => {
          setLiveTranscript(final);
          setInterimText(interim);
        };

        transcriber.onError = (err) => {
          console.warn('Transcription error:', err);
        };

        transcriber.start();
      } catch (speechErr) {
        console.warn('Speech recognition not available:', speechErr.message);
        setPermissionError('Note: Live transcription requires Chrome browser. Recording will still work.');
      }

      // Setup media recorder
      stream.getTracks().forEach(track => {
        track.onended = () => {
          if (mediaRecorderRef.current?.state === 'recording') stopRecording();
        };
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('Recording complete, size:', blob.size);

        if (blob.size < 1000) {
          setPermissionError('Recording too short. Please try again.');
          return;
        }

        const url = URL.createObjectURL(blob);
        const finalTranscript = transcriberRef.current?.getTranscript() || liveTranscript;

        setRecordedBlob(blob);
        setAudioUrl(url);
        setRecordingTime(recordingTimeRef.current);
        setLiveTranscript(finalTranscript);

        // Save to localStorage  
        saveToLocalStorage(blob, recordingTimeRef.current, finalTranscript, null);
      };

      recorder.onerror = (e) => {
        console.error('Recorder error:', e);
        setPermissionError('Recording failed. Please try again.');
        stopRecording();
      };

      startVisualizer(stream);
      recorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

    } catch (err) {
      console.error('Start recording error:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Permission denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No microphone found.');
      } else {
        setPermissionError('Error: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    // Stop transcriber
    if (transcriberRef.current?.isActive) {
      try { transcriberRef.current.stop(); } catch (e) { }
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) { }
      audioContextRef.current = null;
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    setIsRecording(false);
    setInterimText('');
  };

  // Analyze with Ollama after recording
  const handleAnalyze = async () => {
    if (!liveTranscript?.trim()) {
      setAnalysisError('No transcription available. Make sure you use Chrome browser for live transcription.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const result = await analyzeTranscription(liveTranscript);
      setAnalysisResult(result);
      // Update localStorage with analysis
      if (recordedBlob) {
        saveToLocalStorage(recordedBlob, recordingTime, liveTranscript, result);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      if (err.message?.includes('fetch') || err.message?.includes('Failed')) {
        setAnalysisError('Cannot connect to Ollama. Make sure Ollama is running (run "ollama serve" in terminal).');
      } else {
        setAnalysisError('Analysis failed: ' + err.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDiscard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setRecordedBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setLiveTranscript('');
    setInterimText('');
    setAnalysisResult(null);
    setAnalysisError('');
    clearLocalStorage();
  };

  const handleSave = async () => {
    if (!recordedBlob || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(recordedBlob, liveTranscript, analysisResult);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setRecordedBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setLiveTranscript('');
      setAnalysisResult(null);
      clearLocalStorage();
    } catch (err) {
      console.error('Save error:', err);
      setPermissionError('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
          {mode === 'mic' ? <Mic size={24} style={{ color: t.accent }} /> : <Monitor size={24} style={{ color: t.accent }} />}
          {mode === 'mic' ? 'Voice Recorder' : 'Meeting Recorder'}
        </h2>

        {!recordedBlob && !isRecording && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Mode Toggle */}
            <div style={{ background: t.buttonBg, padding: '0.25rem', borderRadius: 10, display: 'flex', gap: '0.25rem', border: `1px solid ${t.cardBorder}` }}>
              <button onClick={() => setMode('mic')} style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: 'none', background: mode === 'mic' ? t.accent : 'transparent', color: mode === 'mic' ? '#fff' : t.textMuted, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mic size={14} /> Mic
              </button>
              <button onClick={() => setMode('tab')} style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: 'none', background: mode === 'tab' ? t.accent : 'transparent', color: mode === 'tab' ? '#fff' : t.textMuted, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Monitor size={14} /> Meet
              </button>
            </div>

            {/* Language Selector */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              style={{
                background: t.input,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 10,
                padding: '0.4rem 0.75rem',
                color: t.text,
                cursor: 'pointer',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Recovered Notice */}
      {hasUnsavedRecording && recordedBlob && (
        <div style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} color="#fbbf24" />
          <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>Recovered unsaved recording!</span>
        </div>
      )}

      {/* Recording Interface */}
      {!recordedBlob ? (
        <>
          <p style={{ marginBottom: '1.5rem', color: t.textMuted }}>
            {mode === 'mic' ? 'Click Start Recording to capture audio with live transcription.' : 'Share your screen to record meeting audio.'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            {!isRecording ? (
              <button onClick={startRecording} style={{ padding: '0.9rem 1.75rem', borderRadius: 14, border: 'none', background: t.accentGradient, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: `0 8px 28px ${t.shadow}`, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {mode === 'mic' ? <Mic size={20} /> : <Monitor size={20} />} Start Recording
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={stopRecording} style={{ padding: '0.9rem 1.75rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', boxShadow: '0 8px 28px rgba(239,68,68,0.4)' }}>
                  <Square size={20} fill="white" /> Stop Recording
                </button>
                <div style={{ background: 'rgba(239,68,68,0.15)', padding: '0.5rem 1rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                  <span style={{ color: '#ef4444', fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem' }}>{formatTime(recordingTime)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Visualizer */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: 80, padding: '1rem', background: t.cardBg, borderRadius: 16, border: `1.5px solid ${t.cardBorder}`, marginBottom: '1rem' }}>
            {levels.map((level, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 4, background: t.barGradient, height: `${10 + level * 90}%`, opacity: isRecording ? 1 : 0.3, transition: 'height 0.1s' }} />
            ))}
          </div>

          {/* Live Transcript Display */}
          {isRecording && (
            <div style={{ background: t.cardBg, borderRadius: 16, padding: '1.25rem', border: `1.5px solid ${t.cardBorder}`, marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.success, animation: 'pulse 1s infinite' }} />
                <span style={{ color: t.success, fontWeight: 600, fontSize: '0.85rem' }}>Live Transcription</span>
              </div>
              <div style={{ color: t.text, fontSize: '0.9rem', lineHeight: 1.7, minHeight: 60, maxHeight: 150, overflowY: 'auto' }}>
                {liveTranscript && <span>{liveTranscript}</span>}
                {interimText && <span style={{ color: t.textMuted, fontStyle: 'italic' }}>{interimText}</span>}
                {!liveTranscript && !interimText && (
                  <span style={{ color: t.textMuted, fontStyle: 'italic' }}>Listening... speak now</span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Review Recording */
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: t.text, marginBottom: '0.5rem' }}>Review Recording</h3>
          <p style={{ color: t.textMuted, marginBottom: '1rem', fontSize: '0.9rem' }}>
            Duration: {formatTime(recordingTime)} | Size: {(recordedBlob.size / 1024).toFixed(1)} KB
          </p>

          <AudioPlayer src={audioUrl} isDarkMode={isDarkMode} />

          {/* Transcript */}
          {liveTranscript && (
            <div style={{ background: t.cardBg, borderRadius: 16, padding: '1.25rem', border: `1.5px solid ${t.cardBorder}`, marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <FileText size={18} color={t.accent} />
                <span style={{ color: t.accent, fontWeight: 700 }}>Transcription</span>
              </div>
              <div style={{ color: t.text, fontSize: '0.9rem', lineHeight: 1.7, maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {liveTranscript}
              </div>
            </div>
          )}

          {/* No transcript warning */}
          {!liveTranscript && (
            <div style={{ background: 'rgba(251,191,36,0.1)', borderRadius: 12, padding: '1rem', border: '1px solid rgba(251,191,36,0.3)', marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: '#fbbf24', fontWeight: 600, margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>No transcription captured</p>
                <p style={{ color: t.textMuted, margin: 0, fontSize: '0.8rem' }}>Use Chrome browser for live transcription. Recording is still saved.</p>
              </div>
            </div>
          )}

          {/* Analyze with Ollama */}
          {liveTranscript && !analysisResult && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem', border: `2px dashed ${t.cardBorder}`, borderRadius: 16 }}>
              <p style={{ color: t.textMuted, marginBottom: '1rem', fontSize: '0.95rem' }}>
                Analyze transcription with Ollama AI to get summary, action items & topics
              </p>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{ padding: '0.8rem 2rem', background: t.accentGradient, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: isAnalyzing ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: `0 8px 24px ${t.shadow}`, opacity: isAnalyzing ? 0.8 : 1 }}
              >
                {isAnalyzing ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing with Ollama...</>
                ) : (
                  <>✨ Analyze with Ollama</>
                )}
              </button>
              {analysisError && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: '0.85rem' }}>
                  {analysisError}
                </div>
              )}
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Summary */}
              <div style={{ background: t.cardBg, borderRadius: 16, padding: '1.25rem', border: `1.5px solid ${t.cardBorder}` }}>
                <h4 style={{ color: t.accent, fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📋 Summary
                </h4>
                <p style={{ color: t.text, lineHeight: 1.7, margin: 0 }}>{analysisResult.summary}</p>
              </div>

              {/* Action Items */}
              {analysisResult.actionItems?.length > 0 && (
                <div style={{ background: t.cardBg, borderRadius: 16, padding: '1.25rem', border: `1.5px solid ${t.cardBorder}` }}>
                  <h4 style={{ color: t.accent, fontWeight: 700, marginBottom: '0.75rem' }}>✅ Action Items</h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {analysisResult.actionItems.map((item, i) => (
                      <li key={i} style={{ color: t.text, padding: '0.5rem 0.75rem', marginBottom: '0.5rem', background: `${t.success}10`, borderRadius: 8, border: `1px solid ${t.success}25`, display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: t.success }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Topics */}
              {analysisResult.keyTopics?.length > 0 && (
                <div style={{ background: t.cardBg, borderRadius: 16, padding: '1.25rem', border: `1.5px solid ${t.cardBorder}` }}>
                  <h4 style={{ color: t.accent, fontWeight: 700, marginBottom: '0.75rem' }}>🏷️ Key Topics</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {analysisResult.keyTopics.map((topic, i) => (
                      <span key={i} style={{ background: `${t.accent}20`, color: t.accent, padding: '0.35rem 0.8rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, border: `1px solid ${t.accent}30` }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={handleDiscard} disabled={isSaving} style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: '1.5px solid #ef4444', borderRadius: 12, color: '#ef4444', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.5 : 1 }}>
              <Trash2 size={18} /> Discard
            </button>
            <button onClick={handleSave} disabled={isSaving} style={{ padding: '0.8rem 2rem', background: t.accentGradient, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 24px ${t.shadow}`, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.8 : 1 }}>
              {isSaving ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={18} /> Save to Library</>}
            </button>
          </div>
        </div>
      )}

      {permissionError && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#f87171" />
          <span style={{ color: '#f87171' }}>{permissionError}</span>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}