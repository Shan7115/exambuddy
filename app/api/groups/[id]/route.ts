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
      .select("id, exam_center, exam_date, session, meetup_point, meetup_time, created_at, updated_at")
      .eq("id", groupId)
      .single();

    if (groupErr || !group) {
      return NextResponse.json({ error: "Travel group not found." }, { status: 404 });
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
        isCurrentUser: (u?.id || row.user_id) === user.userId,
      };
    });

    const isMember = members.some((m) => m.isCurrentUser);

    // 3. Fetch messages
    const { data: rawMessages } = await supabase
      .from("messages")
      .select("id, group_id, user_id, is_bot, body, created_at, users(name)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(80);

    const messages = (rawMessages || []).map((m: any) => {
      let senderName = "Classmate";
      if (m.is_bot) {
        senderName = "System";
      } else if (m.user_id === user.userId) {
        senderName = user.name.split(" ")[0];
      } else if (m.users?.name) {
        senderName = m.users.name.split(" ")[0];
      }

      return {
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
        isBot: m.is_bot,
        body: m.body,
        createdAt: m.created_at,
        senderName,
        isCurrentUser: m.user_id === user.userId,
      };
    });

    return NextResponse.json({
      group: {
        ...group,
        canonicalCenter,
        memberCount: members.length,
        isMember,
      },
      members,
      messages,
      currentUser: user,
    });
  } catch (error) {
    console.error("Get group error:", error);
    return NextResponse.json(
      { error: "Failed to load group details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { meetupPoint, meetupTime } = body;

    const supabase = getAdminSupabase();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof meetupPoint === "string") updates.meetup_point = meetupPoint.trim();
    if (typeof meetupTime === "string") updates.meetup_time = meetupTime.trim();

    const { data: updatedGroup, error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", groupId)
      .select("id, meetup_point, meetup_time")
      .single();

    if (error || !updatedGroup) {
      throw error || new Error("Failed to update meetup details.");
    }

    return NextResponse.json({
      success: true,
      meetupPoint: updatedGroup.meetup_point,
      meetupTime: updatedGroup.meetup_time,
    });
  } catch (error: any) {
    console.error("Update meetup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update meetup details." },
      { status: 500 }
    );
  }
}
