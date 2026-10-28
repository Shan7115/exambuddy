"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SignInSheet } from "@/components/SignInSheet";
import {
  FileUp,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      setUser(null);
      router.push("/");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
          <span className="text-[14px] text-[#6E6E73] font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Navbar
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Student Session Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#D2D2D7]/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                Karunya Student Verified
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight text-[#1D1D1F]">
              Welcome back, {user.name}
            </h1>
            <p className="text-[15px] text-[#6E6E73] mt-1 flex items-center gap-3 flex-wrap">
              <span className="font-mono">{user.registerNo}</span>
              <span>•</span>
              <span>{user.email}</span>
              <span>•</span>
              <span>📍 {user.pickupArea || "Karunya Nagar"}</span>
            </p>
          </div>

          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[15px] font-medium shadow-sm transition-all min-h-[44px]"
          >
            <FileUp className="w-4 h-4" />
            Upload hall ticket
          </Link>
        </div>

        {/* Action Callout for Stage 3 */}
        <div className="mt-8 bg-white rounded-3xl p-8 border border-[#D2D2D7]/70 shadow-xs flex flex-col items-center text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mb-4">
            <FileUp className="w-8 h-8" />
          </div>
          <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
            Upload your NPTEL hall ticket
          </h2>
          <p className="text-[15px] text-[#6E6E73] mt-2 leading-relaxed">
            Our Intake Agent will read your exam center, date, and morning or afternoon session, and match you with classmates heading to the same center.
          </p>
          <Link
            href="/upload"
            className="mt-6 px-6 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[15px] font-medium shadow-sm transition-all flex items-center gap-2 min-h-[44px]"
          >
            Start ticket upload
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <SignInSheet
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={(newUser) => setUser(newUser)}
      />
    </div>
  );
}
