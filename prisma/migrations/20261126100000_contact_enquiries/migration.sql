CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Enquiry_status_check" CHECK ("status" IN ('NEW', 'HANDLED'))
);
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");
-- Supabase public API must not reach this table; the app uses Prisma on the server.
ALTER TABLE "Enquiry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Enquiry" FROM anon, authenticated;
