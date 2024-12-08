/*
  Warnings:

  - You are about to drop the column `govtrackId` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `govtrackId` on the `Representative` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Bill_govtrackId_key";

-- DropIndex
DROP INDEX "Representative_govtrackId_key";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "govtrackId";

-- AlterTable
ALTER TABLE "Representative" DROP COLUMN "govtrackId";
