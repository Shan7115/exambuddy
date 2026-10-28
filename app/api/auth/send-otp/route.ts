import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, registerNo, email, pickupArea } = body;

    // 1. Validation
    if (!name?.trim() || !registerNo?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name, register number, and email are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRegNo = registerNo.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanPickup = pickupArea?.trim() || "Karunya Nagar (Campus Gate)";

    // Strict Karunya email validation on server
    if (!cleanEmail.endsWith("@karunya.edu.in")) {
      return NextResponse.json(
        {
          error:
            "Invalid email domain. ExamBuddy is restricted to Karunya University students (@karunya.edu.in).",
        },
        { status: 400 }
      );
    }

    // Register number pattern validation (e.g. URK22CS1001 or similar Karunya format)
    if (cleanRegNo.length < 6) {
      return NextResponse.json(
        { error: "Please enter a valid Karunya register number (e.g., URK22CS1001)." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    // 2. Check if user already exists
    const { data: existingUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, register_no, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (fetchErr) {
      console.error("Database query error:", fetchErr);
      return NextResponse.json(
        { error: "Database error while verifying student records." },
        { status: 500 }
      );
    }

    if (existingUser && existingUser.register_no.toUpperCase() !== cleanRegNo) {
      return NextResponse.json(
        {
          error: `This email is already associated with register number ${existingUser.register_no}. Please verify your details.`,
        },
        { status: 400 }
      );
    }

    // 3. Generate 6-digit Demo OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Store in otp_codes table
    const { error: insertErr } = await supabase.from("otp_codes").insert({
      email: cleanEmail,
      register_no: cleanRegNo,
      name: cleanName,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("OTP storage error:", insertErr);
      return NextResponse.json(
        { error: "Could not issue verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      demoCode: otpCode,
      email: cleanEmail,
      registerNo: cleanRegNo,
      pickupArea: cleanPickup,
      expiresIn: "10 minutes",
      message: "Demo verification code generated.",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending code." },
      { status: 500 }
    );
  }
}
