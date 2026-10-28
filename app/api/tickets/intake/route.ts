import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { runIntakeAgent } from "@/lib/agents/intake-agent";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let mimeType = "image/png";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const sampleId = formData.get("sampleId") as string | null;

      if (sampleId) {
        // Load preset sample ticket
        const samplePath = path.join(process.cwd(), "public", "sample-tickets", sampleId);
        if (fs.existsSync(samplePath)) {
          buffer = fs.readFileSync(samplePath);
          mimeType = sampleId.endsWith(".svg") ? "image/svg+xml" : "image/png";
        }
      } else if (file) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        mimeType = file.type || "image/png";
      }
    } else {
      const body = await request.json();
      if (body.sampleTicketFile) {
        const samplePath = path.join(
          process.cwd(),
          "public",
          "sample-tickets",
          body.sampleTicketFile
        );
        if (fs.existsSync(samplePath)) {
          buffer = fs.readFileSync(samplePath);
          mimeType = "image/svg+xml";
        }
      } else if (body.imageBase64) {
        buffer = Buffer.from(body.imageBase64, "base64");
        mimeType = body.mimeType || "image/png";
      }
    }

    if (!buffer) {
      return NextResponse.json(
        { error: "No hall ticket image file or sample provided." },
        { status: 400 }
      );
    }

    // Run the Intake Agent
    const result = await runIntakeAgent(buffer, mimeType, {
      id: user.userId,
      name: user.name,
      registerNo: user.registerNo,
    });

    // The image buffer is intentionally freed here (garbage collected)
    // Only extracted structured metadata is returned and retained.
    buffer = null;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Intake route error:", error);
    return NextResponse.json(
      { error: "Failed to process hall ticket. Please try again or use manual confirmation." },
      { status: 500 }
    );
  }
}
