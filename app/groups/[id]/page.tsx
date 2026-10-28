"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { supabaseClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Send,
  Bot,
  Users2,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Edit2,
  DoorOpen,
  Calendar,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

interface ChatMessage {
  id: string;
  groupId: string;
  userId: string | null;
  isBot: boolean;
  body: string;
  createdAt: string;
  senderName: string;
  isCurrentUser: boolean;
  isOptimistic?: boolean;
}

interface GroupDetails {
  id: string;
  exam_center: string;
  exam_date: string;
  session: string;
  meetup_point: string | null;
  meetup_time: string | null;
  memberCount: number;
  isMember: boolean;
}

interface MemberItem {
  id: string;
  name: string;
  firstName: string;
  pickupArea: string;
  isCurrentUser: boolean;
}

function GroupRoomContent() {
  const router = useRouter();
  const rawParams = useParams();
  const groupId = rawParams?.id as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);

  // Meetup editing state
  const [isEditingMeetup, setIsEditingMeetup] = useState(false);
  const [editMeetupPoint, setEditMeetupPoint] = useState("");
  const [editMeetupTime, setEditMeetupTime] = useState("");
  const [isSavingMeetup, setIsSavingMeetup] = useState(false);

  // Meetup suggestions state
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string }> | null>(null);

  // Leaving group state
  const [isLeaving, setIsLeaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Fetch initial group room data
  const loadGroupData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }

      setGroup(data.group);
      setMembers(data.members || []);
      setMessages(data.messages || []);
      setUser(data.currentUser);

      if (data.group) {
        setEditMeetupPoint(data.group.meetup_point || "");
        setEditMeetupTime(data.group.meetup_time || "");
      }
    } catch (err) {
      console.error("Load group error:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // Scroll on message updates
  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  const userRef = useRef(user);
  userRef.current = user;

  const membersRef = useRef(members);
  membersRef.current = members;

  // Realtime subscription + 2-second polling fallback on messages & membership
  useEffect(() => {
    const channel = supabaseClient
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const currentUser = userRef.current;
            const currentMembers = membersRef.current;
            const isCurrent = currentUser ? newMsg.user_id === currentUser.userId : false;
            let senderName = "Classmate";
            if (newMsg.is_bot) {
              senderName = "System";
            } else if (isCurrent) {
              senderName = currentUser?.name.split(" ")[0] || "You";
            } else {
              const matchedMember = currentMembers.find((m) => m.id === newMsg.user_id);
              if (matchedMember) senderName = matchedMember.firstName;
            }

            return [
              ...prev.filter((m) => !m.isOptimistic || m.body !== newMsg.body),
              {
                id: newMsg.id,
                groupId: newMsg.group_id,
                userId: newMsg.user_id,
                isBot: newMsg.is_bot,
                body: newMsg.body,
                createdAt: newMsg.created_at,
                senderName,
                isCurrentUser: isCurrent,
              },
            ];
          });
          scrollToBottom(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated) {
            setGroup((prev) => (prev ? { ...prev, ...updated } : null));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          loadGroupData();
        }
      )
      .subscribe();

    // 2-second fallback polling interval
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (res.ok) {
          const data = await res.json();
          setGroup((prev) => {
            if (
              prev?.meetup_point === data.group?.meetup_point &&
              prev?.meetup_time === data.group?.meetup_time &&
              prev?.memberCount === data.group?.memberCount
            ) {
              return prev;
            }
            return data.group;
          });
          setMembers((prev) => {
            const nextM = data.members || [];
            if (prev.length === nextM.length && prev.every((m, i) => m.id === nextM[i]?.id)) {
              return prev;
            }
            return nextM;
          });
          setMessages((prev) => {
            if (data.messages?.length > prev.length) {
              return data.messages;
            }
            return prev;
          });
        }
      } catch {
        // Silent polling catch
      }
    }, 2000);

    return () => {
      supabaseClient.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [groupId, loadGroupData, scrollToBottom]);

  // Handle Send Message (Optimistic UI)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText("");

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      groupId,
      userId: user?.userId || null,
      isBot: false,
      body: text,
      createdAt: new Date().toISOString(),
      senderName: user?.name.split(" ")[0] || "You",
      isCurrentUser: true,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom(true);
    setIsSending(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(data.error || "Failed to send message.");
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...data.message, isOptimistic: false } : m))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // Request Bot Reminder Summary
  const handleRequestReminder = async () => {
    setIsBotLoading(true);
    setBotError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/reminder`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setBotError(data.error || "Could not generate reminder summary.");
      }
    } catch (err: any) {
      setBotError(err.message || "Network error requesting reminder.");
    } finally {
      setIsBotLoading(false);
    }
  };

  // Save Meetup Point and Time
  const handleSaveMeetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMeetup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/meetup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetupPoint: editMeetupPoint.trim(),
          meetupTime: editMeetupTime.trim(),
        }),
      });

      if (res.ok) {
        setGroup((prev) =>
          prev
            ? {
                ...prev,
                meetup_point: editMeetupPoint.trim(),
                meetup_time: editMeetupTime.trim(),
              }
            : null
        );
        setIsEditingMeetup(false);
      }
    } catch (err) {
      console.error("Save meetup error:", err);
    } finally {
      setIsSavingMeetup(false);
    }
  };

  // Suggest Meetup Spots with Gemini
  const handleSuggestSpots = async () => {
    setIsSuggesting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/suggest-meetup`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Suggest spots error:", err);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this travel group?")) return;
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
      });
      if (res.ok) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setIsLeaving(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
          <span className="text-[14px] text-[#6E6E73] font-medium">Entering group room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Navbar user={user} onOpenSignIn={() => {}} onSignOut={() => router.push("/")} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex flex-col">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D2D2D7]/50 mb-4 flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Ask Bot Reminder Button */}
            <button
              type="button"
              onClick={handleRequestReminder}
              disabled={isBotLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0071E3] hover:bg-blue-100 text-[12px] font-medium border border-blue-200 transition-colors disabled:opacity-60 min-h-[36px]"
              title="Post trip reminder summary in chat"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isBotLoading ? "Posting..." : "Ask Bot"}</span>
            </button>

            {/* Leave Group Button */}
            <button
              type="button"
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-red-50 text-[#FF3B30] text-[12px] font-medium border border-red-200 transition-colors disabled:opacity-60 min-h-[36px]"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>{isLeaving ? "Leaving..." : "Leave group"}</span>
            </button>
          </div>
        </div>

        {/* Bot Error Notice */}
        {botError && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-3 text-[12px] text-red-900 flex items-center justify-between">
            <span>{botError}</span>
            <button onClick={() => setBotError(null)} className="underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Group Details & Meetup Coordinator Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D2D2D7]/70 shadow-xs mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D2D2D7]/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider">
                  Travel Group
                </span>
              </div>
              <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#1D1D1F] mt-0.5">
                {group.exam_center}
              </h1>
              <div className="text-[12px] text-[#6E6E73] mt-0.5 flex items-center gap-2">
                <span>{group.exam_date}</span>
                <span>•</span>
                <span>{group.session} Session</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingMeetup(!isEditingMeetup)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] text-[12px] font-medium border border-[#D2D2D7]/60 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>{isEditingMeetup ? "Close edit" : "Edit meetup"}</span>
              </button>

              <button
                type="button"
                onClick={handleSuggestSpots}
                disabled={isSuggesting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0071E3] text-[12px] font-medium border border-blue-200 transition-colors disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSuggesting ? "Suggesting..." : "Suggest meetup spots"}</span>
              </button>
            </div>
          </div>

          {/* Editable Meetup Form */}
          {isEditingMeetup ? (
            <form onSubmit={handleSaveMeetup} className="bg-[#F5F5F7] rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="editMeetupPoint" className="block text-[11px] font-medium text-[#1D1D1F] mb-1">
                    Meetup point (visible to all members)
                  </label>
                  <input
                    id="editMeetupPoint"
                    type="text"
                    value={editMeetupPoint}
                    onChange={(e) => setEditMeetupPoint(e.target.value)}
                    placeholder="e.g. Karunya Nagar Campus Gate"
                    className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label htmlFor="editMeetupTime" className="block text-[11px] font-medium text-[#1D1D1F] mb-1">
                    Meetup time
                  </label>
                  <input
                    id="editMeetupTime"
                    type="text"
                    value={editMeetupTime}
                    onChange={(e) => setEditMeetupTime(e.target.value)}
                    placeholder="e.g. 07:00 AM"
                    className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingMeetup(false)}
                  className="px-3 py-1.5 rounded-full text-[12px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMeetup}
                  className="px-4 py-1.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-medium disabled:opacity-60"
                >
                  {isSavingMeetup ? "Saving..." : "Save details"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              <div className="bg-[#F5F5F7] p-3 rounded-2xl border border-[#D2D2D7]/50 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#6E6E73] text-[11px] block">Meetup point</span>
                  <span className="font-semibold text-[#1D1D1F]">
                    {group.meetup_point || "To be decided by members"}
                  </span>
                </div>
              </div>

              <div className="bg-[#F5F5F7] p-3 rounded-2xl border border-[#D2D2D7]/50 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#6E6E73] text-[11px] block">Meetup time</span>
                  <span className="font-semibold text-[#1D1D1F]">
                    {group.meetup_time || "To be decided by members"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Meetup Suggestions (No prices) */}
          {suggestions && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#0071E3] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Meetup Suggestions (No prices)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuggestions(null)}
                  className="text-[11px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEditMeetupPoint(s.title);
                      setIsEditingMeetup(true);
                      setSuggestions(null);
                    }}
                    className="text-left p-2.5 rounded-xl bg-white border border-blue-200/60 hover:border-[#0071E3] transition-all text-[12px] shadow-2xs"
                  >
                    <div className="font-semibold text-[#1D1D1F]">{s.title}</div>
                    <div className="text-[11px] text-[#6E6E73] mt-0.5 line-clamp-2">
                      {s.description}
                    </div>
                    <div className="text-[10px] text-[#0071E3] font-medium mt-1">Tap to use spot</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group Members Pill Bar */}
          <div className="pt-2 border-t border-[#D2D2D7]/40 flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-[#6E6E73] flex items-center gap-1">
              <Users2 className="w-3.5 h-3.5" /> Members ({members.length}):
            </span>
            {members.map((m) => (
              <span
                key={m.id}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#F5F5F7] border border-[#D2D2D7]/60 text-[#1D1D1F]"
              >
                <strong>{m.firstName}</strong> ({m.pickupArea})
                {m.isCurrentUser && <span className="ml-1 text-[#0071E3] font-bold">• You</span>}
              </span>
            ))}
          </div>
        </div>

        {/* CHAT MESSAGES CONTAINER */}
        <div className="flex-1 bg-white rounded-3xl border border-[#D2D2D7]/70 shadow-xs flex flex-col overflow-hidden min-h-[380px]">
          {/* Chat Messages Scrollable Area */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 max-h-[500px]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16 text-center text-[#6E6E73]">
                <Users2 className="w-8 h-8 text-[#0071E3]/50 mb-2" />
                <div className="text-[15px] font-semibold text-[#1D1D1F]">No messages yet</div>
                <p className="text-[13px] text-[#6E6E73] max-w-xs mt-1">
                  Say hello to your travel group members! Live chat updates automatically.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                // System notification pill
                if (msg.isBot) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#D2D2D7]/60 text-[11px] font-medium max-w-md text-center leading-relaxed whitespace-pre-line shadow-2xs">
                        <span>{msg.body}</span>
                      </div>
                    </div>
                  );
                }

                // Member chat bubbles
                const isMe = msg.isCurrentUser;
                const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-medium text-[#6E6E73]">
                        {isMe ? "You" : msg.senderName}
                      </span>
                      <span className="text-[10px] text-[#8E8E93]">{timeString}</span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-2xs ${
                        isMe
                          ? "bg-[#0071E3] text-white rounded-br-xs"
                          : "bg-[#F5F5F7] text-[#1D1D1F] rounded-bl-xs border border-[#D2D2D7]/50"
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Message Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-[#D2D2D7]/50 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message to group..."
              disabled={isSending}
              className="flex-1 h-11 px-4 rounded-full border border-[#D2D2D7] bg-[#FBFBFD] text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-11 h-11 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function GroupRoomPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
          <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
        </div>
      }
    >
      <GroupRoomContent />
    </React.Suspense>
  );
}
