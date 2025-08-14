import { NextRequest, NextResponse } from "next/server";
import { auth, AUTH_COOKIE, APP_URL } from "@/services/authService";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_token`);
  }

  try {
    const sessionToken = await auth(token);

    // Set cookie and redirect to home
    const res = NextResponse.redirect(`${APP_URL}/`);
    res.cookies.set(AUTH_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (e) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_token`);
  }
}
