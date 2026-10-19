-- Chamada e frequência (plano-avaliacao-frequencia.md, seção 3.4): Aula, Falta, Justificativa.
-- Só tabelas novas; nenhum dado existente é alterado.

-- CreateEnum
CREATE TYPE "SituacaoAula" AS ENUM ('PREVISTA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoJustificativa" AS ENUM ('ATESTADO', 'ABONO_LEGAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "EfeitoJustificativa" AS ENUM ('ABONA', 'SO_JUSTIFICA');

-- CreateTable
CREATE TABLE "aulas" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "disciplina_id" TEXT,
    "professor_id" TEXT,
    "data" DATE NOT NULL,
    "tempos" INTEGER[],
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "conteudo" TEXT,
    "situacao" "SituacaoAula" NOT NULL DEFAULT 'PREVISTA',
    "chave" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faltas" (
    "id" TEXT NOT NULL,
    "aula_id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "faltas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justificativas" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "tipo" "TipoJustificativa" NOT NULL,
    "efeito" "EfeitoJustificativa" NOT NULL,
    "descricao" TEXT,
    "documento_url" TEXT,
    "registrado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "justificativas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aulas_chave_key" ON "aulas"("chave");

-- CreateIndex
CREATE INDEX "aulas_escola_id_idx" ON "aulas"("escola_id");

-- CreateIndex
CREATE INDEX "aulas_turma_id_data_idx" ON "aulas"("turma_id", "data");

-- CreateIndex
CREATE INDEX "aulas_disciplina_id_idx" ON "aulas"("disciplina_id");

-- CreateIndex
CREATE INDEX "faltas_estudante_id_idx" ON "faltas"("estudante_id");

-- CreateIndex
CREATE UNIQUE INDEX "faltas_aula_id_estudante_id_key" ON "faltas"("aula_id", "estudante_id");

-- CreateIndex
CREATE INDEX "justificativas_escola_id_idx" ON "justificativas"("escola_id");

-- CreateIndex
CREATE INDEX "justificativas_estudante_id_idx" ON "justificativas"("estudante_id");

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faltas" ADD CONSTRAINT "faltas_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faltas" ADD CONSTRAINT "faltas_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificativas" ADD CONSTRAINT "justificativas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificativas" ADD CONSTRAINT "justificativas_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificativas" ADD CONSTRAINT "justificativas_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

