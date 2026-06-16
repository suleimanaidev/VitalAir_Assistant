"use client";

import { useState } from "react";
import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import Navbar from "@/components/Navbar";
import LahoreAreasStrip from "@/components/map/LahoreAreasStrip";
import LeafletMap from "@/components/map/LeafletMap";
import { useLahoreAreas } from "@/hooks/useLahoreAreas";
import { APP_CITY } from "@/lib/constants";
import type { LahoreArea } from "@/lib/lahoreAreas";

export default function RoutePageView() {
  const { areas, loading, refreshing, lastFetched, refresh, error } =
    useLahoreAreas();
  const [activeArea, setActiveArea] = useState<LahoreArea | null>(null);

  return (
    <ProfileSetupGuard>
      <main className="min-h-screen pb-12">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 lg:px-8">
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
              onAreaSelect={setActiveArea}
            />
            <LahoreAreasStrip
              areas={areas}
              activeId={activeArea?.id}
              loading={loading}
              refreshing={refreshing}
              lastFetched={lastFetched}
              onSelect={setActiveArea}
              onRefresh={refresh}
            />
          </div>
        </div>
      </main>
    </ProfileSetupGuard>
  );
}
