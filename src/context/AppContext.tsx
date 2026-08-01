import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { databaseService } from "@/services/databaseService";
import type { Recording, RecordingStatus, ActionItem, TranscriptLine } from "@/data/mockRecordings";
import type { Note } from "@/data/mockNotes";

type Theme = "dark" | "light";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatar?: string;
  plan?: string;
};

type AppContextValue = {
  hydrated: boolean;
  user: MockUser | null;
  login: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  theme: Theme;
  toggleTheme: () => void;
  recordings: Recording[];
  addRecording: (r: Recording) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  toggleActionItem: (recordingId: string, itemId: string) => Promise<void>;
  notes: Note[];
  saveNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  settings: {
    mockAi: boolean;
    localAi: boolean;
    emailDigest: boolean;
  };
  updateSetting: (key: "mockAi" | "localAi" | "emailDigest", value: boolean) => void;
  updateProfile: (patch: Partial<MockUser>) => void;
  refreshData: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = "summarix.theme";

function formatDbRecordingToUI(dbRec: any): Recording {
  let transcriptLines: TranscriptLine[] = [];
  if (typeof dbRec.transcription === "string" && dbRec.transcription.trim()) {
    transcriptLines = dbRec.transcription.split("\n").map((line: string, i: number) => {
      const match = line.match(/^(Speaker \d+|[\w\s]+):\s*(.*)$/);
      if (match) {
        return {
          speaker: match[1],
          time: `0${Math.floor((i * 15) / 60)}:${((i * 15) % 60).toString().padStart(2, "0")}`,
          text: match[2],
        };
      }
      return {
        speaker: `Speaker ${(i % 2) + 1}`,
        time: `0${Math.floor((i * 15) / 60)}:${((i * 15) % 60).toString().padStart(2, "0")}`,
        text: line,
      };
    });
  } else if (Array.isArray(dbRec.transcription)) {
    transcriptLines = dbRec.transcription;
  }

  let items: ActionItem[] = [];
  if (Array.isArray(dbRec.action_items)) {
    items = dbRec.action_items.map((item: any, idx: number) => {
      if (typeof item === "string") {
        return {
          id: `ai_${dbRec.id}_${idx}`,
          text: item,
          assignee: "Team Member",
          initials: "TM",
          due: "Next Sprint",
          done: false,
        };
      }
      return {
        id: item.id || `ai_${dbRec.id}_${idx}`,
        text: item.text || item.title || item.task || "",
        assignee: item.assignee || "Team Member",
        initials: item.initials || "TM",
        due: item.due || "Next Sprint",
        done: !!item.done,
      };
    });
  } else if (Array.isArray(dbRec.actionItems)) {
    items = dbRec.actionItems;
  }

  let durationStr = "00:00";
  if (typeof dbRec.duration === "number") {
    const m = Math.floor(dbRec.duration / 60);
    const s = Math.floor(dbRec.duration % 60);
    durationStr = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  } else if (typeof dbRec.duration === "string") {
    durationStr = dbRec.duration;
  }

  return {
    id: String(dbRec.id),
    title: dbRec.title || "Untitled Meeting",
    date: dbRec.created_at || dbRec.date || new Date().toISOString(),
    duration: durationStr,
    status: (dbRec.status as RecordingStatus) || (dbRec.transcription ? "Transcribed" : "Processing"),
    participants: dbRec.speaker_count || dbRec.speakerCount || dbRec.participants || 1,
    summary: dbRec.summary || "Summary processing...",
    topics: dbRec.key_topics || dbRec.keyTopics || dbRec.topics || [],
    transcript: transcriptLines,
    actionItems: items,
    audioUrl: dbRec.audio_url || dbRec.audioUrl || "",
  };
}

function formatDbNoteToUI(dbNote: any): Note {
  const content = dbNote.content || "";
  const lines = content.split("\n");
  const title = lines[0]?.trim() || "Untitled Note";
  const body = lines.length > 1 ? lines.slice(1).join("\n") : content;

  return {
    id: String(dbNote.id),
    title,
    body,
    updatedAt: dbNote.updated_at || dbNote.created_at || new Date().toISOString(),
    color: "indigo",
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState({
    mockAi: import.meta.env.VITE_MOCK_AI === "true",
    localAi: false,
    emailDigest: true,
  });

  const currentUser: MockUser | null = useMemo(() => {
    if (!auth?.user) return null;
    const email = auth.user.email || "";
    const name = auth.user.user_metadata?.name || (email ? email.split("@")[0] : "User");
    const initials = name
      .split(" ")
      .slice(0, 2)
      .map((p: string) => p.charAt(0))
      .join("")
      .toUpperCase() || "U";

    return {
      id: auth.user.id,
      name,
      email,
      initials,
      plan: "Pro Plan",
    };
  }, [auth?.user]);

  const loadData = useCallback(async () => {
    if (!auth?.user) {
      setRecordings([]);
      setNotes([]);
      return;
    }

    try {
      const [rawRecordings, rawNotes] = await Promise.all([
        databaseService.getRecordings(),
        databaseService.getNotes(),
      ]);

      setRecordings(rawRecordings.map(formatDbRecordingToUI));
      setNotes(rawNotes.map(formatDbNoteToUI));
    } catch (err) {
      console.warn("Failed to load recordings or notes:", err);
    }
  }, [auth?.user]);

  useEffect(() => {
    try {
      const t = window.localStorage.getItem(THEME_KEY);
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* ignore */
    }
    setHydrated(!auth?.loading);
  }, [auth?.loading]);

  useEffect(() => {
    if (auth?.user) {
      loadData();
    }
  }, [auth?.user, loadData]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    if (hydrated) {
      try {
        window.localStorage.setItem(THEME_KEY, theme);
      } catch {
        /* ignore */
      }
    }
  }, [theme, hydrated]);

  const login = useCallback(
    async (email: string, name?: string) => {
      try {
        await auth.signIn(email, "default-password");
      } catch {
        await auth.signUp(email, "default-password");
      }
    },
    [auth],
  );

  const logout = useCallback(async () => {
    await auth.signOut();
    setRecordings([]);
    setNotes([]);
  }, [auth]);

  const addRecording = useCallback(
    async (r: Recording) => {
      setRecordings((prev) => [r, ...prev]);
      try {
        await databaseService.saveRecording({
          title: r.title,
          duration: r.duration,
          speakerCount: r.participants,
          summary: r.summary,
          keyTopics: r.topics,
          transcription: r.transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n"),
          actionItems: r.actionItems,
        });
        await loadData();
      } catch (err) {
        console.warn("Failed to save recording to DB:", err);
      }
    },
    [loadData],
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      try {
        await databaseService.deleteRecording(id);
      } catch (err) {
        console.warn("Failed to delete recording:", err);
      }
    },
    [],
  );

  const toggleActionItem = useCallback(
    async (recordingId: string, itemId: string) => {
      setRecordings((prev) =>
        prev.map((r) => {
          if (r.id !== recordingId) return r;
          const nextItems = r.actionItems.map((a) =>
            a.id === itemId ? { ...a, done: !a.done } : a,
          );
          databaseService.updateRecording(recordingId, { action_items: nextItems }).catch(console.warn);
          return { ...r, actionItems: nextItems };
        }),
      );
    },
    [],
  );

  const saveNote = useCallback(
    async (note: Note) => {
      const fullContent = `${note.title}\n${note.body}`;
      const existing = notes.find((n) => n.id === note.id);
      if (existing) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
        await databaseService.updateNote(note.id, fullContent).catch(console.warn);
      } else {
        setNotes((prev) => [note, ...prev]);
        const dbNote = await databaseService.createNote(fullContent).catch(console.warn);
        if (dbNote) {
          setNotes((prev) => prev.map((n) => (n.id === note.id ? formatDbNoteToUI(dbNote) : n)));
        }
      }
    },
    [notes],
  );

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await databaseService.deleteNote(id).catch(console.warn);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated: !auth?.loading,
      user: currentUser,
      login,
      logout,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      recordings,
      addRecording,
      deleteRecording,
      toggleActionItem,
      notes,
      saveNote,
      deleteNote,
      settings,
      updateSetting: (key, val) => setSettings((s) => ({ ...s, [key]: val })),
      updateProfile: () => {},
      refreshData: loadData,
    }),
    [
      auth?.loading,
      currentUser,
      login,
      logout,
      theme,
      recordings,
      addRecording,
      deleteRecording,
      toggleActionItem,
      notes,
      saveNote,
      deleteNote,
      settings,
      loadData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
