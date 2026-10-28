"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  FileUp,
  MapPin,
  Calendar,
  Clock,
  Users2,
  ArrowRight,
  Loader2,
  Compass,
  MessageSquare,
  LogOut,
  AlertCircle,
  Plus,
  DoorOpen,
  Sparkles,
} from "lucide-react";
import { SignInSheet } from "@/components/SignInSheet";
import type { SessionUser } from "@/lib/auth/session";

interface MemberItem {
  id: string;
  firstName: string;
  pickupArea: string;
  isCurrentUser: boolean;
}

interface CurrentGroup {
  id: string;
  examCenter: string;
  examDate: string;
  session: string;
  meetupPoint: string | null;
  meetupTime: string | null;
  members: MemberItem[];
  memberCount: number;
}

interface CenterStudent {
  id: string;
  firstName: string;
  pickupArea: string;
}

interface OpenGroupItem {
  id: string;
  meetupPoint: string | null;
  meetupTime: string | null;
  memberCount: number;
  members: Array<{ firstName: string; pickupArea: string }>;
}

interface DashboardData {
  user: SessionUser;
  ticket: any | null;
  currentGroup: CurrentGroup | null;
  centerStudents: CenterStudent[];
  openGroups: OpenGroupItem[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStartingGroup, setIsStartingGroup] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setErrorMsg("Failed to connect to ExamBuddy server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Start a new travel group
  const handleStartGroup = async () => {
    if (!data?.ticket) return;
    setIsStartingGroup(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examCenter: data.ticket.exam_center,
          examDate: data.ticket.exam_date,
          session: data.ticket.session,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorMsg(resJson.error || "Could not start travel group.");
        setIsStartingGroup(false);
      } else {
        router.push(`/groups/${resJson.groupId}`);
      }
    } catch {
      setErrorMsg("Network error while starting travel group.");
      setIsStartingGroup(false);
    }
  };

