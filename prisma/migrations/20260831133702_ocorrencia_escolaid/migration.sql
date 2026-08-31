-- AlterTable
ALTER TABLE "ocorrencias" ADD COLUMN     "escola_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ocorrencias_escola_id_idx" ON "ocorrencias"("escola_id");

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
