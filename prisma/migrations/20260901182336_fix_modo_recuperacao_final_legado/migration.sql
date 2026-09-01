-- Correção: SUBSTITUI_MENOR_UNIDADE (usado como default na Fase 2) não
-- reflete o comportamento real da rota "Recuperação Final"
-- (api/notas/recuperacao) - essa sempre foi um cheque isolado
-- (nota_recuperacao >= mínima), sem mexer na média das unidades.
-- SUBSTITUI_MENOR_UNIDADE é o que o Conselho de Classe fazia (só no
-- cliente, nunca validado no servidor) - um mecanismo distinto.
-- Corrige o default da coluna e os esquemas legados já semeados, pra
-- migrar a rota de recuperação sem mudar comportamento por baixo dos pés.

-- AlterTable
ALTER TABLE "esquemas_avaliacao" ALTER COLUMN "modo_recuperacao_final" SET DEFAULT 'NOTA_MINIMA_ISOLADA';

-- Corrige os esquemas legados já criados na Fase 2
UPDATE "esquemas_avaliacao"
SET "modo_recuperacao_final" = 'NOTA_MINIMA_ISOLADA'
WHERE "nome" IN ('3 Unidades (Legado)', '2 Unidades Semestral (Legado)')
  AND "modo_recuperacao_final" = 'SUBSTITUI_MENOR_UNIDADE';
