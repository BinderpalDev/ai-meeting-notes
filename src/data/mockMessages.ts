export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    text: "I've read this meeting end to end. Ask me about decisions, owners, or anything that was said.",
  },
];

export const mockAiReplies: string[] = [
  "The main decision was to ship streaming transcription behind the pilot flag — it takes end-to-end latency from ~9s to ~3s, at the cost of noisier diarization at chunk boundaries.",
  "Four action items came out of this meeting. Two are owned by Marco Reyes, one by Priya Nair, and one by Ava Lindqvist. The earliest due date is Aug 1.",
  "Self-hosted deployment slipped to Q4. The blocker is the security review, not engineering capacity — the team explicitly agreed to stop promising it in demos.",
  "Yes — a Swedish-specific diarization regression was raised around 00:51, where speakers two and three get merged. Priya filed it with sample audio.",
  "Multilingual summaries are on track for week 6 behind a flag. The remaining gap is company glossary injection, which Marco expects to land this sprint.",
];

export const suggestedQuestions = [
  "What was decided?",
  "Who owns what?",
  "Any risks raised?",
];
