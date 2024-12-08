/*
  Warnings:

  - A unique constraint covering the columns `[govtrackId]` on the table `Representative` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `govtrackId` to the `Representative` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Representative" ADD COLUMN     "govtrackId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Representative_govtrackId_key" ON "Representative"("govtrackId");
