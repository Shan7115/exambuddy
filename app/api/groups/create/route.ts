import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "@/lib/agents/center-matcher";
import { postSystemMessage } from "@/lib/agents/coordinator-agent";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { examCenter, examDate, session } = body;

    if (!examCenter?.trim() || !examDate?.trim()) {
      return NextResponse.json(
        { error: "Exam center and exam date are required to start a group." },
        { status: 400 }
      );
    }

    const canonicalCenter = matchToCanonicalCenter(examCenter);
    const normalizedSession =
      String(session || "").toLowerCase().includes("after") ? "Afternoon" : "Forenoon";

    const supabase = getAdminSupabase();

    // Check if user is already in a group for this center/date/session
    // First, remove user from any existing conflicting group for this center/date
    const { data: currentMemberships } = await supabase
      .from("group_members")
      .select("group_id, groups(exam_center, exam_date, session)")
      .eq("user_id", user.userId);

    if (currentMemberships && currentMemberships.length > 0) {
      for (const m of currentMemberships) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", m.group_id)
          .eq("user_id", user.userId);

        const firstName = user.name.split(" ")[0];
        await postSystemMessage(m.group_id, `${firstName} left the group.`);
      }
    }

    // Create new group
    const { data: newGroup, error: groupErr } = await supabase
      .from("groups")
      .insert({
        exam_center: canonicalCenter.name,
        exam_date: examDate.trim(),
        session: normalizedSession,
        meetup_point: null,
        meetup_time: null,
        transport: null,
        est_total_cost: 0,
      })
      .select("id")
      .single();

    if (groupErr || !newGroup) {
      throw new Error("Could not create travel group.");
    }

    // Add user as member
    await supabase.from("group_members").insert({
      group_id: newGroup.id,
      user_id: user.userId,
    });

    const firstName = user.name.split(" ")[0];
    await postSystemMessage(newGroup.id, `${firstName} started the travel group.`);

    return NextResponse.json({
      success: true,
      groupId: newGroup.id,
      message: "Travel group started successfully.",
    });
  } catch (error: any) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start travel group." },
      { status: 500 }
    );
  }
}
