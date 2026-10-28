import { getGeminiClient, getGeminiModelName } from "./gemini";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  CANONICAL_EXAM_CENTERS,
  EXAM_SESSIONS,
  type CanonicalCenter,
} from "@/lib/constants/demo-data";
import { matchToCanonicalCenter } from "./center-matcher";

export interface TripPlan {
  meetupPoint: string;
  meetupTime: string;
  transport: string;
  estTotalFare: number;
}

export interface MatchingResult {
  success: boolean;
  groupId: string;
  isNewGroup: boolean;
  memberCount: number;
  members: Array<{
    id: string;
    firstName: string;
    pickupArea: string;
  }>;
  plan: TripPlan;
  error?: string;
}

async function logAgentEvent(
  userId: string,
  groupId: string | null,
  agent: string,
  message: string,
  status: "running" | "done" | "failed"
) {
  try {
    const supabase = getAdminSupabase();
    await supabase.from("agent_events").insert({
      user_id: userId,
      group_id: groupId || null,
      agent,
      message,
      status,
    });
  } catch (e) {
    console.error("Agent event logging failed:", e);
  }
}

/**
 * Runs the Matching Agent for a student and their confirmed ticket
 */
export async function runMatchingAgent(
  userId: string,
  ticket: {
    exam_center: string;
    exam_date: string;
    session: "Forenoon" | "Afternoon";
  }
): Promise<MatchingResult> {
  const supabase = getAdminSupabase();
  const canonicalCenter = matchToCanonicalCenter(ticket.exam_center);
  const session = ticket.session === "Afternoon" ? "Afternoon" : "Forenoon";

  // 1. Initial event
  await logAgentEvent(
    userId,
    null,
    "Matching agent",
    `Searching for Karunya students traveling to ${canonicalCenter.shortName} on ${ticket.exam_date} (${session})...`,
    "running"
  );

  // 2. Find existing group matching canonical center, date, and session
  const { data: existingGroup } = await supabase
    .from("groups")
    .select("id, meetup_point, meetup_time, transport, est_total_cost")
    .eq("exam_center", canonicalCenter.name)
    .eq("exam_date", ticket.exam_date)
    .eq("session", session)
    .maybeSingle();

  let groupId: string;
  let isNewGroup = false;

  if (existingGroup) {
    groupId = existingGroup.id;
    // Add student to group_members if not already present
    await supabase
      .from("group_members")
      .upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" });
  } else {
    // Create new group
    isNewGroup = true;
    const { data: newGroup, error: groupErr } = await supabase
      .from("groups")
      .insert({
        exam_center: canonicalCenter.name,
        exam_date: ticket.exam_date,
        session,
        meetup_point: "Karunya Nagar Main Bus Stop / Campus Gate",
        meetup_time: EXAM_SESSIONS[session].defaultMeetupTime,
        transport: "Pre-booked 4-Seater Cab",
        est_total_cost: 1200,
      })
      .select("id")
      .single();

    if (groupErr || !newGroup) {
      throw new Error("Could not create travel squad.");
    }

    groupId = newGroup.id;
    await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
    });
  }

  // 3. Fetch all current group members and their pickup areas
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, users(id, name, pickup_area)")
    .eq("group_id", groupId);

  const members = (memberRows || []).map((row: any) => {
    const u = row.users;
    const fullName = u?.name || "Classmate";
    const firstName = fullName.split(" ")[0];
    return {
      id: u?.id || row.user_id,
      firstName,
      pickupArea: u?.pickup_area || "Karunya Nagar",
    };
  });

  const memberCount = members.length;

  // 4. Synthesize Trip Plan with Gemini (or fallback template)
  const plan = await synthesizeTripPlan(canonicalCenter, ticket.exam_date, session, members);

  // 5. Update group with synthesized plan
  await supabase
    .from("groups")
    .update({
      meetup_point: plan.meetupPoint,
      meetup_time: plan.meetupTime,
      transport: plan.transport,
      est_total_cost: plan.estTotalFare,
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  // 6. Log completion events
  await logAgentEvent(
    userId,
    groupId,
    "Matching agent",
    `Matched with ${memberCount} Karunya ${memberCount === 1 ? "classmate" : "classmates"} for ${canonicalCenter.shortName}.`,
    "done"
  );

  return {
    success: true,
    groupId,
    isNewGroup,
    memberCount,
    members,
    plan,
  };
}

/**
 * Calls Gemini to generate a structured meetup and cost split plan
 */
async function synthesizeTripPlan(
  center: CanonicalCenter,
  date: string,
  session: "Forenoon" | "Afternoon",
  members: Array<{ firstName: string; pickupArea: string }>
): Promise<TripPlan> {
  const memberCount = members.length;
  const reportingTime = EXAM_SESSIONS[session].reportingTime;
  const pickupList = members.map((m) => `${m.firstName} (${m.pickupArea})`).join(", ");

  const prompt = `You are the ExamBuddy Trip Planning Agent for Karunya University students taking NPTEL exams.
Details:
- Destination Exam Center: ${center.name} (${center.address})
- Exam Date: ${date}
- Session: ${session} (Reporting Time: ${reportingTime})
- Group Size: ${memberCount} students
- Student Pickups: ${pickupList}

Generate an optimal travel coordination plan in strict JSON:
{
  "meetupPoint": "Central, recognizable Karunya/Coimbatore transit point (e.g. Karunya Nagar Main Bus Stop / Campus Gate, Gandhipuram Central Bus Stand, etc.)",
  "meetupTime": "Departure/meetup time (strictly 45-60 mins before ${reportingTime}, e.g. 06:45 AM or 11:45 AM)",
  "transport": "Vehicle suggestion suited for ${memberCount} passengers (e.g. 4-Seater Cab, 7-Seater Innova/Ertiga, Shared Tempo Traveller)",
  "estTotalFare": 1200 or 1600 or 2000 (total fare for group in INR number)
}
Return ONLY valid JSON.`;

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: getGeminiModelName() });
    const result = await model.generateContent(prompt);
    const text = (await result.response).text();

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      meetupPoint: parsed.meetupPoint || getDefaultMeetupPoint(center, members),
      meetupTime: parsed.meetupTime || EXAM_SESSIONS[session].defaultMeetupTime,
      transport: parsed.transport || getDefaultTransport(memberCount),
      estTotalFare: Number(parsed.estTotalFare) || getDefaultFare(memberCount),
    };
  } catch (err) {
    console.warn("Gemini plan synthesis fallback:", err);
    return {
      meetupPoint: getDefaultMeetupPoint(center, members),
      meetupTime: EXAM_SESSIONS[session].defaultMeetupTime,
      transport: getDefaultTransport(memberCount),
      estTotalFare: getDefaultFare(memberCount),
    };
  }
}

function getDefaultMeetupPoint(center: CanonicalCenter, members: Array<{ pickupArea: string }>): string {
  const campusCount = members.filter((m) => m.pickupArea.toLowerCase().includes("karunya")).length;
  if (campusCount >= members.length / 2) {
    return "Karunya Nagar Main Bus Stop / Campus Gate";
  }
  if (center.id === "center-b") {
    return "Gandhipuram Central Bus Stand (Platform 3)";
  }
  return "Karunya Nagar Campus Gate / Kovaipudur Junction";
}

function getDefaultTransport(count: number): string {
  if (count <= 3) return "Pre-booked 4-Seater Cab (Sedan)";
  if (count <= 6) return "Pre-booked 7-Seater Cab (Innova / Ertiga)";
  return "Shared Maxi Cab / Tempo Traveller";
}

function getDefaultFare(count: number): number {
  if (count <= 3) return 1200;
  if (count <= 6) return 1600;
  return 2000;
}
