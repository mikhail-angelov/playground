"use server";

import { db, users, projects } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function getTelegramProjects(telegramId: string) {
  try {
    // 1. Find user by telegram ID
    // Note: telegramId coming from WebApp is usually numeric string or number
    const user = await db
      .select()
      .from(users)
      .where(eq(users.telegram, telegramId))
      .get();

    if (!user) {
      console.log(`No user found for telegram ID: ${telegramId}`);
      return [];
    }

    // 2. Find projects for this user that have the "telegram" tag
    // Since tags is stored as JSON array in SQLite, we can use sql helper for json_each or similar
    // but for simplicity and better performance if the list is small, we can fetch all and filter,
    // or use a json_contains like logic. SQLite json_each is common.
    
    // Using Drizzle sql for JSON filtering in SQLite
    const userProjects = await db
      .select({
        id: projects.id,
        projectId: projects.projectId,
        name: projects.name,
        image: projects.image,
      })
      .from(projects)
      .where(
        sql`${projects.userId} = ${user.id} AND EXISTS (
          SELECT 1 FROM json_each(${projects.tags}) WHERE value = 'telegram'
        )`
      )
      .all();

    return userProjects;
  } catch (error) {
    console.error("Error fetching telegram projects:", error);
    return [];
  }
}
