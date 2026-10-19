-- CreateEnum: os 4 valores já são usados como string literal hoje (proxy.ts
-- checa 'SUSPENSA'/'CANCELADA', onboard-escola-teste.ts usa 'ATIVA', default
-- é 'TRIAL') - esta migração só formaliza o tipo, sem mudar comportamento.
CREATE TYPE "StatusEscola" AS ENUM ('TRIAL', 'ATIVA', 'SUSPENSA', 'CANCELADA');

-- AlterTable: converte a coluna status de String livre pra enum
ALTER TABLE "escolas" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "escolas" ALTER COLUMN "status" TYPE "StatusEscola" USING status::"StatusEscola";
ALTER TABLE "escolas" ALTER COLUMN "status" SET DEFAULT 'TRIAL';

-- AlterTable: flag de admin de plataforma, independente de escolaId/isSuperuser
ALTER TABLE "users" ADD COLUMN "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;
