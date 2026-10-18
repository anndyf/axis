-- Segurança de acesso (plano-roteiro-ferramentas.md, P0): troca obrigatória
-- de senha, redefinição por link com token e limitador de tentativas.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deve_trocar_senha" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tokens_redefinicao_senha" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_redefinicao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_acesso" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_acesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_redefinicao_senha_token_hash_key" ON "tokens_redefinicao_senha"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_redefinicao_senha_user_id_idx" ON "tokens_redefinicao_senha"("user_id");

-- CreateIndex
CREATE INDEX "tentativas_acesso_chave_criado_em_idx" ON "tentativas_acesso"("chave", "criado_em");

-- AddForeignKey
ALTER TABLE "tokens_redefinicao_senha" ADD CONSTRAINT "tokens_redefinicao_senha_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Contas do portal são criadas com senha = matrícula (previsível): todas
-- passam a trocar a senha no próximo acesso.
UPDATE "users" SET "deve_trocar_senha" = true WHERE "is_portal_user" = true;
