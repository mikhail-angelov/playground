import { eq } from "drizzle-orm";
import { db, users, getUserApi, ProfileDto } from "../db";

export async function getProfile(userId: number): Promise<ProfileDto> {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new Error("User not found");
  }
  return getUserApi(user);
}

export async function saveProfile(userId: number, {key, provider, telegram }: ProfileDto) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new Error("User not found");
  }
  return db
    .update(users)
    .set({ api: JSON.stringify({key, provider}), telegram:(telegram || "").toLowerCase() })
    .where(eq(users.id, userId))
    .run();
}
