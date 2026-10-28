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
    const summary = await postTripReminder(groupId);

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error("Reminder route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to post reminder summary." },
      { status: 500 }
    );
  }
}
