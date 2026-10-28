"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, ShieldAlert, Check, Loader2 } from "lucide-react";

interface ResetDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
}

export function ResetDemoModal({
  isOpen,
  onClose,
  onResetComplete,
}: ResetDemoModalProps) {
  const [adminKey, setAdminKey] = useState("Karunya2026Reset9x");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/demo/reset?key=${encodeURIComponent(adminKey.trim())}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Reset failed. Invalid admin key.");
      } else {
        setSuccessMsg(data.message || "Demo reset complete!");
        if (onResetComplete) {
          setTimeout(() => {
            onResetComplete();
          }, 1000);
        }
      }
    } catch {
      setErrorMsg("Network error while connecting to reset service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            aria-hidden="true"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#D2D2D7]/80 z-10"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]/50 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#1D1D1F]">
                  Reset Demo Environment
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-[#6E6E73] leading-relaxed mb-4">
              Clears all live presentation users, tickets, and messages. Restores the 10 seeded Karunya dummy students to initial state so the demo can be rerun from scratch.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-[13px]">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[13px] flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                  Demo Admin Key
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter DEMO_ADMIN_KEY"
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-[#FBFBFD] text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-full border border-[#D2D2D7] text-[14px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Demo
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
