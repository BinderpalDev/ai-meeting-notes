export type RecordingStatus = "Transcribed" | "Processing" | "Draft";

export type TranscriptLine = {
  speaker: string;
  time: string;
  text: string;
  lang?: string;
};

export type ActionItem = {
  id: string;
  text: string;
  assignee: string;
  initials: string;
  due: string;
  done: boolean;
};

export type Recording = {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: RecordingStatus;
  participants: number;
  summary: string;
  topics: string[];
  transcript: TranscriptLine[];
  actionItems: ActionItem[];
  audioUrl?: string;
};

export const mockRecordings: Recording[] = [
  {
    id: "rec_01",
    title: "Q3 Roadmap Sync",
    date: "2026-07-29T09:30:00Z",
    duration: "42:18",
    status: "Transcribed",
    participants: 5,
    summary:
      "The team locked the Q3 roadmap around three pillars: real-time transcription latency, multilingual summaries, and the self-hosted Ollama path. Latency work is the top priority after two enterprise trials flagged a 9-second lag. Multilingual summaries ship behind a flag in week 6, and the self-hosted build slips to Q4 pending security review.",
    topics: ["Roadmap", "Latency", "Multilingual", "Self-hosted", "Enterprise"],
    transcript: [
      { speaker: "Speaker 1", time: "00:04", text: "Let's start with the latency numbers from the Northwind trial." },
      { speaker: "Speaker 2", time: "00:11", text: "We're averaging nine seconds end-to-end. Streaming chunks gets us to about three." },
      { speaker: "Speaker 1", time: "00:26", text: "Three is acceptable for the pilot. What breaks if we stream?" },
      { speaker: "Speaker 2", time: "00:33", text: "Speaker diarization gets noisier at boundaries. We'd re-align after the fact." },
      { speaker: "Speaker 3", time: "00:51", text: "På svenska fungerar det bra, men diariseringen blandar ihop talare två och tre." },
      { speaker: "Speaker 1", time: "01:07", text: "Good catch — log that as a Swedish-specific regression." },
      { speaker: "Speaker 4", time: "01:19", text: "Sobre los resúmenes multilingües: el modelo ya traduce bien, falta el glosario de la empresa." },
      { speaker: "Speaker 2", time: "01:38", text: "Glossary injection is a small change. I can land it this sprint." },
      { speaker: "Speaker 1", time: "01:47", text: "Then self-hosted. Security review is the blocker, not the build." },
      { speaker: "Speaker 3", time: "02:02", text: "Agreed. Let's target Q4 and stop promising it in demos." },
    ],
    actionItems: [
      { id: "a1", text: "Ship streaming transcription behind the pilot flag", assignee: "Marco Reyes", initials: "MR", due: "Aug 6", done: false },
      { id: "a2", text: "File Swedish diarization regression with sample audio", assignee: "Priya Nair", initials: "PN", due: "Aug 1", done: true },
      { id: "a3", text: "Add company glossary injection to summary prompt", assignee: "Marco Reyes", initials: "MR", due: "Aug 8", done: false },
      { id: "a4", text: "Book security review slot for self-hosted build", assignee: "Ava Lindqvist", initials: "AL", due: "Aug 12", done: false },
    ],
  },
  {
    id: "rec_02",
    title: "Northwind Enterprise Trial — Debrief",
    date: "2026-07-27T14:00:00Z",
    duration: "27:44",
    status: "Transcribed",
    participants: 4,
    summary:
      "Northwind is happy with summary quality but blocked on data residency. They need EU-only processing and an audit log before signature. Procurement wants a 12-month term with a pilot discount.",
    topics: ["Enterprise", "Data residency", "Audit log", "Procurement"],
    transcript: [
      { speaker: "Speaker 1", time: "00:02", text: "Summary quality scored 4.6 out of 5 across nineteen meetings." },
      { speaker: "Speaker 2", time: "00:14", text: "The blocker is residency. Everything must stay in the EU region." },
      { speaker: "Speaker 1", time: "00:29", text: "We can pin inference to Frankfurt. Audit log is the bigger lift." },
      { speaker: "Speaker 3", time: "00:44", text: "Procurement asked for twelve months with the pilot discount carried over." },
    ],
    actionItems: [
      { id: "b1", text: "Draft EU-only processing commitment for legal", assignee: "Ava Lindqvist", initials: "AL", due: "Aug 4", done: false },
      { id: "b2", text: "Scope append-only audit log", assignee: "Tom Okafor", initials: "TO", due: "Aug 9", done: false },
    ],
  },
  {
    id: "rec_03",
    title: "Design Review — Recorder Surface",
    date: "2026-07-24T11:15:00Z",
    duration: "18:02",
    status: "Processing",
    participants: 3,
    summary: "Summary is being generated…",
    topics: ["Design", "Recorder"],
    transcript: [],
    actionItems: [],
  },
  {
    id: "rec_04",
    title: "Weekly Standup",
    date: "2026-07-23T08:00:00Z",
    duration: "11:37",
    status: "Draft",
    participants: 6,
    summary: "Draft — not processed yet.",
    topics: [],
    transcript: [],
    actionItems: [],
  },
  {
    id: "rec_05",
    title: "Investor Update Prep",
    date: "2026-07-18T16:20:00Z",
    duration: "35:51",
    status: "Transcribed",
    participants: 3,
    summary:
      "Metrics narrative centers on 38% MoM growth in processed minutes and a 71% week-four retention. The ask is a bridge round to fund the on-prem push; deck needs a slide on inference cost per minute.",
    topics: ["Fundraising", "Metrics", "Retention", "Unit economics"],
    transcript: [
      { speaker: "Speaker 1", time: "00:06", text: "Processed minutes are up thirty-eight percent month over month." },
      { speaker: "Speaker 2", time: "00:21", text: "Retention at week four is seventy-one percent, which is the headline." },
      { speaker: "Speaker 1", time: "00:39", text: "They'll ask about inference cost per minute. We need that slide." },
    ],
    actionItems: [
      { id: "c1", text: "Build inference cost-per-minute slide", assignee: "Tom Okafor", initials: "TO", due: "Aug 2", done: true },
      { id: "c2", text: "Refresh retention cohort chart", assignee: "Priya Nair", initials: "PN", due: "Aug 3", done: false },
    ],
  },
];
