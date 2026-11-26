import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { token } from "@/lib/server/auth";
import { appOrigin, authorizeUrl, googleConfigured, oauthCookie, safeNext } from "@/lib/server/google";

/** Starts "Continue with Google": stores state + PKCE verifier, then sends the user to Google. */
export async function GET(request: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google_unavailable", appOrigin(request)));

  const state = token();
  const verifier = token();
  const next = safeNext(new URL(request.url).searchParams.get("next"));

  (await cookies()).set(oauthCookie, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeUrl(request, state, verifier));
}
