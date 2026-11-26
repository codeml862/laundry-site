-- Existing services remain bookable with their original IDs and prices.
ALTER TABLE "Service"
ADD COLUMN "familyKey" TEXT,
ADD COLUMN "familyName" TEXT,
ADD COLUMN "speed" TEXT NOT NULL DEFAULT 'REGULAR',
ADD COLUMN "size" TEXT NOT NULL DEFAULT 'MEDIUM';

CREATE UNIQUE INDEX "Service_familyKey_speed_size_key"
ON "Service"("familyKey", "speed", "size");

ALTER TABLE "Service" ADD CONSTRAINT "Service_speed_check"
CHECK ("speed" IN ('REGULAR', 'EXPRESS'));
ALTER TABLE "Service" ADD CONSTRAINT "Service_size_check"
CHECK ("size" IN ('SMALL', 'MEDIUM', 'LARGE'));
