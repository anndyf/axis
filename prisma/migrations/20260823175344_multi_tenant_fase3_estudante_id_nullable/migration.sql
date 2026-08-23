-- AlterTable
ALTER TABLE "estudantes" ADD COLUMN     "id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "estudantes_id_key" ON "estudantes"("id");

