/** Famous Lahore neighborhoods — coordinates for geo-based AQI lookups */
export interface LahoreArea {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const LAHORE_AREAS: LahoreArea[] = [
  { id: "gulberg", name: "Gulberg", lat: 31.5204, lon: 74.3437 },
  { id: "johar-town", name: "Johar Town", lat: 31.4697, lon: 74.2728 },
  { id: "lake-city", name: "Lake City", lat: 31.3927, lon: 74.2552 },
  {
    id: "dha-phase-5",
    name: "DHA Phase 5",
    lat: 31.4734,
    lon: 74.4586,
  },
  { id: "model-town", name: "Model Town", lat: 31.4834, lon: 74.325 },
  { id: "bahria-town", name: "Bahria Town", lat: 31.3704, lon: 74.1845 },
  { id: "allama-iqbal-town", name: "Allama Iqbal Town", lat: 31.5126, lon: 74.2949 },
  { id: "garden-town", name: "Garden Town", lat: 31.5036, lon: 74.3234 },
  { id: "cantt", name: "Lahore Cantt", lat: 31.52, lon: 74.39 },
  { id: "mall-road", name: "Mall Road", lat: 31.568, lon: 74.31 },
  { id: "faisal-town", name: "Faisal Town", lat: 31.4906, lon: 74.3018 },
  { id: "township", name: "Township", lat: 31.4661, lon: 74.3152 },
  { id: "wapda-town", name: "Wapda Town", lat: 31.4428, lon: 74.2581 },
  { id: "valencia", name: "Valencia Town", lat: 31.3775, lon: 74.2389 },
  { id: "shahdara", name: "Shahdara", lat: 31.613, lon: 74.284 },
  { id: "anarkali", name: "Anarkali", lat: 31.5686, lon: 74.312 },
  { id: "liberty", name: "Liberty Market", lat: 31.511, lon: 74.344 },
  { id: "punjab-assembly", name: "Punjab Assembly", lat: 31.568, lon: 74.302 },
];

export const LAHORE_ROTATE_MS = 45_000;

/** Match user-typed area names (e.g. "Gulberg", "DHA") to a known zone */
/** Type-ahead search for user-driven location pickers */
export function searchAreas(query: string, limit = 8): LahoreArea[] {
  const q = query.trim().toLowerCase();
  if (!q) return LAHORE_AREAS.slice(0, limit);

  const scored = LAHORE_AREAS.map((area) => {
    const name = area.name.toLowerCase();
    const id = area.id.replace(/-/g, " ");
    let score = 0;
    if (name === q || id === q) score = 100;
    else if (name.startsWith(q) || id.startsWith(q)) score = 80;
    else if (name.includes(q) || id.includes(q)) score = 60;
    else if (q.includes("dha") && name.includes("dha")) score = 50;
    else if (q.includes("gulberg") && area.id === "gulberg") score = 50;
    return { area, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.area);
}

export function findAreaByName(query: string): LahoreArea | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  const exact = LAHORE_AREAS.find((a) => a.name.toLowerCase() === q);
  if (exact) return exact;

  const byId = LAHORE_AREAS.find((a) => a.id.replace(/-/g, " ") === q);
  if (byId) return byId;

  return LAHORE_AREAS.find(
    (a) =>
      q.includes(a.name.toLowerCase()) ||
      a.name.toLowerCase().includes(q) ||
      (q.includes("dha") && a.name.toLowerCase().includes("dha")) ||
      (q.includes("gulberg") && a.id === "gulberg")
  );
}
