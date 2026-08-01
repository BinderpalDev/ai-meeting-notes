import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithMeeting } from "@/services/geminiService";
import { generateWithOllama, checkOllamaStatus } from "@/services/ollamaService";
import { type ChatMessage, suggestedQuestions } from "@/data/mockMessages";
import { cn } from "@/lib/utils";

export function Chatbot({
  contextLabel,
  transcriptContext = "",
}: {
  contextLabel?: string;
  transcriptContext?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init_1",
      role: "assistant",
      text: `Hello! I'm your AI assistant for "${contextLabel || "this meeting"}". Ask me any questions about what was discussed, decisions made, or key topics.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [useOllama, setUseOllama] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOllamaStatus().then((status) => {
      setOllamaAvailable(status.isRunning);
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || typing) return;

    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: "user", text: value };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    try {
      let replyText = "";
      if (useOllama && ollamaAvailable) {
        const prompt = `MEETING TRANSCRIPT CONTEXT:\n${transcriptContext || "No detailed transcript provided."}\n\nUSER QUESTION: ${value}`;
        replyText = await generateWithOllama(prompt);
      } else {
        const history = messages.map((m) => ({ role: m.role, text: m.text }));
        replyText = await chatWithMeeting(history, value, transcriptContext);
      }

      setMessages((m) => [
        ...m,
        { id: `a_${Date.now()}`, role: "assistant", text: replyText || "No response received." },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { id: `a_${Date.now()}`, role: "assistant", text: `Error: ${err.message || "Could not generate response."}` },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="panel flex h-[540px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-8 w-8 place-items-center rounded-full gradient-primary glow-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Ask Summarix AI</p>
            <p className="truncate text-xs text-muted-foreground">
              {contextLabel ?? "Grounded in this meeting"}
            </p>
          </div>
        </div>

        {ollamaAvailable && (
          <button
            onClick={() => setUseOllama(!useOllama)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
              useOllama
                ? "border-mint/50 bg-mint/15 text-mint"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            title="Toggle between Gemini Cloud AI and Local Ollama AI"
          >
            <Cpu className="h-3.5 w-3.5" />
            {useOllama ? "Local Ollama" : "Gemini Cloud"}
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "gradient-primary text-primary-foreground glow-primary"
                  : "border border-border bg-accent/50 text-foreground",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-accent/50 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-mint"
                  style={{ animation: `bar-pulse 1s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this meeting…"
            className="h-11 rounded-xl bg-background/60"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || typing}
            className="h-11 w-11 shrink-0 rounded-xl gradient-primary glow-primary"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
