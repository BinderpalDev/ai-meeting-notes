import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { Button } from "@/components/ui/button";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  duration = "00:30",
  audioUrl,
}: {
  duration?: string;
  audioUrl?: string;
}) {
  const parts = duration.split(":");
  const initialTotal = Number(parts[0] ?? 0) * 60 + Number(parts[1] ?? 0);
  const [total, setTotal] = useState(initialTotal > 0 ? initialTotal : 30);

  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Fallback visual playback timer when HTML5 audio is unavailable or missing audioUrl
  useEffect(() => {
    if (!playing || (audioUrl && audioRef.current && !audioRef.current.paused)) return;

    const interval = setInterval(() => {
      setPos((prev) => {
        if (prev + 0.25 >= total) {
          setPlaying(false);
          return 0;
        }
        return prev + 0.25;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [playing, total, audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;

    if (playing) {
      if (audio) audio.pause();
      setPlaying(false);
      return;
    }

    if (audio && audioUrl) {
      audio
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((err) => {
          console.warn("HTML5 audio playback fallback to visual animation:", err);
          setPlaying(true);
        });
    } else {
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setPos(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setTotal(audio.duration);
      }
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setPos(0);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      audio.currentTime = 0;
      setPos(0);
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(true));
    } else {
      setPos(0);
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * total;

    setPos(newTime);
    if (audio && audioUrl) {
      audio.currentTime = newTime;
    }
  };

  const progress = total ? pos / total : 0;

  return (
    <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={() => {
          if (audioRef.current?.duration) {
            setTotal(audioRef.current.duration);
          }
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          type="button"
          className="h-11 w-11 shrink-0 rounded-full gradient-primary glow-primary cursor-pointer active:scale-95 transition-transform"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button
          size="icon"
          type="button"
          variant="ghost"
          className="h-9 w-9 shrink-0 rounded-full cursor-pointer"
          onClick={restart}
          aria-label="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <div ref={trackRef} className="h-12 cursor-pointer" onClick={handleSeek}>
          <Waveform bars={56} progress={progress} active={playing} tone="mint" />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
          <span>{fmt(pos)}</span>
          <span>{fmt(total)}</span>
        </div>
      </div>

      <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="hover:text-foreground transition-colors cursor-pointer"
          aria-label="Toggle mute"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-4 w-4 text-destructive" />
          ) : (
            <Volume2 className="h-4 w-4 text-mint" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            setIsMuted(false);
          }}
          className="h-1.5 w-20 cursor-pointer accent-mint bg-muted rounded-lg"
        />
      </div>
    </div>
  );
}
