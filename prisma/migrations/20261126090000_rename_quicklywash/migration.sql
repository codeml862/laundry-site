ALTER TABLE "Settings" ALTER COLUMN "businessName" SET DEFAULT 'Quicklywash';
UPDATE "Settings" SET "businessName" = 'Quicklywash' WHERE "businessName" = 'FreshFold';
