/*
  Warnings:

  - You are about to drop the column `billId` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `repId` on the `Representative` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `RepresentativeVote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[govtrackId]` on the table `Bill` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[govtrackId]` on the table `Representative` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billType` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `congress` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentStatus` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `govtrackId` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introducedDate` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `govtrackId` to the `Representative` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vote` to the `RepresentativeVote` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Bill_billId_key";

-- DropIndex
DROP INDEX "Representative_repId_key";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "billId",
DROP COLUMN "date",
DROP COLUMN "link",
ADD COLUMN     "billType" TEXT NOT NULL,
ADD COLUMN     "congress" INTEGER NOT NULL,
ADD COLUMN     "currentStatus" TEXT NOT NULL,
ADD COLUMN     "govtrackId" INTEGER NOT NULL,
ADD COLUMN     "introducedDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "number" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Representative" DROP COLUMN "repId",
ADD COLUMN     "govtrackId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RepresentativeVote" DROP COLUMN "position",
ADD COLUMN     "vote" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Bill_govtrackId_key" ON "Bill"("govtrackId");

-- CreateIndex
CREATE UNIQUE INDEX "Representative_govtrackId_key" ON "Representative"("govtrackId");
