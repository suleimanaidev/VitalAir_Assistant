"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import {
  askPatientRagChat,
  type PatientRagChatResult,
} from "@/lib/documentsApi";

interface Props {
  open: boolean;
  onClose: () => void;
  area?: string;
  aqi?: number | null;
}

export default function PatientRagChatPanel({
  open,
  onClose,
  area,
  aqi,
}: Props) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<PatientRagChatResult | null>(null);

  if (!open) return null;

  const onAsk = async () => {
    const prompt = question.trim();
    if (!prompt || asking) return;
    setAsking(true);
    setError(null);
    try {
      setChat(
        await askPatientRagChat(prompt, {
          area: area?.trim() || undefined,
          aqi: aqi ?? undefined,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer question");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close health chat"
        onClick={onClose}
      />
      <section
        className="relative z-10 w-full max-w-lg rounded-2xl border border-vital-primary/30 bg-vital-card p-5 shadow-2xl"
        role="dialog"
        aria-labelledby="health-chat-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vital-primary/15 text-vital-primary">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="health-chat-title" className="text-lg font-semibold text-vital-text">
                Health AI Chat
              </h2>
              <p className="mt-1 text-xs text-vital-muted">
                Aap ki health profile + uploaded documents + AQI ke mutabiq jawab.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-vital-muted hover:bg-vital-bg hover:text-vital-text"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onAsk();
            }}
            placeholder="Meri report ke hisaab se aaj kya precaution loon?"
            className="flex-1 rounded-lg border border-vital-border bg-vital-bg px-4 py-2.5 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
            disabled={asking}
          />
          <button
            type="button"
            className="btn-primary inline-flex items-center justify-center gap-2"
            onClick={() => void onAsk()}
            disabled={asking || !question.trim()}
          >
            {asking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Ask
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-vital-danger" role="alert">
            {error}
          </p>
        )}

        {chat && (
          <div className="mt-4 rounded-xl border border-vital-border bg-vital-bg/70 p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-vital-text">
              {chat.answer}
            </p>
            <p className="mt-3 text-xs text-vital-muted">
              {chat.has_patient_docs
                ? "Profile + uploaded documents used"
                : "Profile + WHO health context used"}
              {" · "}
              {chat.sources_used} sources
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
