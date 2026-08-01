export type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  color: "indigo" | "mint" | "plain";
};

export const mockNotes: Note[] = [
  {
    id: "n1",
    title: "Pilot pricing thoughts",
    body: "Anchor on processed minutes, not seats. 500 min free, then tiered.\n\nNorthwind will push for an annual cap — fine, if the overage rate is ours.",
    updatedAt: "2026-07-30T10:12:00Z",
    color: "indigo",
  },
  {
    id: "n2",
    title: "Demo script v3",
    body: "1. Record 40s live\n2. Show transcript streaming\n3. Jump to action items\n4. Ask the chatbot one hard question\n\nDo NOT demo self-hosted.",
    updatedAt: "2026-07-28T17:45:00Z",
    color: "mint",
  },
  {
    id: "n3",
    title: "Open questions",
    body: "- Do we store raw audio after processing?\n- Retention default: 30 or 90 days?\n- Who signs off on the EU residency claim?",
    updatedAt: "2026-07-26T08:03:00Z",
    color: "plain",
  },
];
