/** Turn raw LLM / RAG text into short bullet lines for UI cards. */

const BULLET_PREFIX = /^[\s•\-*–—\d.)\]]+/;

export interface ClinicalPillar {
  id: string;
  category: "airway" | "cardio" | "indoor" | "timing" | "medication" | "general";
  title: string;
  titleUr: string;
  iconName: string;
  badge: string;
  text: string;
  details?: string[];
  detailsUr?: string[];
}

export interface ParsedHealthAdvice {
  summaryEn: string | null;
  summaryUr: string | null;
  bullets: string[];
  pillars: ClinicalPillar[];
  triageLevel: "low" | "moderate" | "high" | "severe" | "critical";
  physiologicalRisks: string[];
}

function cleanPrefix(text: string): { customTitle: string | null; clean: string } {
  let s = text.replace(BULLET_PREFIX, "").replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
  let customTitle: string | null = null;

  // Match prefixes like [Title]:** or **[Title]:** or **Title:** or [Title]: or Title:
  const match = s.match(/^(?:\[?\*\*?|\*\*\[?)([^\]*:]+)(?:\]?\*\*?|\*\*\]?):(?:\*\*)?\s*(.*)$/);
  if (match) {
    customTitle = match[1].replace(/[[\]*]/g, "").trim();
    s = match[2].replace(/^[:*\s]+/, "").trim();
  } else {
    const colonMatch = s.match(/^\[?([A-Za-z &—\/-]{4,45})\]?:\s+(.*)$/);
    if (colonMatch && !colonMatch[1].toLowerCase().includes("http")) {
      customTitle = colonMatch[1].trim();
      s = colonMatch[2].trim();
    }
  }

  // Strip any remaining junk bracketed prefix if still at start
  s = s.replace(/^\[[^\]]+\]:\*{0,2}\s*/, "").replace(/^\*\*[^*]+\*\*:\s*/, "").trim();

  return { customTitle, clean: s };
}

function getDefaultPillar(category: ClinicalPillar["category"], index: number): ClinicalPillar {
  switch (category) {
    case "medication":
      return {
        id: `medication-${index}`,
        category: "medication",
        title: "Medication & Inhaler Protocol",
        titleUr: "ادویات اور سانس کی نگہداشت",
        iconName: "Pill",
        badge: "Condition Care",
        text: "Keep prescribed rescue inhalers accessible and take regular medications on schedule.",
        details: [
          "Keep your rescue inhaler (Salbutamol / Ventolin) readily accessible in your pocket or bag.",
          "Take prescribed daily preventative sprays and allergy medicines on time.",
          "Inhale gentle warm water steam before bed to soothe throat and clear nasal passages."
        ],
        detailsUr: [
          "ریسکیو انہیلر (Salbutamol) ہر وقت اپنے ساتھ بیگ یا جیب میں تیار رکھیں۔",
          "ڈاکٹر کی تجویز کردہ حفاظتی اسپرے اور الرجی کی دوائیاں باقاعدگی سے لیں۔",
          "رات کو سونے سے قبل نیم گرم پانی کی بھاپ لیں تاکہ سانس کی نالیوں میں سکون ملے۔"
        ]
      };
    case "airway":
      return {
        id: `airway-${index}`,
        category: "airway",
        title: "Mask & Airway PPE Protection",
        titleUr: "ماسک اور سانس کا تحفظ (N95 / KN95)",
        iconName: "ShieldAlert",
        badge: "N95 Recommended",
        text: "Wear an airtight N95/KN95 respirator to prevent deep alveolar PM2.5 inhalation.",
        details: [
          "Wear a certified N95 or KN95 respirator with a tight nasal seal (cloth masks do not block PM2.5).",
          "Pinch the metal nose-strip firmly to prevent air leakage from the sides.",
          "Wash face, rinse eyes with cool water, and gargle with warm water upon returning home."
        ],
        detailsUr: [
          "صرف N95 یا KN95 ماسک کا استعمال کریں؛ عام کپڑے کا ماسک باریک سموگ ذرات نہیں روک سکتا۔",
          "ماسک کی دھاتی پٹی کو ناک پر اچھی طرح دبائیں تاکہ اطراف سے زہریلی ہوا داخل نہ ہو۔",
          "گھر واپسی پر چہرے اور آنکھوں کو ٹھنڈے پانی سے دھوئیں اور نیم گرم پانی سے غرارے کریں۔"
        ]
      };
    case "indoor":
      return {
        id: `indoor-${index}`,
        category: "indoor",
        title: "Indoor Air & Vehicle Isolation",
        titleUr: "گھر اور گاڑی کا محفوظ ماحول",
        iconName: "Home",
        badge: "AC Recirculation ON",
        text: "Keep vehicle AC in 100% Recirculation mode and seal home windows with HEPA filtration.",
        details: [
          "Set vehicle AC to 100% Recirculation Mode (blocks up to 80% of road exhaust soot).",
          "Keep home windows and doors tightly sealed to prevent outdoor soot entry.",
          "Run a True HEPA (H13) air purifier in bedrooms during night time for restful sleep."
        ],
        detailsUr: [
          "گاڑی میں سفر کے دوران اے سی کا ری سرکولیشن (Recirculation) موڈ لازمی آن رکھیں۔",
          "گھر کے دروازے اور کھڑکیاں بند رکھیں تاکہ بیرونی کثافتیں اور دھواں اندر داخل نہ ہوں۔",
          "سونے کے کمرے میں ہیپا (HEPA) ایئر پیوریفائر چلائیں تاکہ رات کو صاف ہوا ملے۔"
        ]
      };
    case "cardio":
      return {
        id: `cardio-${index}`,
        category: "cardio",
        title: "Outdoor Exertion & Physical Limits",
        titleUr: "بیرونی سرگرمیاں اور جسمانی مشقت کی حد",
        iconName: "HeartPulse",
        badge: "Exposure Cap",
        text: "Limit outdoor stay to under 25 minutes and shift physical workouts indoors.",
        details: [
          "Cap continuous outdoor stay to under 20–25 minutes during elevated AQI alerts.",
          "Shift exercise, yoga, and workouts indoors in a closed, clean room.",
          "Drink 8–10 glasses of clean water daily to keep respiratory mucosal membranes hydrated."
        ],
        detailsUr: [
          "زیادہ سموگ کے دوران کھلی فضا میں قیام کو 20 سے 25 منٹ تک محدود رکھیں۔",
          "ورزش اور جاگنگ کھلی ہوا کی بجائے گھر کے اندر صاف کمرے میں کریں۔",
          "سانس کی نالیوں کی نمی اور صفائی کیلئے دن بھر وافر مقدار میں پانی پیئیں۔"
        ]
      };
    case "timing":
    default:
      return {
        id: `timing-${index}`,
        category: "timing",
        title: "Safe Commute Hours & Smog Timing",
        titleUr: "محفوظ سفری اوقات اور سموگ احتیاط",
        iconName: "Clock",
        badge: "Smart Commute Timing",
        text: "Travel during midday hours (11 AM - 4 PM) and avoid early morning/evening smog peaks.",
        details: [
          "Plan outdoor transit between 11:00 AM and 4:00 PM when atmospheric smog density is lowest.",
          "Avoid travel during peak thermal inversion hours (6:00–9:30 AM & 7:00–10:00 PM).",
          "Keep all vehicle windows rolled up completely during transit."
        ],
        detailsUr: [
          "ضروری کام اور سفر کیلئے صبح 11 بجے سے سہ پہر 4 بجے تک کے اوقات کا انتخاب کریں۔",
          "صبح سویرے اور رات کے اوقات میں غیر ضروری سفر سے مکمل گریز کریں۔",
          "سفر کے دوران گاڑی کے شیشے ہمیشہ مکمل بند رکھیں۔"
        ]
      };
  }
}

