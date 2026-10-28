import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getGeminiClient, getGeminiModelName } from "@/lib/agents/gemini";

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
    const supabase = getAdminSupabase();

    const { data: group } = await supabase
      .from("groups")
      .select("exam_center, exam_date, session")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    const { data: memberRows } = await supabase
      .from("group_members")
      .select("users(pickup_area)")
      .eq("group_id", groupId);

    const pickupAreas = Array.from(
      new Set(
        (memberRows || [])
          .map((r: any) => r.users?.pickup_area)
          .filter(Boolean)
      )
    );

    const prompt = `You are a Coimbatore transit coordinator for Karunya University students taking NPTEL exams.
Exam Center Destination: ${group.exam_center}
Members' Starting/Pickup Areas: ${pickupAreas.join(", ") || "Karunya Nagar"}

Suggest 3 convenient, easily recognizable meetup spots in Coimbatore for these students to gather before traveling together.
Rules:
- Give only practical physical spots (e.g., Karunya Main Campus Gate, Gandhipuram Bus Stand Platform, Kovaipudur Junction, Town Hall).
- Do NOT mention any prices, fares, taxi costs, auto costs, or monetary figures.
- Return a strict JSON array of objects:
[
  { "title": "Spot name", "description": "Brief 1-sentence landmark description" }
]
Return ONLY JSON.`;

    let suggestions: Array<{ title: string; description: string }> = [];

    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: getGeminiModelName(),
        generationConfig: { temperature: 0.2 },
      });

      const res = await model.generateContent(prompt);
      const text = (await res.response).text();
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      suggestions = JSON.parse(clean);
    } catch (modelErr) {
      console.warn("Gemini meetup suggestion error:", modelErr);
      // Fallback sensible Coimbatore suggestions without prices
      suggestions = [
        {
          title: "Karunya Nagar Main Bus Stop / Campus Gate",
          description: "Central meeting point right outside the university campus with ample waiting space.",
        },
        {
          title: "Kovaipudur Junction Bus Stop",
          description: "Convenient midpoint along Siruvani Main Road connecting to city centers.",
        },
        {
          title: "Gandhipuram Central Bus Terminus",
          description: "Major city hub with frequent local transit and clear landmarks.",
        },
      ];
    }

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error("Suggest meetup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate meetup suggestions." },
      { status: 500 }
    );
  }
}
