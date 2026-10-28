import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";

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
    const body = await request.json();
    const text = body.body?.trim();

    if (!text) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    // Insert student message
    const { data: newMsg, error: insertErr } = await supabase
      .from("messages")
      .insert({
        group_id: groupId,
        user_id: user.userId,
        is_bot: false,
        body: text,
      })
      .select("id, group_id, user_id, is_bot, body, created_at")
      .single();

    if (insertErr || !newMsg) {
      console.error("Failed to insert message:", insertErr);
      return NextResponse.json({ error: "Could not send message." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: {
        ...newMsg,
        senderName: user.name.split(" ")[0],
        isCurrentUser: true,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to post message." },
      { status: 500 }
    );
  }
}
