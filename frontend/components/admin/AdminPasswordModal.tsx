"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Lock, Shield, Eye, EyeOff, X, AlertCircle } from "lucide-react";

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("vitalair_admin_unlocked") === "true";
  } catch {
    return false;
  }
}

export function setAdminUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (unlocked) {
      sessionStorage.setItem("vitalair_admin_unlocked", "true");
    } else {
      sessionStorage.removeItem("vitalair_admin_unlocked");
    }
  } catch {
    // ignore storage errors
  }
}

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminPasswordModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validPasswords = ["admin", "admin123", "vitalair", "admin2026", "123456"];
    const normalizedInput = password.trim();

    setTimeout(() => {
      setLoading(false);
      if (validPasswords.includes(normalizedInput.toLowerCase())) {
        setAdminUnlocked(true);
        setPassword("");
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
          router.push("/admin");
        }
      } else {
        setError("Galat password hai. Sahi Admin password darj karein.");
      }
    }, 300);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-vital-border bg-vital-card p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-vital-muted hover:text-vital-text p-1 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vital-primary/10 text-vital-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-vital-text">Admin Access Required</h3>
              <p className="text-xs text-vital-muted">Enter Admin password to unlock panel</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-vital-muted mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter admin password…"
                  autoFocus
                  className="w-full rounded-xl border border-vital-border bg-vital-bg px-4 py-2.5 pl-10 pr-10 text-sm text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-2 focus:ring-vital-primary/20"
                />
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-vital-muted" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-vital-muted hover:text-vital-text"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-vital-muted">
                Default password: <code className="bg-vital-bg px-1 py-0.5 rounded text-vital-primary">admin</code> or <code className="bg-vital-bg px-1 py-0.5 rounded text-vital-primary">admin123</code>
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-vital-muted hover:bg-vital-bg hover:text-vital-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="flex items-center gap-2 rounded-xl bg-vital-primary px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-vital-primary/90 disabled:opacity-50 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{loading ? "Verifying…" : "Unlock Admin"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
