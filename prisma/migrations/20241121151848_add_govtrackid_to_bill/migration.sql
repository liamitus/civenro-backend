/*
  Warnings:

  - A unique constraint covering the columns `[govtrackId]` on the table `Bill` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `govtrackId` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "govtrackId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Bill_govtrackId_key" ON "Bill"("govtrackId");
