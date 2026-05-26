-- Add salon-scoped static currency configuration.
ALTER TABLE "Salon"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TRY';

ALTER TABLE "Salon"
ALTER COLUMN "currency" SET DEFAULT 'TRY';

UPDATE "Salon"
SET "currency" = 'TRY'
WHERE "currency" IS NULL OR "currency" NOT IN ('TRY', 'SAR');

ALTER TABLE "Salon"
ALTER COLUMN "currency" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "Salon"
  ADD CONSTRAINT "Salon_currency_check" CHECK ("currency" IN ('TRY', 'SAR'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
