import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { postSystemMessage } from "@/lib/agents/coordinator-agent";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const supabase = getAdminSupabase();

    // Verify group exists
    const { data: group } = await supabase
      .from("groups")
      .select("id, exam_center")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: "Already in group." });
    }

    // Leave any other group for this user first
    const { data: otherMemberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.userId);

    const firstName = user.name.split(" ")[0];

    if (otherMemberships && otherMemberships.length > 0) {
      for (const m of otherMemberships) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", m.group_id)
          .eq("user_id", user.userId);

        await postSystemMessage(m.group_id, `${firstName} left the group.`);
      }
    }

    // Insert into group_members
    const { error: joinErr } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: user.userId,
      });

    if (joinErr) throw joinErr;

    // Post system line
    await postSystemMessage(groupId, `${firstName} joined the group.`);

    return NextResponse.json({
      success: true,
      message: `You joined the travel group for ${group.exam_center}.`,
    });
  } catch (error: any) {
    console.error("Join group error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join group." },
      { status: 500 }
    );
  }
}
