"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { searchAreas, type LahoreArea } from "@/lib/lahoreAreas";

interface LocationSearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function LocationSearchInput({
  label,
  value,
  onChange,
  placeholder = "Search Lahore area…",
  disabled = false,
}: LocationSearchInputProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<LahoreArea[]>([]);

  useEffect(() => {
    setSuggestions(searchAreas(value));
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (area: LahoreArea) => {
    onChange(area.name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && suggestions[activeIndex]) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
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
            className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-9 pr-3 text-vital-text focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
      </label>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-vital-border bg-vital-card py-1 shadow-lg"
        >
          {suggestions.map((area, i) => (
            <li key={area.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === activeIndex
                    ? "bg-vital-primary/15 text-vital-primary"
                    : "text-vital-text hover:bg-vital-primary/10"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(area)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {area.name}, Lahore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
