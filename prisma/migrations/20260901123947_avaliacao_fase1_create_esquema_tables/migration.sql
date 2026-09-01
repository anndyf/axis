-- CreateEnum
CREATE TYPE "ModoRecuperacaoUnidade" AS ENUM ('SUBSTITUI_SE_MAIOR');

-- CreateEnum
CREATE TYPE "ModoRecuperacaoFinal" AS ENUM ('SUBSTITUI_MENOR_UNIDADE', 'NOTA_MINIMA_ISOLADA');

-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "esquema_avaliacao_id" TEXT;

-- AlterTable
ALTER TABLE "turmas" ADD COLUMN     "esquema_avaliacao_id" TEXT;

-- CreateTable
CREATE TABLE "esquemas_avaliacao" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "num_unidades" INTEGER NOT NULL,
    "nota_minima_aprovacao" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "recuperacao_unidade_ativa" BOOLEAN NOT NULL DEFAULT false,
    "modo_recuperacao_unidade" "ModoRecuperacaoUnidade",
    "recuperacao_final_ativa" BOOLEAN NOT NULL DEFAULT true,
    "modo_recuperacao_final" "ModoRecuperacaoFinal" DEFAULT 'SUBSTITUI_MENOR_UNIDADE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esquemas_avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esquema_unidades" (
    "id" TEXT NOT NULL,
    "esquema_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "esquema_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esquema_atividades" (
    "id" TEXT NOT NULL,
    "esquema_unidade_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "esquema_atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_unidades" (
    "id" TEXT NOT NULL,
    "nota_final_id" TEXT NOT NULL,
    "esquema_unidade_id" TEXT NOT NULL,
    "nota_calculada" DOUBLE PRECISION,
    "nota_recuperacao" DOUBLE PRECISION,
    "is_desistente" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notas_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_atividades" (
    "id" TEXT NOT NULL,
    "nota_unidade_id" TEXT NOT NULL,
    "esquema_atividade_id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,

    CONSTRAINT "notas_atividades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "esquemas_avaliacao_escola_id_idx" ON "esquemas_avaliacao"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "esquema_unidades_esquema_id_ordem_key" ON "esquema_unidades"("esquema_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "notas_unidades_nota_final_id_esquema_unidade_id_key" ON "notas_unidades"("nota_final_id", "esquema_unidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_atividades_nota_unidade_id_esquema_atividade_id_key" ON "notas_atividades"("nota_unidade_id", "esquema_atividade_id");

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_esquema_avaliacao_id_fkey" FOREIGN KEY ("esquema_avaliacao_id") REFERENCES "esquemas_avaliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_esquema_avaliacao_id_fkey" FOREIGN KEY ("esquema_avaliacao_id") REFERENCES "esquemas_avaliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esquemas_avaliacao" ADD CONSTRAINT "esquemas_avaliacao_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esquema_unidades" ADD CONSTRAINT "esquema_unidades_esquema_id_fkey" FOREIGN KEY ("esquema_id") REFERENCES "esquemas_avaliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esquema_atividades" ADD CONSTRAINT "esquema_atividades_esquema_unidade_id_fkey" FOREIGN KEY ("esquema_unidade_id") REFERENCES "esquema_unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_unidades" ADD CONSTRAINT "notas_unidades_nota_final_id_fkey" FOREIGN KEY ("nota_final_id") REFERENCES "notas_finais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_unidades" ADD CONSTRAINT "notas_unidades_esquema_unidade_id_fkey" FOREIGN KEY ("esquema_unidade_id") REFERENCES "esquema_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_atividades" ADD CONSTRAINT "notas_atividades_nota_unidade_id_fkey" FOREIGN KEY ("nota_unidade_id") REFERENCES "notas_unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_atividades" ADD CONSTRAINT "notas_atividades_esquema_atividade_id_fkey" FOREIGN KEY ("esquema_atividade_id") REFERENCES "esquema_atividades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
