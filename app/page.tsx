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
  MapPin,
  Clock,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { CANONICAL_EXAM_CENTERS, SAMPLE_PRESENTERS } from "@/lib/constants/demo-data";
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
            Match with Karunya classmates headed to your exam center, coordinate the journey, and split the ride effortlessly.
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
                Autonomous agents coordinate your schedule, route, and cab fare so you can focus on your exam.
              </p>
            </div>

            {/* Clean 3-step sequence (no generic card grid, varied depth) */}
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
                    Meet classmates on your route
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#6E6E73]">
                    The matching agent links you with verified Karunya peers traveling to the same center at the same time.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#D2D2D7]/40 text-[12px] font-medium text-[#0071E3]">
                  Exact center and session pairing
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
                    The coordinator agent suggests the campus pickup spot, departure time, and live per-person cost split.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#D2D2D7]/40 text-[12px] font-medium text-[#0071E3]">
                  Live split updates as members join
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

        {/* CANONICAL EXAM CENTERS SECTION */}
        <section id="centers" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              Supported Coimbatore NPTEL centers
            </h2>
            <p className="mt-3 text-[17px] text-[#6E6E73]">
              Pre-configured canonical venues for Karunya students with route distances.
            </p>
          </div>

          <div className="space-y-4">
            {CANONICAL_EXAM_CENTERS.map((center, index) => (
              <div
                key={center.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#D2D2D7]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider">
                        Center {String.fromCharCode(65 + index)}
                      </span>
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#1D1D1F] mt-0.5">
                      {center.name}
                    </h3>
                    <p className="text-[14px] text-[#6E6E73] mt-1 max-w-xl">
                      {center.address}
                    </p>
                  </div>
                </div>

                <a
                  href={center.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0071E3] hover:text-[#0077ED] self-start sm:self-center shrink-0 min-h-[44px]"
                >
                  View on Google Maps
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* DEMO PRESENTERS GUIDE (For 4-device presentation) */}
        <section
          id="demo-presenters"
          className="bg-[#F5F5F7] py-16 px-4 sm:px-6 border-t border-[#D2D2D7]/50"
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2.5 mb-2">
              <Sparkles className="w-4 h-4 text-[#0071E3]" />
              <span className="text-[13px] font-semibold text-[#0071E3] uppercase tracking-wider">
                Live Demo Guide
              </span>
            </div>
            <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[#1D1D1F] mb-3">
              Configured for four simultaneous presenter devices
            </h2>
            <p className="text-[15px] text-[#6E6E73] max-w-2xl mb-8 leading-relaxed">
              When presenting live across four phones or laptops, use the presenter credentials below. Presenters 1, 2, and 3 match into the Center A squad, while Presenter 4 joins the Center B afternoon squad.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SAMPLE_PRESENTERS.map((p, idx) => (
                <div
                  key={p.registerNo}
                  className="bg-white rounded-2xl p-4 border border-[#D2D2D7]/60 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[11px] font-semibold">
                        Device {idx + 1}
                      </span>
                      <span className="text-[11px] font-medium text-[#6E6E73]">
                        {p.session}
                      </span>
                    </div>
                    <div className="font-semibold text-[15px] text-[#1D1D1F]">
                      {p.name}
                    </div>
                    <div className="font-mono text-[12px] text-[#6E6E73] mt-0.5">
                      {p.registerNo}
                    </div>
                    <div className="text-[12px] text-[#6E6E73] mt-2 truncate">
                      📍 {p.pickupArea}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#D2D2D7]/40 text-[11px] font-medium text-[#1D1D1F] truncate">
                    {idx < 3 ? "Matches Center A Group" : "Matches Center B Group"}
                  </div>
                </div>
              ))}
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
          window.location.reload();
        }}
      />
    </div>
  );
}
