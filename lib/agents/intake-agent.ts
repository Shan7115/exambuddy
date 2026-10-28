import { getGeminiClient, getGeminiModelName } from "./gemini";
import { matchToCanonicalCenter } from "./center-matcher";
import { type CanonicalCenter } from "@/lib/constants/demo-data";
import { SchemaType } from "@google/generative-ai";

export interface ExtractedFields {
  name: string | null;
  registerNumber: string | null;
  courseName: string | null;
  courseCode: string | null;
  examCenter: string | null;
  examDate: string | null;
  session: "forenoon" | "afternoon" | null;
}

export interface IntakeResult {
  success: boolean;
  extracted?: ExtractedFields & {
    canonicalCenter?: CanonicalCenter | null;
  };
  rawTranscript?: string;
  rawJson?: Record<string, any> | null;
  isMismatch?: boolean;
  mismatchReason?: string;
  error?: string;
}

/**
 * Normalizes an exam date string into ISO YYYY-MM-DD
 */
export function normalizeDateToIso(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim();

  // Pattern YYYY-MM-DD
  const isoMatch = clean.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Pattern DD-MM-YYYY
  const dmyMatch = clean.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  // Fallback to JS Date parse
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (y >= 2024 && y <= 2030) {
      return `${y}-${m}-${day}`;
    }
  }

  return null;
}

/**
 * Normalizes session string into "forenoon" or "afternoon"
 * Maps 9:00 AM / FN -> "forenoon", 2:00 PM / AN -> "afternoon"
 */
export function normalizeSession(sessionStr: string | null | undefined): "forenoon" | "afternoon" | null {
  if (!sessionStr || typeof sessionStr !== "string") return null;
  const lower = sessionStr.toLowerCase();

  if (
    lower.includes("afternoon") ||
    lower.includes("an") ||
    lower.includes("02:00") ||
    lower.includes("2:00") ||
    lower.includes("2 pm") ||
    lower.includes("14:00")
  ) {
    return "afternoon";
  }

  if (
    lower.includes("forenoon") ||
    lower.includes("fn") ||
    lower.includes("09:00") ||
    lower.includes("9:00") ||
    lower.includes("9 am") ||
    lower.includes("07:30") ||
    lower.includes("morning")
  ) {
    return "forenoon";
  }

  return null;
}

/**
 * Two-pass intake agent using Gemini:
 * Pass 1: Transcribe all ticket text verbatim (at full resolution, no downscaling)
 * Pass 2: Extract structured fields from the transcript into strict JSON (temperature 0)
 */
