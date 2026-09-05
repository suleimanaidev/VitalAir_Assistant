"use client";

import { useState, useEffect } from "react";
import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AppSidebarLayout from "@/components/AppSidebarLayout";
import LeafletMap from "@/components/map/LeafletMap";
import { useLahoreAreas } from "@/hooks/useLahoreAreas";
import { APP_CITY } from "@/lib/constants";
import { LAHORE_AREAS, type LahoreArea } from "@/lib/lahoreAreas";
import { getLahoreSeason } from "@/lib/lahoreSeason";
import { SEASON_PROFILES } from "@/lib/lahoreSeasonalIntelligence";

export default function RoutePageView() {
  const { areas, error } = useLahoreAreas();
  const [activeArea, setActiveArea] = useState<LahoreArea | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.sessionStorage.getItem("vitalair-dashboard-area") : null;
    if (saved) {
      const match = LAHORE_AREAS.find((a) => a.name.toLowerCase() === saved.toLowerCase());
      if (match) setActiveArea(match);
    }
  }, []);

  const handleAreaSelect = (area: LahoreArea | null) => {
    setActiveArea(area);
    if (area) {
      try {
        window.sessionStorage.setItem("vitalair-dashboard-area", area.name);
      } catch {}
    }
  };

  return (
    <ProfileSetupGuard>
      <AppSidebarLayout>
        <main className="pb-12">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="section-title">Lahore route map</h1>
          <p className="section-subtitle">
            {APP_CITY}, Pakistan — famous neighborhoods with live AQI
          </p>

          {error && (
            <p className="mt-4 text-sm text-vital-danger" role="alert">
              {error} — showing last known readings if available.
            </p>
          )}

          {/* Seasonal Hazard & Avoid Areas Info */}
          {(() => {
            const season = getLahoreSeason();
            const profile = SEASON_PROFILES[season.id];
            if (!profile?.avoidAreas?.length) return null;
            return (
              <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
                        {profile.name} — High Hazard Corridors
                      </h3>
                      <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-red-300">
                        {profile.months}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-vital-muted">
                      <strong>Hazard:</strong> {profile.primaryHazard}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {profile.avoidAreas.map((area, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300"
                        >
                          <span>🚫</span>
                          <span>{area}</span>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-vital-text">
                      🧭 <strong>Route Advice:</strong> {profile.routeFocus}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mt-6">
            <LeafletMap
              areas={areas}
              activeAreaId={activeArea?.id}
              onAreaSelect={handleAreaSelect}
            />
          </div>
        </div>
        </main>
      </AppSidebarLayout>
    </ProfileSetupGuard>
  );
}
