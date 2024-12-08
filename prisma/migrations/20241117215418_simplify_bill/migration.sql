/*
  Warnings:

  - You are about to drop the column `billType` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `congress` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `currentStatus` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `introducedDate` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `Bill` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[billId]` on the table `Bill` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billId` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `link` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "billType",
DROP COLUMN "congress",
DROP COLUMN "currentStatus",
DROP COLUMN "introducedDate",
DROP COLUMN "number",
ADD COLUMN     "billId" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "link" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billId_key" ON "Bill"("billId");