function categorizeBullet(bullet: string, index: number): ClinicalPillar {
  const { customTitle, clean } = cleanPrefix(bullet);
  const lower = (customTitle ? `${customTitle} ${clean}` : clean).toLowerCase();

  // 1. Medication & Patient Condition Care
  if (/inhaler|salbutamol|medication|medicine|prescri|doctor|dose|spray|spreader|bronchodilator|pharmacotherapy|asthma|pef|bronchospasm/i.test(lower)) {
    const base = getDefaultPillar("medication", index);
    if (customTitle) base.title = customTitle;
    base.text = clean;
    return base;
  }

  // 2. Airway & Mask PPE Defense
  if (/mask|n95|kn95|ffp2|respirator|seal|facial|airway ppe|airway defense|alveolar/i.test(lower)) {
    const base = getDefaultPillar("airway", index);
    if (customTitle) base.title = customTitle;
    base.text = clean;
    return base;
  }

  // 3. Indoor Air & Vehicle Cabin Isolation
  if (/car|air conditioning|recirculat|indoor|hepa|purifier|window|filter|cabin|micro-environment|vehicular/i.test(lower)) {
    const base = getDefaultPillar("indoor", index);
    if (customTitle) base.title = customTitle;
    base.text = clean;
    return base;
  }

  // 4. Physical Exertion & Cardiopulmonary Limits
  if (/limit|exertion|strenuous|outdoor|minute|cardio|heart|pulse|chest|fatigue|walk|hemodynamic|cardiopulmonary|speed/i.test(lower)) {
    const base = getDefaultPillar("cardio", index);
    if (customTitle) base.title = customTitle;
    base.text = clean;
    return base;
  }

  // 5. Smog Timing & Chronobiology
  const base = getDefaultPillar("timing", index);
  if (customTitle) base.title = customTitle;
  base.text = clean;
  return base;
}

/** Split backend health text into Roman Urdu summary + structured clinical pillars. */
export function parseHealthAdvice(text: string, aqi = 100): ParsedHealthAdvice {
  if (!text?.trim()) {
    return {
      summaryEn: null,
      summaryUr: null,
      bullets: [],
      pillars: [],
      triageLevel: "moderate",
      physiologicalRisks: [],
    };
  }

  const blocks = text.split(/\n\n+/);
  const preamble = blocks[0]?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];
  const bulletBlock = blocks.slice(1).join("\n") || text;

  let summaryEn: string | null = null;
  let summaryUr: string | null = null;

  if (preamble.length >= 2) {
    summaryEn = preamble[0].replace(/^\*\*([^*]+)\*\*:\s*/, "");
    summaryUr = preamble[1];
  } else if (preamble.length === 1) {
    const line = preamble[0].replace(/^\*\*([^*]+)\*\*:\s*/, "");
    const isUr =
      /(pehnein|rahein|karein|zyada|kam|paani|mask|ghar|bahir|garmi|smog|barsaat|ehtiyat|mat jayein|dopahar|bachein|theek|hawa|season)/i.test(
        line
      ) && line.length < 140;
    if (isUr) summaryUr = line;
    else summaryEn = line;
  }

  const rawBullets = toBulletLines(bulletBlock, 8);
  const filteredBullets = rawBullets.filter(
    (b) =>
      b !== summaryEn &&
      b !== summaryUr &&
      !b.toLowerCase().startsWith("⚠️") &&
      !b.toLowerCase().startsWith("medical note") &&
      !b.toLowerCase().startsWith(String(summaryEn ?? "").toLowerCase().slice(0, 24))
  );

  // Exactly 4 unique clinical pillars (NO duplicate categories or titles ever)
  const usedCategories = new Set<string>();
  const pillars: ClinicalPillar[] = [];

  // Step 1: Add distinct categories from AI bullets
  for (let i = 0; i < filteredBullets.length && pillars.length < 4; i++) {
    const rawBullet = filteredBullets[i];
    const pillar = categorizeBullet(rawBullet, pillars.length);
    
    if (!usedCategories.has(pillar.category)) {
      usedCategories.add(pillar.category);
      pillars.push(pillar);
    }
  }

  // Step 2: If fewer than 4 distinct categories, fill remaining slots with unique unused categories
  const fallbackCategoryOrder: ClinicalPillar["category"][] = [
    "airway",
    "indoor",
    "cardio",
    "medication",
    "timing"
  ];

  for (const cat of fallbackCategoryOrder) {
    if (pillars.length >= 4) break;
    if (!usedCategories.has(cat)) {
      usedCategories.add(cat);
      pillars.push(getDefaultPillar(cat, pillars.length));
    }
  }

  let triageLevel: ParsedHealthAdvice["triageLevel"] = "low";
  const risks: string[] = [];

  if (aqi >= 200) {
    triageLevel = "critical";
    risks.push("Severe Acute Bronchospasm", "Myocardial Ischemia Alert", "Systemic Endothelial Inflammation");
  } else if (aqi >= 150) {
    triageLevel = "severe";
    risks.push("High Airway Reactivity", "Cardiovascular Exertion Load", "Alveolar PM2.5 Infiltration");
  } else if (aqi >= 100) {
    triageLevel = "high";
    risks.push("Moderate Bronchial Strain", "Cardiac Rhythm Sensitivity", "Microvascular Stress");
  } else if (aqi >= 50) {
    triageLevel = "moderate";
    risks.push("Mild Mucosal Irritation", "Upper Airway Dryness");
  } else {
    triageLevel = "low";
    risks.push("Baseline Pulmonary Status");
  }

  return {
    summaryEn,
    summaryUr,
    bullets: pillars.map((p) => p.text),
    pillars,
    triageLevel,
    physiologicalRisks: risks,
  };
}

