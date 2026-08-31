-- Substituído pela tabela escola_modulos (moduloId: 'banco-questoes').
-- Confirmado antes desta migration: nenhuma escola tinha is_banco_questoes_ativo = false,
-- então não há necessidade de backfill de override para preservar comportamento.
ALTER TABLE "configs" DROP COLUMN "is_banco_questoes_ativo";
