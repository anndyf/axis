-- DropForeignKey
ALTER TABLE "areas_conhecimento" DROP CONSTRAINT "areas_conhecimento_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "configs" DROP CONSTRAINT "configs_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "cursos" DROP CONSTRAINT "cursos_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "laboratorios" DROP CONSTRAINT "laboratorios_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "turmas" DROP CONSTRAINT "turmas_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_escola_id_fkey";

-- DropIndex
DROP INDEX "areas_conhecimento_nome_key";

-- DropIndex
DROP INDEX "cursos_nome_modalidade_key";

-- DropIndex
DROP INDEX "cursos_sigla_key";

-- DropIndex
DROP INDEX "laboratorios_nome_key";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "areas_conhecimento" ALTER COLUMN "escola_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "configs" ALTER COLUMN "escola_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cursos" ALTER COLUMN "escola_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "laboratorios" ALTER COLUMN "escola_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "escola_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "turmas" ALTER COLUMN "escola_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "escola_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "areas_conhecimento_escola_id_nome_key" ON "areas_conhecimento"("escola_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_escola_id_sigla_key" ON "cursos"("escola_id", "sigla");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_escola_id_nome_modalidade_key" ON "cursos"("escola_id", "nome", "modalidade");

-- CreateIndex
CREATE UNIQUE INDEX "laboratorios_escola_id_nome_key" ON "laboratorios"("escola_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "users_escola_id_email_key" ON "users"("escola_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_escola_id_username_key" ON "users"("escola_id", "username");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configs" ADD CONSTRAINT "configs_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas_conhecimento" ADD CONSTRAINT "areas_conhecimento_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratorios" ADD CONSTRAINT "laboratorios_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

