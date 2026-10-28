import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  DEMO_STUDENTS,
  CANONICAL_EXAM_CENTERS,
  DEFAULT_EXAM_DATE,
} from "@/lib/constants/demo-data";

export async function POST(request: Request) {
  return handleReset(request);
}

export async function GET(request: Request) {
  return handleReset(request);
}

async function handleReset(request: Request) {
  try {
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");
    const headerKey = request.headers.get("x-demo-admin-key");

    let bodyKey: string | null = null;
    if (request.method === "POST" && request.headers.get("content-type")?.includes("json")) {
      try {
        const body = await request.json();
        bodyKey = body.key;
      } catch {
        // Ignore json parse error
      }
    }

    const providedKey = queryKey || headerKey || bodyKey;
    const adminKey = process.env.DEMO_ADMIN_KEY || "Karunya2026Reset9x";

    if (!providedKey || providedKey !== adminKey) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing DEMO_ADMIN_KEY." },
        { status: 401 }
      );
    }

    const supabase = getAdminSupabase();

    // 1. Find all non-demo users
    const { data: nonDemoUsers } = await supabase
      .from("users")
      .select("id")
      .eq("is_demo", false);

    if (nonDemoUsers && nonDemoUsers.length > 0) {
      const nonDemoIds = nonDemoUsers.map((u) => u.id);
      await supabase.from("messages").delete().filter("user_id", "in", `(${nonDemoIds.join(",")})`);
      await supabase.from("group_members").delete().filter("user_id", "in", `(${nonDemoIds.join(",")})`);
      await supabase.from("agent_events").delete().filter("user_id", "in", `(${nonDemoIds.join(",")})`);
      await supabase.from("tickets").delete().filter("user_id", "in", `(${nonDemoIds.join(",")})`);
      await supabase.from("users").delete().eq("is_demo", false);
    }

    // 2. Clear non-seeded OTP codes
    await supabase.from("otp_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Reset groups back to initial 10-dummy student state
    const groupAId = "11111111-1111-1111-1111-111111111111";
    const groupBId = "22222222-2222-2222-2222-222222222222";

    // Clean extraneous group memberships in seeded groups
    const dummyIds = DEMO_STUDENTS.map((s) => s.id);
    await supabase
      .from("group_members")
      .delete()
      .filter("user_id", "not.in", `(${dummyIds.join(",")})`);

    // Reset group metadata
    await supabase.from("groups").upsert([
      {
        id: groupAId,
        exam_center: CANONICAL_EXAM_CENTERS[0].name,
        exam_date: DEFAULT_EXAM_DATE,
        session: "Forenoon",
        meetup_point: "Karunya Nagar Main Bus Stop / Campus Gate",
        meetup_time: "06:45 AM",
      },
      {
        id: groupBId,
        exam_center: CANONICAL_EXAM_CENTERS[1].name,
        exam_date: DEFAULT_EXAM_DATE,
        session: "Afternoon",
        meetup_point: "Gandhipuram Central Bus Stand (Platform 3)",
        meetup_time: "11:45 AM",
      },
    ]);

    // Restore seeded memberships
    const membersA = DEMO_STUDENTS.slice(0, 4).map((s) => ({
      group_id: groupAId,
      user_id: s.id,
    }));
    const membersB = DEMO_STUDENTS.slice(4, 7).map((s) => ({
      group_id: groupBId,
      user_id: s.id,
    }));

    await supabase.from("group_members").upsert([...membersA, ...membersB]);

    return NextResponse.json({
      success: true,
      message:
        "Demo environment successfully reset in seconds. Retained 10 dummy students across 3 centers.",
      retainedStudents: DEMO_STUDENTS.length,
    });
  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset demo environment." },
      { status: 500 }
    );
  }
}
