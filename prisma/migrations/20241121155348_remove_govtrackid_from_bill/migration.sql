/*
  Warnings:

  - You are about to drop the column `govtrackId` on the `Bill` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Bill_govtrackId_key";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "govtrackId";
