/*
  Warnings:

  - You are about to drop the column `govtrackId` on the `Representative` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bioguideId]` on the table `Representative` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bioguideId` to the `Representative` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Representative_govtrackId_key";

-- AlterTable
ALTER TABLE "Representative" DROP COLUMN "govtrackId",
ADD COLUMN     "bioguideId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Representative_bioguideId_key" ON "Representative"("bioguideId");
