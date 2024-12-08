-- CreateTable
CREATE TABLE "Representative" (
    "id" SERIAL NOT NULL,
    "repId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "party" TEXT NOT NULL,
    "chamber" TEXT NOT NULL,

    CONSTRAINT "Representative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentativeVote" (
    "id" SERIAL NOT NULL,
    "representativeId" INTEGER NOT NULL,
    "billId" INTEGER NOT NULL,
    "position" TEXT NOT NULL,

    CONSTRAINT "RepresentativeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Representative_repId_key" ON "Representative"("repId");

-- CreateIndex
CREATE UNIQUE INDEX "RepresentativeVote_representativeId_billId_key" ON "RepresentativeVote"("representativeId", "billId");

-- AddForeignKey
ALTER TABLE "RepresentativeVote" ADD CONSTRAINT "RepresentativeVote_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "Representative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentativeVote" ADD CONSTRAINT "RepresentativeVote_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