export function toBulletLines(text: string, maxItems = 8): string[] {
  if (!text?.trim()) return [];

  // Split glued headings like "text.**Next Header:**" or "text.• Header" or "text.[Header]:**"
  let normalized = text.replace(/([.!?])\s*(?=\[?[A-Za-z &—\/-]{3,45}\]?:\*{0,2})/g, "$1\n• ");
  normalized = normalized.replace(/([.!?])\s*(?=\*\*[A-Za-z &—\/-]{3,45}\*\*:)/g, "$1\n• ");

  const lines = normalized
    .split(/\n+/)
    .map((l) => l.replace(BULLET_PREFIX, "").trim())
    .filter((l) => l.length > 10 && l.length < 400);

  if (lines.length >= 2) {
    return lines.slice(0, maxItems);
  }

  const sentences = normalized
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 400);

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

export interface ClinicalDietItem {
  id: string;
  category: "antioxidant" | "hydration" | "anti_inflammatory" | "airway_clearance" | "cellular_defense";
  tag: string;
  tagUr: string;
  emoji: string;
  title: string;
  titleUr: string;
  targetOrgan: string;
  targetOrganUr: string;
  description: string;
  descriptionUr: string;
  bioactive: string;
  bioactiveUr: string;
  tips: string[];
  tipsUr: string[];
}

