"use client";

import { useState, useEffect } from "react";
import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AppSidebarLayout from "@/components/AppSidebarLayout";
import LeafletMap from "@/components/map/LeafletMap";
import { useLahoreAreas } from "@/hooks/useLahoreAreas";
import { APP_CITY } from "@/lib/constants";
import { LAHORE_AREAS, type LahoreArea } from "@/lib/lahoreAreas";

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

          <div className="mt-8">
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
