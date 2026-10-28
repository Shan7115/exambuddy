// ExamBuddy TypeScript Seed Script
// Seeds the 10 dummy students and groups into Supabase using Admin Client
import { createClient } from "@supabase/supabase-js";
import {
  DEMO_STUDENTS,
  CANONICAL_EXAM_CENTERS,
  DEFAULT_EXAM_DATE,
} from "../lib/constants/demo-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runSeed() {
  console.log("🌱 Starting ExamBuddy Demo Data Seed...");

  // 1. Delete existing demo data
  console.log("Cleaning up prior demo data...");
  const { data: demoUsers } = await supabase
    .from("users")
    .select("id")
    .eq("is_demo", true);

  if (demoUsers && demoUsers.length > 0) {
    const ids = demoUsers.map((u) => u.id);
    await supabase.from("messages").delete().filter("user_id", "in", `(${ids.join(",")})`);
    await supabase.from("group_members").delete().filter("user_id", "in", `(${ids.join(",")})`);
    await supabase.from("agent_events").delete().filter("user_id", "in", `(${ids.join(",")})`);
    await supabase.from("tickets").delete().filter("user_id", "in", `(${ids.join(",")})`);
    await supabase.from("users").delete().eq("is_demo", true);
  }

  // 2. Insert the 10 Dummy Students
  console.log(`Inserting ${DEMO_STUDENTS.length} dummy Karunya students...`);
  const userPayloads = DEMO_STUDENTS.map((s) => ({
    id: s.id,
    name: s.name,
    register_no: s.registerNo,
    email: s.email,
    college: s.college,
    pickup_area: s.pickupArea,
    is_demo: true,
  }));

  const { error: userErr } = await supabase.from("users").upsert(userPayloads);
  if (userErr) throw userErr;

  // 3. Insert Tickets
  console.log("Inserting tickets...");
  const ticketPayloads = DEMO_STUDENTS.map((s, idx) => ({
    user_id: s.id,
    course_name: s.courseName,
    exam_center: s.examCenter,
    exam_date: s.examDate,
    session: s.session,
    extracted_json: {
      courseCode: `noc24-cs10${idx}`,
      reportingTime: s.session === "Forenoon" ? "07:30 AM" : "12:30 PM",
    },
  }));

  const { error: ticketErr } = await supabase.from("tickets").insert(ticketPayloads);
  if (ticketErr) throw ticketErr;

  // 4. Create Groups for Center A and Center B
  console.log("Creating groups...");
  const groupAId = "11111111-1111-1111-1111-111111111111";
  const groupBId = "22222222-2222-2222-2222-222222222222";

  await supabase.from("groups").upsert([
    {
      id: groupAId,
      exam_center: CANONICAL_EXAM_CENTERS[0].name,
      exam_date: DEFAULT_EXAM_DATE,
      session: "Forenoon",
      meetup_point: "Karunya Nagar Main Bus Stop / Campus Gate",
      meetup_time: "06:45 AM",
      transport: "Shared Maxi Cab / Tempo Traveller",
      est_total_cost: 1600.0,
    },
    {
      id: groupBId,
      exam_center: CANONICAL_EXAM_CENTERS[1].name,
      exam_date: DEFAULT_EXAM_DATE,
      session: "Afternoon",
      meetup_point: "Gandhipuram Central Bus Stand (Platform 3)",
      meetup_time: "11:45 AM",
      transport: "Pre-booked 7-Seater Cab (Innova)",
      est_total_cost: 1200.0,
    },
  ]);

  // 5. Add Group Members
  console.log("Adding group members...");
  const membersA = DEMO_STUDENTS.slice(0, 4).map((s) => ({
    group_id: groupAId,
    user_id: s.id,
  }));
  const membersB = DEMO_STUDENTS.slice(4, 7).map((s) => ({
    group_id: groupBId,
    user_id: s.id,
  }));

  await supabase.from("group_members").upsert([...membersA, ...membersB]);

  // 6. Bot messages
  console.log("Posting coordinator messages...");
  await supabase.from("messages").insert([
    {
      group_id: groupAId,
      is_bot: true,
      body: "Welcome everyone! I am your ExamBuddy Coordinator. You have been matched for the NPTEL exam at iON Digital Zone Kovai Pudur on Nov 15 (Forenoon). Current estimated cost is ₹1,600 (₹400 / person). Meetup at Karunya Nagar Main Bus Stop by 06:45 AM.",
    },
    {
      group_id: groupBId,
      is_bot: true,
      body: "Welcome to your NPTEL travel squad for KGiSL Institute of Technology (Afternoon session). Estimated fare is ₹1,200 (₹400 / person). Meetup at Gandhipuram Central Bus Stand by 11:45 AM.",
    },
  ]);

  console.log("✅ Seed completed successfully!");
}

runSeed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
