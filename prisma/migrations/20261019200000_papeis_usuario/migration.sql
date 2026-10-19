-- Papéis do usuário (Fase 1 de perfis e permissões).
-- papeis passa a ser a fonte da verdade; os campos is_* continuam existindo
-- enquanto as telas migram para can(), e a CHECK abaixo impede que os dois
-- divirjam: qualquer gravação que mude só um lado falha.
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'DIRECAO', 'COORDENACAO', 'PROFESSOR', 'AEE');

ALTER TABLE "users" ADD COLUMN "papeis" "Papel"[] NOT NULL DEFAULT ARRAY[]::"Papel"[];

-- Backfill 1:1 a partir dos campos atuais (ninguém ganha nem perde acesso)
UPDATE "users" SET "papeis" = ARRAY_REMOVE(ARRAY[
  CASE WHEN "is_superuser" THEN 'ADMIN'::"Papel" END,
  CASE WHEN "is_direcao"   THEN 'DIRECAO'::"Papel" END,
  CASE WHEN "is_staff"     THEN 'PROFESSOR'::"Papel" END,
  CASE WHEN "is_aee"       THEN 'AEE'::"Papel" END
], NULL);

ALTER TABLE "users" ADD CONSTRAINT "users_papeis_flags_consistentes" CHECK (
  "is_superuser" = ('ADMIN' = ANY("papeis")) AND
  "is_direcao"   = ('DIRECAO' = ANY("papeis")) AND
  "is_staff"     = ('PROFESSOR' = ANY("papeis")) AND
  "is_aee"       = ('AEE' = ANY("papeis"))
);
