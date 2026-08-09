"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * 44×24 pill toggle with sliding knob.
 * Uses lucide-react Moon/Sun for consistent cross-platform rendering.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center
        rounded-full border border-vital-border/60
        bg-vital-card transition-colors duration-300
        hover:border-vital-primary/50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vital-primary focus-visible:ring-offset-2
        ${className}
      `}
    >
      {/* Sliding knob */}
      <span
        className={`
          pointer-events-none flex h-5 w-5 items-center justify-center
          rounded-full bg-vital-primary shadow-sm
          transition-transform duration-300 ease-in-out
          ${isDark ? "translate-x-5" : "translate-x-0.5"}
        `}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-white" />
        ) : (
          <Sun className="h-3 w-3 text-white" />
        )}
      </span>
    </button>
  );
}
