"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import Navbar from "@/components/Navbar";
import ExposureTrendsDashboard from "@/components/history/ExposureTrendsDashboard";
import { env } from "@/lib/env";
import { APP_CITY } from "@/lib/constants";
import { useVitalAirStore } from "@/store/useVitalAirStore";

const API_BASE = env.apiUrl.replace(/\/$/, "");

interface HistoryItem {
  id: string;
  source?: string;
  destination?: string;
  aqi_at_time?: number;
  pes_score?: number;
  health_advice?: string;
  timestamp?: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const userId = useVitalAirStore((s) => s.userId);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = userId || session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (status === "loading") return;

    const q = effectiveUserId
      ? `?user_id=${encodeURIComponent(effectiveUserId)}`
      : "";
    const headers: HeadersInit = {};
    if (session?.backendToken) {
      headers.Authorization = `Bearer ${session.backendToken}`;
    }

    fetch(`${API_BASE}/api/history${q}`, { headers })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            (body as { detail?: string }).detail || `Failed (${r.status})`
          );
        }
        return r.json();
      })
      .then((d: { items: HistoryItem[] }) => setItems(d.items ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load history")
      )
      .finally(() => setLoading(false));
  }, [effectiveUserId, session?.backendToken, status]);

  return (
    <ProfileSetupGuard>
      <main className="min-h-screen pb-12">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 lg:px-8">
          <h1 className="section-title">Exposure history & trends</h1>
          <p className="section-subtitle">
            {APP_CITY}, Pakistan — 30-day pollution exposure intelligence
          </p>

          {status === "unauthenticated" ? (
            <p className="mt-8 text-vital-muted">
              Please{" "}
              <Link
                href="/login?callbackUrl=/history"
                className="text-vital-primary underline"
              >
                sign in
              </Link>{" "}
              to view your exposure trends.
            </p>
          ) : (
            <div className="mt-8 space-y-10">
              <ExposureTrendsDashboard
                userId={effectiveUserId}
                token={session?.backendToken}
              />

              <section>
                <h2 className="mb-4 text-lg font-semibold text-vital-text">
                  Recent analyses
                </h2>
                {loading || status === "loading" ? (
                  <p className="text-vital-muted">Loading…</p>
                ) : error ? (
                  <p className="text-sm text-vital-danger" role="alert">
                    {error}
                  </p>
                ) : items.length === 0 ? (
                  <p className="text-vital-muted">
                    No history yet.{" "}
                    <Link href="/dashboard" className="text-vital-primary underline">
                      Run an analysis
                    </Link>
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.id} className="vital-card p-4">
                        <p className="font-medium text-vital-text">
                          {item.source} → {item.destination}
                        </p>
                        <p className="mt-1 text-sm text-vital-muted">
                          AQI {item.aqi_at_time}
                          {item.pes_score != null && (
                            <> · PES {item.pes_score}/100</>
                          )}
                          {" · "}
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleString()
                            : "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </ProfileSetupGuard>
  );
}
