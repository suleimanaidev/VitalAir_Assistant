"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "./LeafletMapInner";

const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-xl border border-vital-border bg-vital-card text-vital-muted">
      Loading Lahore map…
    </div>
  ),
});

export type { LeafletMapProps };

export default function LeafletMap(props: LeafletMapProps) {
  return <LeafletMapInner {...props} />;
}
