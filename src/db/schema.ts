import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";

export interface ProfileDto {
  provider: string;
  key: string;
  telegram: string;
}

export function getUserApi(user: User): ProfileDto {
  if (!user.api) {
    return { provider: "deepSeek", key: "", telegram: user.telegram || "" };
  }
  try {
    return JSON.parse(user.api as string);
  } catch (e) {
    console.log("parse user api error:", e);
    return { provider: "deepSeek", key: "", telegram: user.telegram || "" };
  }
}

// User table for authentication
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  api: text("api", { mode: "json" }),
  telegram: text("telegram"),
  verifiedTelegram: integer("verified_telegram", { mode: "boolean" }).default(false),
});

// Projects table
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  image: text("image"),
  projectId: text("projectId").notNull(),
  email: text("email").notNull(),
  tags: text("tags", { mode: "json" }).notNull()
    .$type<string[]>()
    .default(sql`(json_array())`),
});

// Metrics table for likes and forks
export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "like" or "fork"
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript types for User
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// TypeScript types for Project
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

// TypeScript types for Metric
export type Metric = InferSelectModel<typeof metrics>;
export type NewMetric = InferInsertModel<typeof metrics>;
