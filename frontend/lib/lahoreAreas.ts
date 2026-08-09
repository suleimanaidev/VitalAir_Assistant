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
  // --- Gulberg & Commercial Hubs ---
  { id: "gulberg", name: "Gulberg", lat: 31.5204, lon: 74.3437, aliases: ["gulberg iii", "gulberg 3", "main gulberg", "gulberg greens"] },
  { id: "gulberg-ii", name: "Gulberg II", lat: 31.518, lon: 74.34, aliases: ["gulberg 2"] },
  { id: "liberty", name: "Liberty Market", lat: 31.511, lon: 74.344, aliases: ["liberty", "liberty chowk"] },
  { id: "mm-alam-road", name: "MM Alam Road", lat: 31.515, lon: 74.348, aliases: ["mm alam"] },
  { id: "cavalry-ground", name: "Cavalry Ground", lat: 31.508, lon: 74.368, aliases: ["cavalry"] },
  { id: "cantt", name: "Lahore Cantt", lat: 31.52, lon: 74.39, aliases: ["cantonment", "cantt lahore"] },

  // --- DHA Phases (Defence Housing Authority) ---
  { id: "dha-phase-1", name: "DHA Phase 1", lat: 31.492, lon: 74.385, aliases: ["dha 1", "defence phase 1", "h block dha"] },
  { id: "dha-phase-2", name: "DHA Phase 2", lat: 31.488, lon: 74.398, aliases: ["dha 2", "defence phase 2", "q block dha"] },
  { id: "dha-phase-3", name: "DHA Phase 3", lat: 31.478, lon: 74.38, aliases: ["dha 3", "defence phase 3", "y block dha", "y block"] },
  { id: "dha-phase-4", name: "DHA Phase 4", lat: 31.47, lon: 74.405, aliases: ["dha 4", "defence phase 4", "dd block dha"] },
  { id: "dha-phase-5", name: "DHA Phase 5", lat: 31.4734, lon: 74.4586, aliases: ["dha", "dha 5", "defence phase 5", "lalik jan chowk"] },
  { id: "dha-phase-6", name: "DHA Phase 6", lat: 31.48, lon: 74.47, aliases: ["dha 6", "defence phase 6", "main boulevard dha 6"] },
  { id: "dha-phase-7", name: "DHA Phase 7", lat: 31.465, lon: 74.492, aliases: ["dha 7", "defence phase 7"] },
  { id: "dha-phase-8", name: "DHA Phase 8", lat: 31.448, lon: 74.455, aliases: ["dha 8", "defence phase 8", "air avenue", "broadway dha"] },
  { id: "dha-phase-9", name: "DHA Phase 9 Prism", lat: 31.425, lon: 74.482, aliases: ["dha 9", "dha prism", "phase 9 town"] },
  { id: "dha-rahbar", name: "DHA Rahbar (Phase 11)", lat: 31.392, lon: 74.268, aliases: ["dha rahbar", "dha phase 11"] },
  { id: "defence-ravi", name: "Defence Raya", lat: 31.455, lon: 74.445, aliases: ["defence raya golf club"] },

  // --- Johar Town & Southern Townships ---
  { id: "johar-town", name: "Johar Town", lat: 31.4697, lon: 74.2728, aliases: ["johar", "johar town phase 1", "johar town phase 2", "g1 market"] },
  { id: "faisal-town", name: "Faisal Town", lat: 31.4906, lon: 74.3018, aliases: ["faisal town lahore"] },
  { id: "township", name: "Township", lat: 31.4661, lon: 74.3152, aliases: ["township lahore"] },
  { id: "wapda-town", name: "Wapda Town", lat: 31.4428, lon: 74.2581, aliases: ["wapda town phase 1", "wapda town phase 2"] },
  { id: "valencia", name: "Valencia Town", lat: 31.3775, lon: 74.2389, aliases: ["valencia"] },
  { id: "lake-city", name: "Lake City", lat: 31.3927, lon: 74.2552, aliases: ["lake city lahore", "lake city phase 2"] },
  { id: "bahria-town", name: "Bahria Town", lat: 31.3704, lon: 74.1845, aliases: ["bahria lahore", "sector c bahria"] },
  { id: "bahria-orchard", name: "Bahria Orchard", lat: 31.325, lon: 74.195, aliases: ["orchard bahria"] },
  { id: "ali-town", name: "Ali Town", lat: 31.448, lon: 74.268 },
  { id: "dubai-town", name: "Dubai Town", lat: 31.435, lon: 74.278 },
  { id: "izmir-town", name: "Izmir Town", lat: 31.442, lon: 74.292 },
  { id: "green-town", name: "Green Town", lat: 31.455, lon: 74.305 },

  // --- Central & Historic Lahore ---
  { id: "model-town", name: "Model Town", lat: 31.4834, lon: 74.325, aliases: ["gor", "model town lahore", "model town link road"] },
  { id: "garden-town", name: "Garden Town", lat: 31.5036, lon: 74.3234, aliases: ["kalma chowk"] },
  { id: "allama-iqbal-town", name: "Allama Iqbal Town", lat: 31.5126, lon: 74.2949, aliases: ["iqbal town", "moon market"] },
  { id: "mall-road", name: "Mall Road", lat: 31.568, lon: 74.31, aliases: ["the mall", "charing cross"] },
  { id: "anarkali", name: "Anarkali", lat: 31.5686, lon: 74.312, aliases: ["anarkali bazaar"] },
  { id: "punjab-assembly", name: "Punjab Assembly", lat: 31.568, lon: 74.302, aliases: ["civil secretariat", "ag office"] },
  { id: "ichhra", name: "Ichhra", lat: 31.528, lon: 74.318, aliases: ["ichhra bazaar"] },
  { id: "shadman", name: "Shadman", lat: 31.542, lon: 74.328, aliases: ["shadman market"] },
  { id: "samanabad", name: "Samanabad", lat: 31.538, lon: 74.318 },
  { id: "gulshan-ravi", name: "Gulshan Ravi", lat: 31.548, lon: 74.328 },
  { id: "empress-road", name: "Empress Road", lat: 31.572, lon: 74.318, aliases: ["shimla pahari"] },
  { id: "garhi-shahu", name: "Garhi Shahu", lat: 31.565, lon: 74.335, aliases: ["garhi shahu lahore"] },
  { id: "islampura", name: "Islampura", lat: 31.562, lon: 74.302, aliases: ["krishan nagar", "sant nagar"] },
  { id: "mozang", name: "Mozang", lat: 31.552, lon: 74.315, aliases: ["mozang chungi"] },
  { id: "data-darbar", name: "Data Darbar", lat: 31.578, lon: 74.308, aliases: ["bhati gate"] },
  { id: "walled-city", name: "Walled City (Androon Lahore)", lat: 31.588, lon: 74.315, aliases: ["androon lahore", "lahore fort", "badshahi mosque", "shahi qila"] },

  // --- Askari Housing Schemes ---
  { id: "askari-10", name: "Askari 10", lat: 31.498, lon: 74.412, aliases: ["askari x"] },
  { id: "askari-11", name: "Askari 11", lat: 31.468, lon: 74.418, aliases: ["askari xi"] },
  { id: "askari-1", name: "Askari 1 & 2", lat: 31.535, lon: 74.372, aliases: ["askari 1", "askari 2"] },
  { id: "askari-5", name: "Askari 5", lat: 31.512, lon: 74.385, aliases: ["askari v"] },

  // --- Eastern & Northern Suburbs ---
  { id: "mughalpura", name: "Mughalpura", lat: 31.575, lon: 74.365, aliases: ["mughalpura flyover"] },
  { id: "harbanspura", name: "Harbanspura", lat: 31.588, lon: 74.378 },
  { id: "shalamar", name: "Shalamar Gardens", lat: 31.585, lon: 74.382, aliases: ["shalimar gardens", "baghbanpura"] },
  { id: "tajpura", name: "Tajpura", lat: 31.572, lon: 74.398 },
  { id: "daroghawala", name: "Daroghawala", lat: 31.595, lon: 74.415 },
  { id: "batapur", name: "Batapur", lat: 31.602, lon: 74.468, aliases: ["bambawali canal"] },
  { id: "jallo", name: "Jallo Park", lat: 31.562, lon: 74.498, aliases: ["jallo"] },
  { id: "shahdara", name: "Shahdara", lat: 31.613, lon: 74.284, aliases: ["shahdara town", "ravi bridge"] },
  { id: "ravi-town", name: "Ravi Town", lat: 31.598, lon: 74.348, aliases: ["badami bagh"] },
  { id: "misri-shah", name: "Misri Shah", lat: 31.588, lon: 74.332, aliases: ["shadbagh"] },

  // --- Major Arterial Corridors & Highways ---
  { id: "barki-road", name: "Barki Road", lat: 31.512, lon: 74.442, aliases: ["burki road", "barki"] },
  { id: "bedian-road", name: "Bedian Road", lat: 31.465, lon: 74.415, aliases: ["bedian"] },
  { id: "raiwind-road", name: "Raiwind Road", lat: 31.398, lon: 74.225, aliases: ["raiwind"] },
  { id: "ferozepur-road", name: "Ferozepur Road", lat: 31.478, lon: 74.332, aliases: ["ferozepur"] },
  { id: "multan-road", name: "Multan Road", lat: 31.485, lon: 74.262, aliases: ["yateem khana chowk"] },
  { id: "walton-road", name: "Walton Road", lat: 31.495, lon: 74.368, aliases: ["walton"] },
  { id: "jail-road", name: "Jail Road", lat: 31.54, lon: 74.335, aliases: ["lahore college", "services hospital"] },
  { id: "canal-bank-road", name: "Canal Bank Road", lat: 31.505, lon: 74.325, aliases: ["canal road lahore", "canal view"] },
  { id: "pine-avenue", name: "Pine Avenue", lat: 31.395, lon: 74.248 },
  { id: "khayaban-e-jinnah", name: "Khayaban-e-Jinnah", lat: 31.435, lon: 74.265 },

  // --- Major Societies & Suburbs ---
  { id: "paragon-city", name: "Paragon City", lat: 31.535, lon: 74.468, aliases: ["paragon"] },
  { id: "state-life", name: "State Life Society", lat: 31.458, lon: 74.432, aliases: ["state life phase 1"] },
  { id: "central-park", name: "Central Park Housing Scheme", lat: 31.348, lon: 74.358, aliases: ["central park lahore"] },
  { id: "sui-gas-society", name: "Sui Gas Housing Society", lat: 31.442, lon: 74.448, aliases: ["sui gas phase 1", "sui gas phase 2"] },
  { id: "park-view-city", name: "Park View City", lat: 31.435, lon: 74.195 },
  { id: "pak-arab", name: "Pak Arab Housing Society", lat: 31.448, lon: 74.388 },
  { id: "punjab-society", name: "Punjab Society", lat: 31.478, lon: 74.355 },
  { id: "nfc", name: "NFC Society", lat: 31.462, lon: 74.378, aliases: ["nfc phase 1", "nfc phase 2"] },
  { id: "bhobtian-chowk", name: "Bhobtian Chowk", lat: 31.4486, lon: 74.4094, aliases: ["bhobtian"] },
  { id: "thokar-niaz-baig", name: "Thokar Niaz Baig", lat: 31.458, lon: 74.248, aliases: ["thokar", "motorway M2 entry"] },
  { id: "college-road", name: "College Road", lat: 31.438, lon: 74.268 },
  { id: "sabzazar", name: "Sabzazar", lat: 31.472, lon: 74.288 },
  { id: "chung", name: "Chung", lat: 31.438, lon: 74.318, aliases: ["chuhng"] },
  { id: "kahna", name: "Kahna Nau", lat: 31.368, lon: 74.368, aliases: ["kahna"] },
  { id: "hall-road", name: "Hall Road", lat: 31.562, lon: 74.318 },
  { id: "wapda-city", name: "Wapda City", lat: 31.425, lon: 74.235 },
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
export function searchAreas(query: string, limit = 16): LahoreArea[] {
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
  if (hits[0]) return hits[0];

  const cleaned = cleanAreaName(query);
  if (!cleaned || cleaned.length < 2) return undefined;

  // Fallback fallback: Return a dynamic area object centered on Lahore central coordinates
  // so any non-hardcoded area name can be safely parsed by downstream components
  const idSlug = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: idSlug,
    name: cleaned,
    lat: 31.5204,
    lon: 74.3587,
    aliases: [cleaned.toLowerCase()],
  };
}
