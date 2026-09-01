-- CreateEnum
CREATE TYPE "NivelEnsino" AS ENUM ('FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'ENSINO_MEDIO', 'TECNICO', 'EJA', 'OUTRO');

-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "nivel_ensino" "NivelEnsino";
