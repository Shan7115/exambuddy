"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Search,
  Compass,
  MapPin,
  Calendar,
  Clock,
  Users2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  CANONICAL_EXAM_CENTERS,
  DEFAULT_EXAM_DATE,
} from "@/lib/constants/demo-data";
import { SignInSheet } from "@/components/SignInSheet";
import type { SessionUser } from "@/lib/auth/session";

interface MatchedStudent {
  id: string;
  firstName: string;
  pickupArea: string;
  center: string;
}

interface MatchedGroup {
  id: string;
  examCenter: string;
  examDate: string;
  session: string;
  meetupPoint: string | null;
  meetupTime: string | null;
  memberCount: number;
  members: Array<{ firstName: string; pickupArea: string }>;
  isUserMember: boolean;
}

export default function ExploreTravelPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Form states
  const [centerInput, setCenterInput] = useState("");
  const [examDate, setExamDate] = useState(DEFAULT_EXAM_DATE);
  const [session, setSession] = useState("all");

  // Search results
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [students, setStudents] = useState<MatchedStudent[]>([]);
  const [groups, setGroups] = useState<MatchedGroup[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Action states
  const [isStartingGroup, setIsStartingGroup] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  // Center suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Execute search
  const handleSearch = async (e?: React.FormEvent, overrideCenter?: string) => {
    if (e) e.preventDefault();
    const queryCenter = overrideCenter !== undefined ? overrideCenter : centerInput;
    if (!queryCenter.trim()) {
      setErrorMsg("Please enter or select an exam center name.");
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    setShowSuggestions(false);

    try {
      const params = new URLSearchParams({
        center: queryCenter.trim(),
        date: examDate.trim(),
        session,
      });

      const res = await fetch(`/api/explore?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Search failed.");
      } else {
        setStudents(data.students || []);
        setGroups(data.groups || []);
        setHasSearched(true);
      }
    } catch {
      setErrorMsg("Network error searching travel options.");
    } finally {
      setIsSearching(false);
    }
  };

  // Start group for this center & date
  const handleStartGroup = async () => {
    if (!user) {
      setIsSignInOpen(true);
      return;
    }
    if (!centerInput.trim()) return;
    setIsStartingGroup(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examCenter: centerInput.trim(),
          examDate: examDate.trim(),
          session: session === "Afternoon" ? "Afternoon" : "Forenoon",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not start group.");
        setIsStartingGroup(false);
      } else {
        router.push(`/groups/${data.groupId}`);
      }
    } catch {
      setErrorMsg("Network error while starting group.");
      setIsStartingGroup(false);
    }
  };

  // Join group
  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      setIsSignInOpen(true);
      return;
    }
    setJoiningGroupId(groupId);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not join group.");
        setJoiningGroupId(null);
      } else {
        router.push(`/groups/${groupId}`);
      }
    } catch {
      setErrorMsg("Network error while joining group.");
      setJoiningGroupId(null);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
      </div>
    );
  }

  // Filtered suggestions based on user input
  const filteredSuggestions = CANONICAL_EXAM_CENTERS.filter((c) =>
    c.name.toLowerCase().includes(centerInput.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Navbar
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onSignOut={async () => {
          await fetch("/api/auth/signout", { method: "POST" });
          setUser(null);
        }}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Trip</span>
          </Link>
        </div>

        {/* Page Title */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[12px] font-semibold uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5" />
            Explore Travel Options
          </div>
          <h1 className="text-[30px] sm:text-[38px] font-semibold tracking-tight text-[#1D1D1F]">
            Find travel options by exam center
          </h1>
          <p className="text-[15px] text-[#6E6E73] mt-1">
            Search by exam center name to find classmates traveling there and open groups.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs space-y-5">
          <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
            {/* Center Input with Suggestions */}
            <div className="relative">
              <label htmlFor="centerInput" className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                Exam center name (type any center or select from suggestions)
              </label>
              <div className="relative">
                <input
                  id="centerInput"
                  type="text"
                  value={centerInput}
                  onChange={(e) => {
                    setCenterInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g. iON Digital Zone Kovai Pudur, SKCET, KGiSL..."
                  required
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#D2D2D7] bg-white text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
                <Search className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-4" />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-2xl border border-[#D2D2D7]/80 shadow-lg overflow-hidden py-1">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                    Common Coimbatore Centers
                  </div>
                  {filteredSuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCenterInput(c.name);
                        setShowSuggestions(false);
                        handleSearch(undefined, c.name);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] text-[13px] text-[#1D1D1F] flex items-center justify-between"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[11px] text-[#6E6E73]">{c.city}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Select Center Chips */}
              <div className="mt-3">
                <span className="text-[11px] font-medium text-[#6E6E73] block mb-1.5">
                  Or select a supported exam center:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CANONICAL_EXAM_CENTERS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCenterInput(c.name);
                        setShowSuggestions(false);
                        handleSearch(undefined, c.name);
                      }}
                      className={`text-[12px] px-3 py-1 rounded-full border transition-all ${
                        centerInput === c.name
                          ? "bg-[#0071E3] text-white border-[#0071E3] shadow-xs"
                          : "bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] border-[#D2D2D7]/60"
                      }`}
                    >
                      {c.shortName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date & Session */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="examDate" className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                  Exam date
                </label>
                <div className="relative">
                  <input
                    id="examDate"
                    type="text"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    placeholder="2026-11-15"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[14px] font-mono text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                  <Calendar className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="sessionFilter" className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                  Exam session (optional)
                </label>
                <select
                  id="sessionFilter"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                >
                  <option value="all">All sessions</option>
                  <option value="Forenoon">Forenoon (FN)</option>
                  <option value="Afternoon">Afternoon (AN)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full h-12 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching classmates and groups...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search travel options</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-[13px] text-red-900 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* RESULTS SECTION */}
        {hasSearched && (
          <div className="space-y-8">
            {/* Open Travel Groups */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D2D2D7]/40">
                <div>
                  <h2 className="text-[20px] font-semibold text-[#1D1D1F]">
                    Open travel groups ({groups.length})
                  </h2>
                  <p className="text-[13px] text-[#6E6E73] mt-0.5">
                    Groups created by students traveling to this center.
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
                      Starting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Start a travel group</span>
                    </>
                  )}
                </button>
              </div>

              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((grp) => (
                    <div
                      key={grp.id}
                      className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#D2D2D7]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-[15px] font-semibold text-[#1D1D1F] flex items-center gap-2">
                          <Users2 className="w-4 h-4 text-[#0071E3]" />
                          <span>{grp.examCenter}</span>
                          <span className="text-[12px] font-normal text-[#6E6E73]">
                            ({grp.session})
                          </span>
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

                      {grp.isUserMember ? (
                        <Link
                          href={`/groups/${grp.id}`}
                          className="px-5 py-2 rounded-full bg-[#34C759] text-white text-[13px] font-medium transition-all shadow-xs self-start sm:self-center shrink-0"
                        >
                          Open Group Room
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={joiningGroupId === grp.id}
                          onClick={() => handleJoinGroup(grp.id)}
                          className="px-5 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-all shadow-xs self-start sm:self-center shrink-0 disabled:opacity-60"
                        >
                          {joiningGroupId === grp.id ? "Joining..." : "Join group"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#6E6E73] text-[14px] bg-[#F5F5F7] rounded-2xl border border-[#D2D2D7]/40">
                  No open groups found yet for this center. You can start the first travel group above!
                </div>
              )}
            </div>

            {/* Matching Students */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D2D2D7]/70 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#D2D2D7]/40">
                <h2 className="text-[19px] font-semibold text-[#1D1D1F]">
                  Students going to this center ({students.length})
                </h2>
                <p className="text-[13px] text-[#6E6E73] mt-0.5">
                  Classmates with confirmed tickets matching this center venue.
                </p>
              </div>

              {students.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {students.map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7]/60"
                    >
                      <div className="font-semibold text-[14px] text-[#1D1D1F]">
                        {st.firstName}
                      </div>
                      <div className="text-[12px] text-[#6E6E73] mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#0071E3]" />
                        <span>{st.pickupArea}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#6E6E73] text-[14px] bg-[#F5F5F7] rounded-2xl border border-[#D2D2D7]/40">
                  No other students found for this center and date yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sign-in Sheet Dialog */}
      <SignInSheet
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={(signedInUser) => {
          setUser(signedInUser);
          setIsSignInOpen(false);
        }}
      />
    </div>
  );
}