export async function runIntakeAgent(
  imageBuffer: Buffer,
  mimeType: string,
  signedInUser: { id: string; name: string; registerNo: string }
): Promise<IntakeResult> {
  const modelName = getGeminiModelName();
  let genAI;

  try {
    genAI = getGeminiClient();
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Gemini API client not configured. Missing GEMINI_API_KEY.",
    };
  }

  const isSvg =
    mimeType.includes("svg") ||
    imageBuffer.subarray(0, 100).toString("utf-8").includes("<svg");

  let transcript = "";

  // -------------------------------------------------------------
  // PASS 1: Verbatim Transcription
  // -------------------------------------------------------------
  try {
    const pass1Model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0,
      },
    });

    const pass1Prompt = `You are an expert OCR transcription agent.
Transcribe ALL visible text on this NPTEL hall ticket verbatim, line by line.
Preserve all candidate names, register/roll numbers, course titles, course codes, exam dates, session timings, and center names/addresses exactly as written.
Do not summarize. Do not skip any lines.`;

    let pass1Result;

    if (isSvg) {
      // Pass the SVG document text directly
      const svgText = imageBuffer.toString("utf-8");
      pass1Result = await pass1Model.generateContent([
        pass1Prompt,
        `\n\nHall Ticket SVG Document:\n${svgText}`,
      ]);
    } else {
      // Send original raster image at full resolution (no downscaling or heavy compression)
      pass1Result = await pass1Model.generateContent([
        pass1Prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: mimeType || "image/png",
          },
        },
      ]);
    }

    transcript = (await pass1Result.response).text() || "";
  } catch (err: any) {
    console.error("Intake Pass 1 failed:", err);
    const msg = err.message || String(err);
    if (msg.includes("404") || msg.includes("not found") || msg.includes("is not found")) {
      return {
        success: false,
        error: `Gemini model error: Model "${modelName}" was not found (404). Please verify GEMINI_MODEL in .env.local.`,
      };
    }
    return {
      success: false,
      error: `Gemini transcription failed: ${msg}`,
    };
  }

  // -------------------------------------------------------------
  // PASS 2: Structured JSON Extraction from Transcript
  // -------------------------------------------------------------
  let rawJson: Record<string, any> | null = null;
  try {
    const pass2Model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, nullable: true },
            registerNumber: { type: SchemaType.STRING, nullable: true },
            courseName: { type: SchemaType.STRING, nullable: true },
            courseCode: { type: SchemaType.STRING, nullable: true },
            examCenter: { type: SchemaType.STRING, nullable: true },
            examDate: { type: SchemaType.STRING, nullable: true },
            session: { type: SchemaType.STRING, nullable: true },
          },
          required: [
            "name",
            "registerNumber",
            "courseName",
            "courseCode",
            "examCenter",
            "examDate",
            "session",
          ],
        },
        temperature: 0,
      },
    });

    const pass2Prompt = `You are the ExamBuddy Extraction Agent for Karunya University students taking NPTEL exams.
Given the following verbatim transcript of an NPTEL hall ticket, extract the structured fields.

Rules:
1. Extract:
   - "name": student candidate full name, or null if not readable.
   - "registerNumber": student register/roll number (e.g. URK22CS1001), or null if not readable.
   - "courseName": full NPTEL course title, or null if not readable.
   - "courseCode": course code (e.g. noc24-cs101), or null if not readable.
   - "examCenter": full name and address/city of assigned exam center venue, or null if not readable.
   - "examDate": exam date normalized to ISO "YYYY-MM-DD" format (e.g. 2026-11-15), or null if not readable.
   - "session": either "forenoon" or "afternoon" (map 9:00 AM or FN to "forenoon", 2:00 PM or AN to "afternoon"), or null if not readable.
2. If any field cannot be read with confidence from the transcript, return null for that field. Never guess or hallucinate.

Transcript:
${transcript}`;

    const pass2Result = await pass2Model.generateContent(pass2Prompt);
    const pass2Text = (await pass2Result.response).text();

    try {
      rawJson = JSON.parse(pass2Text);
    } catch {
      const clean = pass2Text.replace(/```json/g, "").replace(/```/g, "").trim();
      rawJson = JSON.parse(clean);
    }
  } catch (err: any) {
    console.error("Intake Pass 2 failed:", err);
    return {
      success: false,
      rawTranscript: transcript,
      error: `Gemini field extraction failed: ${err.message || String(err)}`,
    };
  }

  if (!rawJson) {
    return {
      success: false,
      rawTranscript: transcript,
      error: "Model returned empty response for structured fields.",
    };
  }

  // Normalize extracted values
  const name = rawJson.name ? String(rawJson.name).trim() : null;
  const registerNumber = rawJson.registerNumber
    ? String(rawJson.registerNumber).trim().toUpperCase()
    : null;
  const courseName = rawJson.courseName ? String(rawJson.courseName).trim() : null;
  const courseCode = rawJson.courseCode ? String(rawJson.courseCode).trim() : null;
  const examCenter = rawJson.examCenter ? String(rawJson.examCenter).trim() : null;
  const examDate = normalizeDateToIso(rawJson.examDate);
  const session = normalizeSession(rawJson.session);

  const canonicalCenter = examCenter ? matchToCanonicalCenter(examCenter) : null;

  // Cross-check register number if readable
  if (registerNumber && signedInUser?.registerNo) {
    const cleanExpected = signedInUser.registerNo.toUpperCase().trim();
    if (
      registerNumber !== cleanExpected &&
      !registerNumber.includes(cleanExpected) &&
      !cleanExpected.includes(registerNumber)
    ) {
      return {
        success: false,
        isMismatch: true,
        mismatchReason: `Ticket register number (${registerNumber}) does not match your signed-in Karunya account (${cleanExpected}).`,
        rawTranscript: transcript,
        rawJson,
        extracted: {
          name,
          registerNumber,
          courseName,
          courseCode,
          examCenter,
          canonicalCenter,
          examDate,
          session,
        },
      };
    }
  }

  return {
    success: true,
    rawTranscript: transcript,
    rawJson,
    extracted: {
      name,
      registerNumber,
      courseName,
      courseCode,
      examCenter,
      canonicalCenter,
      examDate,
      session,
    },
  };
}
