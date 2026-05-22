-- Create Admin table if it doesn't exist in migration history
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");

-- CreateTable: Salon (the tenancy root)
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- Insert the default salon BEFORE adding FK columns
INSERT INTO "Salon" ("id", "createdAt", "name")
VALUES ('salon_default', NOW(), 'Lamees Nail Salon');

-- Add salonId to all tables, defaulting to the salon we just created
ALTER TABLE "Admin"       ADD COLUMN "salonId" TEXT NOT NULL DEFAULT 'salon_default';
ALTER TABLE "Customer"    ADD COLUMN "salonId" TEXT NOT NULL DEFAULT 'salon_default';
ALTER TABLE "Service"     ADD COLUMN "salonId" TEXT NOT NULL DEFAULT 'salon_default';
ALTER TABLE "Staff"       ADD COLUMN "salonId" TEXT NOT NULL DEFAULT 'salon_default';
ALTER TABLE "Appointment" ADD COLUMN "salonId" TEXT NOT NULL DEFAULT 'salon_default';
ALTER TABLE "UserPackage" ADD COLUMN "salonId" TEXT NOT NULL DEFAULT 'salon_default';

-- Drop the temporary defaults (schema has no default for salonId)
ALTER TABLE "Admin"       ALTER COLUMN "salonId" DROP DEFAULT;
ALTER TABLE "Customer"    ALTER COLUMN "salonId" DROP DEFAULT;
ALTER TABLE "Service"     ALTER COLUMN "salonId" DROP DEFAULT;
ALTER TABLE "Staff"       ALTER COLUMN "salonId" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "salonId" DROP DEFAULT;
ALTER TABLE "UserPackage" ALTER COLUMN "salonId" DROP DEFAULT;

-- Add foreign key constraints
ALTER TABLE "Admin"       ADD CONSTRAINT "Admin_salonId_fkey"       FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer"    ADD CONSTRAINT "Customer_salonId_fkey"    FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service"     ADD CONSTRAINT "Service_salonId_fkey"     FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Staff"       ADD CONSTRAINT "Staff_salonId_fkey"       FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old global unique index on Customer.phone
DROP INDEX IF EXISTS "Customer_phone_key";

-- Add new composite unique index (phone unique per salon, not globally)
CREATE UNIQUE INDEX "Customer_salonId_phone_key" ON "Customer"("salonId", "phone");