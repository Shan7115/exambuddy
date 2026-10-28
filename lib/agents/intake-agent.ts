import { getGeminiClient, getGeminiModelName } from "./gemini";
import { matchToCanonicalCenter } from "./center-matcher";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { DEFAULT_EXAM_DATE, type CanonicalCenter } from "@/lib/constants/demo-data";

export interface ExtractedTicket {
  name: string;
  registerNo: string;
  courseName: string;
  courseCode: string;
  examCenter: string;
  canonicalCenter: CanonicalCenter;
  city: string;
  examDate: string;
  session: "Forenoon" | "Afternoon";
  reportingTime: string;
  gateCloses: string;
  rawJson?: Record<string, unknown>;
}

export interface IntakeResult {
  success: boolean;
  extracted?: ExtractedTicket;
  isMismatch?: boolean;
  mismatchReason?: string;
  fallbackUsed?: boolean;
  error?: string;
}

/**
 * Log an event to agent_events table
 */
async function logAgentEvent(
  userId: string,
  message: string,
  status: "running" | "done" | "failed"
) {
  try {
    const supabase = getAdminSupabase();
    await supabase.from("agent_events").insert({
      user_id: userId,
      agent: "Intake agent",
      message,
      status,
    });
  } catch (e) {
    console.error("Failed to log agent event:", e);
  }
}

/**
 * Helper to extract fields directly from SVG markup
 */
function extractFromSvgText(svgContent: string): Partial<ExtractedTicket> | null {
  try {
    // Check for roll number pattern
    const regMatch = svgContent.match(/URK\d{2}[A-Z]{2}\d{4}/i);
    const registerNo = regMatch ? regMatch[0].toUpperCase() : undefined;

    // Course title match
    let courseName: string | undefined;
    const courseMatch = svgContent.match(
      /<text[^>]*font-weight="700"[^>]*>([A-Za-z0-9\s,:.-]+)<\/text>/g
    );
    if (courseMatch) {
      for (const m of courseMatch) {
        const text = m.replace(/<[^>]+>/g, "").trim();
        if (
          text.includes("Cloud") ||
          text.includes("Natural Language") ||
          text.includes("Deep Learning") ||
          text.includes("Robotics") ||
          text.includes("Systems") ||
          text.includes("Processing")
        ) {
          courseName = text;
          break;
        }
      }
    }

    // Name match
    let name: string | undefined;
    const nameMatch = svgContent.match(/Candidate Name:[\s\S]*?<text[^>]*>([A-Za-z\s]+)<\/text>/i);
    if (nameMatch && nameMatch[1]) {
      name = nameMatch[1].trim();
    }

    // Exam center match
    let examCenter: string | undefined;
    if (svgContent.includes("Kovai Pudur")) {
      examCenter = "iON Digital Zone iDZ Kovai Pudur";
    } else if (svgContent.includes("KGiSL")) {
      examCenter = "KGiSL Institute of Technology, Saravanampatti";
    } else if (svgContent.includes("Krishna") || svgContent.includes("SKCET")) {
      examCenter = "Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur";
    }

    // Session match
    let session: "Forenoon" | "Afternoon" | undefined;
    if (svgContent.includes("Afternoon")) {
      session = "Afternoon";
    } else if (svgContent.includes("Forenoon")) {
      session = "Forenoon";
    }

    if (registerNo || examCenter || courseName) {
      return {
        name,
        registerNo,
        courseName,
        examCenter,
        session,
        examDate: DEFAULT_EXAM_DATE,
      };
    }
  } catch (e) {
    console.error("Error parsing SVG text:", e);
  }
  return null;
}

/**
 * Runs the Intake Agent using Gemini Vision
 */
