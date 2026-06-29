import { cleanAreaName } from "./formatLocation";

/** Famous Lahore neighborhoods — coordinates for geo-based AQI lookups */
export interface LahoreArea {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Optional search aliases */
  aliases?: string[];
}

export const LAHORE_AREAS: LahoreArea[] = [
  { id: "gulberg", name: "Gulberg", lat: 31.5204, lon: 74.3437, aliases: ["gulberg iii", "gulberg 3", "main gulberg"] },
  { id: "gulberg-ii", name: "Gulberg II", lat: 31.518, lon: 74.34, aliases: ["gulberg 2"] },
  { id: "johar-town", name: "Johar Town", lat: 31.4697, lon: 74.2728, aliases: ["johar"] },
  { id: "lake-city", name: "Lake City", lat: 31.3927, lon: 74.2552 },
  { id: "dha-phase-5", name: "DHA Phase 5", lat: 31.4734, lon: 74.4586, aliases: ["dha", "dha 5", "defence phase 5"] },
  { id: "dha-phase-6", name: "DHA Phase 6", lat: 31.48, lon: 74.47, aliases: ["dha 6"] },
  { id: "model-town", name: "Model Town", lat: 31.4834, lon: 74.325, aliases: ["gor", "model town lahore"] },
  { id: "bahria-town", name: "Bahria Town", lat: 31.3704, lon: 74.1845 },
  { id: "allama-iqbal-town", name: "Allama Iqbal Town", lat: 31.5126, lon: 74.2949, aliases: ["iqbal town"] },
  { id: "garden-town", name: "Garden Town", lat: 31.5036, lon: 74.3234 },
  { id: "cantt", name: "Lahore Cantt", lat: 31.52, lon: 74.39, aliases: ["cantonment", "cantt lahore"] },
  { id: "mall-road", name: "Mall Road", lat: 31.568, lon: 74.31 },
  { id: "faisal-town", name: "Faisal Town", lat: 31.4906, lon: 74.3018 },
  { id: "township", name: "Township", lat: 31.4661, lon: 74.3152 },
  { id: "wapda-town", name: "Wapda Town", lat: 31.4428, lon: 74.2581 },
  { id: "valencia", name: "Valencia Town", lat: 31.3775, lon: 74.2389 },
  { id: "shahdara", name: "Shahdara", lat: 31.613, lon: 74.284 },
  { id: "anarkali", name: "Anarkali", lat: 31.5686, lon: 74.312 },
  { id: "liberty", name: "Liberty Market", lat: 31.511, lon: 74.344, aliases: ["liberty"] },
  { id: "punjab-assembly", name: "Punjab Assembly", lat: 31.568, lon: 74.302, aliases: ["civil secretariat"] },
  { id: "ali-town", name: "Ali Town", lat: 31.448, lon: 74.268 },
  { id: "dubai-town", name: "Dubai Town", lat: 31.435, lon: 74.278 },
  { id: "kot-lakhpat", name: "Kot Lakhpat", lat: 31.464, lon: 74.335 },
  { id: "samanabad", name: "Samanabad", lat: 31.538, lon: 74.318 },
  { id: "mughalpura", name: "Mughalpura", lat: 31.575, lon: 74.365 },
  { id: "bhobtian-chowk", name: "Bhobtian Chowk", lat: 31.4486, lon: 74.4094, aliases: ["bhobtian"] },
  { id: "mm-alam-road", name: "MM Alam Road", lat: 31.515, lon: 74.348, aliases: ["mm alam"] },
  { id: "green-town", name: "Green Town", lat: 31.455, lon: 74.305 },
  { id: "izmir-town", name: "Izmir Town", lat: 31.442, lon: 74.292 },
  { id: "punjab-society", name: "Punjab Society", lat: 31.478, lon: 74.355 },
  { id: "canal-view", name: "Canal View", lat: 31.492, lon: 74.338 },
  { id: "gulshan-ravi", name: "Gulshan Ravi", lat: 31.548, lon: 74.328 },
  { id: "ichhra", name: "Ichhra", lat: 31.528, lon: 74.318 },
  { id: "shadman", name: "Shadman", lat: 31.542, lon: 74.328 },
  { id: "thokar-niaz-baig", name: "Thokar Niaz Baig", lat: 31.458, lon: 74.248, aliases: ["thokar"] },
  { id: "college-road", name: "College Road", lat: 31.438, lon: 74.268 },
  { id: "askari-11", name: "Askari 11", lat: 31.468, lon: 74.418 },
  { id: "nfc", name: "NFC Society", lat: 31.462, lon: 74.378, aliases: ["nfc society"] },
  { id: "harbanspura", name: "Harbanspura", lat: 31.588, lon: 74.378 },
  { id: "chung", name: "Chung", lat: 31.438, lon: 74.318 },
  { id: "defence-ravi", name: "Defence Raya", lat: 31.455, lon: 74.445 },
  { id: "pak-arab", name: "Pak Arab Housing Society", lat: 31.448, lon: 74.388 },
  { id: "wapda-city", name: "Wapda City", lat: 31.425, lon: 74.235 },
  { id: "empress-road", name: "Empress Road", lat: 31.572, lon: 74.318 },
  { id: "data-darbar", name: "Data Darbar", lat: 31.578, lon: 74.308 },
  { id: "ravi-town", name: "Ravi Town", lat: 31.598, lon: 74.348 },
  { id: "sabzazar", name: "Sabzazar", lat: 31.472, lon: 74.288 },
  { id: "cavalry-ground", name: "Cavalry Ground", lat: 31.508, lon: 74.368 },
];

