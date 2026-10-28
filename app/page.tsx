"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { HeroConvergence } from "@/components/HeroConvergence";
import { SignInSheet } from "@/components/SignInSheet";
import { ResetDemoModal } from "@/components/ResetDemoModal";
import {
  FileText,
  Users2,
  Navigation,
  ArrowRight,
  Shield,
  RotateCcw,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // Check current session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      setUser(null);
    } catch (e) {
      console.error("Signout error", e);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setIsSignInOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      {/* Frosted Top Navigation */}
      <Navbar
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="pt-14 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Subtle Campus Chip */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F5F7] border border-[#D2D2D7]/60 text-[13px] font-medium text-[#6E6E73] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
            Karunya University NPTEL Travel Coordination
          </div>

          {/* Large Apple Headline (56-72px desktop, 36-40px mobile) */}
          <h1 className="text-[38px] sm:text-[60px] md:text-[68px] font-semibold leading-[1.08] tracking-[-0.025em] text-[#1D1D1F] max-w-4xl">
            Get to your NPTEL exam together.
          </h1>

          {/* One-line subhead (body 17px, line length < 70 chars) */}
          <p className="mt-5 text-[17px] sm:text-[19px] leading-[1.45] text-[#6E6E73] max-w-[620px] font-normal">
            Match with Karunya classmates headed to your exam center and coordinate the journey together effortlessly.
          </p>

          {/* Primary & Secondary Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleGetStarted}
              id="hero-get-started-btn"
              className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white text-[16px] font-medium shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{user ? "Go to my trip" : "Get started"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] text-[16px] font-medium border border-[#D2D2D7]/60 transition-colors flex items-center justify-center"
            >
              How it works
            </a>
          </div>

          {/* Quiet Memorable Hero Animation */}
          <div className="w-full mt-6">
            <HeroConvergence />
          </div>
        </section>

        {/* THREE STEP EXPLANATION SECTION (Alternate background #F5F5F7) */}
        <section
          id="how-it-works"
          className="w-full bg-[#F5F5F7] py-20 px-4 sm:px-6 border-y border-[#D2D2D7]/50"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-[32px] sm:text-[42px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                Three simple steps. Zero travel stress.
              </h2>
              <p className="mt-3 text-[17px] text-[#6E6E73] leading-relaxed">
                Coordinate your schedule and meetup details so you can focus on your exam.
              </p>
            </div>

            {/* Clean 3-step sequence */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Step 1 */}
              <div className="bg-white rounded-3xl p-7 border border-[#D2D2D7]/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center mb-5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-[13px] font-medium text-[#6E6E73] mb-1">
                    Step 1
                  </div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] mb-2.5">
                    Upload your hall ticket
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#6E6E73]">
                    Our intake agent extracts your exam center, date, and forenoon or afternoon session automatically.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#D2D2D7]/40 text-[12px] font-medium text-[#0071E3]">
                  Vision extraction in under 2 seconds
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-3xl p-7 border border-[#D2D2D7]/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center mb-5">
                    <Users2 className="w-5 h-5" />
                  </div>
                  <div className="text-[13px] font-medium text-[#6E6E73] mb-1">
                    Step 2
                  </div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] mb-2.5">
                    See classmates at your center
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#6E6E73]">
                    View peers traveling to the same exam center and session, and choose to start or join a travel group.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#D2D2D7]/40 text-[12px] font-medium text-[#0071E3]">
                  Exact center and session matching
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-3xl p-7 border border-[#D2D2D7]/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center mb-5">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div className="text-[13px] font-medium text-[#6E6E73] mb-1">
                    Step 3
                  </div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] mb-2.5">
                    Plan the trip together
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#6E6E73]">
                    Coordinate your meetup point and departure time with your travel group members in live chat.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#D2D2D7]/40 text-[12px] font-medium text-[#0071E3]">
                  Live chat with group members
                </div>
              </div>
            </div>

            {/* University verification guarantee */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#D2D2D7]/60 text-[13px] text-[#6E6E73]">
                <Shield className="w-4 h-4 text-[#34C759]" />
                <span>
                  Built exclusively for Karunya Institute of Technology and Sciences students with a verified @karunya.edu.in email.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-[#D2D2D7]/50 bg-white py-10 px-4 sm:px-6 text-[13px] text-[#6E6E73]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-[#1D1D1F]">ExamBuddy</div>
            <div>Karunya Institute of Technology and Sciences • Karunya Nagar, Coimbatore 641114</div>
          </div>
          <div className="flex items-center gap-4 text-[13px] flex-wrap">
            <span>NPTEL 2026 Session</span>
            <span>•</span>
            <span>AI Multi-Agent Architecture</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              className="inline-flex items-center gap-1 text-[#6E6E73] hover:text-[#0071E3] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Sign-in Sheet Dialog */}
      <SignInSheet
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={(signedInUser) => {
          setUser(signedInUser);
          router.push("/dashboard");
        }}
      />

      {/* Reset Demo Modal */}
      <ResetDemoModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onResetComplete={() => {
          setIsResetOpen(false);
          setUser(null);
          router.push("/");
        }}
      />
    </div>
  );
}
