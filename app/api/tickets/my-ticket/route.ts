import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, ticket: null }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.userId)
      .maybeSingle();

    return NextResponse.json({
      hasTicket: !!ticket,
      ticket,
    });
  } catch (error) {
    console.error("Fetch ticket error:", error);
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}
