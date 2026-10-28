import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface SessionUser {
  userId: string;
  name: string;
  registerNo: string;
  email: string;
  pickupArea?: string;
  college?: string;
}

const COOKIE_NAME = "exambuddy_session";
const DEFAULT_SECRET = "exambuddy-karunya-super-secret-key-32-chars-min!";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  const secret = getSecretKey();
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      registerNo: payload.registerNo as string,
      email: payload.email as string,
      pickupArea: (payload.pickupArea as string) || undefined,
      college: (payload.college as string) || "Karunya Institute of Technology and Sciences",
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
