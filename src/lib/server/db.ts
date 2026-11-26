import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parse } from "dotenv";

/**
 * Next.js never overrides variables that already exist in the shell, even empty ones.
 * In development, fall back to the project's .env file when DATABASE_URL is missing or blank.
 */
function databaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production") return undefined;
  try {
    const file = parse(readFileSync(join(process.cwd(), ".env")));
    if (file.DATABASE_URL) {
      process.env.DATABASE_URL = file.DATABASE_URL;
      if (file.DIRECT_URL && !process.env.DIRECT_URL?.trim()) process.env.DIRECT_URL = file.DIRECT_URL;
      console.warn("DATABASE_URL was blank in the environment; using the value from .env.");
      return file.DATABASE_URL;
    }
  } catch {
    // No .env file: Prisma reports the missing variable itself.
  }
  return undefined;
}

const url = databaseUrl();

/**
 * Connection-level failures that are safe to retry: the query never reached the database.
 * A hosted database can drop or refuse a connection briefly (network blips, pooler restarts).
 * P1001 unreachable · P1002 timeout · P1008 operation timeout · P1017 connection closed · P2024 pool timeout
 */
const transientCodes = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const retryDelays = [500, 1500, 3000];

/**
 * Wrong credentials or a blocked pooler never fix themselves, and retrying them makes it worse:
 * Supabase's pooler locks out new connections after repeated authentication failures (ECIRCUITBREAKER).
 */
const credentialProblem = /P1000|authentication failed|password authentication|ECIRCUITBREAKER|Tenant or user not found/i;

function isTransient(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, errorCode, name, message } = error as { code?: string; errorCode?: string; name?: string; message?: string };
  if (errorCode === "P1000" || credentialProblem.test(message ?? "")) return false;
  return transientCodes.has(code ?? "") || transientCodes.has(errorCode ?? "") || name === "PrismaClientInitializationError";
}

/** Fail fast with a clear message while .env still holds the placeholder password. */
if (url?.includes("YOUR_SUPABASE_DB_PASSWORD")) {
  console.error("DATABASE_URL still contains YOUR_SUPABASE_DB_PASSWORD. Put the Supabase database password in .env (DATABASE_URL and DIRECT_URL).");
}

function createClient() {
  const base = new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    // The hosted database can be slow to hand out a connection (network distance, cold starts).
    // Prisma's 2s default makes busy moments fail with P2028 "Unable to start a transaction in the given time".
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });
  const client = base.$extends({
    query: {
      async $allOperations({ args, query, operation, model }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (!isTransient(error) || attempt >= retryDelays.length) throw error;
            console.warn(`Database unavailable (${model ?? "raw"}.${operation}); retrying in ${retryDelays[attempt]}ms.`);
            await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
          }
        }
      },
    },
  });
  // The extension only adds retries; the client keeps the same API, so expose it with PrismaClient's type.
  return client as unknown as PrismaClient;
}

/* Reuse one client across hot reloads in development, but never a client built for a different URL. */
const globalDb = globalThis as typeof globalThis & { quicklywashDb?: { url?: string; client: PrismaClient; retries?: boolean; transactions?: boolean } };
const previous = globalDb.quicklywashDb;
const cached = previous && previous.url === url && previous.retries && previous.transactions ? previous.client : undefined;
export const db = cached ?? createClient();
if (process.env.NODE_ENV !== "production") globalDb.quicklywashDb = { url, client: db, retries: true, transactions: true };
