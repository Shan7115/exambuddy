import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "@/lib/agents/center-matcher";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { courseName, examCenter, examDate, session, extractedJson } = body;

    if (!courseName?.trim() || !examCenter?.trim() || !examDate?.trim()) {
      return NextResponse.json(
        { error: "Course name, exam center, and exam date are required." },
        { status: 400 }
      );
    }

    const canonicalCenter = matchToCanonicalCenter(examCenter);
    const normalizedSession =
      session === "Afternoon" ? "Afternoon" : "Forenoon";

    const supabase = getAdminSupabase();

    // Check if user already has a ticket
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("user_id", user.userId)
      .maybeSingle();

    let ticketId: string;

    if (existingTicket) {
      const { data, error } = await supabase
        .from("tickets")
        .update({
          course_name: courseName.trim(),
          exam_center: canonicalCenter.name,
          exam_date: examDate.trim(),
          session: normalizedSession,
          extracted_json: extractedJson || {},
        })
        .eq("id", existingTicket.id)
        .select()
        .single();

      if (error) throw error;
      ticketId = data.id;
    } else {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          user_id: user.userId,
          course_name: courseName.trim(),
          exam_center: canonicalCenter.name,
          exam_date: examDate.trim(),
          session: normalizedSession,
          extracted_json: extractedJson || {},
        })
        .select()
        .single();

      if (error) throw error;
      ticketId = data.id;
    }

    // Log confirmation agent event
    await supabase.from("agent_events").insert({
      user_id: user.userId,
      agent: "Intake agent",
      message: `Hall ticket confirmed for ${canonicalCenter.shortName} (${normalizedSession}). Ready for classmate matching.`,
      status: "done",
    });

    return NextResponse.json({
      success: true,
      ticketId,
      canonicalCenter,
      message: "Ticket details confirmed.",
    });
  } catch (error) {
    console.error("Ticket confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to save confirmed ticket." },
      { status: 500 }
    );
  }
}
