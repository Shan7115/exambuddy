import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { signSession, COOKIE_NAME } from "@/lib/auth/session";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, registerNo, name, pickupArea, code } = body;

    if (!email?.trim() || !code?.trim() || !registerNo?.trim()) {
      return NextResponse.json(
        { error: "Email, register number, and verification code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRegNo = registerNo.trim().toUpperCase();
    const cleanCode = code.trim();
    const cleanName = name?.trim() || "Student";
    const cleanPickup = pickupArea?.trim() || "Karunya Nagar (Campus Gate)";

    const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
    const supabase = getAdminSupabase();

    // 1. Verify OTP code from database
    const { data: validOtp, error: otpErr } = await supabase
      .from("otp_codes")
      .select("id, email, register_no, expires_at")
      .eq("email", cleanEmail)
      .eq("code_hash", codeHash)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr) {
      console.error("OTP verification error:", otpErr);
      return NextResponse.json(
        { error: "Database error during code verification." },
        { status: 500 }
      );
    }

    if (!validOtp) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please check your code or request a new one." },
        { status: 400 }
      );
    }

    // 2. Lookup existing user or create new account
    let userId: string;
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, name, register_no, email, pickup_area, college")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.register_no.toUpperCase() !== cleanRegNo) {
        return NextResponse.json(
          { error: "Register number does not match existing records for this email." },
          { status: 400 }
        );
      }
      userId = existingUser.id;

      // Update pickup area or name if updated
      await supabase
        .from("users")
        .update({
          name: cleanName || existingUser.name,
          pickup_area: cleanPickup || existingUser.pickup_area,
        })
        .eq("id", userId);
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await supabase
        .from("users")
        .insert({
          name: cleanName,
          register_no: cleanRegNo,
          email: cleanEmail,
          college: "Karunya Institute of Technology and Sciences",
          pickup_area: cleanPickup,
          is_demo: false,
        })
        .select()
        .single();

      if (createErr || !newUser) {
        console.error("User creation error:", createErr);
        return NextResponse.json(
          { error: "Could not create user account. Please try again." },
          { status: 500 }
        );
      }
      userId = newUser.id;
    }

    // 3. Clean up the used OTP code
    await supabase.from("otp_codes").delete().eq("id", validOtp.id);

    // 4. Create signed session token
    const sessionPayload = {
      userId,
      name: cleanName,
      registerNo: cleanRegNo,
      email: cleanEmail,
      pickupArea: cleanPickup,
      college: "Karunya Institute of Technology and Sciences",
    };

    const token = await signSession(sessionPayload);

    // 5. Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: sessionPayload,
      message: "Signed in successfully.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying code." },
      { status: 500 }
    );
  }
}
