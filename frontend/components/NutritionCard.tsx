"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Languages,
  Sparkles,
  Utensils,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Target,
} from "lucide-react";
import { parseDietPlan, type ClinicalDietItem } from "@/lib/formatAdvice";

export interface NutritionCardProps {
  items?: string[];
  seasonId?: string;
  seasonLabel?: string;
  emptyMessage?: string;
  /** Hide duplicate header when nested inside AgentStepCard */
  embedded?: boolean;
  hasPatientDocs?: boolean;
}

export default function NutritionCard({
  items = [],
  seasonId = "monsoon",
  seasonLabel = "Barsaat / Monsoon Season",
  emptyMessage = "Analyze an area or route — personalized nutrition recommendations will appear here.",
  embedded = false,
  hasPatientDocs = false,
}: NutritionCardProps) {
  const [lang, setLang] = useState<"en" | "ur">("en");
  const [copied, setCopied] = useState(false);

  const parsedItems = parseDietPlan(items, seasonId);

  const handleCopy = () => {
    const textToCopy = `[VitalAir Seasonal Nutrition Guide • ${seasonLabel}]\n\n${parsedItems
      .map(
        (item) =>
          `• ${item.emoji} ${item.title} (${item.tag})\n  Target: ${item.targetOrgan}\n  Mechanism: ${item.description}\n  Benefits: \n  - ${item.tips.join("\n  - ")}`
      )
      .join("\n\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-2 flex flex-col space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-vital-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {hasPatientDocs && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-vital-primary/30 bg-vital-primary/10 px-3 py-1 text-xs font-bold text-vital-primary shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Personalized via Health Profile</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-vital-border/80 bg-vital-bg/90 px-3 py-1 text-xs font-bold text-vital-text shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-vital-primary" />
            <span>{seasonLabel} Diet Protocol</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Bilingual Toggle */}
          <div className="inline-flex rounded-lg border border-vital-border/80 bg-vital-bg/90 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                lang === "en"
                  ? "bg-vital-primary text-white shadow-sm"
                  : "text-vital-muted hover:text-vital-text"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("ur")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                lang === "ur"
                  ? "bg-vital-primary text-white shadow-sm"
                  : "text-vital-muted hover:text-vital-text"
              }`}
            >
              <Languages className="h-3 w-3" />
              اردو
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy nutrition plan"
            className="flex items-center gap-1 rounded-lg border border-vital-border/80 bg-vital-bg/90 px-2.5 py-1 text-xs font-medium text-vital-muted hover:border-vital-primary/50 hover:text-vital-primary transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Strictly Seasonal Nutrition Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {parsedItems.map((item, i) => {
          const isUrdu = lang === "ur";
          const currentTitle = isUrdu ? item.titleUr : item.title;
          const currentTag = isUrdu ? item.tagUr : item.tag;
          const currentDesc = isUrdu ? item.descriptionUr : item.description;
          const currentBioactive = isUrdu ? item.bioactiveUr : item.bioactive;
          const currentOrgan = isUrdu ? item.targetOrganUr : item.targetOrgan;
          const currentTips = isUrdu ? item.tipsUr : item.tips;

          return (
            <motion.div
              key={item.id || i}
              className="flex flex-col justify-between rounded-2xl border border-vital-border/80 bg-vital-card/95 p-4 sm:p-5 transition-all duration-300 hover:border-vital-primary/50 hover:shadow-lg"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <div>
                {/* Header: Emoji, Tag & Bioactive Badge */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-vital-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital-bg border border-vital-border text-lg shadow-inner shrink-0">
                      {item.emoji}
                    </span>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-vital-primary">
                        {currentTag}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-vital-primary/10 border border-vital-primary/25 px-2.5 py-0.5 text-[10px] font-extrabold text-vital-primary whitespace-nowrap shrink-0">
                    {item.category.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                {/* Primary Recipe/Food Title */}
                <h3
                  className={`text-base font-extrabold text-vital-text mb-1.5 ${
                    isUrdu ? "font-['Arial',sans-serif]" : ""
                  }`}
                  dir={isUrdu ? "rtl" : "ltr"}
                >
                  {currentTitle}
                </h3>

                {/* Target Organ Badge */}
                <div className="flex items-center mb-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-vital-primary/10 border border-vital-primary/25 px-2.5 py-0.5 text-[11px] font-bold text-vital-primary">
                    <Target className="h-3 w-3 text-vital-primary shrink-0" />
                    <span>{isUrdu ? `ہدف: ${currentOrgan}` : `Target: ${currentOrgan}`}</span>
                  </span>
                </div>

                {/* Specific Item-by-Item Benefit Breakdown (کونسی چیز کیا فائدہ دیتی ہے) */}
                {currentTips && currentTips.length > 0 && (
                  <div
                    className={`rounded-xl bg-vital-bg/70 border border-vital-border/60 p-3 space-y-2 ${
                      isUrdu ? "font-['Arial',sans-serif]" : ""
                    }`}
                    dir={isUrdu ? "rtl" : "ltr"}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-vital-muted flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                      <span>{isUrdu ? "اجزاء اور غذائی فوائد (کونسی چیز کیا فائدہ دیتی ہے)" : "Ingredient Breakdown & Direct Clinical Benefits"}</span>
                    </div>
                    <ul className="space-y-2 text-xs sm:text-[12.5px] text-vital-text leading-relaxed">
                      {currentTips.slice(0, 3).map((tip, idx) => {
                        // Check if tip has arrow "➔"
                        const hasArrow = tip.includes("➔");
                        if (hasArrow) {
                          const [ingredient, benefit] = tip.split("➔");
                          return (
                            <li key={idx} className="flex items-start gap-2 bg-vital-card/70 border border-vital-border/40 rounded-lg p-2">
                              <span className="text-vital-primary font-bold mt-0.5 shrink-0">•</span>
                              <div className="flex-1">
                                <span className="font-extrabold text-vital-primary mr-1.5">{ingredient.trim()}:</span>
                                <span className="text-vital-text/90">{benefit.trim()}</span>
                              </div>
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-vital-primary font-bold mt-0.5 shrink-0">•</span>
                            <span className="flex-1">{tip}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {parsedItems.length === 0 && (
          <p className="text-sm text-vital-muted col-span-2 text-center py-6">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
