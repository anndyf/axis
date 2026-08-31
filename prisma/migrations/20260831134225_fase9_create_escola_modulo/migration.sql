-- CreateTable
CREATE TABLE "escola_modulos" (
    "id" TEXT NOT NULL,
    "escola_id" TEXT NOT NULL,
    "modulo_id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escola_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escola_modulos_escola_id_idx" ON "escola_modulos"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "escola_modulos_escola_id_modulo_id_key" ON "escola_modulos"("escola_id", "modulo_id");

-- AddForeignKey
ALTER TABLE "escola_modulos" ADD CONSTRAINT "escola_modulos_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
