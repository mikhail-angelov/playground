"use server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE, JWT_SECRET } from "@/services/authService";
import { redirect } from "next/navigation";
import { login as loginService } from "@/services/authService";

function isValidEmail(email: string): boolean {
  // Simple email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function login(
  email: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!email || !isValidEmail(email)) {
    return { error: "Invalid email" };
  }
  return loginService(email);
}

export async function logout() {
  try {
    (await cookies()).delete(AUTH_COOKIE);
    return redirect(`/`);
  } catch (e) {
    console.log("====", e);
    return { error: "Unauthorized: No token provided" };
  }
}

export async function getIsAuthenticated() {
  const cookieStore = await cookies();
  let isAuthenticated = false;
  try {
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    if (token) {
      const payload = jwt.verify(token, JWT_SECRET);
      isAuthenticated = !!payload;
    }
  } catch {
    isAuthenticated = false;
  }
  return isAuthenticated;
}
