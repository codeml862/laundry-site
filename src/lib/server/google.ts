import { createHash } from "node:crypto";
import { db } from "@/lib/server/db";
import { hashPassword, token } from "@/lib/server/auth";

export const oauthCookie = "quicklywash_oauth";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(request: Request) {
  return new URL(process.env.APP_URL ?? new URL(request.url).origin).origin;
}

export function callbackUrl(request: Request) {
  return appOrigin(request) + "/api/auth/google/callback";
}

/** Only allow redirects back to known in-app pages after sign-in. */
export function safeNext(value: string | null) {
  if (!value) return null;
  if (["/book", "/account", "/admin"].includes(value)) return value;
  if (/^\/account\?(order=[\w-]{1,100}|tab=(addresses|profile|payments|offers|updates|support))$/.test(value)) return value;
  return null;
}

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function authorizeUrl(request: Request, state: string, verifier: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url;
}

type GoogleProfile = { sub: string; email?: string; email_verified?: boolean; name?: string; given_name?: string };

/** Exchanges the authorization code with Google and returns the verified profile. */
export async function googleProfile(request: Request, code: string, verifier: string) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(request),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) {
    // e.g. redirect_uri_mismatch or invalid_client: visible in development logs only.
    if (process.env.NODE_ENV !== "production") console.error("Google token exchange failed", tokenResponse.status, await tokenResponse.text().catch(() => ""));
    return null;
  }
  const { access_token: accessToken } = await tokenResponse.json() as { access_token?: string };
  if (!accessToken) return null;

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!profileResponse.ok) return null;
  const profile = await profileResponse.json() as GoogleProfile;
  if (!profile.sub || !profile.email || profile.email_verified !== true) {
    if (process.env.NODE_ENV !== "production") console.error("Google profile rejected: missing or unverified email");
    return null;
  }
  return { email: profile.email.toLowerCase(), name: (profile.name || profile.given_name || profile.email.split("@")[0]).slice(0, 80) };
}

/** Finds the account for a Google-verified email, or creates a verified customer account. */
export async function googleUser(profile: { email: string; name: string }) {
  const existing = await db.user.findUnique({ where: { email: profile.email }, select: { id: true, role: true, active: true, verified: true } });
  if (existing) {
    if (!existing.active) return null;
    if (!existing.verified) await db.user.update({ where: { id: existing.id }, data: { verified: true } });
    return existing;
  }
  // Google accounts get a random password nobody knows; they can set one later with "Forgot password".
  return db.user.create({
    data: { email: profile.email, name: profile.name, passwordHash: await hashPassword(token()), verified: true, profile: { create: {} } },
    select: { id: true, role: true, active: true, verified: true },
  });
}
