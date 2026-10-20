-- CreateEnum
CREATE TYPE "EscopoPapel" AS ENUM ('ESCOLA', 'CURSO', 'SERIE', 'TURMA', 'DOCENCIA', 'DEPENDENTES', 'PROPRIO');

-- CreateTable
CREATE TABLE "papeis" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papeis_permissoes" (
    "papel_id" TEXT NOT NULL,
    "permissao" TEXT NOT NULL,

    CONSTRAINT "papeis_permissoes_pkey" PRIMARY KEY ("papel_id","permissao")
);

-- CreateTable
CREATE TABLE "vinculos_papel" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "papel_id" TEXT NOT NULL,
    "escopo" "EscopoPapel" NOT NULL DEFAULT 'ESCOLA',
    "escopo_id" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vinculos_papel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "papeis_escola_id_codigo_key" ON "papeis"("escola_id", "codigo");

-- CreateIndex
CREATE INDEX "vinculos_papel_escola_id_idx" ON "vinculos_papel"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculos_papel_usuario_id_escola_id_papel_id_key" ON "vinculos_papel"("usuario_id", "escola_id", "papel_id");

-- AddForeignKey
ALTER TABLE "papeis" ADD CONSTRAINT "papeis_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papeis_permissoes" ADD CONSTRAINT "papeis_permissoes_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_papel" ADD CONSTRAINT "vinculos_papel_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_papel" ADD CONSTRAINT "vinculos_papel_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_papel" ADD CONSTRAINT "vinculos_papel_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Papéis de sistema (escola_id nulo): um por código. O índice único acima
-- (escola_id, codigo) não cobre esse caso porque no PostgreSQL nulos são distintos.
CREATE UNIQUE INDEX "papeis_sistema_codigo_key" ON "papeis"("codigo") WHERE "escola_id" IS NULL;