const SEASONAL_DIET_PROFILES: Record<string, ClinicalDietItem[]> = {
  monsoon: [
    {
      id: "monsoon-1",
      category: "hydration",
      tag: "Breakfast • Monsoon Airway Defense",
      tagUr: "ناشتہ • برسات میں سانس کا تحفظ",
      emoji: "🍋",
      title: "Fresh Lemon Water & Crisp Apple",
      titleUr: "تازہ لیموں پانی اور سیب (نمی اور الرجی کا دفاع)",
      targetOrgan: "Lungs & Upper Airway",
      targetOrganUr: "پھیپھڑے اور سانس کی نالیاں",
      bioactive: "Ascorbic Acid & Flavonoids (Immune Shield)",
      bioactiveUr: "وٹامن سی اور فلیوونائڈز (مدافعتی ڈھال)",
      description: "Boosts respiratory mucosal barrier against airborne mold spores and counters heavy atmospheric humidity.",
      descriptionUr: "برسات کی زیادہ نمی اور فنگل ذرات کے خلاف سانس کی نالیوں کی قدرتی مدافعت کو مضبوط بناتا ہے۔",
      tips: [
        "🍋 Fresh Lemon Juice ➔ Delivers bioavailable Vitamin C that fortifies pulmonary alveolar cells against mold spore irritation.",
        "🍎 Crisp Apple Flavonoids ➔ Nourishes bronchial mucosal membranes, reducing excess mucus secretion during humid rain spells.",
        "💧 Warm Filtered Water ➔ Stimulates morning digestive detox and accelerates elimination of airborne metabolic toxins."
      ],
      tipsUr: [
        "🍋 لیموں کا تازہ رس ➔ وٹامن سی فراہم کرتا ہے جو نم ہوا اور فنگل الرجیز سے پھیپھڑوں کے خلیات کی حفاظت کرتا ہے۔",
        "🍎 تازہ سیب کے فلیوونائڈز ➔ سانس کی نالیوں کی اندرونی جھلی کو نم رکھتے ہیں اور اضافی بلغم بننے کی رفتار کم کرتے ہیں۔",
        "💧 نیم گرم پانی ➔ صبح کے وقت نظام انہضام کو فعال کر کے زہریلے مادوں کا جسم سے قدرتی اخراج آسان بناتا ہے۔"
      ]
    },
    {
      id: "monsoon-2",
      category: "antioxidant",
      tag: "Midday • Antioxidant & Sugar Balance",
      tagUr: "دوپہر • اینٹی آکسیڈنٹس اور شوگر بیلنس",
      emoji: "🫐",
      title: "Fresh Black Jamun & Pomegranate Bowl",
      titleUr: "تازہ جامن اور انار کا استعمال (خلیات کا تحفظ)",
      targetOrgan: "Blood Stream & Cellular DNA",
      targetOrganUr: "خون اور خلیاتی ڈی این اے",
      bioactive: "Anthocyanins & Ellagic Acid (ROS Scavengers)",
      bioactiveUr: "اینتھوسیاننز اور ایلاجک ایسڈ (خلیات کا دفاع)",
      description: "Superior seasonal antioxidant fruit in Punjab that neutralizes air pollutants and prevents waterborne infections.",
      descriptionUr: "پنجاب کا بہترین موسمی پھل جو فضائی زہریلے ذرات کے اثرات زائل کرتا ہے اور خون صاف رکھتا ہے۔",
      tips: [
        "🫐 Black Jamun Anthocyanins ➔ Actively neutralizes reactive oxygen species (ROS) caused by vehicular soot and air pollution.",
        "🫐 Natural Astringent Tannins ➔ Creates a protective antimicrobial shield in the gut against rainy-season bacterial pathogens.",
        "🍎 Pomegranate Polyphenols ➔ Improves blood vascular elasticity and promotes optimal micro-capillary oxygen delivery."
      ],
      tipsUr: [
        "🫐 کالا جامن ➔ اینتھوسیانن اینٹی آکسیڈنٹس فراہم کرتا ہے جو خون میں سموگ اور دھوئیں کے زہریلے اثرات کو ختم کرتے ہیں۔",
        "🫐 جامن کے قدرتی ٹیننز ➔ برسات میں پیٹ کے بیکٹیریا اور گیسٹرو انفیکشنز کے خلاف قدرتی مدافعتی ڈھال بناتے ہیں۔",
        "🍎 انار کا عرق / دانے ➔ خون کی روانی اور شریانوں کی لچک کو بڑھا کر پھیپھڑوں تک آکسیجن کی سپلائی تیز کرتے ہیں۔"
      ]
    },
    {
      id: "monsoon-3",
      category: "anti_inflammatory",
      tag: "Lunch • Light Digestion & Gut Protection",
      tagUr: "دوپہر کا کھانا • ہلکی غذا اور معدے کی حفاظت",
      emoji: "🍲",
      title: "Sprouted Moong Dal & Boiled Clean Water",
      titleUr: "ابلی ہوئی مونک دال اور ابلا ہوا صاف پانی",
      targetOrgan: "Gastrointestinal Tract & Immune Axis",
      targetOrganUr: "معدہ، آنتیں اور مدافعتی نظام",
      bioactive: "Plant Protein & Bioavailable Zinc",
      bioactiveUr: "پلانٹ پروٹین اور زنک (قوت مدافعت)",
      description: "Light, effortless digestion protecting against seasonal waterborne gastrointestinal pathogens.",
      descriptionUr: "ہضم میں انتہائی ہلکی غذا جو برسات میں پیٹ کی خرابی اور انفیکشن سے محفوظ رکھتی ہے۔",
      tips: [
        "🍲 Sprouted Moong Amino Acids ➔ Supplies easily absorbed protein for rapid repair of microscopic pulmonary tissue strain.",
        "🧄 Ginger & Turmeric (Haldi) ➔ Reduces systemic gut inflammation and destroys airborne bacteria before they enter circulation.",
        "💧 Boiled Filtered Water ➔ Eliminates 100% risk of waterborne typhoid, cholera, and gastrointestinal monsoon pathogens."
      ],
      tipsUr: [
        "🍲 مونک دال کا پروٹین ➔ پھیپھڑوں کے باریک ٹشوز کی مرمت کرتا ہے اور جسمانی توانائی کو بغیر بوجھ بحال رکھتا ہے۔",
        "🧄 ادرک اور ہلدی ➔ برسات کی نمی میں پیٹ کی سوزش ختم کرتے ہیں اور قوت مدافعت کو جراثیم کے خلاف طاقت دیتے ہیں۔",
        "💧 ابلا ہوا فلٹر پانی ➔ آلودہ پانی کے جراثیم اور ٹائیفائیڈ / ہیپاٹائٹس کے موسمی خطرات سے مکمل تحفظ دیتا ہے۔"
      ]
    },
    {
      id: "monsoon-4",
      category: "airway_clearance",
      tag: "Dinner • Chest Clearance & Decongestion",
      tagUr: "رات کا کھانا • سینے اور گلے کی صفائی",
      emoji: "🥣",
      title: "Warm Chicken Yakhni & Ginger Broth",
      titleUr: "گرم چکن یخنی اور ادرک کا سوپ (گلے کی صفائی)",
      targetOrgan: "Bronchial Tubes & Throat",
      targetOrganUr: "سانس کی نالیاں اور گلا",
      bioactive: "Carnosine & Gingerols (Mucosal Cleansing)",
      bioactiveUr: "ادرک کے قدرتی اجزاء اور کارنوسین",
      description: "Clears chest congestion, soothes damp throat irritation, and provides deep restorative immunity before sleep.",
      descriptionUr: "سینے کی جکڑن کھولتا ہے، نم ہوا کی وجہ سے گلے کی خراش دور کرتا ہے اور رات کو پرسکون نیند لاتا ہے۔",
      tips: [
        "🥣 Chicken Yakhni Carnosine ➔ Directly suppresses airway inflammation and relaxes bronchial spasms for peaceful night breathing.",
        "🫚 Fresh Grated Ginger ➔ Breaks down thick stagnant mucus and clears the throat of trapped micro-dust particles.",
        "🧂 Black Pepper & Garlic ➔ Stimulates pulmonary blood circulation and provides immediate soothing relief from rainy cough."
      ],
      tipsUr: [
        "🥣 دیسی چکن یخنی کا کارنوسین ➔ سینے اور پھیپھڑوں کی اندرونی سوزش کم کرتا ہے اور رات کو پرسکون سانس دیتا ہے۔",
        "🫚 تازہ پسی ہوئی ادرک ➔ گلے میں پھنسے بلغم اور کثافتوں کو پتلا کر کے با آسانی خارج کرتی ہے۔",
        "🧂 کالی مرچ اور لہسن ➔ سانس کی نالیوں میں خون کی گردش تیز کر کے موسمی کھانسی اور گلے کی خراش کو فوری دور کرتے ہیں۔"
      ]
    }
  ],

  winter_smog: [
    {
      id: "smog-1",
      category: "airway_clearance",
      tag: "Breakfast • Smog Defense & Alveolar Fuel",
      tagUr: "ناشتہ • سموگ سے بچاؤ اور توانائی",
      emoji: "🥣",
      title: "Warm Chicken Yakhni & Crushed Garlic",
      titleUr: "گرم چکن یخنی اور دیسی لہسن کا سوپ",
      targetOrgan: "Lungs & Alveolar Sacs",
      targetOrganUr: "پھیپھڑے اور ہوائی تھیلیاں",
      bioactive: "Carnosine, Allicin & Zinc (Heavy PM2.5 Shield)",
      bioactiveUr: "ایلیسن، کارنوسین اور زنک (سموگ شیلڈ)",
      description: "High-protein restorative broth that dissolves soot deposits and boosts bronchial blood circulation in freezing smog.",
      descriptionUr: "پھیپھڑوں میں جمع سموگ کے زہریلے ذرات کو صاف کرتا ہے اور سردی میں خون کی روانی تیز کرتا ہے۔",
      tips: [
        "🥣 Yakhni Carnosine ➔ Rebuilds lung tissue damaged by acidic fine particulate matter (PM2.5).",
        "🧄 Crushed Garlic Allicin ➔ Acts as a powerful natural antibiotic, destroying airborne winter viral pathogens.",
        "🥚 Boiled Egg Choline ➔ Optimizes lung surfactant production, keeping airway alveoli fully open."
      ],
      tipsUr: [
        "🥣 دیسی یخنی کا کارنوسین ➔ تیزابی سموگ (PM2.5) سے متاثرہ پھیپھڑوں کے خلیات کی تیزی سے مرمت کرتا ہے۔",
        "🧄 دیسی لہسن کا ایلیسن ➔ قدرتی جراثیم کش دوا کے طور پر کام کر کے فضائی بیکٹیریا اور انفیکشن کو روکتا ہے۔",
        "🥚 ابلے انڈے کے پروٹینز ➔ پھیپھڑوں کی ہوائی تھیلیوں کو کھلا رکھ کر آکسیجن جذب کرنے کی رفتار بڑھاتے ہیں۔"
      ]
    },
    {
      id: "smog-2",
      category: "anti_inflammatory",
      tag: "Dinner • Airway Coating & Cytokine Block",
      tagUr: "رات • گلے کی حفاظت اور سوزش کا خاتمہ",
      emoji: "🥛",
      title: "Warm Turmeric Milk & Pure Honey (Haldi Doodh)",
      titleUr: "نیم گرم ہلدی والا دودھ اور خالص شہد",
      targetOrgan: "Throat Lining & Immune Cytokines",
      targetOrganUr: "گلے کی جھلی اور مدافعتی نظام",
      bioactive: "Curcumin & Active Enzymes (Anti-Inflammatory)",
      bioactiveUr: "کرکومین اور شہد کے انزائمز (اینٹی انفلامیٹری)",
      description: "Powerful anti-inflammatory drink that coats throat lining and blocks PM2.5 inflammatory cytokines during sleep.",
      descriptionUr: "گلے کی اندرونی جھلی کو ڈھانپ کر رات بھر سموگ کے زہریلے کیمیکلز سے ہونے والی سوزش کو ختم کرتا ہے۔",
      tips: [
        "🥛 Curcumin in Warm Milk ➔ Deactivates inflammatory cytokine cascades in the bronchial tree.",
        "🍯 Raw Honey Enzymes ➔ Forms a soothing protective demulcent layer over raw, scratchy throat tissues.",
        "🧂 Black Pepper Piperine ➔ Increases turmeric bio-absorption by 2,000%, maximizing cellular anti-smog defense."
      ],
      tipsUr: [
        "🥛 ہلدی کا کرکومین ➔ پھیپھڑوں کی نالیوں میں سموگ سے پیدا ہونے والی خطرناک سوزش کو جڑ سے ختم کرتا ہے۔",
        "🍯 خالص شہد ➔ گلے کی چھلی ہوئی اور خشک جلد پر حفاظتی تہہ جما کر رات کی کھانسی روکتا ہے۔",
        "🧂 کالی مرچ ➔ ہلدی کے جذب ہونے کی قدرتی صلاحیت کو 20 گنا بڑھا کر بھرپور شفا بخشتی ہے۔"
      ]
    },
    {
      id: "smog-3",
      category: "cellular_defense",
      tag: "Lunch • Phase-II Liver & Lung Detox",
      tagUr: "دوپہر کا کھانا • پھیپھڑوں اور جگر کا ڈی ٹاکس",
      emoji: "🥦",
      title: "Fresh Spinach, Mustard Greens (Saag) & Makki Roti",
      titleUr: "تازہ پالک، سرسوں کا ساگ اور مکئی کی روٹی",
      targetOrgan: "Liver Enzymes & Blood Hemoglobin",
      targetOrganUr: "جگر کا فلٹر اور خون کا ہیموگلوبن",
      bioactive: "Sulforaphane, Dietary Iron & Chlorophyll",
      bioactiveUr: "سلفورافین اور قدرتی آئرن (جسمانی صفائی)",
      description: "Activates liver Phase-II enzymes to bind and eliminate inhaled toxic combustion hydrocarbons from vehicular smog.",
      descriptionUr: "خون اور جگر کے انزائمز کو فعال کرتا ہے تاکہ گاڑیوں کے دھوئیں سے پیدا ہونے والے زہریلے مادے خارج ہوں۔",
      tips: [
        "🥦 Sulforaphane in Mustard Greens ➔ Triggers Nrf2 cellular pathways to detoxify inhaled polycyclic hydrocarbons.",
        "🥬 Dietary Iron in Spinach ➔ Restores healthy hemoglobin levels for maximum arterial oxygen carrying capacity.",
        "🧈 Pure Butter / Desi Ghee ➔ Facilitates absorption of fat-soluble Vitamins A, D, and E for respiratory immunity."
      ],
      tipsUr: [
        "🥦 سرسوں کا سلفورافین ➔ پھیپھڑوں میں سانس کے ذریعے گئے دھوئیں اور کیمیکلز کو فلٹر کر کے خارج کرتا ہے۔",
        "🥬 پالک کا قدرتی آئرن ➔ خون میں ہیموگلوبن بڑھاتا ہے تاکہ جسم کے تمام اعضاء کو بھرپور آکسیجن مل سکے۔",
        "🧈 دیسی گھی / مکھن ➔ وٹامن اے اور ای کو جسم میں جذب کرا کے پھیپھڑوں کی اندرونی جھلی کو نرم رکھتا ہے۔"
      ]
    },
    {
      id: "smog-4",
      category: "antioxidant",
      tag: "Snack • Alveolar Vitamin C Shield",
      tagUr: "شام • وٹامن سی اور خلیات کا دفاع",
      emoji: "🍊",
      title: "Fresh Kinnow, Malta & Citrus Bowl",
      titleUr: "کینو اور مالٹا کا تازہ پھل / جوس",
      targetOrgan: "Pulmonary Capillaries & White Blood Cells",
      targetOrganUr: "پھیپھڑوں کی باریک شریانیں اور مدافعتی خلیات",
      bioactive: "Hesperidin & Bioavailable Vitamin C",
      bioactiveUr: "وٹامن سی اور ہیسپریڈن (اینٹی سموگ شیلڈ)",
      description: "Neutralizes alveolar oxidative damage caused by dense toxic Lahore winter smog and boosts white blood cell response.",
      descriptionUr: "لاہور کی شدید سموگ سے پھیپھڑوں کے باریک خلیات کو پہنچنے والے نقصان کو روکتا ہے اور مدافعت بڑھاتا ہے۔",
      tips: [
        "🍊 Kinnow Vitamin C ➔ Recharges macrophage immune cells to ingest and clear inhaled fine carbon dust.",
        "🍊 Citrus Hesperidin ➔ Strengthens fragile pulmonary capillary walls against smog-induced microvascular leakage.",
        "☀️ Midday Sunlight Intake ➔ Eating fresh citrus in warm sunshine avoids late-evening cold throat constriction."
      ],
      tipsUr: [
        "🍊 کینو کا وٹامن سی ➔ مدافعتی خلیات کو طاقت دیتا ہے تاکہ وہ پھیپھڑوں میں پھنسے زہریلے کاربن ذرات کو نگل کر ختم کریں۔",
        "🍊 مالٹے کا ہیسپریڈن ➔ پھیپھڑوں کی باریک خون کی نالیوں کو مضبوط بناتا ہے اور لیکج سے روکتا ہے۔",
        "☀️ دوپہر کی دھوپ میں استعمال ➔ شام کی ٹھنڈی سموگ میں کھانے سے بچاتا ہے اور گلے کو گرم رکھتا ہے۔"
      ]
    }
  ],

  summer_heatwave: [
    {
      id: "heat-1",
      category: "hydration",
      tag: "Morning • Electrolyte Balance & Heatstroke Prevention",
      tagUr: "صبح • الیکٹرولائٹس اور لو سے بچاؤ",
      emoji: "🥥",
      title: "Pure Coconut Water & Mint Lemonade (Nimbu Pani)",
      titleUr: "ناریل کا پانی اور تازہ پودینے کا لیموں پانی",
      targetOrgan: "Cardiovascular System & Blood Plasma",
      targetOrganUr: "دل اور خون کا پلازما",
      bioactive: "Natural Potassium, Magnesium & Citric Acid",
      bioactiveUr: "پوٹاشیم، میگنیشیم اور وٹامن سی (ہائیڈریشن)",
      description: "Instant cellular rehydration preventing heat exhaustion, hemoconcentration, and electrolyte collapse under extreme sun.",
      descriptionUr: "شدید گرمی اور لو میں جسم میں نمکیات کی کمی پوری کرتا ہے اور ہیٹ اسٹروک سے محفوظ رکھتا ہے۔",
      tips: [
        "🥥 Coconut Water Potassium ➔ Normalizes heart rhythm and prevents sudden blood pressure drops during peak heat.",
        "🍋 Mint Lemonade Citric Acid ➔ Cools core body temperature and restores vital electrolytes lost through heavy sweating.",
        "🧂 Himalayan Pink Salt Pinch ➔ Retains essential intracellular fluid balance, preventing painful heat cramps."
      ],
      tipsUr: [
        "🥥 ناریل کا پوٹاشیم ➔ دل کی دھڑکن کو متوازن رکھتا ہے اور شدید لو میں بلڈ پریشر گرنے سے بچاتا ہے۔",
        "🍋 لیموں اور پودینہ ➔ جسم کی اندرونی گرمی کو فوری ٹھنڈک میں بدلتے ہیں اور پسینے سے ضائع نمکیات بحال کرتے ہیں۔",
        "🧂 کالا نمک ➔ خلیات کے اندر پانی کی سطح کو برقرار رکھ کر پٹھوں کے کھنچاؤ سے محفوظ رکھتا ہے۔"
      ]
    },
    {
      id: "heat-2",
      category: "antioxidant",
      tag: "Midday • Cellular Cooling & Vascular Defense",
      tagUr: "دوپہر • ٹھنڈک اور خلیات کی حفاظت",
      emoji: "🍉",
      title: "Chilled Watermelon & Sweet Musk Melon (Kharbooza)",
      titleUr: "ٹھنڈا تربوز اور میٹھا خربوزہ",
      targetOrgan: "Vascular Endothelium & Kidneys",
      targetOrganUr: "خون کی شریانیں اور گردے",
      bioactive: "Lycopene, Citrulline & 92% Water Content",
      bioactiveUr: "لائکوپین، سیٹرولین اور قدرتی پانی",
      description: "High water-content seasonal fruits providing continuous vascular hydration and neutralizing ozone-induced free radicals.",
      descriptionUr: "جسم کو اندرونی ٹھنڈک فراہم کرتا ہے اور گرمی کی وجہ سے پیدا ہونے والی تیزابیت کو ختم کرتا ہے۔",
      tips: [
        "🍉 Watermelon Citrulline ➔ Relaxes stiffened arterial walls, ensuring smooth oxygen perfusion under heat stress.",
        "🍉 High Bioactive Lycopene ➔ Protects skin and mucosal cells from intense UV-radiation and summer ozone damage.",
        "🍈 Melon Mineral Water ➔ Gently flushes the kidneys, preventing concentrated urine and heat-induced kidney stones."
      ],
      tipsUr: [
        "🍉 تربوز کا سیٹرولین ➔ شریانوں کو نرم اور کشادہ کرتا ہے تاکہ گرمی میں دل پر خون پمپ کرنے کا بوجھ نہ پڑے۔",
        "🍉 لائکوپین اینٹی آکسیڈنٹ ➔ خلیات کو سورج کی تپش اور فضائی اوزون گیس کے نقصانات سے بچاتا ہے۔",
        "🍈 خربوزے کا قدرتی پانی ➔ گردوں کی صفائی کرتا ہے اور گرمی کی وجہ سے پیشاب کی جلن کو دور کرتا ہے۔"
      ]
    },
    {
      id: "heat-3",
      category: "anti_inflammatory",
      tag: "Lunch • Natural Thermal Shield & Satiety",
      tagUr: "دوپہر کا کھانا • قدرتی ٹھنڈک اور ستو",
      emoji: "🌾",
      title: "Chilled Barley Sattu & Chia/Sabza Seed Drink",
      titleUr: "جو کا ستو اور تخم ملنگا کا شربت",
      targetOrgan: "Stomach Lining & Digestive Core",
      targetOrganUr: "معدے کی جھلی اور جگر",
      bioactive: "Beta-Glucan & Soluble Mucilage Fiber",
      bioactiveUr: "بیٹا گلوکین اور فائبر (معدے کی ٹھنڈک)",
      description: "Traditional Punjab thermal coolant that prevents acid reflux and protects gut lining under extreme summer heat.",
      descriptionUr: "پنجاب کا روایتی مشروب جو معدے اور جگر کی گرمی ختم کرتا ہے اور توانائی برقرار رکھتا ہے۔",
      tips: [
        "🌾 Barley Sattu Beta-Glucans ➔ Delivers steady glucose release without generating internal metabolic digestion heat.",
        "🌱 Sabza / Chia Seeds Gel ➔ Forms a cooling protective mucous-like layer inside the stomach, eliminating acid burn.",
        "🌿 Roasted Cumin (Zeera) ➔ Stimulates gentle enzyme secretion without overheating the gastric mucosa."
      ],
      tipsUr: [
        "🌾 جو کا ستو ➔ جسم میں اضافی حرارت پیدا کیے بغیر دیرپا توانائی فراہم کرتا ہے اور کمزوری دور کرتا ہے۔",
        "🌱 تخم ملنگا کی جیل ➔ معدے کے اندر ٹھنڈی حفاظتی تہہ بنا کر تیزابیت اور سینے کی جلن کو فوری ختم کرتی ہے۔",
        "🌿 بھنا زیرہ ➔ معدے کے ہاضمے کو بغیر گرمی بڑھائے چست اور فعال رکھتا ہے۔"
      ]
    },
    {
      id: "heat-4",
      category: "cellular_defense",
      tag: "Dinner • Light Digestion & Gut Microbiome",
      tagUr: "رات کا کھانا • ہلکی غذا اور ٹھنڈا رائتہ",
      emoji: "🥒",
      title: "Chilled Cucumber Mint Raita & Bottle Gourd (Lauki)",
      titleUr: "کھیرے کا رائتہ اور لوکی کی ہلکی سبزی",
      targetOrgan: "Gut Microbiome & Colon",
      targetOrganUr: "معدے کے اچھے بیکٹیریا اور بڑی آنت",
      bioactive: "Cucurbitacins & Probiotic Lactobacilli",
      bioactiveUr: "پروبائیوٹکس اور کھیرے کے اینزائمز",
      description: "Prevents internal metabolic thermal load and maintains healthy gut flora during scorching Lahore summer nights.",
      descriptionUr: "رات کو پرسکون نیند لاتا ہے، ہاضمہ ہلکا رکھتا ہے اور جسمانی درجہ حرارت نارمل کرتا ہے۔",
      tips: [
        "🥒 Cucumber Hydration ➔ Replenishes intracellular fluids and cools digestive inflammation overnight.",
        "🥛 Yogurt Live Probiotics ➔ Restores friendly microbiome colonies disrupted by extreme heat dehydration.",
        "🥗 Steamed Lauki (Gourd) ➔ Easily absorbed dietary fiber that prevents constipation during summer heatwaves."
      ],
      tipsUr: [
        "🥒 کھیرے کا پانی ➔ رات بھر جسم کے خلیات کو نمی فراہم کر کے صبح کی پیاس اور خشکی روکتا ہے۔",
        "🥛 دہی کے پروبائیوٹکس ➔ گرمی سے متاثرہ آنتوں کے دوست بیکٹیریا کو زندہ رکھ کر قوت مدافعت بڑھاتے ہیں۔",
        "🥗 لوکی کی ہلکی سبزی ➔ ہضم میں ہلکی اور جگر کو ٹھنڈک دے کر رات کو پرسکون نیند لاتی ہے۔"
      ]
    }
  ],

  spring_dust: [
    {
      id: "spring-1",
      category: "airway_clearance",
      tag: "Morning • Pollen & Dust Mucosal Barrier",
      tagUr: "صبح • پولن اور گرد سے بچاؤ",
      emoji: "🍯",
      title: "Warm Honey Water & Fresh Guava (Amrood)",
      titleUr: "شہد ملا نیم گرم پانی اور تازہ امرود",
      targetOrgan: "Nasal Passages & Pharynx",
      targetOrganUr: "ناک کی نالیاں اور حلق",
      bioactive: "Quercetin, Pectin & High Vitamin C",
      bioactiveUr: "کوئرسیٹن، پیکٹین اور وٹامن سی",
      description: "Anti-allergic fruit complex that coats upper respiratory membranes against pollen grains and coarse PM10 dust.",
      descriptionUr: "سانس کی نالیوں پر قدرتی حفاظتی تہہ بناتا ہے تاکہ گرد اور پولن الرجیز کے ذرات چپک نہ سکیں۔",
      tips: [
        "🍯 Raw Honey Demulcents ➔ Coats sensitive pharyngeal tissues, blocking pollen allergens from triggering cough reflex.",
        "🍈 Fresh Guava Quercetin ➔ Stabilizes mast cells, dramatically decreasing sneezing and allergic rhinitis.",
        "💧 Morning Hydration ➔ Thins nasal secretions, allowing natural ciliated hairs to sweep out PM10 dust."
      ],
      tipsUr: [
        "🍯 خالص شہد ➔ گلے کے اوپر حفاظتی کوٹنگ بنا کر پولن اور گرد سے ہونے والی کھانسی کو روکتا ہے۔",
        "🍈 امرود کا کوئرسیٹن ➔ الرجی پیدا کرنے والے ہسٹامائن کو روک کر چھینکوں اور ناک کے بہنے کو قابو کرتا ہے۔",
        "💧 نہار منہ نیم گرم پانی ➔ ناک کی جھلی کو نمی دیتا ہے تاکہ گرد کے موٹے ذرات قدرتی طور پر باہر نکل جائیں۔"
      ]
    },
    {
      id: "spring-2",
      category: "anti_inflammatory",
      tag: "Midday • Natural Antihistamine Infusion",
      tagUr: "دوپہر • قدرتی اینٹی الرجی قہوہ",
      emoji: "🍵",
      title: "Tulsi, Fresh Ginger & Cardamom Herbal Infusion",
      titleUr: "تلسی، تازہ ادرک اور الائچی کا قہوہ",
      targetOrgan: "Bronchial Airway & Eyes",
      targetOrganUr: "سانس کی نالیاں اور آنکھیں",
      bioactive: "Eugenol & Cineole (Natural Antihistamine)",
      bioactiveUr: "یوجینول اور قدرتی اینٹی ہسٹامائن",
      description: "Natural antihistamine tea that dampens seasonal allergic rhinitis, sneezing, nasal congestion, and ocular itchiness.",
      descriptionUr: "موسم بہار کی الرجی، چھینکوں، ناک کی بندش اور آنکھوں کی جلن کو فوری سکون پہنچاتا ہے۔",
      tips: [
        "🌿 Holy Basil (Tulsi) Eugenol ➔ Directly opens constricted bronchial tubes during dusty windstorms.",
        "🫚 Ginger Anti-Histamines ➔ Reduces swollen nasal turbinates, clearing blocked breathing without drowsiness.",
        "🌱 Green Cardamom Cineole ➔ Soothes itchy roof of mouth and relieves allergic sinus headache."
      ],
      tipsUr: [
        "🌿 تلسی کا یوجینول ➔ گرد آلود ہوا میں سکڑی ہوئی سانس کی نالیوں کو قدرتی طور پر کھولتا ہے۔",
        "🫚 ادرک کا عرق ➔ ناک کے اندر سوجن کم کر کے بغیر کسی سستی یا نیند کے سانس کو رواں کرتا ہے۔",
        "🌱 چھوٹی الائچی ➔ تالو کی الرجی، کھجلی اور سر میں گرد کی وجہ سے ہونے والے درد کو دور کرتی ہے۔"
      ]
    },
    {
      id: "spring-3",
      category: "hydration",
      tag: "Lunch • Digestive Stamina & Light Clean Fuel",
      tagUr: "دوپہر کا کھانا • ہاضمے کی طاقت اور کھچڑی",
      emoji: "🍲",
      title: "Sprouted Lentil & Vegetable Khichdi with Plain Curd",
      titleUr: "دیسی ویجیٹیبل کھچڑی اور سادہ دہی",
      targetOrgan: "Gut-Lung Immunity Axis",
      targetOrganUr: "معدہ اور پھیپھڑوں کا مدافعتی رشتہ",
      bioactive: "Resistant Starch & Live Probiotics",
      bioactiveUr: "ریزسٹنٹ نشاستہ اور پروبائیوٹکس",
      description: "Soothing easily digested meal that prevents dust-induced systemic inflammation and digestive lethargy.",
      descriptionUr: "گرد کے موسم میں جسم کو تھکاوٹ سے بچاتا ہے اور معدے کو ہلکا اور فعال رکھتا ہے۔",
      tips: [
        "🍲 Moong & Rice Resistant Starch ➔ Nourishes gut colonocytes, which produce protective anti-allergic short-chain fatty acids.",
        "🥛 Fresh Plain Curd ➔ Provides live lactic cultures that modulate whole-body allergic hypersensitivity.",
        "🥕 Seasonal Carrots & Peas ➔ Delivers Beta-Carotene for rapid repair of dust-scratched mucosal linings."
      ],
      tipsUr: [
        "🍲 مونک اور چاول کا نشاستہ ➔ معدے کو طاقت دے کر ایسے قدرتی کیمیکلز بناتا ہے جو الرجی کو کم کرتے ہیں۔",
        "🥛 سادہ دہی ➔ خون میں الرجی پیدا کرنے والے اینٹی باڈیز کی حساسیت کو نارمل کرتا ہے۔",
        "🥕 گاجر اور مٹر ➔ بیٹا کیروٹین فراہم کر کے گرد سے متاثرہ اندرونی جھلیوں کی مرمت کرتے ہیں۔"
      ]
    },
    {
      id: "spring-4",
      category: "cellular_defense",
      tag: "Snack • Immune Cell Shield & Zinc Power",
      tagUr: "شام • زنک اور مدافعتی طاقت",
      emoji: "🥜",
      title: "Roasted Chickpeas (Bhuna Chana) & Pomegranate Seeds",
      titleUr: "بھنے ہوئے چنے اور انار کے دانے",
      targetOrgan: "White Blood Cells & Lymph Nodes",
      targetOrganUr: "سفید خلیات اور لمف نوڈز",
      bioactive: "Polyphenols & Dietary Zinc Complex",
      bioactiveUr: "زنک، آئرن اور پولی فینولز",
      description: "Strengthens immune white blood cells and cellular membranes against airborne dust pathogens and allergens.",
      descriptionUr: "خون کے سفید خلیات اور مدافعت کو طاقت دیتا ہے تاکہ فضائی جراثیم اثر نہ کر سکیں۔",
      tips: [
        "🥜 Roasted Chickpea Zinc ➔ Directly stabilizes immune mast cells, preventing explosive histamine discharge.",
        "🥜 Plant Iron & Protein ➔ Prevents seasonal fatigue and sustains sustained energy during dusty weather.",
        "🍎 Pomegranate Seeds ➔ Synergistically coats cell membranes against microscopic particulate oxidation."
      ],
      tipsUr: [
        "🥜 بھنے چنوں کا زنک ➔ الرجی پیدا کرنے والے خلیات کو مضبوطی سے قابو میں رکھ کر چھینکیں روکتا ہے۔",
        "🥜 پلانٹ آئرن ➔ گرد اور مٹی کی وجہ سے ہونے والی جسمانی سستی اور تھکن کو فوری دور کرتا ہے۔",
        "🍎 انار کے دانے ➔ خلیات کے گرد حفاظتی دیوار بنا کر فضائی کثافتوں کے نقصان سے بچاتے ہیں۔"
      ]
    }
  ]
};

