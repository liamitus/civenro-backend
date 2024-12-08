/*
  Warnings:

  - Added the required column `billType` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentStatus` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentStatusDate` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introducedDate` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "billType" TEXT NOT NULL,
ADD COLUMN     "currentChamber" TEXT,
ADD COLUMN     "currentStatus" TEXT NOT NULL,
ADD COLUMN     "currentStatusDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "introducedDate" TIMESTAMP(3) NOT NULL;
