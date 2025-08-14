import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { getProfile, saveProfile } from "@/services/profileService";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    const user = await getAuthUser(token);
    const profile = await getProfile(user.id);
    return NextResponse.json(profile);
  } catch (e) {
    NextResponse.json(
      { error: "Unauthorized: No token provided" },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    const user = await getAuthUser(token);
    const body = await req.json();
    // Expecting { provider: string, key: string } in body
    if (!body || typeof body !== "object" || !body.provider || !body.key) {
      return { error: "Invalid request body" };
    }
    await saveProfile(user.id, {
      provider: body.provider,
      key: body.key,
    });
    return { ok: true };
  } catch (e) {
    return { error: "Unauthorized: No token provided" };
  }
}
