-- Remove as colunas fixas nota_1/2/3 e is_desistente_unid1/2/3 de
-- notas_finais (plano-avaliacao-frequencia.md, passo 4). Todos os leitores
-- já usam notas_unidades/notas_atividades.
--
-- Rede de segurança: antes de apagar, copia para o modelo novo toda nota
-- que ainda não tenha etapas (ex.: banco onde o backfill antigo não rodou),
-- usando o esquema efetivo da turma (turma ?? curso) - mesma regra do
-- antigo prisma/backfill-notas-unidades.ts. Notas que já têm etapas não são
-- tocadas. Sem isso, a remoção apagaria notas que só existem nas colunas fixas.

-- 1. Etapas (uma por unidade do esquema, até a 3ª - só existiam 3 colunas)
INSERT INTO "notas_unidades" ("id", "nota_final_id", "esquema_unidade_id", "nota_calculada", "is_desistente")
SELECT
  gen_random_uuid()::text,
  nf."id",
  eu."id",
  CASE eu."ordem" WHEN 1 THEN nf."nota_1" WHEN 2 THEN nf."nota_2" WHEN 3 THEN nf."nota_3" END,
  CASE eu."ordem" WHEN 1 THEN nf."is_desistente_unid1" WHEN 2 THEN nf."is_desistente_unid2" WHEN 3 THEN nf."is_desistente_unid3" END
FROM "notas_finais" nf
JOIN "estudantes" e ON e."id" = nf."estudante_id"
JOIN "turmas" t ON t."id" = e."turma_id"
LEFT JOIN "cursos" c ON c."id" = t."curso_id"
JOIN "esquema_unidades" eu
  ON eu."esquema_id" = COALESCE(t."esquema_avaliacao_id", c."esquema_avaliacao_id")
 AND eu."ordem" <= 3
WHERE NOT EXISTS (SELECT 1 FROM "notas_unidades" nu WHERE nu."nota_final_id" = nf."id");

-- 2. Atividade de cada etapa recém-criada (a primeira do esquema; nos
-- esquemas legados é a única, "Nota da Unidade")
INSERT INTO "notas_atividades" ("id", "nota_unidade_id", "esquema_atividade_id", "valor")
SELECT gen_random_uuid()::text, nu."id", ea."id", nu."nota_calculada"
FROM "notas_unidades" nu
JOIN LATERAL (
  SELECT a."id" FROM "esquema_atividades" a
  WHERE a."esquema_unidade_id" = nu."esquema_unidade_id"
  ORDER BY a."ordem" LIMIT 1
) ea ON true
WHERE NOT EXISTS (SELECT 1 FROM "notas_atividades" na WHERE na."nota_unidade_id" = nu."id");

-- 3. Remove as colunas legadas
ALTER TABLE "notas_finais" DROP COLUMN "is_desistente_unid1",
DROP COLUMN "is_desistente_unid2",
DROP COLUMN "is_desistente_unid3",
DROP COLUMN "nota_1",
DROP COLUMN "nota_2",
DROP COLUMN "nota_3";
