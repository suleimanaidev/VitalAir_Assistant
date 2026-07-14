import { useState, useEffect } from "react";

export function usePersistedState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const item = window.sessionStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch {
        return initialValue;
      }
    }
    return initialValue;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(key, JSON.stringify(state));
      } catch {}
    }
  }, [key, state]);

  return [state, setState] as const;
}
