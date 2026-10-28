"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AgentActivityPanel, type AgentEventItem } from "@/components/AgentActivityPanel";
import { ArrowLeft, Bot, Sparkles, Loader2, Home, FileUp, MessageSquare, LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export default function ActivityLogPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [events, setEvents] = useState<AgentEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (res.status === 401) {
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUser(data.user);
          setEvents(data.agentEvents || []);
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F] pb-24 md:pb-12">
      <Navbar user={user} onOpenSignIn={() => {}} onSignOut={handleSignOut} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Trip</span>
          </Link>
        </div>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[12px] font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Realtime Audit Trail
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1D1D1F] tracking-tight">
            Agent Activity Stream
          </h1>
          <p className="text-[14px] text-[#6E6E73] mt-1">
            Realtime log of actions executed by the Intake, Matching, and Coordinator AI agents.
          </p>
        </div>

        {/* Full-width Agent Activity Panel */}
        <AgentActivityPanel
          initialEvents={events}
          userId={user.userId}
          groupId={null}
        />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#D2D2D7]/60 px-4 py-2 flex items-center justify-around"
      >
        <Link
          href="/dashboard"
          className="flex flex-col items-center py-1 text-[#6E6E73] hover:text-[#1D1D1F] min-h-[44px] min-w-[44px] justify-center"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">My trip</span>
        </Link>

        <Link
          href="/upload"
          className="flex flex-col items-center py-1 text-[#6E6E73] hover:text-[#1D1D1F] min-h-[44px] min-w-[44px] justify-center"
        >
          <FileUp className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Ticket</span>
        </Link>

        <Link
          href="/activity"
          className="flex flex-col items-center py-1 text-[#0071E3] min-h-[44px] min-w-[44px] justify-center"
        >
          <Bot className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Agents</span>
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex flex-col items-center py-1 text-[#6E6E73] hover:text-[#1D1D1F] min-h-[44px] min-w-[44px] justify-center"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Sign out</span>
        </button>
      </nav>
    </div>
  );
}
