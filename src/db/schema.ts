import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferModel } from "drizzle-orm";

export interface Api {
  provider: string;
  key: string;
}

export function getUserApi(user: User): Api | null {
  if (!user.api) {
    return null;
  }
  if (typeof user.api === "object") {
    return user.api;
  }
  try {
    return JSON.parse(user.api as string);
  } catch (e) {
    console.log("parse user api error:", e);
    return null;
  }
}

// User table for authentication
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  api: text("api", { mode: "json" }),
});

// Projects table
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // content: text("content", { mode: "json" }).notNull(),
  image: text("image"),
  projectId: text("projectId").notNull(),
  email: text("email"),
  rating: integer("rating").notNull().default(0),
});

// TypeScript types for User
export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;

// TypeScript types for Project
export type Project = InferModel<typeof projects>;
export type NewProject = InferModel<typeof projects, "insert">;
