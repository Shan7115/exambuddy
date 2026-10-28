"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

export interface AgentEventItem {
  id: string;
  agent: string;
  message: string;
  status: "running" | "done" | "failed" | string;
  created_at: string;
}

interface AgentActivityPanelProps {
  initialEvents: AgentEventItem[];
  userId: string;
  groupId: string | null;
}

export function AgentActivityPanel({
  initialEvents,
  userId,
  groupId,
}: AgentActivityPanelProps) {
  const [events, setEvents] = useState<AgentEventItem[]>(initialEvents);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isLive, setIsLive] = useState(true);

  // Sync initial events
  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Realtime subscription + 2-second polling fallback
  useEffect(() => {
    let isSubscribed = false;

    // 1. Supabase Realtime channel
    const channel = supabaseClient
      .channel("agent-events-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_events",
        },
        (payload) => {
          const newEvent = payload.new as AgentEventItem;
          setEvents((prev) => {
            if (prev.some((e) => e.id === newEvent.id)) return prev;
            return [newEvent, ...prev].slice(0, 25);
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          isSubscribed = true;
          setIsLive(true);
        } else {
          isSubscribed = false;
        }
      });

    // 2. Fallback polling every 2 seconds if realtime is disconnected or missed
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabaseClient
          .from("agent_events")
          .select("id, agent, message, status, created_at, group_id, user_id")
          .or(`user_id.eq.${userId}${groupId ? `,group_id.eq.${groupId}` : ""}`)
          .order("created_at", { ascending: false })
          .limit(15);

        if (data && data.length > 0) {
          setEvents((prev) => {
            // Check if there are new events
            if (data[0].id !== prev[0]?.id || data.length !== prev.length) {
              return data as AgentEventItem[];
            }
            return prev;
          });
        }
      } catch {
        // Silently continue
      }
    }, 2500);

    return () => {
      supabaseClient.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [userId, groupId]);

  const getAgentColor = (agent: string) => {
    if (agent.toLowerCase().includes("intake")) return "bg-blue-50 text-[#0071E3] border-blue-200/80";
    if (agent.toLowerCase().includes("matching")) return "bg-purple-50 text-purple-700 border-purple-200/80";
    return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  };

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* Mobile Accordion Toggle Strip */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-[#D2D2D7]/70 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-[14px] font-semibold text-[#1D1D1F]">
              Live Agent Activity ({events.length})
            </span>
          </div>
          {isOpenMobile ? (
            <ChevronUp className="w-4 h-4 text-[#6E6E73]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
          )}
        </button>
      </div>

      {/* Main Panel Content (Always visible on desktop, toggleable on mobile) */}
      <div
        className={`bg-white rounded-3xl border border-[#D2D2D7]/70 p-5 shadow-xs transition-all ${
          isOpenMobile ? "block" : "hidden lg:block"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D2D2D7]/50 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                Agent Activity
              </h3>
              <p className="text-[11px] text-[#6E6E73]">Live autonomous event log</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] border border-[#D2D2D7]/60">
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-[11px] font-medium text-[#6E6E73]">Live stream</span>
          </div>
        </div>

        {/* Events Feed */}
        {events.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[#6E6E73]">
            No recent agent events. Actions will stream here automatically.
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-2xl bg-[#FBFBFD] border border-[#D2D2D7]/50 hover:bg-[#F5F5F7] transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getAgentColor(
                      evt.agent
                    )}`}
                  >
                    {evt.agent}
                  </span>

                  <span className="text-[11px] font-mono text-[#6E6E73]">
                    {formatTime(evt.created_at)}
                  </span>
                </div>

                <div className="text-[13px] text-[#1D1D1F] leading-snug">
                  {evt.message}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  {evt.status === "running" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0071E3]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running
                    </span>
                  )}
                  {evt.status === "done" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34C759]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      Complete
                    </span>
                  )}
                  {evt.status === "failed" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF3B30]">
                      <AlertCircle className="w-3 h-3" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
