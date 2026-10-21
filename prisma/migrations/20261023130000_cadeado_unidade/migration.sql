-- Cadeado de unidade encerrada (só aditiva): encerramento manual da etapa
-- do calendário e reaberturas pontuais por turma + disciplina.
-- criado_em: o Prisma sempre envia o valor (UTC); o DEFAULT só vale para
-- inserção fora do Prisma.
-- AlterTable
ALTER TABLE "etapas_calendario" ADD COLUMN     "encerrada_em" TIMESTAMP(3),
ADD COLUMN     "encerrada_por_id" TEXT;

-- CreateTable
CREATE TABLE "reaberturas_unidade" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "etapa_calendario_id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "disciplina_id" TEXT,
    "ate" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "criado_por_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogada_em" TIMESTAMP(3),
    "revogada_por_id" TEXT,

    CONSTRAINT "reaberturas_unidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reaberturas_unidade_escola_id_idx" ON "reaberturas_unidade"("escola_id");

-- CreateIndex
CREATE INDEX "reaberturas_unidade_etapa_calendario_id_turma_id_idx" ON "reaberturas_unidade"("etapa_calendario_id", "turma_id");

-- CreateIndex
CREATE INDEX "reaberturas_unidade_turma_id_idx" ON "reaberturas_unidade"("turma_id");

-- AddForeignKey
ALTER TABLE "etapas_calendario" ADD CONSTRAINT "etapas_calendario_encerrada_por_id_fkey" FOREIGN KEY ("encerrada_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaberturas_unidade" ADD CONSTRAINT "reaberturas_unidade_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaberturas_unidade" ADD CONSTRAINT "reaberturas_unidade_etapa_calendario_id_fkey" FOREIGN KEY ("etapa_calendario_id") REFERENCES "etapas_calendario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaberturas_unidade" ADD CONSTRAINT "reaberturas_unidade_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaberturas_unidade" ADD CONSTRAINT "reaberturas_unidade_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaberturas_unidade" ADD CONSTRAINT "reaberturas_unidade_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaberturas_unidade" ADD CONSTRAINT "reaberturas_unidade_revogada_por_id_fkey" FOREIGN KEY ("revogada_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