export function parseDietPlan(items: string[], seasonId = "monsoon"): ClinicalDietItem[] {
  const normSeason = (seasonId || "monsoon").toLowerCase().replace(/[^a-z_]/g, "");
  let matchedSeason = "monsoon";

  if (normSeason.includes("smog") || normSeason.includes("winter")) {
    matchedSeason = "winter_smog";
  } else if (normSeason.includes("heat") || normSeason.includes("summer")) {
    matchedSeason = "summer_heatwave";
  } else if (normSeason.includes("dust") || normSeason.includes("spring")) {
    matchedSeason = "spring_dust";
  } else {
    matchedSeason = "monsoon";
  }

  // Check if items explicitly match a different season
  const allText = (items || []).join(" ").toLowerCase();
  if (allText.includes("smog") || allText.includes("kinnow") || allText.includes("haldi doodh")) {
    matchedSeason = "winter_smog";
  } else if (allText.includes("heatwave") || allText.includes("sattu") || allText.includes("watermelon")) {
    matchedSeason = "summer_heatwave";
  } else if (allText.includes("dust") || allText.includes("spring") || allText.includes("guava")) {
    matchedSeason = "spring_dust";
  }

  return SEASONAL_DIET_PROFILES[matchedSeason] || SEASONAL_DIET_PROFILES["monsoon"];
}

export function toRomanUrduDietTip(item: string): string {
  return item.trim();
}

export function localizeDietPlan(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}
