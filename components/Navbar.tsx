"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, LogOut, RotateCcw } from "lucide-react";
import { ResetDemoModal } from "./ResetDemoModal";
import type { SessionUser } from "@/lib/auth/session";

interface NavbarProps {
  user: SessionUser | null;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  onResetComplete?: () => void;
}

export function Navbar({ user, onOpenSignIn, onSignOut, onResetComplete }: NavbarProps) {
  const [isResetOpen, setIsResetOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full frosted-glass border-b border-[#D2D2D7]/50 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo & University Tag */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="ExamBuddy home"
          >
            <div className="w-8 h-8 rounded-full bg-[#0071E3] flex items-center justify-center text-white font-semibold text-sm shadow-sm group-hover:bg-[#0077ED] transition-colors">
              E
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[17px] tracking-tight text-[#1D1D1F]">
                ExamBuddy
              </span>
              <span className="hidden sm:inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#D2D2D7]/60">
                Karunya
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#6E6E73]">
            <Link href="/dashboard" className="hover:text-[#1D1D1F] transition-colors">
              My Trip
            </Link>
            <Link href="/explore" className="hover:text-[#1D1D1F] transition-colors">
              Explore Travel
            </Link>
            <Link href="/upload" className="hover:text-[#1D1D1F] transition-colors">
              Upload Ticket
            </Link>
          </nav>

          {/* Right CTA */}
          <div className="flex items-center gap-2.5">
            {/* Quick Demo Reset Trigger */}
            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              className="p-2 text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center text-[12px]"
              title="Reset Demo Environment (DEMO_ADMIN_KEY)"
              aria-label="Reset Demo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {user ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] text-[13px] font-medium px-3.5 py-1.5 rounded-full border border-[#D2D2D7]/60 transition-colors min-h-[40px]"
                >
                  <div className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px] font-semibold">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="max-w-[90px] truncate text-left sm:max-w-none">
                    {user.name ? user.name.split(" ")[0] : "Dashboard"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6E6E73]" />
                </Link>
                <button
                  onClick={onSignOut}
                  className="p-2 text-[#6E6E73] hover:text-[#1D1D1F] rounded-full hover:bg-[#F5F5F7] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenSignIn}
                id="nav-signin-button"
                className="inline-flex items-center justify-center bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white text-[14px] font-medium px-5 py-2 rounded-full shadow-sm transition-all min-h-[44px]"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <ResetDemoModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onResetComplete={() => {
          setIsResetOpen(false);
          if (onResetComplete) {
            onResetComplete();
          }
        }}
      />
    </>
  );
}
