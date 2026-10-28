import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "@/lib/agents/center-matcher";

export async function GET(
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

    // 1. Fetch group
    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupErr || !group) {
      return NextResponse.json({ error: "Group squad not found" }, { status: 404 });
    }

    const canonicalCenter = matchToCanonicalCenter(group.exam_center);

    // 2. Fetch members
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id, joined_at, users(id, name, pickup_area)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    const members = (memberRows || []).map((row: any) => {
      const u = row.users;
      const fullName = u?.name || "Student";
      const firstName = fullName.split(" ")[0];
      return {
        id: u?.id || row.user_id,
        name: fullName,
        firstName,
        pickupArea: u?.pickup_area || "Karunya Nagar",
        isCurrentUser: u?.id === user.userId,
      };
    });

    const memberCount = members.length;
    const totalCost = Number(group.est_total_cost) || 1200;
    const perPersonCost = memberCount > 0 ? Math.round(totalCost / memberCount) : totalCost;

    // 3. Fetch messages with sender info
    const { data: rawMessages } = await supabase
      .from("messages")
      .select("id, group_id, user_id, is_bot, body, created_at, users(name)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(60);

    const messages = (rawMessages || []).map((m: any) => ({
      id: m.id,
      groupId: m.group_id,
      userId: m.user_id,
      isBot: m.is_bot,
      body: m.body,
      createdAt: m.created_at,
      senderName: m.is_bot ? "Coordinator Bot" : m.users?.name?.split(" ")[0] || "Classmate",
      isCurrentUser: m.user_id === user.userId,
    }));

    return NextResponse.json({
      group: {
        ...group,
        canonicalCenter,
        memberCount,
        perPersonCost,
      },
      members,
      messages,
      currentUser: user,
    });
  } catch (error) {
    console.error("Get group room error:", error);
    return NextResponse.json(
      { error: "Failed to load group squad details." },
      { status: 500 }
    );
  }
}