  // Join an existing open group
  const handleJoinGroup = async (groupId: string) => {
    setIsJoining(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorMsg(resJson.error || "Could not join group.");
        setIsJoining(false);
      } else {
        router.push(`/groups/${groupId}`);
      }
    } catch {
      setErrorMsg("Network error while joining group.");
      setIsJoining(false);
    }
  };

  // Leave current group
  const handleLeaveGroup = async () => {
    if (!data?.currentGroup) return;
    setIsLeaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/groups/${data.currentGroup.id}/leave`, {
        method: "POST",
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErrorMsg(resJson.error || "Could not leave group.");
      } else {
        await loadDashboard();
      }
    } catch {
      setErrorMsg("Network error while leaving group.");
    } finally {
      setIsLeaving(false);
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
          <span className="text-[14px] text-[#6E6E73] font-medium">Loading your trip...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
        <Navbar
          user={null}
          onOpenSignIn={() => setIsSignInOpen(true)}
          onSignOut={() => router.push("/")}
        />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#D2D2D7]/60 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1D1D1F] mb-2">
              Sign in to view your trip
            </h2>
            <p className="text-[14px] text-[#6E6E73] mb-6">
              Enter your Karunya student email and OTP to access your trip details and coordination group.
            </p>
            <button
              onClick={() => setIsSignInOpen(true)}
              className="w-full min-h-[44px] px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-[15px] shadow-sm transition-all"
            >
              Sign in
            </button>
          </div>
        </main>
        <SignInSheet
          isOpen={isSignInOpen}
          onClose={() => setIsSignInOpen(false)}
          onSuccess={() => {
            setIsSignInOpen(false);
            setLoading(true);
            loadDashboard();
          }}
        />
      </div>
    );
  }

  const user = data.user;
  const ticket = data.ticket;
  const currentGroup = data.currentGroup;
  const centerStudents = data.centerStudents || [];
  const openGroups = data.openGroups || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F] pb-24 md:pb-12">
      <Navbar
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D2D2D7]/50">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[12px] font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              NPTEL Travel Dashboard
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight text-[#1D1D1F]">
              Welcome, {user.name ? user.name.split(" ")[0] : "Student"}
            </h1>
            <p className="text-[14px] text-[#6E6E73] mt-0.5">
              Karunya Register No: <span className="font-mono text-[#1D1D1F] font-medium">{user.registerNo}</span> • Pickup Area: <span className="text-[#1D1D1F] font-medium">{user.pickupArea}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#F5F5F7] border border-[#D2D2D7]/80 text-[#1D1D1F] text-[13px] font-medium transition-colors shadow-xs"
            >
              <Compass className="w-4 h-4 text-[#0071E3]" />
              <span>Explore travel options</span>
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-all shadow-xs"
            >
              <FileUp className="w-4 h-4" />
              <span>{ticket ? "Update ticket" : "Upload ticket"}</span>
            </Link>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            className="rounded-2xl bg-red-50 border border-red-200 p-4 text-[13px] text-red-900 flex items-center justify-between shadow-xs"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-[12px] font-medium text-red-700 hover:text-red-900 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION 1: Confirmed Ticket Summary */}
        {ticket ? (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]/40 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                <span className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                  Confirmed Admit Card
                </span>
              </div>
              <span className="text-[12px] font-mono text-[#6E6E73]">
                {ticket.extracted_json?.courseCode || "NPTEL-2026"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <div className="text-[12px] text-[#6E6E73] mb-1">Course Title</div>
                <div className="font-semibold text-[16px] text-[#1D1D1F] leading-snug">
                  {ticket.course_name}
                </div>
              </div>

              <div>
                <div className="text-[12px] text-[#6E6E73] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0071E3]" />
                  Exam Center Venue
                </div>
                <div className="font-semibold text-[15px] text-[#1D1D1F] leading-snug">
                  {ticket.exam_center}
                </div>
              </div>

              <div>
                <div className="text-[12px] text-[#6E6E73] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
                  Exam Date & Session
                </div>
                <div className="font-semibold text-[15px] text-[#1D1D1F]">
                  {ticket.exam_date} • {ticket.session}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-[#D2D2D7]/70 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-[19px] font-semibold text-[#1D1D1F]">
                No hall ticket uploaded yet
              </h3>
              <p className="text-[14px] text-[#6E6E73] mt-1 leading-relaxed">
                Upload your NPTEL admit card to discover classmates headed to your exam center, or explore travel options manually.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/upload"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-medium transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <span>Upload hall ticket</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/explore"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] text-[14px] font-medium border border-[#D2D2D7]/60 transition-colors flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-[#0071E3]" />
                <span>Explore travel options</span>
              </Link>
            </div>
          </div>
        )}

        {/* SECTION 2: Active Travel Group (if member) OR Opt-in Groups */}
        {currentGroup ? (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#0071E3]/40 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D2D2D7]/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                  <span className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider">
                    Your Travel Group
                  </span>
                </div>
                <h2 className="text-[20px] font-semibold text-[#1D1D1F] mt-0.5">
                  {currentGroup.examCenter} ({currentGroup.session})
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/groups/${currentGroup.id}`}
                  className="px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-all shadow-xs flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open group room & chat</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  disabled={isLeaving}
                  className="px-4 py-2.5 rounded-full bg-white hover:bg-red-50 text-[#FF3B30] border border-red-200 text-[13px] font-medium transition-colors disabled:opacity-60"
                >
                  {isLeaving ? "Leaving..." : "Leave group"}
                </button>
              </div>
            </div>

            {/* Meetup Info (Member editable in room) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F5F7] rounded-2xl p-4 border border-[#D2D2D7]/50 text-[13px]">
              <div>
                <span className="text-[#6E6E73] block mb-0.5">Meetup point:</span>
                <span className="font-semibold text-[#1D1D1F]">
                  {currentGroup.meetupPoint || "Not set yet (editable in group room)"}
                </span>
              </div>
              <div>
                <span className="text-[#6E6E73] block mb-0.5">Meetup time:</span>
                <span className="font-semibold text-[#1D1D1F]">
                  {currentGroup.meetupTime || "Not set yet (editable in group room)"}
                </span>
              </div>
            </div>

            {/* Member List */}
            <div>
              <div className="text-[13px] font-semibold text-[#1D1D1F] mb-2 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-[#0071E3]" />
                <span>Group members ({currentGroup.memberCount}):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentGroup.members.map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#D2D2D7]/70 text-[12px] text-[#1D1D1F]"
                  >
                    <span className="font-medium">{m.firstName}</span>
                    <span className="text-[#6E6E73]">({m.pickupArea})</span>
                    {m.isCurrentUser && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0071E3]/15 text-[#0071E3] font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : ticket ? (
          /* User has ticket, but is NOT yet in a group: Opt-in controls */
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D2D2D7]/40">
              <div>
                <h2 className="text-[20px] font-semibold text-[#1D1D1F]">
                  Travel groups for your center
                </h2>
                <p className="text-[13px] text-[#6E6E73] mt-0.5">
                  Groups are strictly opt-in. Join an open group or start your own.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartGroup}
                disabled={isStartingGroup}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-all shadow-xs self-start sm:self-auto disabled:opacity-60"
              >
                {isStartingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting group...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Start a travel group</span>
                  </>
                )}
              </button>
            </div>

            {openGroups.length > 0 ? (
              <div className="space-y-3">
                {openGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#D2D2D7]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-[14px] font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <Users2 className="w-4 h-4 text-[#0071E3]" />
                        <span>Travel Group ({grp.memberCount} members)</span>
                      </div>
                      <div className="text-[12px] text-[#6E6E73] mt-1">
                        Meetup: <strong className="text-[#1D1D1F]">{grp.meetupPoint || "To be decided"}</strong> at <strong className="text-[#1D1D1F]">{grp.meetupTime || "To be decided"}</strong>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {grp.members.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#D2D2D7]/60 text-[#1D1D1F]"
                          >
                            {m.firstName} ({m.pickupArea})
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isJoining}
                      onClick={() => handleJoinGroup(grp.id)}
                      className="px-5 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-all shadow-xs self-start sm:self-center shrink-0 disabled:opacity-60"
                    >
                      {isJoining ? "Joining..." : "Join group"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-[#6E6E73] text-[14px] bg-[#F5F5F7] rounded-2xl border border-[#D2D2D7]/40">
                No open groups started yet for this center. Tap <strong>Start a travel group</strong> above to create one!
              </div>
            )}
          </div>
        ) : null}

        {/* SECTION 3: People Going to Your Center (Strictly First Name & Pickup Area) */}
        {ticket && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]/40">
              <div>
                <h2 className="text-[19px] font-semibold text-[#1D1D1F]">
                  People going to your center
                </h2>
                <p className="text-[13px] text-[#6E6E73] mt-0.5">
                  Classmates attending <strong className="text-[#1D1D1F]">{ticket.exam_center}</strong> on <strong className="text-[#1D1D1F]">{ticket.exam_date}</strong> ({ticket.session}).
                </p>
              </div>
              <span className="text-[12px] font-medium px-3 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#D2D2D7]/60">
                {centerStudents.length} classmates
              </span>
            </div>

            {centerStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {centerStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7]/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-[14px] text-[#1D1D1F]">
                        {st.firstName}
                      </div>
                      <div className="text-[12px] text-[#6E6E73] mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#0071E3]" />
                        <span>{st.pickupArea}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[#6E6E73] text-[14px] bg-[#F5F5F7] rounded-2xl border border-[#D2D2D7]/40">
                No other students have confirmed for this center and session yet.
              </div>
            )}
          </div>
        )}
      </main>

      <SignInSheet
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={() => {
          setIsSignInOpen(false);
          setLoading(true);
          loadDashboard();
        }}
      />
    </div>
  );
}
