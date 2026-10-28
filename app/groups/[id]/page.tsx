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
  Car,
  IndianRupee,
  ExternalLink,
  Send,
  Bot,
  Users2,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  CheckCheck,
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
  meetup_point: string;
  meetup_time: string;
  transport: string;
  est_total_cost: number;
  perPersonCost: number;
  memberCount: number;
  canonicalCenter?: {
    shortName: string;
    googleMapsUrl: string;
  };
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
          // Avoid duplicating optimistic message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const isCurrent = user ? newMsg.user_id === user.userId : false;
            let senderName = "Classmate";
            if (newMsg.is_bot) senderName = "Coordinator Bot";
            else if (isCurrent) senderName = user?.name.split(" ")[0] || "You";
            else {
              const matchedMember = members.find((m) => m.id === newMsg.user_id);
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
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          // Refresh member list and cost split
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
          setGroup(data.group);
          setMembers(data.members || []);
          setMessages((prev) => {
            if (data.messages?.length > prev.length) {
              return data.messages;
            }
            return prev;
          });
        }
      } catch {
        // Continue silently
      }
    }, 2500);

    return () => {
      supabaseClient.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [groupId, user, members, loadGroupData, scrollToBottom]);

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
        // Rollback optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(data.error || "Failed to send message.");
      } else {
        // Replace optimistic message with server acknowledged message
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
    try {
      await fetch(`/api/groups/${groupId}/reminder`, { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsBotLoading(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
          <span className="text-[14px] text-[#6E6E73] font-medium">
            Entering group room...
          </span>
        </div>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    group.meetup_point || group.exam_center
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD] text-[#1D1D1F]">
      <Navbar user={user} onOpenSignIn={() => {}} onSignOut={() => router.push("/")} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex flex-col">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D2D2D7]/50 mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRequestReminder}
              disabled={isBotLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0071E3] hover:bg-blue-100 text-[12px] font-medium border border-blue-200 transition-colors disabled:opacity-60 min-h-[36px]"
              title="Ask Coordinator Bot to post exam reminder summary"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isBotLoading ? "Posting..." : "Ask Bot Reminder"}</span>
            </button>
          </div>
        </div>

        {/* TOP TRIP PLAN CARD (with Maps link and Live Per-Person Split) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D2D2D7]/70 shadow-xs mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D2D2D7]/40 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                  NPTEL Travel Squad
                </span>
              </div>
              <h1 className="text-[19px] sm:text-[22px] font-semibold text-[#1D1D1F] mt-0.5">
                {group.canonicalCenter?.shortName || group.exam_center} ({group.session})
              </h1>
            </div>

            {/* Live Per-Person Split Callout */}
            <div className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-right">
              <div className="text-[10px] font-semibold text-[#0071E3] uppercase tracking-wider">
                Live Per-Person Split
              </div>
              <div className="text-[20px] font-bold text-[#0071E3] flex items-center justify-end">
                <IndianRupee className="w-4 h-4" />
                <span>{group.perPersonCost}</span>
                <span className="text-[11px] text-[#6E6E73] font-normal ml-1">
                  ({group.memberCount} students)
                </span>
              </div>
            </div>
          </div>

          {/* Trip Logistics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
            {/* Meetup Point with Maps Link */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#6E6E73]">
                  Meetup Location
                </div>
                <div className="font-semibold text-[#1D1D1F] line-clamp-1">
                  {group.meetup_point || "Karunya Nagar Campus Gate"}
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0071E3] hover:underline mt-0.5"
                >
                  Open in Google Maps
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            {/* Meetup Time */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#6E6E73]">
                  Meetup Time
                </div>
                <div className="font-semibold text-[#1D1D1F]">
                  {group.meetup_time || "06:45 AM"}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-0.5">
                  45m buffer prior to reporting
                </div>
              </div>
            </div>

            {/* Transport & Total Fare */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#6E6E73]">
                  Vehicle & Total Fare
                </div>
                <div className="font-semibold text-[#1D1D1F] line-clamp-1">
                  {group.transport}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-0.5">
                  Total est. ₹{group.est_total_cost}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SQUAD MEMBER AVATARS STRIP */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
          <div className="text-[12px] font-semibold text-[#6E6E73] shrink-0 mr-1 flex items-center gap-1">
            <Users2 className="w-3.5 h-3.5" />
            <span>Squad ({members.length}):</span>
          </div>

          {members.map((m) => (
            <div
              key={m.id}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border ${
                m.isCurrentUser
                  ? "bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/30 font-medium"
                  : "bg-white text-[#1D1D1F] border-[#D2D2D7]/60"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white ${
                  m.isCurrentUser ? "bg-[#0071E3]" : "bg-neutral-600"
                }`}
              >
                {m.firstName[0]}
              </div>
              <span>{m.firstName}</span>
              {m.isCurrentUser && <span className="text-[10px] opacity-75">(You)</span>}
            </div>
          ))}
        </div>

        {/* REALTIME CHAT ROOM */}
        <div className="flex-1 bg-white rounded-3xl border border-[#D2D2D7]/70 shadow-xs flex flex-col overflow-hidden min-h-[460px]">
          {/* Messages Scroll Area */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4"
          >
            {messages.length === 0 ? (
              <div className="py-12 text-center text-[#6E6E73] text-[13px]">
                Welcome to your travel squad! Say hello to your classmates or ask the Coordinator Bot for assistance.
              </div>
            ) : (
              messages.map((msg) => {
                // Style 1: Coordinator Bot Message
                if (msg.isBot) {
                  return (
                    <div
                      key={msg.id}
                      className="w-full bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 text-[#1D1D1F] shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-blue-200/50">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                            <Bot className="w-3 h-3" />
                          </div>
                          <span className="text-[12px] font-semibold text-[#0071E3]">
                            Coordinator Bot
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0071E3]/15 text-[#0071E3] font-medium">
                            Verified AI Agent
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-[#6E6E73]">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap">
                        {msg.body}
                      </div>
                    </div>
                  );
                }

                // Style 2: Current Student Message (Right-aligned, Apple blue)
                if (msg.isCurrentUser) {
                  return (
                    <div key={msg.id} className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#6E6E73]">
                        <span>You</span>
                        <span>•</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="bg-[#0071E3] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-[14px] max-w-[80%] sm:max-w-[70%] leading-snug shadow-xs flex items-center gap-2">
                        <span>{msg.body}</span>
                        {msg.isOptimistic && (
                          <Loader2 className="w-3 h-3 animate-spin opacity-75 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                }

                // Style 3: Classmate Message (Left-aligned, soft surface)
                return (
                  <div key={msg.id} className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#6E6E73]">
                      <span className="font-semibold text-[#1D1D1F]">{msg.senderName}</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="bg-[#F5F5F7] text-[#1D1D1F] border border-[#D2D2D7]/50 rounded-2xl rounded-tl-xs px-4 py-2.5 text-[14px] max-w-[80%] sm:max-w-[70%] leading-snug">
                      {msg.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chat Action Chips */}
          <div className="px-4 py-2 bg-[#FBFBFD] border-t border-[#D2D2D7]/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setInputText("What is our current meetup time and fare split?");
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#D2D2D7]/70 text-[11px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
            >
              "What is our meetup time?"
            </button>
            <button
              type="button"
              onClick={() => {
                setInputText("I will meet everyone at Karunya campus gate.");
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#D2D2D7]/70 text-[11px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
            >
              "I'll meet at campus gate"
            </button>
            <button
              type="button"
              onClick={handleRequestReminder}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#D2D2D7]/70 text-[11px] text-[#0071E3] hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Bot className="w-3 h-3" />
              <span>Ask bot for summary</span>
            </button>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 bg-white border-t border-[#D2D2D7]/50 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message your travel squad or ask @bot for details..."
              className="flex-1 h-11 px-4 rounded-full border border-[#D2D2D7] bg-[#FBFBFD] text-[14px] text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-11 h-11 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 min-h-[44px] min-w-[44px]"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
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
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#0071E3] animate-spin" />
            <span className="text-[14px] text-[#6E6E73] font-medium">Entering group room...</span>
          </div>
        </div>
      }
    >
      <GroupRoomContent />
    </React.Suspense>
  );
}
