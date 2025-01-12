/*
  Warnings:

  - You are about to drop the column `s3Bucket` on the `BillText` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `BillText` table. All the data in the column will be lost.
  - Added the required column `heading` to the `BillText` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `BillText` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillText" DROP COLUMN "s3Bucket",
DROP COLUMN "s3Key",
ADD COLUMN     "heading" TEXT NOT NULL,
ADD COLUMN     "text" TEXT NOT NULL;
