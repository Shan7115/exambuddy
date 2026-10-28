import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { postTripReminder } from "@/lib/agents/coordinator-agent";

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
    await postTripReminder(groupId);

    return NextResponse.json({ success: true, message: "Reminder posted to group." });
  } catch (error) {
    console.error("Reminder route error:", error);
    return NextResponse.json(
      { error: "Failed to generate coordinator reminder." },
      { status: 500 }
    );
  }
}
