/** Turn raw LLM / RAG text into short bullet lines for UI cards. */

const BULLET_PREFIX = /^[\s•\-*–—\d.)\]]+/;

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
