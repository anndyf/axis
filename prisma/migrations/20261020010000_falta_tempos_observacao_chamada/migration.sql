-- AlterTable
ALTER TABLE "faltas" ADD COLUMN     "tempos" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "observacoes_chamada" (
    "id" TEXT NOT NULL,
    "aula_id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observacoes_chamada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observacoes_chamada_estudante_id_idx" ON "observacoes_chamada"("estudante_id");

-- CreateIndex
CREATE UNIQUE INDEX "observacoes_chamada_aula_id_estudante_id_key" ON "observacoes_chamada"("aula_id", "estudante_id");

-- AddForeignKey
ALTER TABLE "observacoes_chamada" ADD CONSTRAINT "observacoes_chamada_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes_chamada" ADD CONSTRAINT "observacoes_chamada_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes_chamada" ADD CONSTRAINT "observacoes_chamada_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: as faltas já gravadas viram os primeiros `quantidade` tempos da
-- aula (a chamada antiga só guardava quantos tempos o aluno perdeu, não
-- quais). Chamada diária (aula sem tempos) fica com tempos vazio.
UPDATE "faltas" AS f
SET "tempos" = a."tempos"[1:f."quantidade"]
FROM "aulas" AS a
WHERE f."aula_id" = a."id"
  AND cardinality(a."tempos") > 0;