export async function runIntakeAgent(
  imageBuffer: Buffer,
  mimeType: string,
  signedInUser: { id: string; name: string; registerNo: string }
): Promise<IntakeResult> {
  const userId = signedInUser.id;

  // 1. Initial agent event
  await logAgentEvent(
    userId,
    `Analyzing uploaded NPTEL hall ticket for ${signedInUser.name}...`,
    "running"
  );

  const isSvg =
    mimeType.includes("svg") ||
    imageBuffer.subarray(0, 100).toString("utf-8").includes("<svg");

  // Fast path for SVG tickets
  if (isSvg) {
    const svgStr = imageBuffer.toString("utf-8");
    const svgData = extractFromSvgText(svgStr);

    if (svgData && svgData.registerNo) {
      const extractedReg = svgData.registerNo.toUpperCase().trim();
      const expectedReg = signedInUser.registerNo.toUpperCase().trim();

      // Verification Check: Reject ticket if register number doesn't match signed-in student
      if (extractedReg !== expectedReg) {
        const reason = `Ticket register number (${extractedReg}) does not match your signed-in Karunya account (${expectedReg}).`;
        await logAgentEvent(userId, `Verification rejected: ${reason}`, "failed");
        return {
          success: false,
          isMismatch: true,
          mismatchReason: reason,
        };
      }

      const canonicalCenter = matchToCanonicalCenter(
        svgData.examCenter || "iON Digital Zone"
      );
      const session = svgData.session || "Forenoon";

      const extracted: ExtractedTicket = {
        name: svgData.name || signedInUser.name,
        registerNo: extractedReg,
        courseName: svgData.courseName || "Cloud Computing and Distributed Systems",
        courseCode: "noc24-cs101",
        examCenter: svgData.examCenter || canonicalCenter.name,
        canonicalCenter,
        city: "Coimbatore",
        examDate: svgData.examDate || DEFAULT_EXAM_DATE,
        session,
        reportingTime: session === "Forenoon" ? "07:30 AM" : "12:30 PM",
        gateCloses: session === "Forenoon" ? "08:45 AM" : "01:45 PM",
        rawJson: svgData,
      };

      await logAgentEvent(
        userId,
        `Extracted hall ticket for ${extracted.name} (${extracted.registerNo}) at ${canonicalCenter.shortName} (${session}).`,
        "done"
      );

      return {
        success: true,
        extracted,
        fallbackUsed: false,
      };
    }
  }

  // Vision pipeline for PNG / JPG / Raster uploads
  const base64Data = imageBuffer.toString("base64");

  const prompt = `You are the ExamBuddy Intake Agent for Karunya University students taking NPTEL exams.
Analyze this NPTEL hall ticket image carefully and extract the following details into strict JSON format with no markdown formatting around it:
{
  "name": "Student Full Name",
  "registerNo": "Register number / Roll number (e.g., URK22CS1001)",
  "courseName": "Full NPTEL course title",
  "courseCode": "Course code (e.g. noc24-cs101)",
  "examCenter": "Name and address of exam center / venue",
  "city": "City name (e.g. Coimbatore)",
  "examDate": "Exam date in YYYY-MM-DD format (if ambiguous use 2026-11-15)",
  "session": "Forenoon" or "Afternoon",
  "reportingTime": "Reporting time (e.g. 07:30 AM or 12:30 PM)",
  "gateCloses": "Gate closure time (e.g. 08:45 AM or 01:45 PM)"
}
Return ONLY the JSON object.`;

  let responseText = "";
  let attempt = 0;
  const maxRetries = 2;
  const modelName = getGeminiModelName();

  while (attempt <= maxRetries) {
    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "image/png",
          },
        },
      ]);

      const response = await result.response;
      responseText = response.text();
      if (responseText) break;
    } catch (err: unknown) {
      attempt++;
      console.warn(`Intake Agent Gemini attempt ${attempt} failed:`, err);
      if (attempt > maxRetries) {
        await logAgentEvent(
          userId,
          "Vision model timed out or encountered an error. Falling back to manual confirmation form.",
          "failed"
        );
        return createFallbackResult(signedInUser);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Parse JSON response
  try {
    const cleanJson = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

    const rawSession = String(parsed.session || "").toLowerCase();
    const session: "Forenoon" | "Afternoon" =
      rawSession.includes("after") || rawSession.includes("02") || rawSession.includes("pm")
        ? "Afternoon"
        : "Forenoon";

    const canonicalCenter = matchToCanonicalCenter(parsed.examCenter || "");

    const extracted: ExtractedTicket = {
      name: parsed.name || signedInUser.name,
      registerNo: (parsed.registerNo || signedInUser.registerNo).toUpperCase().trim(),
      courseName: parsed.courseName || "NPTEL Certified Course",
      courseCode: parsed.courseCode || "noc24-cs101",
      examCenter: parsed.examCenter || canonicalCenter.name,
      canonicalCenter,
      city: parsed.city || "Coimbatore",
      examDate: parsed.examDate || DEFAULT_EXAM_DATE,
      session,
      reportingTime:
        parsed.reportingTime || (session === "Forenoon" ? "07:30 AM" : "12:30 PM"),
      gateCloses:
        parsed.gateCloses || (session === "Forenoon" ? "08:45 AM" : "01:45 PM"),
      rawJson: parsed,
    };

    // Verification Check: Reject ticket if register number doesn't match signed-in student
    const expectedReg = signedInUser.registerNo.toUpperCase().trim();
    const extractedReg = extracted.registerNo;

    if (
      extractedReg &&
      extractedReg !== expectedReg &&
      !extractedReg.includes(expectedReg) &&
      !expectedReg.includes(extractedReg)
    ) {
      const reason = `Ticket register number (${extractedReg}) does not match your signed-in Karunya account (${expectedReg}).`;
      await logAgentEvent(userId, `Verification rejected: ${reason}`, "failed");
      return {
        success: false,
        isMismatch: true,
        mismatchReason: reason,
        extracted,
      };
    }

    await logAgentEvent(
      userId,
      `Extracted hall ticket for ${extracted.name} (${extracted.registerNo}) at ${canonicalCenter.shortName} (${session}).`,
      "done"
    );

    return {
      success: true,
      extracted,
      fallbackUsed: false,
    };
  } catch (parseError) {
    console.error("Failed to parse Gemini output:", parseError, responseText);
    await logAgentEvent(
      userId,
      "Extraction format issue; provided editable form with detected fields.",
      "done"
    );
    return createFallbackResult(signedInUser);
  }
}

/**
 * Fallback when model is unavailable or fails to parse
 */
function createFallbackResult(signedInUser: {
  name: string;
  registerNo: string;
}): IntakeResult {
  const canonicalCenter = matchToCanonicalCenter("iON Digital Zone");
  return {
    success: true,
    fallbackUsed: true,
    extracted: {
      name: signedInUser.name,
      registerNo: signedInUser.registerNo,
      courseName: "Cloud Computing and Distributed Systems",
      courseCode: "noc24-cs101",
      examCenter: canonicalCenter.name,
      canonicalCenter,
      city: "Coimbatore",
      examDate: DEFAULT_EXAM_DATE,
      session: "Forenoon",
      reportingTime: "07:30 AM",
      gateCloses: "08:45 AM",
    },
  };
}
