-- DropConstraint: remove a PK antiga de matricula. Nenhuma FK de outra tabela
-- referencia estudantes.matricula neste momento (confirmado antes de aplicar).
ALTER TABLE "estudantes" DROP CONSTRAINT "estudantes_pkey";

-- AddConstraint: promove o indice unico ja existente em id (estudantes_id_key,
-- criado e validado na Migration 2) a nova PK, em vez de reconstruir um indice do zero.
ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_pkey" PRIMARY KEY USING INDEX "estudantes_id_key";

-- CreateIndex: matricula deixa de ser globalmente unica e passa a ser unica por escola
CREATE UNIQUE INDEX "estudantes_escola_id_matricula_key" ON "estudantes"("escola_id", "matricula");
