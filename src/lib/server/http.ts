import { Prisma } from "@prisma/client";
import { connection } from "next/server";

export class ApiError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export function expect(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new ApiError(message, status);
}
/** Database connection or capacity problems: safe to tell the user to simply try again. */
const databaseBusy = new Set(["P1001", "P1002", "P1008", "P1017", "P2024", "P2028"]);

export function api(handler: (request: Request) => Promise<unknown>, sameOrigin = true) {
  return async (request: Request) => {
    if (request.method === "GET") await connection();
    try {
      if (sameOrigin && request.method !== "GET") {
        // CSRF guard: accept the configured site URL and the host the request was actually sent to
        // (covers localhost vs 127.0.0.1 and Vercel preview URLs), and reject other sites.
        const origin = request.headers.get("origin");
        const allowed = new Set([new URL(request.url).origin]);
        if (process.env.APP_URL) allowed.add(new URL(process.env.APP_URL).origin);
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
        if (host) allowed.add(`${request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1)}://${host}`);
        expect(!origin || allowed.has(origin), "Request origin is not allowed.", 403);
        expect(request.headers.get("sec-fetch-site") !== "cross-site", "Request origin is not allowed.", 403);
      }
      return Response.json(await handler(request), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ApiError) return Response.json({error: error.message}, {status: error.status});
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") return Response.json({error:"That record already exists."}, {status:409});
        if (error.code === "P2025") return Response.json({error:"Record not found."}, {status:404});
        if (error.code === "P2034") return Response.json({error:"Something changed while saving. Please retry."}, {status:409});
        if (error.code === "P2003") return Response.json({error:"This record is linked to other data and cannot be changed this way."}, {status:409});
      }
      // A short reference lets support match what the user saw with the server log.
      const reference = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2) + "00000000").slice(0, 8).toUpperCase();
      const code = (error as { code?: unknown })?.code;
      const name = error instanceof Error ? error.name : "Unknown error";
      // Production logs only the error type and code; development also logs the full error to make setup problems obvious.
      if (process.env.NODE_ENV === "production") console.error(`Quicklywash API error [${reference}]`, name, typeof code === "string" ? code : "");
      else console.error(`Quicklywash API error [${reference}]`, error);
      const unreachable = name === "PrismaClientInitializationError" || (typeof code === "string" && databaseBusy.has(code));
      return Response.json({
        error: unreachable
          ? `We couldn't reach the database just now. Please try again in a few seconds. (Ref ${reference})`
          : `Something went wrong on our side. Please try again. If it keeps happening, share reference ${reference} with support.`,
        reference,
      }, {status: unreachable ? 503 : 500});
    }
  };
}
/** Caller's address for rate limiting. Vercel's header can't be spoofed; elsewhere use the proxy headers. */
export function clientIp(request: Request) {
  const raw = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for");
  return raw?.split(",")[0]?.trim().slice(0, 90) || "local";
}
export type Data = Record<string, unknown>;
export function object(value: unknown): Data {
  expect(value !== null && typeof value === "object" && !Array.isArray(value), "Invalid request data.");
  return value as Data;
}
export async function body(request: Request) {
  expect(request.headers.get("content-type")?.includes("application/json"), "Expected JSON data.", 415);
  const raw = await readText(request, 100_000);
  try { return object(JSON.parse(raw)); } catch { throw new ApiError("Invalid JSON data."); }
}
export async function readText(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let result = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return result + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ApiError("Request is too large.", 413);
      }
      result += decoder.decode(chunk.value, {stream:true});
    }
  } finally {
    reader.releaseLock();
  }
}
export function str(value: unknown, name: string, max = 200, optional = false) {
  if (optional && (value === undefined || value === null)) return "";
  expect(typeof value === "string", `Enter a valid ${name}.`);
  const result = value.trim();
  expect((optional || result.length > 0) && result.length <= max, `Enter a valid ${name}.`);
  return result;
}
export function integer(value: unknown, name: string, min = 0, max = 10_000_000) {
  expect(typeof value === "number" && Number.isInteger(value) && value >= min && value <= max, `Enter a valid ${name}.`);
  return value;
}
export function oneOf<T extends string>(value: unknown, options: readonly T[], name: string): T {
  expect(typeof value === "string" && options.includes(value as T), `Choose a valid ${name}.`);
  return value as T;
}
export function bool(value: unknown, name: string) {
  expect(typeof value === "boolean", `Choose a valid ${name} setting.`);
  return value;
}
export function emailValue(value: unknown) {
  const email = str(value, "email address", 254).toLowerCase();
  expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Enter a valid email address.");
  return email;
}
export function addressFields(input: Data) {
  const postalCode = str(input.postalCode, "PIN code", 6);
  const phone = str(input.phone, "phone", 25);
  expect(/^\d{6}$/.test(postalCode), "Enter a six-digit Indian PIN code.");
  expect(/^\+?[\d ()-]{10,25}$/.test(phone) && phone.replace(/\D/g, "").length >= 10, "Enter a valid phone number.");
  return { postalCode, phone, label:str(input.label,"address label",45), line1:str(input.line1,"street address",150), line2:str(input.line2,"address line 2",150,true), city:str(input.city,"city",90) };
}
export function dateField(value: unknown, name: string) {
  const date = str(value, name, 10);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(date), `Choose a valid ${name}.`);
  const parsed = new Date(date + "T00:00:00Z");
  expect(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date, `Choose a valid ${name}.`);
  return date;
}
export function indiaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  return ["year","month","day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}
