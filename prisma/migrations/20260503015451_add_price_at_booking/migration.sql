/*
  Warnings:

  - You are about to drop the column `customerEmail` on the `Appointment` table. All the data in the column will be lost.
  - Added the required column `priceAtBooking` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "customerEmail",
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "priceAtBooking" DOUBLE PRECISION NOT NULL;
