import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "@/lib/agents/center-matcher";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabase();

    // Fetch student's confirmed ticket
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

    const canonical = matchToCanonicalCenter(ticket.exam_center);

    // Return matching classmates going to the same center, date, session (Opt-in only, no auto group creation)
    const { data: matchingTickets } = await supabase
      .from("tickets")
      .select("user_id, users(id, name, pickup_area)")
      .eq("exam_center", canonical.name)
      .eq("exam_date", ticket.exam_date)
      .eq("session", ticket.session);

    const centerStudents = (matchingTickets || [])
      .filter((t: any) => t.users && t.users.id !== user.userId)
      .map((t: any) => ({
        id: t.users.id,
        firstName: (t.users.name || "Student").split(" ")[0],
        pickupArea: t.users.pickup_area || "Karunya Nagar",
      }));

    return NextResponse.json({
      success: true,
      ticket,
      centerStudents,
      canonicalCenter: canonical,
    });
  } catch (error) {
    console.error("Match route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch matching classmates." },
      { status: 500 }
    );
  }
}
