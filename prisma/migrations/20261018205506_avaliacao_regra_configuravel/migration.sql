-- Regra de avaliação configurável (plano-avaliacao-frequencia.md, seção 3.1).
-- Aditivo e sem mudança de resultado: os defaults reproduzem a conta atual
-- (soma das atividades na etapa, média aritmética das etapas).

-- CreateEnum
CREATE TYPE "TipoNota" AS ENUM ('NUMERICA', 'CONCEITUAL');

-- CreateEnum
CREATE TYPE "FormaCalculo" AS ENUM ('SOMA', 'MEDIA_ARITMETICA', 'MEDIA_PONDERADA', 'SOMA_COM_DIVISOR', 'MAIOR_NOTA');

-- CreateEnum
CREATE TYPE "DefinicaoAtividades" AS ENUM ('ESCOLA', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "RegistroFrequencia" AS ENUM ('POR_AULA', 'POR_DIA');

-- CreateEnum
CREATE TYPE "ApuracaoFrequencia" AS ENUM ('GERAL', 'POR_COMPONENTE');

-- AlterEnum
ALTER TYPE "ModoRecuperacaoFinal" ADD VALUE 'MEDIA_COM_FINAL';

-- AlterEnum
ALTER TYPE "ModoRecuperacaoUnidade" ADD VALUE 'MEDIA_COM_UNIDADE';

-- esquema_atividades: até aqui "peso" significava QUANTO A ATIVIDADE VALE
-- (soma direta). Esse valor passa para nota_maxima, e "peso" passa a ser o
-- peso relativo na média ponderada da etapa (1 = neutro).
ALTER TABLE "esquema_atividades" ADD COLUMN "nota_maxima" DOUBLE PRECISION;
UPDATE "esquema_atividades" SET "nota_maxima" = "peso", "peso" = 1;
ALTER TABLE "esquema_atividades" ALTER COLUMN "nota_maxima" SET NOT NULL;
ALTER TABLE "esquema_atividades" ALTER COLUMN "peso" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "esquema_unidades" ADD COLUMN     "divisor" DOUBLE PRECISION,
ADD COLUMN     "forma_calculo" "FormaCalculo" NOT NULL DEFAULT 'SOMA',
ADD COLUMN     "peso" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "esquemas_avaliacao" ADD COLUMN     "apuracao_frequencia" "ApuracaoFrequencia" NOT NULL DEFAULT 'GERAL',
ADD COLUMN     "casas_decimais" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "definicao_atividades" "DefinicaoAtividades" NOT NULL DEFAULT 'ESCOLA',
ADD COLUMN     "divisor_final" DOUBLE PRECISION,
ADD COLUMN     "forma_calculo_final" "FormaCalculo" NOT NULL DEFAULT 'MEDIA_ARITMETICA',
ADD COLUMN     "frequencia_minima" DOUBLE PRECISION NOT NULL DEFAULT 75,
ADD COLUMN     "nota_maxima" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "nota_minima_exame_final" DOUBLE PRECISION,
ADD COLUMN     "registro_frequencia" "RegistroFrequencia" NOT NULL DEFAULT 'POR_AULA',
ADD COLUMN     "tipo_nota" "TipoNota" NOT NULL DEFAULT 'NUMERICA';