export const LAHORE_ROTATE_MS = 45_000;

function normalizeSearch(q: string): string {
  return cleanAreaName(q).toLowerCase().replace(/\s+/g, " ").trim();
}

function tokens(q: string): string[] {
  return normalizeSearch(q).split(/\s+/).filter((t) => t.length > 0);
}

function scoreArea(area: LahoreArea, q: string, toks: string[]): number {
  const name = area.name.toLowerCase();
  const id = area.id.replace(/-/g, " ");
  const aliasList = (area.aliases ?? []).map((a) => a.toLowerCase());
  let score = 0;

  if (!q) return 1;

  if (name === q || id === q) score = 100;
  else if (aliasList.includes(q)) score = 95;
  else if (name.startsWith(q) || id.startsWith(q)) score = 85;
  else if (aliasList.some((a) => a.startsWith(q))) score = 82;
  else if (name.includes(q) || id.includes(q)) score = 70;
  else if (aliasList.some((a) => q.includes(a) || a.includes(q))) score = 65;

  for (const t of toks) {
    if (t.length < 2) continue;
    if (name === t || id === t) score = Math.max(score, 90);
    else if (name.startsWith(t) || id.startsWith(t)) score = Math.max(score, 75);
    else if (name.includes(t) || id.includes(t)) score = Math.max(score, 55);
    else if (aliasList.some((a) => a.includes(t) || t.includes(a))) score = Math.max(score, 50);
    else {
      const nameWords = name.split(/\s+/);
      if (nameWords.some((w) => w.startsWith(t))) score = Math.max(score, 48);
    }
  }

  if (score === 0 && q.length >= 2) {
    const compact = q.replace(/\s/g, "");
    const compactName = name.replace(/\s/g, "");
    if (compactName.includes(compact) || compact.includes(compactName.slice(0, 4))) {
      score = 35;
    }
  }

  return score;
}

/** Type-ahead search for user-driven location pickers */
export function searchAreas(query: string, limit = 12): LahoreArea[] {
  const q = normalizeSearch(query);
  if (!q) return LAHORE_AREAS.slice(0, limit);

  const toks = tokens(q);
  return LAHORE_AREAS.map((area) => ({ area, score: scoreArea(area, q, toks) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.area.name.localeCompare(b.area.name))
    .slice(0, limit)
    .map((x) => x.area);
}

/** Match user-typed area names to a known zone */
export function findAreaByName(query: string): LahoreArea | undefined {
  const hits = searchAreas(query, 1);
  return hits[0];
}
