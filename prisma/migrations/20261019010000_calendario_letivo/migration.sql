-- Calendário letivo e tempos de aula (plano-avaliacao-frequencia.md, passo 6).

-- CreateEnum
CREATE TYPE "TipoDiaNaoLetivo" AS ENUM ('FERIADO', 'RECESSO', 'PLANEJAMENTO', 'OUTRO');

-- AlterTable
ALTER TABLE "disciplinas" ADD COLUMN     "carga_horaria" INTEGER;

-- AlterTable
ALTER TABLE "horarios_aula" ADD COLUMN     "disciplina_id" TEXT,
ADD COLUMN     "professor_id" TEXT;

-- CreateTable
CREATE TABLE "periodos_letivos" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "ano_letivo" INTEGER NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,

    CONSTRAINT "periodos_letivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_calendario" (
    "id" TEXT NOT NULL,
    "periodo_letivo_id" TEXT NOT NULL,
    "esquema_unidade_id" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "prazo_lancamento" DATE,

    CONSTRAINT "etapas_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_nao_letivos" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" "TipoDiaNaoLetivo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "turma_id" TEXT,

    CONSTRAINT "dias_nao_letivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_letivos_extras" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "seguir_horario_de" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "dias_letivos_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempos_aula" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "inicio" TEXT NOT NULL,
    "fim" TEXT NOT NULL,

    CONSTRAINT "tempos_aula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodos_letivos_escola_id_ano_letivo_key" ON "periodos_letivos"("escola_id", "ano_letivo");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_calendario_periodo_letivo_id_esquema_unidade_id_key" ON "etapas_calendario"("periodo_letivo_id", "esquema_unidade_id");

-- CreateIndex
CREATE INDEX "dias_nao_letivos_escola_id_data_idx" ON "dias_nao_letivos"("escola_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "dias_letivos_extras_escola_id_data_key" ON "dias_letivos_extras"("escola_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "tempos_aula_escola_id_turno_ordem_key" ON "tempos_aula"("escola_id", "turno", "ordem");

-- CreateIndex
CREATE INDEX "horarios_aula_disciplina_id_idx" ON "horarios_aula"("disciplina_id");

-- AddForeignKey
ALTER TABLE "horarios_aula" ADD CONSTRAINT "horarios_aula_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_aula" ADD CONSTRAINT "horarios_aula_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_letivos" ADD CONSTRAINT "periodos_letivos_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_calendario" ADD CONSTRAINT "etapas_calendario_periodo_letivo_id_fkey" FOREIGN KEY ("periodo_letivo_id") REFERENCES "periodos_letivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_calendario" ADD CONSTRAINT "etapas_calendario_esquema_unidade_id_fkey" FOREIGN KEY ("esquema_unidade_id") REFERENCES "esquema_unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dias_nao_letivos" ADD CONSTRAINT "dias_nao_letivos_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dias_nao_letivos" ADD CONSTRAINT "dias_nao_letivos_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dias_letivos_extras" ADD CONSTRAINT "dias_letivos_extras_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tempos_aula" ADD CONSTRAINT "tempos_aula_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Vincula os horários já cadastrados (texto livre) às disciplinas da própria
-- turma e aos professores da escola, comparando nomes sem diferenciar
-- maiúsculas/espaços. O que não casar fica sem vínculo e aparece na tela de
-- horário para revisão.
UPDATE "horarios_aula" h
SET "disciplina_id" = d."id"
FROM "disciplinas" d
WHERE d."turma_id" = h."turma_id"
  AND lower(trim(d."nome")) = lower(trim(h."disciplina"))
  AND h."disciplina_id" IS NULL;

UPDATE "horarios_aula" h
SET "professor_id" = u."id"
FROM "turmas" t, "users" u
WHERE t."id" = h."turma_id"
  AND u."escola_id" = t."escola_id"
  AND h."professor" IS NOT NULL
  AND lower(trim(coalesce(u."name", u."username"))) = lower(trim(h."professor"))
  AND h."professor_id" IS NULL;
