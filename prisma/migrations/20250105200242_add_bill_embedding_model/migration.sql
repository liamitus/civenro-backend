-- CreateTable
CREATE TABLE "BillEmbedding" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "chunk" TEXT NOT NULL,
    "vector" JSONB NOT NULL,

    CONSTRAINT "BillEmbedding_pkey" PRIMARY KEY ("id")
);
