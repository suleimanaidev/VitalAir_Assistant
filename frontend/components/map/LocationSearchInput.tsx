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
      <mark className="rounded bg-vital-primary/25 px-0.5 text-vital-text">
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
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-medium text-vital-text">
        {label}
        <div className="relative mt-1.5">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vital-muted"
            aria-hidden
          />
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-9 pr-9 text-vital-text focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
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
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-vital-muted"
              aria-hidden
            />
          )}
        </div>
      </label>

      {open && listItems.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full min-w-[280px] overflow-auto rounded-lg border border-vital-border bg-vital-card py-1 shadow-xl sm:min-w-full"
        >
          {!trimmed && (
            <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-vital-muted">
              All Lahore areas ({listItems.length})
            </li>
          )}
          {trimmed && listItems.some((i) => i.source === "area_mapping") && (
            <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-vital-primary">
              Mapped areas
            </li>
          )}
          {listItems.map((item, i) => {
            const showGeoHeader =
              trimmed &&
              item.source === "geocode" &&
              (i === 0 || listItems[i - 1]?.source === "area_mapping");
            return (
              <li key={item.id} role="presentation">
                {showGeoHeader && (
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-vital-muted">
                    Map search
                  </div>
                )}
                <div role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-start gap-1 px-3 py-2.5 text-left ${
                      i === activeIndex
                        ? "bg-vital-primary/15"
                        : "hover:bg-vital-primary/10"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item)}
                  >
                    <span className="flex w-full items-start gap-2 text-sm font-semibold leading-snug text-vital-text">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary opacity-80"
                        aria-hidden
                      />
                      <span className="whitespace-normal break-words">
                        {highlightMatch(item.label, trimmed)}
                      </span>
                    </span>
                    {item.detail && (
                      <span className="pl-6 text-xs text-vital-muted">{item.detail}</span>
                    )}
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
