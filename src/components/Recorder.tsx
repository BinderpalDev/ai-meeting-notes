import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mic, Pause, Play, Square, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Waveform } from "@/components/Waveform";
import { useApp } from "@/context/AppContext";
import { databaseService } from "@/services/databaseService";
import { transcribeAudio } from "@/services/geminiService";
import { extractActionItems } from "@/services/mlActionItemService";
import { LiveTranscriber } from "@/services/speechService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "idle" | "recording" | "paused" | "stopped" | "processing" | "done";

const ACCEPTED = [".mp3", ".wav", ".webm", ".m4a"];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export function Recorder({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [liveText, setLiveText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriberRef = useRef<LiveTranscriber | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecording } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);

      try {
        const transcriber = new LiveTranscriber("en-US");
        transcriber.onTranscriptUpdate = (final, interim) => {
          setLiveText(final);
          setInterimText(interim);
        };
        transcriber.start();
        transcriberRef.current = transcriber;
      } catch (speechErr) {
        console.warn("Live Speech Recognition not supported in this browser:", speechErr);
      }

      setPhase("recording");
    } catch (err) {
      toast.error("Microphone Access Denied", {
        description: "Please allow microphone access to record audio.",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setPhase("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setPhase("recording");
    }
  };

  const stopAndGetBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (transcriberRef.current) {
        try {
          const finalRecordedText = transcriberRef.current.stop();
          if (finalRecordedText) setLiveText(finalRecordedText);
        } catch (e) {}
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          resolve(blob);
        } else {
          resolve(audioBlob);
        }
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        resolve(blob);
      };

      recorder.stop();
    });
  };

  const stopRecording = () => {
    stopAndGetBlob();
    setPhase("stopped");
  };

  const reset = () => {
    if (transcriberRef.current) {
      try { transcriberRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setPhase("idle");
    setSeconds(0);
    setFileName(null);
    setSelectedFile(null);
    setAudioBlob(null);
    setLiveText("");
    setInterimText("");
    setNewId(null);
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) window.setTimeout(reset, 250);
  };

  const process = async () => {
    setPhase("processing");
    try {
      let blobToProcess: Blob | null = selectedFile;
      if (!blobToProcess) {
        blobToProcess = await stopAndGetBlob();
      }

      if (!blobToProcess || blobToProcess.size === 0) {
        throw new Error("No audio recording detected. Please record audio or upload a file first.");
      }

      // 1. Upload audio using databaseService
      let audioUrl = "";
      let uploadedFileName = fileName || `recording_${Date.now()}.webm`;

      try {
        const uploadRes = await databaseService.uploadAudio(blobToProcess);
        audioUrl = uploadRes.audioUrl;
        uploadedFileName = uploadRes.fileName;
      } catch (e) {
        audioUrl = URL.createObjectURL(blobToProcess);
      }

      // 2. Transcribe audio via Gemini AI service (or Mock mode)
      let aiResult: any = null;
      try {
        aiResult = await transcribeAudio(blobToProcess);
      } catch (e: any) {
        console.warn("Gemini transcription fallback to live speech transcript:", e);
        aiResult = {
          speakerCount: 1,
          transcription: liveText || "Live speech captured.",
          summary: liveText
            ? `Summary of recorded audio: ${liveText.substring(0, 150)}...`
            : "Audio processed successfully.",
          actionItems: [],
          keyTopics: ["Meeting Recording"],
        };
      }

      const finalTranscriptText = aiResult?.transcription || liveText || "Audio recorded.";

      // 3. Extract action items using local ONNX model service
      let mlItems: string[] = [];
      try {
        const mlResult = await extractActionItems(finalTranscriptText);
        if (mlResult && Array.isArray(mlResult.data)) {
          mlItems = mlResult.data
            .map((item: any) => (typeof item === "string" ? item : item.task || item.text || ""))
            .filter(Boolean);
        }
      } catch (e) {
        console.warn("ONNX Action Item extraction fallback:", e);
      }

      const combinedActionItems = Array.from(
        new Set([...(aiResult?.actionItems || []), ...mlItems])
      );

      const id = `rec_${Date.now()}`;
      const title = fileName ? fileName.replace(/\.[^.]+$/, "") : `Meeting ${new Date().toLocaleDateString()}`;

      await addRecording({
        id,
        title,
        date: new Date().toISOString(),
        duration: fmt(seconds > 0 ? seconds : 10),
        status: "Transcribed",
        participants: aiResult?.speakerCount || 1,
        summary: aiResult?.summary || "Audio summary generated.",
        topics: aiResult?.keyTopics || ["Live Recording"],
        transcript: finalTranscriptText
          .split("\n")
          .filter(Boolean)
          .map((line: string, i: number) => ({
            speaker: line.startsWith("Speaker") ? line.split(":")[0] : `Speaker ${(i % 2) + 1}`,
            time: fmt(i * 15),
            text: line.includes(":") ? line.split(":").slice(1).join(":").trim() : line,
          })),
        actionItems: combinedActionItems.map((text, idx) => ({
          id: `${id}_a${idx}`,
          text,
          assignee: "Assigned Member",
          initials: "AM",
          due: "Next Sprint",
          done: false,
        })),
        audioUrl: audioUrl || (blobToProcess ? URL.createObjectURL(blobToProcess) : ""),
      });

      setNewId(id);
      setPhase("done");
      toast.success("Real-Time Recording Processed!");
    } catch (err: any) {
      console.error("Processing error:", err);
      toast.error("Processing failed", { description: err.message || "Could not process audio." });
      setPhase("stopped");
    }
  };

  const handleFile = (file: File) => {
    if (!ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      toast.error("Unsupported file", { description: `Use ${ACCEPTED.join(", ")}` });
      return;
    }
    setFileName(file.name);
    setSelectedFile(file);
    setPhase("stopped");
  };

  const recordingLike = phase === "recording" || phase === "paused" || phase === "stopped" || !!selectedFile || !!audioBlob;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass max-w-lg rounded-2xl p-0 sm:max-w-lg">
        <div className="border-b border-border px-5 py-4">
          <DialogTitle className="text-lg">New recording</DialogTitle>
          <DialogDescription className="text-xs">
            Capture real-time audio from your microphone or upload an audio file.
          </DialogDescription>
        </div>

        <div className="space-y-5 px-5 pb-5">
          {phase === "processing" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-display text-lg">Processing Real-Time Audio…</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Transcribing microphone audio, detecting topics, and running local ONNX action item classifier.
              </p>
              <div className="mt-2 h-10 w-full max-w-xs">
                <Waveform bars={30} active tone="primary" />
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-mint/15 glow-mint">
                <CheckCircle2 className="h-7 w-7 text-mint" />
              </span>
              <p className="font-display text-lg">Real-Time Recording Ready</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Transcript, executive summary, action items, and Q&A chat are ready for your recording.
              </p>
              <Button
                className="mt-2 rounded-xl gradient-primary glow-primary"
                onClick={() => {
                  close(false);
                  if (newId) navigate({ to: "/meeting/$id", params: { id: newId } });
                }}
              >
                View AI Output
              </Button>
            </div>
          )}

          {phase !== "processing" && phase !== "done" && (
            <>
              <div className="relative overflow-hidden rounded-xl border border-border bg-background/40 p-6">
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={cn(
                      "grid h-16 w-16 place-items-center rounded-full transition-all duration-300",
                      phase === "recording"
                        ? "gradient-primary glow-primary animate-pulse"
                        : "border border-border bg-muted",
                    )}
                  >
                    <Mic
                      className={cn(
                        "h-7 w-7",
                        phase === "recording" ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    />
                  </div>

                  <div className="h-14 w-full">
                    <Waveform bars={36} active={phase === "recording"} tone="mint" />
                  </div>

                  <p className="font-display text-3xl tabular-nums">{fmt(seconds)}</p>

                  {(liveText || interimText) && (
                    <div className="w-full max-h-24 overflow-y-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-mint">Live: </span>
                      {liveText} <span className="italic text-foreground/70">{interimText}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {phase === "idle" && (
                      <Button
                        onClick={startMicrophone}
                        disabled={!!fileName}
                        className="rounded-xl gradient-primary glow-primary active:scale-95"
                      >
                        <Play className="mr-1.5 h-4 w-4" /> Start Recording
                      </Button>
                    )}

                    {phase === "paused" && (
                      <Button
                        onClick={resumeRecording}
                        className="rounded-xl gradient-primary glow-primary active:scale-95"
                      >
                        <Play className="mr-1.5 h-4 w-4" /> Resume
                      </Button>
                    )}

                    {phase === "recording" && (
                      <Button
                        variant="secondary"
                        onClick={pauseRecording}
                        className="rounded-xl active:scale-95"
                      >
                        <Pause className="mr-1.5 h-4 w-4" /> Pause
                      </Button>
                    )}

                    {(phase === "recording" || phase === "paused") && (
                      <Button
                        variant="ghost"
                        onClick={stopRecording}
                        className="rounded-xl border border-border active:scale-95"
                      >
                        <Square className="mr-1.5 h-3.5 w-3.5 text-destructive" /> Stop
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-xl border border-dashed border-border p-6 text-center transition-all duration-200 hover:border-primary/50 hover:bg-primary/5",
                  dragging && "border-mint/60 bg-mint/5",
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  {fileName ?? "Drop an audio file or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">MP3, WAV, WEBM, M4A · up to 500 MB</p>
              </div>

              <Button
                disabled={!recordingLike || phase === "recording"}
                onClick={process}
                className="w-full rounded-xl gradient-primary glow-primary active:scale-95"
              >
                Process recording
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
