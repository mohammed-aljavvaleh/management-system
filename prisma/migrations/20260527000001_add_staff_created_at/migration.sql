-- Add createdAt field to Staff table (existing rows get current timestamp)
ALTER TABLE "Staff" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
