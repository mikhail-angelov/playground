import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

export function createTestDb() {
  // Use in-memory SQLite for isolation
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema, logger: false });
  // Create all tables using Drizzle ORM's schema
  // This is a workaround: run the CREATE TABLE statements for all tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      api TEXT,
      telegram TEXT,
      verified_telegram BOOLEAN DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      userId INTEGER NOT NULL,
      image TEXT,
      projectId TEXT NOT NULL,
      email TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      projectId INTEGER NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
  return { db, sqlite };
}
