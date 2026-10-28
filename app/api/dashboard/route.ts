import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { CANONICAL_EXAM_CENTERS } from "@/lib/constants/demo-data";
import { matchToCanonicalCenter } from "@/lib/agents/center-matcher";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabase();

    // 1. Fetch user record
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, name, register_no, email, pickup_area, college, is_demo")
      .eq("id", session.userId)
      .single();

    // 2. Fetch confirmed ticket
    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let group = null;
    let members: Array<{
      id: string;
      firstName: string;
      pickupArea: string;
      isCurrentUser: boolean;
    }> = [];
    let perPersonCost = 0;

    // 3. If student has a ticket, look for group membership
    if (ticket) {
      const canonical = matchToCanonicalCenter(ticket.exam_center);

      // Check which group this user belongs to
      const { data: membership } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", session.userId)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let targetGroupId = membership?.group_id;

      // If not yet joined, look for existing group matching center, date, session
      if (!targetGroupId) {
        const { data: matchingGroup } = await supabase
          .from("groups")
          .select("id")
          .eq("exam_center", canonical.name)
          .eq("exam_date", ticket.exam_date)
          .eq("session", ticket.session)
          .maybeSingle();

        if (matchingGroup) {
          targetGroupId = matchingGroup.id;
        }
      }

      if (targetGroupId) {
        const { data: groupData } = await supabase
          .from("groups")
          .select("*")
          .eq("id", targetGroupId)
          .single();

        if (groupData) {
          // Fetch members
          const { data: memberRows } = await supabase
            .from("group_members")
            .select("user_id, joined_at, users(id, name, pickup_area)")
            .eq("group_id", targetGroupId)
            .order("joined_at", { ascending: true });

          members = (memberRows || []).map((row: any) => {
            const u = row.users;
            const fullName = u?.name || "Student";
            const firstName = fullName.split(" ")[0];
            return {
              id: u?.id || row.user_id,
              firstName,
              pickupArea: u?.pickup_area || "Karunya Nagar",
              isCurrentUser: u?.id === session.userId,
            };
          });

          const totalCost = Number(groupData.est_total_cost) || 1200;
          perPersonCost = members.length > 0 ? Math.round(totalCost / members.length) : totalCost;

          group = {
            ...groupData,
            canonicalCenter: canonical,
            perPersonCost,
            memberCount: members.length,
          };
        }
      }
    }

    // 4. Fetch recent agent events for this user and their group
    const { data: events } = await supabase
      .from("agent_events")
      .select("id, agent, message, status, created_at, group_id")
      .or(`user_id.eq.${session.userId}${group?.id ? `,group_id.eq.${group.id}` : ""}`)
      .order("created_at", { ascending: false })
      .limit(15);

    return NextResponse.json({
      user: dbUser || session,
      ticket,
      group,
      members,
      agentEvents: events || [],
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
