-- CreateEnum
CREATE TYPE "ModuloId" AS ENUM ('NUC', 'SEC', 'DIA', 'NOT', 'RES', 'AEE', 'QST', 'PRV', 'PLA', 'COM', 'REC', 'FIN', 'IND', 'DOC');

-- CreateEnum
CREATE TYPE "EstadoModulo" AS ENUM ('ATIVO', 'SOMENTE_LEITURA', 'INATIVO');

-- CreateEnum
CREATE TYPE "SituacaoAssinatura" AS ENUM ('TESTE', 'ATIVA', 'INADIMPLENTE', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigemModulo" AS ENUM ('PLANO', 'ADICIONAL', 'CORTESIA', 'TESTE', 'EXCECAO');

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo_para_venda" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "limite_estudantes" INTEGER,
    "limite_usuarios" INTEGER,
    "limite_armazenamento_mb" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_modulos" (
    "plano_id" TEXT NOT NULL,
    "modulo_id" "ModuloId" NOT NULL,

    CONSTRAINT "planos_modulos_pkey" PRIMARY KEY ("plano_id","modulo_id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "situacao" "SituacaoAssinatura" NOT NULL DEFAULT 'TESTE',
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "fim_teste" DATE,
    "limite_estudantes" INTEGER,
    "limite_usuarios" INTEGER,
    "limite_armazenamento_mb" INTEGER,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas_modulos" (
    "id" TEXT NOT NULL,
    "assinatura_id" TEXT NOT NULL,
    "modulo_id" "ModuloId" NOT NULL,
    "origem" "OrigemModulo" NOT NULL,
    "estado" "EstadoModulo" NOT NULL DEFAULT 'ATIVO',
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "leitura_ate" DATE,

    CONSTRAINT "assinaturas_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_assinaturas" (
    "id" TEXT NOT NULL,
    "assinatura_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dados" JSONB,
    "autor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planos_codigo_key" ON "planos"("codigo");

-- CreateIndex
CREATE INDEX "assinaturas_escola_id_idx" ON "assinaturas"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_modulos_assinatura_id_modulo_id_key" ON "assinaturas_modulos"("assinatura_id", "modulo_id");

-- CreateIndex
CREATE INDEX "historico_assinaturas_assinatura_id_idx" ON "historico_assinaturas"("assinatura_id");

-- AddForeignKey
ALTER TABLE "planos_modulos" ADD CONSTRAINT "planos_modulos_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_modulos" ADD CONSTRAINT "assinaturas_modulos_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_assinaturas" ADD CONSTRAINT "historico_assinaturas_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

