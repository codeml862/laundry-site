import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { expect } from "@/lib/server/http";
import type { Role } from "@prisma/client";

const derive = promisify(scrypt);
const sessionCookie = "quicklywash_session";
/**
 * Long-term sliding sessions: a session lasts 30 days from the last visit.
 * Active users stay signed in indefinitely; idle sessions expire after 30 days.
 */
const duration = 60 * 60 * 24 * 30;
/** Extend at most once a day to avoid a database write on every request. */
const refreshAfter = 60 * 60 * 24;
const cookieOptions = () => ({httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:"lax" as const,path:"/",maxAge:duration});
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export const userFields = {id:true,name:true,email:true,role:true,verified:true,permissions:true} as const;

export function passwordValue(value: unknown) {
  expect(typeof value === "string" && value.length >= 8 && value.length <= 128, "Use a password between 8 and 128 characters.");
  return value;
}
export async function hashPassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + ((await derive(value, salt, 64)) as Buffer).toString("hex");
}
export async function checkPassword(value: string, stored?: string) {
  const [salt, expected] = (stored ?? "00000000000000000000000000000000:" + "00".repeat(64)).split(":");
  const actual = (await derive(value.slice(0,128), salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected,"hex")) && Boolean(stored);
}
export async function currentUser() {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookie)?.value;
  if (!sessionToken || !/^[\w-]{43}$/.test(sessionToken)) return null;
  const tokenHash = digest(sessionToken);
  const session = await db.session.findUnique({where:{tokenHash},select:{expiresAt:true,user:{select:{...userFields,active:true}}}});
  if (!session?.user.active || session.expiresAt <= new Date()) return null;

  // Slide the expiry forward on activity: the database at most once a day, the cookie on every API request.
  if (session.expiresAt.getTime() - Date.now() < (duration - refreshAfter) * 1000) {
    await db.session.updateMany({where:{tokenHash},data:{expiresAt:new Date(Date.now() + duration * 1000)}});
  }
  try {
    jar.set(sessionCookie, sessionToken, cookieOptions());
  } catch {
    // Pages can't set cookies while rendering; the next API request (e.g. /api/auth on every page) refreshes it.
  }

  const { id, name, email, role, verified, permissions } = session.user;
  return {id,name,email,role,verified,permissions};
}
export async function requireUser(roles?: Role[], verified = false) {
  const user = await currentUser();
  expect(user, "Sign in to continue.", 401);
  expect(!roles || roles.includes(user.role), "You do not have access to this action.", 403);
  expect(!verified || user.verified, "Verify your email address to continue.", 403);
  return user;
}
export async function startSession(userId: string) {
  await endSession();
  const value = token();
  const expiresAt = new Date(Date.now() + duration * 1000);
  await db.session.create({data:{userId,tokenHash:digest(value),expiresAt}});
  (await cookies()).set(sessionCookie,value,cookieOptions());
}
export async function endSession() {
  const jar = await cookies();
  const value = jar.get(sessionCookie)?.value;
  if (value) {
    await db.session.deleteMany({where:{tokenHash:digest(value)}});
    jar.delete(sessionCookie);
  }
}
export async function limit(key: string, max: number, minutes: number, message = "Too many attempts") {
  const window = minutes * 60_000;
  const bucket = Math.floor(Date.now() / window);
  const record = await db.rateLimit.upsert({
    where:{key:digest(key + ":" + bucket)},
    create:{key:digest(key + ":" + bucket),count:1,expiresAt:new Date((bucket+1)*window)},
    update:{count:{increment:1}}
  });
  const wait = Math.max(1, Math.ceil(((bucket + 1) * window - Date.now()) / 60_000));
  expect(record.count <= max, `${message}. Please try again in ${wait} minute${wait === 1 ? "" : "s"}.`, 429);
}
