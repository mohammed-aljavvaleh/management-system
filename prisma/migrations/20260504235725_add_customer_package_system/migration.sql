-- CreateTable Customer
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserPackage
CREATE TABLE "UserPackage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "remainingSessions" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "UserPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable Installment
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "userPackageId" TEXT NOT NULL,
    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- Step 1: Add customerId as nullable first
ALTER TABLE "Appointment" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "userPackageId" TEXT;

-- Step 2: Create one placeholder customer for all existing appointments
INSERT INTO "Customer" ("id", "name", "phone", "createdAt")
VALUES ('migrated-placeholder', 'Migrated Customer', '00000000000', CURRENT_TIMESTAMP);

-- Step 3: Assign all existing appointments to that placeholder customer
UPDATE "Appointment" SET "customerId" = 'migrated-placeholder';

-- Step 4: Now make customerId NOT NULL
ALTER TABLE "Appointment" ALTER COLUMN "customerId" SET NOT NULL;

-- Step 5: Drop old inline customer columns
ALTER TABLE "Appointment" DROP COLUMN "customerName";
ALTER TABLE "Appointment" DROP COLUMN "customerPhone";

-- AddForeignKey
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_userPackageId_fkey"
    FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userPackageId_fkey"
    FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;