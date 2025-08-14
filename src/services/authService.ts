import { db, users, getUserApi } from "@/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sendMail } from "./mailService";

// Replace with your app's URL and JWT secret in production
export const APP_URL = process.env.APP_URL || "http://localhost:3000";
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Name of the cookie to store the JWT
export const AUTH_COOKIE = "auth_token";

export async function login(email: string) {
  // Check if user exists, otherwise create
  let user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    const inserted = db
      .insert(users)
      .values({ email }) // passwordHash unused for magic link
      .returning()
      .get();
    user = inserted;
  }

  // Create a short-lived JWT token for magic link (e.g., 10 min)
  const token = jwt.sign(
    { userId: user.id, email: user.email, type: "magic" },
    JWT_SECRET,
    { expiresIn: "10d" }, //todo: reduce
  );

  // Compose magic link
  const magicLink = `${APP_URL}/api/auth/callback?token=${token}`;

  // TODO: Send email with magic link (implement with your email provider)
  // For now, just log it (for dev)
  console.log(`Magic link for ${email}: ${magicLink}`);
  await sendMail({
    to: email,
    subject: "Your Authentication Link",
    text: `Click the following link to log in to ${magicLink}`,
  });

  // Always respond with success (don't leak user existence)
  return { ok: true };
}

// Helper to verify JWT and extract payload
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function auth(token: string) {
  const payload = verifyToken(token);

  if (
    !payload ||
    typeof payload !== "object" ||
    payload.type !== "magic" ||
    !payload.userId ||
    !payload.email
  ) {
    throw new Error("invalid_token");
  }

  // Issue a new JWT for session (longer expiry, no "magic" type)
  const sessionToken = jwt.sign(
    { userId: payload.userId, email: payload.email },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  return sessionToken;
}

export async function getAuthUser(token?: string) {
  const payload = verifyToken(token || "");

  if (
    !payload ||
    typeof payload !== "object" ||
    !payload.userId ||
    !payload.email
  ) {
    throw new Error("invalid_token");
  }

  return {
    id: payload.userId,
    email: payload.email,
  };
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    const { id } = await getAuthUser(token);
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      return { error: "cannot get user: " + id };
    }
    console.log("----getUser----", user);
    let hasAi = false;
    const api = getUserApi(user);
    if (api?.key) {
      hasAi = true;
    }
    return {
      id: user.id,
      email: user.email,
      hasAi,
    };
  } catch (e) {
    console.log("-------e-", e);
    return { error: "cannot get user" };
  }
}
