"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Sparkles,
} from "lucide-react";
import {
  SAMPLE_PRESENTERS,
  COIMBATORE_PICKUP_AREAS,
  type SamplePresenter,
} from "@/lib/constants/demo-data";
import type { SessionUser } from "@/lib/auth/session";

interface SignInSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
}

export function SignInSheet({ isOpen, onClose, onSuccess }: SignInSheetProps) {
  const [step, setStep] = useState<"form" | "otp">("form");

  // Form states
  const [name, setName] = useState("");
  const [registerNo, setRegisterNo] = useState("");
  const [email, setEmail] = useState("");
  const [pickupArea, setPickupArea] = useState(COIMBATORE_PICKUP_AREAS[0]);
  const [otpCode, setOtpCode] = useState("");

  // Demo generated code banner
  const [demoReceivedCode, setDemoReceivedCode] = useState<string | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Quick fill preset presenter
  const handleSelectPresenter = (p: SamplePresenter) => {
    setName(p.name);
    setRegisterNo(p.registerNo);
    setEmail(p.email);
    setPickupArea(p.pickupArea);
    setErrorMessage(null);
  };

  // Submit Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation
    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!registerNo.trim()) {
      setErrorMessage("Please enter your Karunya register number.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your Karunya student email.");
      return;
    }
    if (!cleanEmail.endsWith("@karunya.edu.in")) {
      setErrorMessage("Email must end with @karunya.edu.in for Karunya students.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          registerNo: registerNo.trim().toUpperCase(),
          email: cleanEmail,
          pickupArea,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Could not generate verification code.");
        setIsLoading(false);
        return;
      }

      setDemoReceivedCode(data.demoCode);
      setOtpCode(data.demoCode); // Auto-populate for effortless testing
      setStep("otp");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          registerNo: registerNo.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          pickupArea,
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Verification failed. Please try again.");
        setIsLoading(false);
        return;
      }

      onSuccess(data.user);
      onClose();
    } catch {
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyDemoCode = () => {
    if (demoReceivedCode) {
      navigator.clipboard.writeText(demoReceivedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal / Sheet Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-[#D2D2D7]/80 overflow-hidden z-10 max-h-[92vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-title"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#D2D2D7]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 id="signin-title" className="text-[19px] font-semibold tracking-tight text-[#1D1D1F]">
                  {step === "form" ? "Sign in to ExamBuddy" : "Enter verification code"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Quick Presenter Presets for 4-device live presentation */}
              {step === "form" && (
                <div className="bg-[#F5F5F7] rounded-2xl p-3.5 border border-[#D2D2D7]/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-[#6E6E73] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
                      Live demo presenter presets (tap to fill):
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_PRESENTERS.map((p, idx) => (
                      <button
                        key={p.registerNo}
                        type="button"
                        onClick={() => handleSelectPresenter(p)}
                        className={`text-left p-2 rounded-xl text-[12px] border transition-all ${
                          registerNo === p.registerNo
                            ? "bg-[#0071E3] text-white border-[#0071E3]"
                            : "bg-white hover:bg-white/90 text-[#1D1D1F] border-[#D2D2D7]/60"
                        }`}
                      >
                        <div className="font-semibold truncate">
                          P{idx + 1}: {p.name}
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            registerNo === p.registerNo ? "text-white/80" : "text-[#6E6E73]"
                          }`}
                        >
                          {p.registerNo} • {p.pickupArea.split(" ")[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div
                  className="rounded-2xl bg-red-50 border border-red-200/80 p-3.5 flex items-start gap-3 text-red-900"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 text-[#FF3B30] shrink-0 mt-0.5" />
                  <div className="text-[13px] leading-5">{errorMessage}</div>
                </div>
              )}

              {step === "form" ? (
                /* Step 1: User info form */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="signin-name"
                      className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5"
                    >
                      Full name
                    </label>
                    <input
                      id="signin-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Daniel Raj"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signin-regno"
                      className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5"
                    >
                      Karunya register number
                    </label>
                    <input
                      id="signin-regno"
                      type="text"
                      value={registerNo}
                      onChange={(e) => setRegisterNo(e.target.value.toUpperCase())}
                      placeholder="e.g. URK22CS1001"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[15px] uppercase font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signin-email"
                      className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5"
                    >
                      Karunya email address
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@karunya.edu.in"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                    />
                    <p className="text-[11px] text-[#6E6E73] mt-1">
                      Must end with <span className="font-medium text-[#1D1D1F]">@karunya.edu.in</span>
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="signin-pickup"
                      className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5"
                    >
                      Pickup / starting area
                    </label>
                    <select
                      id="signin-pickup"
                      value={pickupArea}
                      onChange={(e) => setPickupArea(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                    >
                      {COIMBATORE_PICKUP_AREAS.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.99] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 min-h-[44px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating demo code...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Verification Code Form */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {/* Clearly labelled Demo Code Banner as required */}
                  {demoReceivedCode && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-[#1D1D1F]">
                      <div className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider mb-1">
                        Demo code banner
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-2xl font-bold tracking-widest text-[#0071E3]">
                            {demoReceivedCode}
                          </span>
                          <span className="text-[11px] text-[#6E6E73]">
                            (Valid for 10 minutes)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={copyDemoCode}
                          className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-medium text-[#0071E3] hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#34C759]" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[12px] text-[#6E6E73] mt-2">
                        For live demo presentation: this code was generated server-side. In production, it is dispatched to your Karunya email.
                      </p>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="signin-otp-input"
                      className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5"
                    >
                      6-digit verification code
                    </label>
                    <input
                      id="signin-otp-input"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      required
                      className="w-full h-12 px-4 rounded-xl border border-[#D2D2D7] bg-white text-center font-mono text-2xl tracking-[0.4em] font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.99] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying session...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setErrorMessage(null);
                      }}
                      className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] underline underline-offset-4 transition-colors"
                    >
                      Edit details or use a different account
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
