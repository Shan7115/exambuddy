import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
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

    let currentGroup: any = null;
    let centerStudents: Array<{ id: string; firstName: string; pickupArea: string }> = [];
    let openGroups: Array<{
      id: string;
      meetupPoint: string | null;
      meetupTime: string | null;
      memberCount: number;
      members: Array<{ firstName: string; pickupArea: string }>;
    }> = [];

    // 3. Check if user is currently an explicit member of any travel group
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id, groups(*)")
      .eq("user_id", session.userId)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membership && membership.groups) {
      const g = membership.groups as any;
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("user_id, users(id, name, pickup_area)")
        .eq("group_id", g.id)
        .order("joined_at", { ascending: true });

      const members = (memberRows || []).map((row: any) => {
        const u = row.users;
        const fullName = u?.name || "Student";
        return {
          id: u?.id || row.user_id,
          firstName: fullName.split(" ")[0],
          pickupArea: u?.pickup_area || "Karunya Nagar",
          isCurrentUser: (u?.id || row.user_id) === session.userId,
        };
      });

      currentGroup = {
        id: g.id,
        examCenter: g.exam_center,
        examDate: g.exam_date,
        session: g.session,
        meetupPoint: g.meetup_point || null,
        meetupTime: g.meetup_time || null,
        members,
        memberCount: members.length,
      };
    }

    // 4. If user has a ticket, fetch classmates going to the same center, date, session
    if (ticket) {
      const canonical = matchToCanonicalCenter(ticket.exam_center);
      const ticketSession =
        ticket.session.toLowerCase().includes("after") ? "Afternoon" : "Forenoon";

      // Query tickets for the same center, date, session
      const { data: matchingTickets } = await supabase
        .from("tickets")
        .select("user_id, users(id, name, pickup_area)")
        .eq("exam_center", canonical.name)
        .eq("exam_date", ticket.exam_date)
        .eq("session", ticketSession);

      if (matchingTickets) {
        const seenIds = new Set<string>();
        for (const t of matchingTickets) {
          const u = (t as any).users;
          if (u && u.id !== session.userId && !seenIds.has(u.id)) {
            seenIds.add(u.id);
            centerStudents.push({
              id: u.id,
              firstName: (u.name || "Student").split(" ")[0],
              pickupArea: u.pickup_area || "Karunya Nagar",
            });
          }
        }
      }

      // Query open groups for this center, date, session
      const { data: groupRows } = await supabase
        .from("groups")
        .select("id, meetup_point, meetup_time, group_members(user_id, users(name, pickup_area))")
        .eq("exam_center", canonical.name)
        .eq("exam_date", ticket.exam_date)
        .eq("session", ticketSession);

      if (groupRows) {
        openGroups = groupRows.map((gr: any) => {
          const gmList = gr.group_members || [];
          const membersList = gmList.map((gm: any) => ({
            firstName: (gm.users?.name || "Student").split(" ")[0],
            pickupArea: gm.users?.pickup_area || "Karunya Nagar",
          }));

          return {
            id: gr.id,
            meetupPoint: gr.meetup_point || null,
            meetupTime: gr.meetup_time || null,
            memberCount: membersList.length,
            members: membersList,
          };
        });
      }
    }

    return NextResponse.json({
      user: dbUser || session,
      ticket,
      currentGroup,
      centerStudents,
      openGroups,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
