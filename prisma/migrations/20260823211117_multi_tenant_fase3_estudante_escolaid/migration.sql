-- AlterTable: adiciona escola_id nullable primeiro (tabela ja tem linhas, nao da pra NOT NULL direto)
ALTER TABLE "estudantes" ADD COLUMN "escola_id" TEXT;

-- DataMigration: deriva escola_id a partir da turma do estudante (turmas.escola_id ja e NOT NULL desde a Migration 1)
UPDATE "estudantes" e
SET "escola_id" = t."escola_id"
FROM "turmas" t
WHERE e."turma_id" = t."id";

-- AlterTable: agora que esta populado, torna obrigatorio
ALTER TABLE "estudantes" ALTER COLUMN "escola_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "estudantes_escola_id_idx" ON "estudantes"("escola_id");

-- AddForeignKey
ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
