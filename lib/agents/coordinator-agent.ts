import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * Coordinator Agent for ExamBuddy
 * Strictly handles:
 * 1. "Ask bot" reminder summary: posts one message in chat summarizing center, date, session, and meetup point/time.
 * 2. System messages for join/leave.
 * (No autonomous messages, no taxi/auto prices or cost splits)
 */

export async function postSystemMessage(groupId: string, text: string) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      group_id: groupId,
      user_id: null,
      is_bot: true,
      body: text,
    })
    .select()
    .single();

  if (error) {
    console.error("System message insert error:", error);
    throw error;
  }
  return data;
}

/**
 * Generates an on-demand trip reminder summary in the chat when "Ask bot" is pressed.
 * Posts exactly one message summarizing center, date, session, and member-configured meetup point/time.
 * Does not generate anything else.
 */
export async function postTripReminder(groupId: string): Promise<string> {
  const supabase = getAdminSupabase();

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("exam_center, exam_date, session, meetup_point, meetup_time")
    .eq("id", groupId)
    .single();

  if (groupErr || !group) {
    throw new Error("Group not found.");
  }

  const meetupPoint = group.meetup_point?.trim() || "Not set yet";
  const meetupTime = group.meetup_time?.trim() || "Not set yet";

  const summary = `Exam Center: ${group.exam_center}
Date: ${group.exam_date}
Session: ${group.session}
Meetup Point: ${meetupPoint}
Meetup Time: ${meetupTime}`;

  await postSystemMessage(groupId, summary);
  return summary;
}
