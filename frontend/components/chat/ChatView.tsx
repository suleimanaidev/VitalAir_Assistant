"use client";

import { useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { askPatientRagChat } from "@/lib/documentsApi";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  meta?: string;
}

const SUGGESTIONS = [
  "Meri report ke hisaab se aaj kya precaution loon?",
  "Is AQI mein mujhe bahar jana chahiye?",
  "Mere liye kaunsi diet behtar hai?",
];

export default function ChatView() {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || asking) return;

    setError(null);
    setAsking(true);
    setQuestion("");
    setTurns((t) => [...t, { role: "user", text: prompt }]);

    try {
      const res = await askPatientRagChat(prompt);
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          text: res.answer,
          meta:
            (res.has_patient_docs
              ? "Profile + uploaded documents used"
              : "Profile + WHO health context used") +
            ` · ${res.sources_used} sources`,
        },
      ]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer question");
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="pb-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:min-h-screen">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
              <MessageCircle className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="section-title">Health AI Chat</h1>
              <p className="section-subtitle">
                Aap ki health profile aur uploaded documents ke mutabiq jawab.
              </p>
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="vital-card flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
        >
          {turns.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-vital-primary/10 text-vital-primary">
                <MessageCircle className="h-7 w-7" aria-hidden />
              </span>
              <p className="max-w-md text-sm text-vital-muted">
                Apni health report, symptoms, ya aaj ki air quality ke baare mein
                koi bhi sawal poochein. Pehle{" "}
                <span className="text-vital-primary">Health profile</span> par
                documents upload karein behtar jawab ke liye.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-vital-border bg-vital-bg/60 px-3 py-1.5 text-xs text-vital-text hover:border-vital-primary/50"
                    onClick={() => void send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn, i) => (
              <div
                key={i}
                className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    turn.role === "user"
                      ? "bg-vital-primary/15 text-vital-text"
                      : "border border-vital-border bg-vital-bg/70 text-vital-text"
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">
                    {turn.text}
                  </p>
                  {turn.meta && (
                    <p className="mt-2 text-xs text-vital-muted">{turn.meta}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {asking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-vital-border bg-vital-bg/70 px-4 py-3 text-sm text-vital-muted">
                <Loader2 className="h-4 w-4 animate-spin text-vital-primary" />
                Soch raha hoon…
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-vital-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send(question);
            }}
            placeholder="Apna sawal yahan likhein…"
            className="input-field flex-1"
            disabled={asking}
          />
          <button
            type="button"
            className="btn-primary inline-flex items-center justify-center gap-2"
            onClick={() => void send(question)}
            disabled={asking || !question.trim()}
          >
            {asking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
