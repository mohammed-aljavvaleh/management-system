-- Migration: add notes to Customer and Appointment, add serviceId to UserPackage
 
-- 1. Customer notes
ALTER TABLE "Customer" ADD COLUMN "notes" TEXT;
 
-- 2. Appointment notes
ALTER TABLE "Appointment" ADD COLUMN "notes" TEXT;
 
-- 3. UserPackage serviceId (nullable for backwards compat with existing packages)
ALTER TABLE "UserPackage" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
