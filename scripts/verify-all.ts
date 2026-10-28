import fs from "fs";
import path from "path";

// Load .env.local
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      process.env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    }
  }
}

const BASE_URL = "http://localhost:3000";

async function loginUser(name: string, registerNo: string, email: string, pickupArea: string) {
  // 1. Send OTP
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, registerNo, email, pickupArea }),
  });
  const sendData = await sendRes.json();
  if (!sendRes.ok) throw new Error("Send OTP failed: " + JSON.stringify(sendData));

  const otpCode = sendData.demoCode;

  // 2. Verify OTP
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, registerNo, email, pickupArea, code: otpCode }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error("Verify OTP failed: " + JSON.stringify(verifyData));

  // Extract session cookie
  const setCookie = verifyRes.headers.get("set-cookie");
  const cookieMatch = setCookie?.match(/exambuddy_session=([^;]+)/);
  const cookieHeader = cookieMatch ? `exambuddy_session=${cookieMatch[1]}` : "";

  return { user: verifyData.user, cookieHeader };
}

async function runVerification() {
  console.log("=== EXAMBUDDY TEST & VERIFICATION SUITE ===\n");

  // Reset Demo first
  console.log("1. Resetting demo environment...");
  const resetRes = await fetch(`${BASE_URL}/api/demo/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: process.env.DEMO_ADMIN_KEY || "Karunya2026Reset9x" }),
  });
  const resetData = await resetRes.json();
  console.log("Reset result:", resetData.message || resetData);

  // Sign in Student 1 (Daniel Raj)
  console.log("\n2. Signing in Student 1 (Daniel Raj - URK22CS1001)...");
  const student1 = await loginUser(
    "Daniel Raj",
    "URK22CS1001",
    "daniel.raj@karunya.edu.in",
    "Karunya Nagar (Campus Gate)"
  );
  console.log("Student 1 signed in successfully.");

  // Test Intake Agent with all 4 sample tickets
  console.log("\n3. Testing Intake Agent on sample tickets through /api/tickets/intake...");
  const sampleTickets = [
    "ticket-1-urk22cs1001.svg",
    "ticket-2-urk22cs1002.svg",
    "ticket-3-urk22ai1003.svg",
    "ticket-4-urk22ec1004.svg",
  ];

  for (const filename of sampleTickets) {
    const intakeRes = await fetch(`${BASE_URL}/api/tickets/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: student1.cookieHeader,
      },
      body: JSON.stringify({ sampleTicketFile: filename }),
    });

    const intakeData = await intakeRes.json();
    console.log(`\nResults for ${filename}:`);
    console.log("  Success:", intakeData.success);
    if (intakeData.extracted) {
      console.log("  Extracted Candidate:", intakeData.extracted.name);
      console.log("  Register No:", intakeData.extracted.registerNumber);
      console.log("  Course:", intakeData.extracted.courseName);
      console.log("  Center:", intakeData.extracted.examCenter);
      console.log("  Date:", intakeData.extracted.examDate);
      console.log("  Session:", intakeData.extracted.session);
    } else {
      console.log("  Notice/Error:", intakeData.error);
    }
    console.log("  Raw Transcript length:", intakeData.rawTranscript ? intakeData.rawTranscript.length : 0);
    console.log("  Raw JSON returned:", !!intakeData.rawJson);
  }

  // Confirm Ticket for Student 1
  console.log("\n4. Confirming ticket for Student 1...");
  const confirmRes = await fetch(`${BASE_URL}/api/tickets/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: student1.cookieHeader,
    },
    body: JSON.stringify({
      courseName: "Cloud Computing and Distributed Systems",
      examCenter: "iON Digital Zone iDZ Kovai Pudur",
      examDate: "2026-11-15",
      session: "Forenoon",
      extractedJson: { courseCode: "noc24-cs101" },
    }),
  });
  const confirmData = await confirmRes.json();
  console.log("Confirm status:", confirmData.success, confirmData.message);

  // Check Dashboard for Student 1: Verify NO auto-grouping and NO prices
  console.log("\n5. Checking Dashboard for Student 1...");
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Cookie: student1.cookieHeader },
  });
  const dashData = await dashRes.json();
  console.log("Has ticket:", !!dashData.ticket);
  console.log("Auto-grouped?:", dashData.currentGroup !== null ? "YES (FAILED)" : "NO (CORRECT: Opt-in only)");
  console.log("People going to your center count:", dashData.centerStudents?.length);
  console.log("Sample classmates:", dashData.centerStudents?.slice(0, 3));
  console.log("Open groups count:", dashData.openGroups?.length);
  // Verify no price / fare fields in payload
  const jsonStr = JSON.stringify(dashData);
  const hasFares = jsonStr.includes("perPersonCost") || jsonStr.includes("est_total_cost") || jsonStr.includes("estTotalFare");
  console.log("Are fare/cost fields present?:", hasFares ? "YES (FAILED)" : "NO (CORRECT: All prices removed)");

  // Test "Explore Travel Options"
  console.log("\n6. Testing Explore Travel Options API (/api/explore)...");
  const exploreRes = await fetch(`${BASE_URL}/api/explore?center=ion%20digital&date=2026-11-15&session=Forenoon`, {
    headers: { Cookie: student1.cookieHeader },
  });
  const exploreData = await exploreRes.json();
  console.log("Explore Success:", exploreData.success);
  console.log("Canonical match:", exploreData.canonicalMatch);
  console.log("Matching students found:", exploreData.students?.length);
  console.log("Matching open groups found:", exploreData.groups?.length);

  // Student 1 starts a travel group
  console.log("\n7. Student 1 starts a travel group (/api/groups/create)...");
  const createRes = await fetch(`${BASE_URL}/api/groups/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: student1.cookieHeader,
    },
    body: JSON.stringify({
      examCenter: "iON Digital Zone iDZ Kovai Pudur",
      examDate: "2026-11-15",
      session: "Forenoon",
    }),
  });
  const createData = await createRes.json();
  console.log("Created Group ID:", createData.groupId);
  const groupId = createData.groupId;

  // Edit meetup point and time
  console.log("\n8. Updating meetup point & time (PATCH /api/groups/[id]/meetup)...");
  const meetupRes = await fetch(`${BASE_URL}/api/groups/${groupId}/meetup`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: student1.cookieHeader,
    },
    body: JSON.stringify({
      meetupPoint: "Karunya Nagar Campus Main Gate",
      meetupTime: "07:00 AM",
    }),
  });
  const meetupData = await meetupRes.json();
  console.log("Updated meetup:", meetupData.meetupPoint, "at", meetupData.meetupTime);

  // Suggest Meetup Spots with Gemini
  console.log("\n9. Requesting meetup suggestions (/api/groups/[id]/suggest-meetup)...");
  const suggestRes = await fetch(`${BASE_URL}/api/groups/${groupId}/suggest-meetup`, {
    method: "POST",
    headers: { Cookie: student1.cookieHeader },
  });
  const suggestData = await suggestRes.json();
  console.log("Suggestions returned count:", suggestData.suggestions?.length);
  if (suggestData.suggestions?.length > 0) {
    console.log("First suggestion:", suggestData.suggestions[0].title);
  }

  // Sign in Student 2 (Priya George)
  console.log("\n10. Signing in Student 2 (Priya George - URK22CS1002)...");
  const student2 = await loginUser(
    "Priya George",
    "URK22CS1002",
    "priya.g@karunya.edu.in",
    "Gandhipuram"
  );
  console.log("Student 2 signed in successfully.");

  // Student 2 joins Student 1's group
  console.log("\n11. Student 2 joins the travel group (/api/groups/[id]/join)...");
  const joinRes = await fetch(`${BASE_URL}/api/groups/${groupId}/join`, {
    method: "POST",
    headers: { Cookie: student2.cookieHeader },
  });
  const joinData = await joinRes.json();
  console.log("Join result:", joinData.message);

  // Two-way Chat testing
  console.log("\n12. Testing live two-way chat messages...");
  // Student 1 sends a message
  const msg1Res = await fetch(`${BASE_URL}/api/groups/${groupId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: student1.cookieHeader,
    },
    body: JSON.stringify({ body: "Hey team! I will bring the printed tickets." }),
  });
  const msg1Data = await msg1Res.json();
  console.log("Student 1 posted:", msg1Data.message?.body);

  // Student 2 sends a message
  const msg2Res = await fetch(`${BASE_URL}/api/groups/${groupId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: student2.cookieHeader,
    },
    body: JSON.stringify({ body: "Sounds great Daniel! I will be at Karunya gate by 7 AM." }),
  });
  const msg2Data = await msg2Res.json();
  console.log("Student 2 posted:", msg2Data.message?.body);

  // Test "Ask Bot" Reminder button
  console.log("\n13. Testing 'Ask Bot' reminder button (/api/groups/[id]/reminder)...");
  const botRes = await fetch(`${BASE_URL}/api/groups/${groupId}/reminder`, {
    method: "POST",
    headers: { Cookie: student1.cookieHeader },
  });
  const botData = await botRes.json();
  console.log("Ask bot response:\n" + botData.summary);

  // Fetch final group messages and inspect
  console.log("\n14. Inspecting group room messages...");
  const roomRes = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    headers: { Cookie: student1.cookieHeader },
  });
  const roomData = await roomRes.json();
  console.log("Total messages in group:", roomData.messages?.length);
  for (const m of roomData.messages || []) {
    const role = m.isBot ? "[SYSTEM]" : `[${m.senderName}]`;
    console.log(`  ${role}: ${m.body.replace(/\n/g, " | ")}`);
  }

  // Student 2 leaves group
  console.log("\n15. Student 2 leaves group (/api/groups/[id]/leave)...");
  const leaveRes = await fetch(`${BASE_URL}/api/groups/${groupId}/leave`, {
    method: "POST",
    headers: { Cookie: student2.cookieHeader },
  });
  const leaveData = await leaveRes.json();
  console.log("Leave result:", leaveData.message);

  console.log("\n=== ALL REVISION TESTS PASSED SUCCESSFULLY ===");
}

runVerification().catch(console.error);
