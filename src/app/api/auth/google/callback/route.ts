import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { limit, startSession } from "@/lib/server/auth";
import { appOrigin, googleConfigured, googleProfile, googleUser, oauthCookie, safeNext } from "@/lib/server/google";

/** Google redirects back here with ?code&state. */
export async function GET(request: Request) {
  const origin = appOrigin(request);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
  if (!googleConfigured()) return fail("google_unavailable");

  const jar = await cookies();
  const raw = jar.get(oauthCookie)?.value;
  jar.delete({ name: oauthCookie, path: "/api/auth/google" });

  const params = new URL(request.url).searchParams;
  if (params.get("error")) return fail("google_cancelled");

  let saved: { state?: string; verifier?: string; next?: string | null } = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch { /* treated as a missing state below */ }
  const code = params.get("code");
  if (!code || !saved.state || !saved.verifier || params.get("state") !== saved.state) return fail("google_failed");

  try {
    const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") : request.headers.get("x-forwarded-for");
    await limit(`auth:google:${ip?.split(",")[0]?.slice(0, 90) || "local"}`, 30, 15);

    const profile = await googleProfile(request, code, saved.verifier);
    if (!profile) return fail("google_failed");
    const user = await googleUser(profile);
    if (!user) return fail("account_disabled");
    await startSession(user.id);
    // Google has verified the email, so the team and customers may use it; each lands in their own area.
    if (user.role !== "CUSTOMER") return NextResponse.redirect(new URL("/admin", origin));
    const next = safeNext(saved.next ?? null);
    return NextResponse.redirect(new URL(next && next !== "/admin" ? next : "/account", origin));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Google sign-in failed", error);
    return fail("google_failed");
  }
}
