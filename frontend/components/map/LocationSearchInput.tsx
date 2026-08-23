"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { cleanAreaName } from "@/lib/formatLocation";

export interface LocationSuggestion {
  id: string;
  name: string;
  label: string;
  detail?: string;
  source: "area_mapping" | "geocode";
  group?: "popular" | "other";
}

interface LocationSearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-vital-primary/25 px-1 font-bold text-vital-primary">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export default function LocationSearchInput({
  label,
  value,
  onChange,
  placeholder = "Search Lahore area — Gulberg, DHA, Johar Town, Dubai Town…",
  disabled = false,
}: LocationSearchInputProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSuggestions = (q: string) => {
    setLoading(true);
    void fetch(`/api/locations/search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("search failed");
        return res.json() as Promise<{ suggestions: LocationSuggestion[] }>;
      })
      .then((data) => {
        setSuggestions(data.suggestions ?? []);
        setActiveIndex(0);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadSuggestions(value.trim());
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmed = cleanAreaName(value);
  const showCustom =
    trimmed.length >= 2 &&
    !suggestions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());

  const listItems: LocationSuggestion[] = showCustom
    ? [
        {
          id: "__custom__",
          name: trimmed,
          label: `${trimmed}, Lahore`,
          detail: "Apna likha hua area use karein",
          source: "geocode",
        },
        ...suggestions,
      ]
    : suggestions;

  const pick = (item: LocationSuggestion) => {
    onChange(cleanAreaName(item.name));
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || listItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, listItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && listItems[activeIndex]) {
      e.preventDefault();
      pick(listItems[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <label className="block text-sm font-medium text-vital-text">
        {label}
        <div className="relative mt-1.5">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-vital-primary/70"
            aria-hidden
          />
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className="w-full rounded-xl border border-vital-border bg-vital-bg py-3 pl-10 pr-10 text-sm font-medium text-vital-text shadow-sm transition-all focus:border-vital-primary focus:bg-vital-card focus:outline-none focus:ring-2 focus:ring-vital-primary/20"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(cleanAreaName(e.target.value));
              setOpen(true);
            }}
            onBlur={() => {
              const cleaned = cleanAreaName(value);
              if (cleaned !== value) onChange(cleaned);
            }}
            onFocus={() => {
              setOpen(true);
              if (suggestions.length === 0) loadSuggestions(value.trim());
            }}
            onKeyDown={onKeyDown}
          />
          {loading && (
            <Loader2
              className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-vital-primary"
              aria-hidden
            />
          )}
        </div>
      </label>

      {open && listItems.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 max-h-80 sm:max-h-96 w-full overflow-y-auto rounded-xl border border-vital-border bg-vital-card p-1.5 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
        >
          {!trimmed && (
            <li className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-vital-muted">
              All Lahore areas ({listItems.length})
            </li>
          )}
          {trimmed && listItems.some((i) => i.source === "area_mapping") && (
            <li className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-vital-primary">
              Mapped Lahore Areas
            </li>
          )}
          {listItems.map((item, i) => {
            const showGeoHeader =
              trimmed &&
              item.source === "geocode" &&
              (i === 0 || listItems[i - 1]?.source === "area_mapping");
            const isCustom = item.id === "__custom__";
            return (
              <li key={item.id} role="presentation">
                {showGeoHeader && (
                  <div className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-vital-muted">
                    Map search
                  </div>
                )}
                <div role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 rounded-lg px-3.5 py-2.5 text-left transition-all ${
                      i === activeIndex
                        ? "bg-vital-primary/15 text-vital-primary font-semibold"
                        : "hover:bg-vital-primary/10 text-vital-text"
                    } ${isCustom ? "bg-vital-primary/5 border border-vital-primary/20 mb-1" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item)}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-vital-primary/15 text-vital-primary">
                      <MapPin className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-vital-text leading-snug">
                          {highlightMatch(item.label, trimmed)}
                        </span>
                        {isCustom && (
                          <span className="rounded-md bg-vital-primary/20 px-2 py-0.5 text-[10px] font-bold text-vital-primary">
                            Custom Area
                          </span>
                        )}
                        {item.source === "area_mapping" && (
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Live AQI
                          </span>
                        )}
                      </div>
                      {item.detail && (
                        <p className="mt-0.5 text-xs text-vital-muted">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
