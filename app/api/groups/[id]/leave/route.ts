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

    const { error: leaveErr } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.userId);

    if (leaveErr) throw leaveErr;

    const firstName = user.name.split(" ")[0];
    await postSystemMessage(groupId, `${firstName} left the group.`);

    return NextResponse.json({
      success: true,
      message: "You have left the group.",
    });
  } catch (error: any) {
    console.error("Leave group error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to leave group." },
      { status: 500 }
    );
  }
}
