import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";

/** The landing page for each role after sign-in. */
export function homeFor(role: Role) {
  return role === "CUSTOMER" ? "/account" : "/admin";
}

/**
 * Server-side page guard. Visitors go to login (and come back afterwards);
 * signed-in users without the right role go to their own area instead.
 */
export async function requireRole(roles: Role[], next: string) {
  const user = await currentUser();
  if (!user) redirect(roles.includes("CUSTOMER") ? `/login?next=${encodeURIComponent(next)}` : "/admin/login");
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Login, sign-up and password pages are only for signed-out visitors. */
export async function redirectIfSignedIn() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
}

