import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "@/lib/agents/center-matcher";
import { CANONICAL_EXAM_CENTERS } from "@/lib/constants/demo-data";

/**
 * Normalizes strings by lowercasing, stripping punctuation, and compressing whitespace
 */
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if query matches target with tolerance for small spelling/spacing differences
 */
function isFuzzyCenterMatch(query: string, target: string): boolean {
  const q = cleanString(query);
  const t = cleanString(target);

  if (!q || !t) return false;
  if (t.includes(q) || q.includes(t)) return true;

  // Check word tokens
  const qWords = q.split(" ").filter((w) => w.length > 2);
  const tWords = t.split(" ").filter((w) => w.length > 2);

  const matched = qWords.filter((qw) => tWords.some((tw) => tw.includes(qw) || qw.includes(tw)));
  return matched.length >= Math.min(2, qWords.length);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const centerQuery = searchParams.get("center")?.trim() || "";
    const dateQuery = searchParams.get("date")?.trim() || "";
    const sessionQuery = searchParams.get("session")?.trim() || "";

    if (!centerQuery) {
      return NextResponse.json({
        students: [],
        groups: [],
        suggestions: CANONICAL_EXAM_CENTERS.map((c) => c.name),
      });
    }

    const canonical = matchToCanonicalCenter(centerQuery);
    const supabase = getAdminSupabase();

    // 1. Fetch tickets to find matching classmates
    let ticketQuery = supabase
      .from("tickets")
      .select("user_id, exam_center, exam_date, session, users(id, name, pickup_area)");

    if (dateQuery) {
      ticketQuery = ticketQuery.eq("exam_date", dateQuery);
    }
    if (sessionQuery && sessionQuery !== "all") {
      const normSession = sessionQuery.toLowerCase().includes("after") ? "Afternoon" : "Forenoon";
      ticketQuery = ticketQuery.eq("session", normSession);
    }

    const { data: ticketRows } = await ticketQuery;

    const matchingStudents: Array<{ id: string; firstName: string; pickupArea: string; center: string }> = [];
    const seenUserIds = new Set<string>();

    for (const t of ticketRows || []) {
      const u = (t as any).users;
      if (!u || u.id === user.userId || seenUserIds.has(u.id)) continue;

      const tCenter = t.exam_center || "";
      if (
        tCenter === canonical.name ||
        isFuzzyCenterMatch(centerQuery, tCenter) ||
        isFuzzyCenterMatch(canonical.name, tCenter)
      ) {
        seenUserIds.add(u.id);
        matchingStudents.push({
          id: u.id,
          firstName: (u.name || "Student").split(" ")[0],
          pickupArea: u.pickup_area || "Karunya Nagar",
          center: tCenter,
        });
      }
    }

    // 2. Fetch open travel groups
    let groupQuery = supabase
      .from("groups")
      .select("id, exam_center, exam_date, session, meetup_point, meetup_time, group_members(user_id, users(name, pickup_area))");

    if (dateQuery) {
      groupQuery = groupQuery.eq("exam_date", dateQuery);
    }
    if (sessionQuery && sessionQuery !== "all") {
      const normSession = sessionQuery.toLowerCase().includes("after") ? "Afternoon" : "Forenoon";
      groupQuery = groupQuery.eq("session", normSession);
    }

    const { data: groupRows } = await groupQuery;

    const matchingGroups: Array<{
      id: string;
      examCenter: string;
      examDate: string;
      session: string;
      meetupPoint: string | null;
      meetupTime: string | null;
      memberCount: number;
      members: Array<{ firstName: string; pickupArea: string }>;
      isUserMember: boolean;
    }> = [];

    for (const gr of groupRows || []) {
      const grCenter = gr.exam_center || "";
      if (
        grCenter === canonical.name ||
        isFuzzyCenterMatch(centerQuery, grCenter) ||
        isFuzzyCenterMatch(canonical.name, grCenter)
      ) {
        const gmList = gr.group_members || [];
        const isUserMember = gmList.some((gm: any) => gm.user_id === user.userId);
        const membersList = gmList.map((gm: any) => ({
          firstName: (gm.users?.name || "Student").split(" ")[0],
          pickupArea: gm.users?.pickup_area || "Karunya Nagar",
        }));

        matchingGroups.push({
          id: gr.id,
          examCenter: gr.exam_center,
          examDate: gr.exam_date,
          session: gr.session,
          meetupPoint: gr.meetup_point || null,
          meetupTime: gr.meetup_time || null,
          memberCount: membersList.length,
          members: membersList,
          isUserMember,
        });
      }
    }

    return NextResponse.json({
      success: true,
      canonicalMatch: canonical.name,
      students: matchingStudents,
      groups: matchingGroups,
    });
  } catch (error: any) {
    console.error("Explore API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search travel options." },
      { status: 500 }
    );
  }
}
