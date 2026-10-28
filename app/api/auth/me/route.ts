import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    // Optionally fetch fresh user info from database
    const supabase = getAdminSupabase();
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, name, register_no, email, pickup_area, college, is_demo")
      .eq("id", session.userId)
      .maybeSingle();

    const user = dbUser
      ? {
          userId: dbUser.id,
          name: dbUser.name,
          registerNo: dbUser.register_no,
          email: dbUser.email,
          pickupArea: dbUser.pickup_area,
          college: dbUser.college,
          isDemo: dbUser.is_demo,
        }
      : session;

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
