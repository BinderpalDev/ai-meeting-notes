import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Volume1,
  Gauge,
  RotateCcw,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function AudioPlayer({ src, isDarkMode = true }) {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showVolume, setShowVolume] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [waveformBars] = useState(() => 
    Array.from({ length: 50 }, () => Math.random() * 60 + 40)
  );
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [isDragging, setIsDragging] = useState(false);

  const t = isDarkMode ? {
    bg: 'rgba(15,23,42,0.9)',
    border: 'rgba(139,92,246,0.25)',
    accent: '#a78bfa',
    accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
    text: '#f8fafc',
    textMuted: 'rgba(167,139,250,0.8)',
    progress: 'rgba(139,92,246,0.2)',
    buttonBg: 'rgba(139,92,246,0.1)',
    buttonBgHover: 'rgba(139,92,246,0.25)',
    shadow: 'rgba(139,92,246,0.4)',
  } : {
    bg: 'rgba(248,250,252,0.95)',
    border: 'rgba(99,102,241,0.25)',
    accent: '#6366f1',
    accentGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    text: '#1e293b',
    textMuted: 'rgba(99,102,241,0.9)',
    progress: 'rgba(99,102,241,0.15)',
    buttonBg: 'rgba(99,102,241,0.08)',
    buttonBgHover: 'rgba(99,102,241,0.18)',
    shadow: 'rgba(99,102,241,0.35)',
  };

  // Reset when src changes
  useEffect(() => {
    setStatus('loading');
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [src]);

  // Setup audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const handleLoadedData = () => {
      console.log('Audio loaded, duration:', audio.duration);
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setStatus('ready');
      }
    };

    const handleCanPlay = () => {
      console.log('Audio can play');
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setStatus('ready');
      }
    };

    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setStatus('ready');
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setStatus('error');
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Add all listeners
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Force load
    audio.load();

    // Timeout fallback for loading
    const timeout = setTimeout(() => {
      if (status === 'loading' && audio.readyState >= 2) {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
        setStatus('ready');
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [src, isDragging, status]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        // If audio not loaded yet, force ready state
        if (status === 'loading') {
          setStatus('ready');
        }
        await audio.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      // Still try to play
      setIsPlaying(false);
    }
  };

  const seekTo = useCallback((percentage) => {
    const audio = audioRef.current;
    const dur = duration || audio?.duration || 0;
    if (!audio || !dur || !isFinite(dur)) return;
    
    const newTime = Math.max(0, Math.min(percentage * dur, dur));
    if (isFinite(newTime)) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const handleProgressClick = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(percentage);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(percentage);
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, seekTo]);

  const skip = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = duration || audio.duration || 0;
    if (!isFinite(dur)) return;
    const newTime = Math.max(0, Math.min(audio.currentTime + seconds, dur));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const cyclePlaybackRate = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(playbackRate);
    const newRate = speeds[(idx + 1) % speeds.length];
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
    setPlaybackRate(newRate);
  };

  const formatTime = (time) => {
    if (!time || !isFinite(time) || time < 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const isReady = status === 'ready' || status === 'loading';

  return (
    <div style={{
      background: t.bg,
      border: `1.5px solid ${t.border}`,
      borderRadius: 20,
      padding: '1.5rem',
      backdropFilter: 'blur(20px)',
    }}>
      <audio ref={audioRef} src={src} preload="auto" />

      {/* Error State */}
      {status === 'error' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          gap: '1rem'
        }}>
          <AlertCircle size={32} color="#f87171" />
          <p style={{ color: '#f87171', margin: 0 }}>Failed to load audio</p>
          <button
            onClick={() => {
              setStatus('loading');
              audioRef.current?.load();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: t.buttonBg,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              color: t.text,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Player UI */}
      {status !== 'error' && (
        <>
          {/* Waveform */}
          <div
            ref={progressRef}
            onMouseDown={handleMouseDown}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              height: 56,
              marginBottom: '1rem',
              cursor: 'pointer',
              padding: '0 4px',
              borderRadius: 12,
              userSelect: 'none',
            }}
          >
            {waveformBars.map((height, i) => {
              const barProgress = (i / waveformBars.length) * 100;
              const isActive = barProgress <= progress;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${height}%`,
                    background: isActive ? t.accentGradient : t.progress,
                    borderRadius: 3,
                    transition: isDragging ? 'none' : 'background 0.15s',
                    transform: isPlaying && isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                  }}
                />
              );
            })}
          </div>

          {/* Time */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: 'monospace',
            color: t.textMuted,
            padding: '0 4px',
          }}>
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {/* Restart */}
            <button
              onClick={restart}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: t.buttonBg,
                border: `1.5px solid ${t.border}`,
                color: t.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCcw size={16} />
            </button>

            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: t.buttonBg,
                border: `1.5px solid ${t.border}`,
                color: t.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SkipBack size={20} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: t.accentGradient,
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 28px ${t.shadow}`,
              }}
            >
              {status === 'loading' ? (
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
              ) : isPlaying ? (
                <Pause size={28} fill="white" />
              ) : (
                <Play size={28} fill="white" style={{ marginLeft: 3 }} />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: t.buttonBg,
                border: `1.5px solid ${t.border}`,
                color: t.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SkipForward size={20} />
            </button>

            {/* Volume */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                onClick={() => {
                  const newVol = volume === 0 ? 0.8 : 0;
                  setVolume(newVol);
                  if (audioRef.current) audioRef.current.volume = newVol;
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: t.buttonBg,
                  border: `1.5px solid ${t.border}`,
                  color: t.textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VolumeIcon size={18} />
              </button>

              {showVolume && (
                <div style={{
                  position: 'absolute',
                  bottom: '120%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: t.bg,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: 14,
                  padding: '1rem 0.75rem',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  zIndex: 100,
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: t.textMuted, fontWeight: 700 }}>
                      {Math.round(volume * 100)}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                        width: 6,
                        height: 70,
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Speed */}
            <button
              onClick={cyclePlaybackRate}
              style={{
                height: 40,
                padding: '0 10px',
                borderRadius: 10,
                background: playbackRate !== 1 ? t.buttonBgHover : t.buttonBg,
                border: `1.5px solid ${playbackRate !== 1 ? t.accent : t.border}`,
                color: playbackRate !== 1 ? t.accent : t.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                minWidth: 58,
              }}
            >
              <Gauge size={14} />
              {playbackRate}x
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}