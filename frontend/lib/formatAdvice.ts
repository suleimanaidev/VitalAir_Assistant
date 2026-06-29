/** Turn raw LLM / RAG text into short bullet lines for UI cards. */

const BULLET_PREFIX = /^[\s•\-*–—\d.)\]]+/;

export interface ParsedHealthAdvice {
  summaryEn: string | null;
  summaryUr: string | null;
  bullets: string[];
}

/** Split backend health text into Roman Urdu summary + readable bullets. */
export function parseHealthAdvice(text: string): ParsedHealthAdvice {
  if (!text?.trim()) {
    return { summaryEn: null, summaryUr: null, bullets: [] };
  }

  const blocks = text.split(/\n\n+/);
  const preamble = blocks[0]?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];
  const bulletBlock = blocks.slice(1).join("\n") || text;

  let summaryEn: string | null = null;
  let summaryUr: string | null = null;

  if (preamble.length >= 2) {
    summaryEn = preamble[0];
    summaryUr = preamble[1];
  } else if (preamble.length === 1) {
    const line = preamble[0];
    const isUr =
      /(pehnein|rahein|karein|zyada|kam|paani|mask|ghar|bahir|garmi|smog|barsaat|ehtiyat|mat jayein|dopahar|bachein|theek|hawa|season)/i.test(
        line
      ) && line.length < 140;
    if (isUr) summaryUr = line;
    else summaryEn = line;
  }

  const bullets = toBulletLines(bulletBlock, 4);
  const filteredBullets = bullets.filter(
    (b) =>
      b !== summaryEn &&
      b !== summaryUr &&
      !b.toLowerCase().startsWith(String(summaryEn ?? "").toLowerCase().slice(0, 24))
  );

  return {
    summaryEn,
    summaryUr,
    bullets: (filteredBullets.length > 0 ? filteredBullets : bullets).slice(0, 4),
  };
}

export function toBulletLines(text: string, maxItems = 8): string[] {
  if (!text?.trim()) return [];

  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(BULLET_PREFIX, "").trim())
    .filter((l) => l.length > 12 && l.length < 220);

  if (lines.length >= 2) {
    return lines.slice(0, maxItems);
  }

  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && s.length < 220);

  return sentences.slice(0, maxItems);
}

const DIET_EMOJI_MAP: [RegExp, string][] = [
  [/nimbu|lemon|citric|citrus|orange|kinnow|berr|aam panna/i, "🍊"],
  [/tarbuz|watermelon|kharbooza|melon/i, "🍉"],
  [/lassi|dahi|yogurt|curd|chaas|buttermilk/i, "🥛"],
  [/paani|water|hydrat|coconut/i, "💧"],
  [/ginger|adrak|tea|chai|green tea|tulsi/i, "🍵"],
  [/walnut|omega|fish|badam|nut|chana/i, "🥜"],
  [/broccoli|leafy|green|sabzi|vegetable|cucumber/i, "🥦"],
  [/turmeric|haldi|garlic|onion/i, "🧄"],
  [/soup|khana|meal|daal|khichdi|roti/i, "🍲"],
  [/fruit|apple|banana|guava|falsa/i, "🍎"],
  [/sattu|barley|oats/i, "🌾"],
  [/anar|pomegranate|beetroot/i, "🫐"],
  [/lauki|bottle gourd/i, "🥒"],
];

const HEALTH_EMOJI_MAP: [RegExp, string][] = [
  [/mask|n95|kn95/i, "😷"],
  [/inhaler|asthma|medication|medicine|peak flow/i, "💊"],
  [/indoor|home|window|hepa|purifier/i, "🏠"],
  [/water|hydrat|heat|stroke|dopahar|12.*4|midday/i, "💧"],
  [/drive|commute|rain|monsoon|road/i, "🚗"],
  [/lung|breath|pulmon/i, "🫁"],
];

export function emojiForDietItem(text: string): string {
  for (const [re, emoji] of DIET_EMOJI_MAP) {
    if (re.test(text)) return emoji;
  }
  return "🥗";
}

export function emojiForHealthItem(text: string): string {
  for (const [re, emoji] of HEALTH_EMOJI_MAP) {
    if (re.test(text)) return emoji;
  }
  return "⚠️";
}

function lineStartsWithEmoji(line: string): boolean {
  const cp = line.codePointAt(0);
  if (cp == null) return false;
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    (cp >= 0x1f600 && cp <= 0x1f64f)
  );
}

export function withEmojiBullets(
  lines: string[],
  emojiFor: (line: string) => string = () => "•"
): string[] {
  return lines.map((line) => {
    if (lineStartsWithEmoji(line)) return line;
    return `${emojiFor(line)} ${line}`;
  });
}

export const HEALTH_EMOJIS = ["🫁", "😷", "🏠", "💊", "⚠️"];
export const DIET_EMOJIS = ["🥦", "🍊", "🍵", "🥜", "🐟", "🧄"];

/** Punjab/Lahore foods in Roman Urdu for display (English LLM output → local tips). */
const DIET_ROMAN_UR: [RegExp, string][] = [
  [/ginger.*tea|adrak.*chai/i, "Adrak wali garam chai — halki, bina zyada shakkar ke"],
  [/broccoli|spinach/i, "Palak ya saag — ghar pe pakaya hua"],
  [/green tea/i, "Hari chai — din mein 1 cup theek hai"],
  [/grilled fish|omega.*fish/i, "Rohu ya thaila machli — hafte mein 1–2 dafa"],
  [/walnut|almond|badam/i, "Thori si badam ya akhrot — subah"],
  [/turmeric.*milk|haldi/i, "Raat ko haldi wala doodh (haldi doodh)"],
  [/citrus|vitamin c|orange/i, "Kinnow ya malta — subah ke waqt"],
  [/nimbu|lemon/i, "Thanda nimbu pani — namak aur podina ke sath"],
  [/lassi/i, "Thandi lassi — bina shakkar, dopahar ko"],
  [/tarbuz|watermelon/i, "Tarbuz ke tukray — garmi mein roz"],
  [/kharbooza|melon/i, "Kharbooza — thanda, iftar ya dopahar ke baad"],
  [/coconut water/i, "Nariyal pani — garmi mein behtareen"],
  [/sattu/i, "Sattu sharbat — thanda, namkeen ya meetha"],
  [/chaas|buttermilk/i, "Thanda chaas — khane ke sath"],
  [/moong|khichdi/i, "Halki moong ki khichdi — raat ka khana"],
  [/guava|amrood/i, "Amrood — vitamin C ke liye"],
  [/pomegranate|anar/i, "Anar ka juice — thora sa roz"],
  [/street food|snack/i, "Ghar ka khana prefer karein — bahir ka oily khana kam"],
  [/oats|barley/i, "Dalia ya jau ka kanji — subah ka nashta"],
];

export function toRomanUrduDietTip(item: string): string {
  const trimmed = item.trim();
  if (!trimmed) return trimmed;
  const alreadyUrdu =
    /(peena|khana|pani|dahi|lassi|tarbuz|nimbu|chaas|sattu|kinnow|malta|amrood|khichdi|daal|roti|sharbat|doodh|subah|dopahar|raat|ghar|punjab|lahore)/i.test(
      trimmed
    );
  if (alreadyUrdu) return trimmed;
  for (const [re, ur] of DIET_ROMAN_UR) {
    if (re.test(trimmed)) return ur;
  }
  return trimmed;
}

export function localizeDietPlan(items: string[]): string[] {
  return items.map(toRomanUrduDietTip);
}
