"use server";
import { cookies } from "next/headers";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { getProfile, saveProfile } from "@/services/profileService";

export async function get() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    const user = await getAuthUser(token);
    const profile = await getProfile(user.id);
    return profile;
  } catch (e) {
    console.log("get profile error: ", e);
    throw { error: "Unauthorized: No token provided" };
  }
}

export async function save(body: { key: string; provider: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    const user = await getAuthUser(token);
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
    console.log("save profile error: ", e);
    throw { error: "Unauthorized: No token provided" };
  }
}
