-- Atividades criadas pelo professor (plano-avaliacao-frequencia.md, passo 5).
-- Só tabelas novas; nenhum dado existente é alterado.

-- CreateTable
CREATE TABLE "avaliacoes_disciplina" (
    "id" TEXT NOT NULL,
    "disciplina_id" TEXT NOT NULL,
    "esquema_unidade_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" DATE,
    "nota_maxima" DOUBLE PRECISION NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ordem" INTEGER NOT NULL,
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avaliacoes_disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_avaliacoes" (
    "id" TEXT NOT NULL,
    "nota_unidade_id" TEXT NOT NULL,
    "avaliacao_id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,

    CONSTRAINT "notas_avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avaliacoes_disciplina_disciplina_id_esquema_unidade_id_idx" ON "avaliacoes_disciplina"("disciplina_id", "esquema_unidade_id");

-- CreateIndex
CREATE INDEX "notas_avaliacoes_avaliacao_id_idx" ON "notas_avaliacoes"("avaliacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_avaliacoes_nota_unidade_id_avaliacao_id_key" ON "notas_avaliacoes"("nota_unidade_id", "avaliacao_id");

-- AddForeignKey
ALTER TABLE "avaliacoes_disciplina" ADD CONSTRAINT "avaliacoes_disciplina_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes_disciplina" ADD CONSTRAINT "avaliacoes_disciplina_esquema_unidade_id_fkey" FOREIGN KEY ("esquema_unidade_id") REFERENCES "esquema_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes_disciplina" ADD CONSTRAINT "avaliacoes_disciplina_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_avaliacoes" ADD CONSTRAINT "notas_avaliacoes_nota_unidade_id_fkey" FOREIGN KEY ("nota_unidade_id") REFERENCES "notas_unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_avaliacoes" ADD CONSTRAINT "notas_avaliacoes_avaliacao_id_fkey" FOREIGN KEY ("avaliacao_id") REFERENCES "avaliacoes_disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

