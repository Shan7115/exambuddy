"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AgentActivityPanel, type AgentEventItem } from "@/components/AgentActivityPanel";
import {
  FileUp,
  MapPin,
  Calendar,
  Clock,
  Users2,
  Car,
  IndianRupee,
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles,
  RefreshCw,
  Home,
  MessageSquare,
  LogOut,
  AlertCircle,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

interface DashboardData {
  user: SessionUser;
  ticket: any | null;
  group: any | null;
  members: Array<{
    id: string;
    firstName: string;
    pickupArea: string;
    isCurrentUser: boolean;
  }>;
  agentEvents: AgentEventItem[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = await res.json();
      setData(json);

      // If user has a ticket but no group yet, auto-trigger matching agent
      if (json.ticket && !json.group) {
        triggerMatching();
      }
    } catch {
      setErrorMsg("Failed to connect to ExamBuddy server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Run Matching Agent
  const triggerMatching = async () => {
    setIsMatching(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/groups/match", { method: "POST" });
      const resJson = await res.json();
      if (!res.ok) {
        setErrorMsg(resJson.error || "Could not match with classmates.");
      } else {
        await loadDashboard();
      }
    } catch {
      setErrorMsg("Network error while running matching agent.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
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
          <span className="text-[14px] text-[#6E6E73] font-medium">
            Loading your NPTEL trip...
          </span>
        </div>
      </div>
    );
  }

  if (!data?.user) return null;

  const { user, ticket, group, members, agentEvents } = data;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F] pb-20 md:pb-12">
      {/* Frosted Top Nav */}
      <Navbar
        user={user}
        onOpenSignIn={() => {}}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D2D2D7]/50 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                Karunya University Student
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[38px] font-semibold tracking-tight text-[#1D1D1F]">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="text-[14px] text-[#6E6E73] mt-1 flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-[#1D1D1F] font-medium">{user.registerNo}</span>
              <span>•</span>
              <span>📍 {user.pickupArea || "Karunya Nagar"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {ticket && (
              <button
                type="button"
                onClick={triggerMatching}
                disabled={isMatching}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] text-[13px] font-medium border border-[#D2D2D7]/60 transition-colors disabled:opacity-50 min-h-[44px]"
                title="Re-run matching agent"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isMatching ? "animate-spin text-[#0071E3]" : ""}`} />
                <span>{isMatching ? "Matching..." : "Re-match squad"}</span>
              </button>
            )}

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-medium shadow-sm transition-all min-h-[44px]"
            >
              <FileUp className="w-4 h-4" />
              <span>{ticket ? "Update ticket" : "Upload hall ticket"}</span>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-[14px] text-red-900 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF3B30] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STATE A: NO TICKET YET */}
        {!ticket ? (
          <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 sm:p-10 border border-[#D2D2D7]/70 shadow-xs text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mb-5">
              <FileUp className="w-8 h-8" />
            </div>
            <h2 className="text-[24px] font-semibold text-[#1D1D1F] tracking-tight">
              No hall ticket uploaded yet
            </h2>
            <p className="text-[15px] text-[#6E6E73] mt-2 max-w-md leading-relaxed">
              Upload your NPTEL admit card to let our AI agents match you with Karunya classmates headed to the same center, date, and exam session.
            </p>
            <Link
              href="/upload"
              className="mt-6 px-7 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[15px] font-medium shadow-sm transition-all flex items-center gap-2 min-h-[44px]"
            >
              Upload your hall ticket
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* STATE B: TICKET UPLOADED AND MATCHING ACTIVE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (8 cols): Exam Summary, Group Card, and Classmates List */}
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Exam Summary Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]/40 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider">
                      Exam Details
                    </span>
                  </div>
                  <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759]">
                    Verified
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Course Name */}
                  <div>
                    <h2 className="text-[20px] sm:text-[22px] font-semibold text-[#1D1D1F] tracking-tight">
                      {ticket.course_name}
                    </h2>
                    {ticket.extracted_json?.courseCode && (
                      <span className="inline-block mt-1 text-[12px] font-mono text-[#6E6E73] bg-[#F5F5F7] px-2 py-0.5 rounded-md">
                        {ticket.extracted_json.courseCode}
                      </span>
                    )}
                  </div>

                  {/* Venue and Timing Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Venue */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#6E6E73]">
                          Exam Center Venue
                        </div>
                        <div className="text-[14px] font-semibold text-[#1D1D1F] mt-0.5">
                          {ticket.exam_center}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            ticket.exam_center
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0071E3] hover:underline mt-1"
                        >
                          Open in Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#6E6E73]">
                          Date & Session
                        </div>
                        <div className="text-[14px] font-semibold text-[#1D1D1F] mt-0.5">
                          {ticket.exam_date} • {ticket.session}
                        </div>
                        <div className="text-[12px] text-[#6E6E73] mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {ticket.session === "Forenoon"
                              ? "Reporting: 07:30 AM (Exam: 9am-12pm)"
                              : "Reporting: 12:30 PM (Exam: 2pm-5pm)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Group Plan Card (Trip Plan with live split) */}
              {group && (
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs relative overflow-hidden">
                  {/* Subtle decorative background gradient */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#0071E3]/5 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />

                  <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]/40 mb-5 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#34C759] animate-pulse" />
                      <span className="text-[13px] font-semibold text-[#1D1D1F]">
                        Travel Squad ({group.memberCount} Karunya Students)
                      </span>
                    </div>

                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3]">
                      Route optimized
                    </span>
                  </div>

                  {/* Trip Plan Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                    {/* Meetup Point & Time */}
                    <div className="space-y-3">
                      <div>
                        <div className="text-[12px] font-medium text-[#6E6E73]">
                          Recommended Meetup Point
                        </div>
                        <div className="text-[15px] font-semibold text-[#1D1D1F] mt-0.5">
                          {group.meetup_point || "Karunya Nagar Main Bus Stop / Campus Gate"}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            group.meetup_point || "Karunya Nagar Campus Gate"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0071E3] hover:underline mt-1"
                        >
                          View meetup on Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div>
                        <div className="text-[12px] font-medium text-[#6E6E73]">
                          Meetup Time
                        </div>
                        <div className="text-[15px] font-semibold text-[#1D1D1F] mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#0071E3]" />
                          <span>{group.meetup_time || "06:45 AM"}</span>
                          <span className="text-[11px] text-[#6E6E73] font-normal">
                            (45m prior to reporting)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transport & Cost Split */}
                    <div className="space-y-3 bg-[#FBFBFD] p-4 rounded-2xl border border-[#D2D2D7]/50">
                      <div>
                        <div className="text-[12px] font-medium text-[#6E6E73]">
                          Suggested Transport
                        </div>
                        <div className="text-[14px] font-semibold text-[#1D1D1F] mt-0.5 flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-[#0071E3]" />
                          <span>{group.transport || "Shared Cab"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#D2D2D7]/40 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-medium text-[#6E6E73]">
                            Total Estimated Fare
                          </div>
                          <div className="text-[14px] font-semibold text-[#1D1D1F]">
                            ₹{group.est_total_cost}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] font-semibold text-[#0071E3] uppercase tracking-wider">
                            Your Cost Split
                          </div>
                          <div className="text-[20px] font-bold text-[#0071E3] flex items-center justify-end">
                            <IndianRupee className="w-4 h-4" />
                            <span>{group.perPersonCost}</span>
                            <span className="text-[11px] text-[#6E6E73] font-normal ml-0.5">
                              / student
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Open Group CTA Button */}
                  <div className="mt-6 pt-5 border-t border-[#D2D2D7]/50 flex items-center justify-between flex-wrap gap-3 relative z-10">
                    <div className="text-[13px] text-[#6E6E73]">
                      Live group chat & coordinator bot ready.
                    </div>

                    <Link
                      href={`/groups/${group.id}`}
                      id="open-group-room-button"
                      className="px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-[14px] shadow-sm transition-all flex items-center gap-2 min-h-[44px]"
                    >
                      <span>Open group room</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* 3. Matched Classmates List (Department-free, first name only, pickup area) */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]/40 mb-4">
                  <div className="flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-[#0071E3]" />
                    <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                      Matched Karunya Classmates ({members.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6E6E73]">
                    Going to the same center & session
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                        member.isCurrentUser
                          ? "bg-[#0071E3]/5 border-[#0071E3]/30"
                          : "bg-[#FBFBFD] border-[#D2D2D7]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-[13px] text-white shadow-xs ${
                            member.isCurrentUser ? "bg-[#0071E3]" : "bg-neutral-600"
                          }`}
                        >
                          {member.firstName[0]}
                        </div>

                        <div>
                          {/* First name only as required */}
                          <div className="font-semibold text-[14px] text-[#1D1D1F] flex items-center gap-1.5">
                            <span>{member.firstName}</span>
                            {member.isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0071E3]/15 text-[#0071E3] font-bold">
                                You
                              </span>
                            )}
                          </div>
                          {/* Department-free pickup area as required */}
                          <div className="text-[12px] text-[#6E6E73] truncate max-w-[170px]">
                            📍 {member.pickupArea}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (4 cols): Agent Activity Panel */}
            <div className="lg:col-span-4 lg:sticky lg:top-20">
              <AgentActivityPanel
                initialEvents={agentEvents}
                userId={user.userId}
                groupId={group?.id || null}
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Tab Bar (phone-first experience) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#D2D2D7]/60 px-4 py-2 flex items-center justify-around"
      >
        <Link
          href="/dashboard"
          className="flex flex-col items-center py-1 text-[#0071E3] min-h-[44px] min-w-[44px] justify-center"
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

        {group && (
          <Link
            href={`/groups/${group.id}`}
            className="flex flex-col items-center py-1 text-[#6E6E73] hover:text-[#1D1D1F] min-h-[44px] min-w-[44px] justify-center"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Squad</span>
          </Link>
        )}

        <Link
          href="/activity"
          className="flex flex-col items-center py-1 text-[#6E6E73] hover:text-[#1D1D1F] min-h-[44px] min-w-[44px] justify-center"
        >
          <Sparkles className="w-5 h-5" />
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
