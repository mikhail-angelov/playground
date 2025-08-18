import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Path to your SQLite database file
const sqlitePath = process.env.DB_STORAGE || "sqlite.db";

// Create or open the SQLite database
export const sqlite = new Database(sqlitePath);

// Initialize Drizzle ORM with the database and schema
export const db = drizzle(sqlite, { schema, logger: true });

export * from "./schema";
