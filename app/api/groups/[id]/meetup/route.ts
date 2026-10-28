import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";

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
