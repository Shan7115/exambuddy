import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "./center-matcher";
import { EXAM_SESSIONS } from "@/lib/constants/demo-data";

/**
 * Coordinator Agent for ExamBuddy
 * Handles welcome posts, cost split recalculations, and reminder summaries.
 */

async function logAgentEvent(
  groupId: string,
  message: string,
  status: "running" | "done" | "failed"
) {
  try {
    const supabase = getAdminSupabase();
    await supabase.from("agent_events").insert({
      group_id: groupId,
      agent: "Coordinator agent",
      message,
      status,
    });
  } catch (e) {
    console.error("Coordinator agent event log error:", e);
  }
}

export async function postBotMessage(groupId: string, body: string) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      group_id: groupId,
      user_id: null,
      is_bot: true,
      body,
    })
    .select()
    .single();

  if (error) {
    console.error("Bot message insert error:", error);
    throw error;
  }

  return data;
}

/**
 * Triggered when a new member joins or leaves
 */
export async function handleMembershipChange(groupId: string, newMemberName?: string) {
  const supabase = getAdminSupabase();

  // 1. Fetch group & current members
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) return;

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, users(name, pickup_area)")
    .eq("group_id", groupId);

  const count = members?.length || 1;
  const totalCost = Number(group.est_total_cost) || 1200;
  const perPersonSplit = Math.round(totalCost / count);

  const firstName = newMemberName ? newMemberName.split(" ")[0] : "Classmate";

  const messageText = `👋 ${newMemberName ? `Welcome ${firstName}!` : "Squad update!"} We now have ${count} Karunya ${count === 1 ? "student" : "students"} in our squad for ${group.exam_center}. 

💰 Live Cost Split: ₹${perPersonSplit} / person (Total estimated fare: ₹${totalCost}).
📍 Meetup Point: ${group.meetup_point || "Karunya Nagar Campus Gate"}
⏰ Meetup Time: ${group.meetup_time || "06:45 AM"}`;

  await postBotMessage(groupId, messageText);

  await logAgentEvent(
    groupId,
    `Recalculated per-person fare split to ₹${perPersonSplit} for ${count} students.`,
    "done"
  );

  return { perPersonSplit, memberCount: count };
}

/**
 * Generates an on-demand trip reminder summary in the chat
 */
export async function postTripReminder(groupId: string) {
  const supabase = getAdminSupabase();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) return;

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, users(name, pickup_area)")
    .eq("group_id", groupId);

  const count = members?.length || 1;
  const perPerson = Math.round((Number(group.est_total_cost) || 1200) / count);
  const session = group.session as "Forenoon" | "Afternoon";
  const sessionDetails = EXAM_SESSIONS[session] || EXAM_SESSIONS.Forenoon;

  const reminderText = `📋 NPTEL Exam Trip Reminder Summary:
• Destination: ${group.exam_center}
• Date: ${group.exam_date} (${session} Session)
• Reporting Time: ${sessionDetails.reportingTime} (Gate Closes: ${sessionDetails.gateCloses})
• Squad Meetup: ${group.meetup_time} at ${group.meetup_point}
• Transport Vehicle: ${group.transport}
• Fare Split: ₹${perPerson} per student (${count} students)

⚠️ Exam Checklist:
1. Printed NPTEL Hall Ticket / Admit Card
2. Original Karunya College ID Card
3. Bring exact cash or UPI for cab fare`;

  await postBotMessage(groupId, reminderText);

  await logAgentEvent(
    groupId,
    "Coordinator bot posted complete trip logistics and exam checklist summary.",
    "done"
  );
}
