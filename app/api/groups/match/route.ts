import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runMatchingAgent } from "@/lib/agents/matching-agent";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabase();

    // 1. Fetch student's confirmed ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("id, exam_center, exam_date, session, course_name")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return NextResponse.json(
        { error: "No confirmed hall ticket found. Please upload your ticket first." },
        { status: 400 }
      );
    }

    // 2. Run Matching Agent
    const matchingResult = await runMatchingAgent(user.userId, {
      exam_center: ticket.exam_center,
      exam_date: ticket.exam_date,
      session: ticket.session as "Forenoon" | "Afternoon",
    });

    return NextResponse.json({
      success: true,
      ticket,
      group: matchingResult,
    });
  } catch (error) {
    console.error("Match route error:", error);
    return NextResponse.json(
      { error: "Failed to run matching agent. Please try again." },
      { status: 500 }
    );
  }
}
