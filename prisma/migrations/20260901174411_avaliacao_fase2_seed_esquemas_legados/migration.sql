-- Fase 2 (modelo de avaliação configurável): cria, para cada escola, os
-- dois esquemas "legados" que replicam exatamente o comportamento atual
-- do sistema (3 unidades anuais / 2 unidades semestrais, 1 atividade por
-- unidade, peso 10 = "digitar 1 nota direto"), e vincula cada Curso ao
-- esquema certo.
--
-- Fonte da classificação: Curso.modalidade (não Turma.modalidade) -
-- confirmado contra dados reais que Turma.modalidade está sempre NULL,
-- então a regra histórica "isSemestral = modalidade IN (PROEJA,
-- SUBSEQUENTE)" nunca de fato executou para dados reais; Curso.modalidade
-- é quem carrega o valor de verdade. Decisão de negócio confirmada: cursos
-- PROEJA/SUBSEQUENTE são semestrais (2 unidades) - a regra pretendida
-- desde sempre, mesmo que nunca tenha sido aplicada de fato até agora.
-- Turma.esquemaAvaliacaoId fica só como fallback para turmas sem cursoId.
--
-- Idempotente: pula escolas que já têm o esquema legado criado.
DO $$
DECLARE
  esc RECORD;
  esquema3_id TEXT;
  esquema2_id TEXT;
  unidade_id TEXT;
  i INT;
BEGIN
  FOR esc IN SELECT id FROM escolas LOOP
    IF EXISTS (
      SELECT 1 FROM esquemas_avaliacao
      WHERE escola_id = esc.id AND nome = '3 Unidades (Legado)'
    ) THEN
      CONTINUE;
    END IF;

    -- Esquema "3 Unidades (Legado)"
    esquema3_id := gen_random_uuid()::text;
    INSERT INTO esquemas_avaliacao
      (id, escola_id, nome, num_unidades, nota_minima_aprovacao,
       recuperacao_unidade_ativa, recuperacao_final_ativa, modo_recuperacao_final,
       created_at, updated_at)
    VALUES
      (esquema3_id, esc.id, '3 Unidades (Legado)', 3, 5,
       false, true, 'SUBSTITUI_MENOR_UNIDADE',
       NOW(), NOW());

    FOR i IN 1..3 LOOP
      unidade_id := gen_random_uuid()::text;
      INSERT INTO esquema_unidades (id, esquema_id, ordem, nome)
      VALUES (unidade_id, esquema3_id, i, i || 'ª Unidade');
      INSERT INTO esquema_atividades (id, esquema_unidade_id, nome, peso, ordem)
      VALUES (gen_random_uuid()::text, unidade_id, 'Nota da Unidade', 10, 1);
    END LOOP;

    -- Esquema "2 Unidades Semestral (Legado)"
    esquema2_id := gen_random_uuid()::text;
    INSERT INTO esquemas_avaliacao
      (id, escola_id, nome, num_unidades, nota_minima_aprovacao,
       recuperacao_unidade_ativa, recuperacao_final_ativa, modo_recuperacao_final,
       created_at, updated_at)
    VALUES
      (esquema2_id, esc.id, '2 Unidades Semestral (Legado)', 2, 5,
       false, true, 'SUBSTITUI_MENOR_UNIDADE',
       NOW(), NOW());

    FOR i IN 1..2 LOOP
      unidade_id := gen_random_uuid()::text;
      INSERT INTO esquema_unidades (id, esquema_id, ordem, nome)
      VALUES (unidade_id, esquema2_id, i, i || 'ª Unidade');
      INSERT INTO esquema_atividades (id, esquema_unidade_id, nome, peso, ordem)
      VALUES (gen_random_uuid()::text, unidade_id, 'Nota da Unidade', 10, 1);
    END LOOP;

    -- Vincula cada Curso ao esquema certo, pela modalidade
    UPDATE cursos SET esquema_avaliacao_id = esquema2_id
      WHERE escola_id = esc.id AND modalidade IN ('PROEJA', 'SUBSEQUENTE');
    UPDATE cursos SET esquema_avaliacao_id = esquema3_id
      WHERE escola_id = esc.id AND (modalidade IS NULL OR modalidade NOT IN ('PROEJA', 'SUBSEQUENTE'));

    -- Fallback: turmas sem cursoId, usando Turma.modalidade diretamente
    -- (na prática não deve afetar nenhuma turma real hoje, já que todas
    -- têm cursoId preenchido - mas mantém integridade para dados futuros)
    UPDATE turmas SET esquema_avaliacao_id = esquema2_id
      WHERE escola_id = esc.id AND curso_id IS NULL AND modalidade IN ('PROEJA', 'SUBSEQUENTE');
    UPDATE turmas SET esquema_avaliacao_id = esquema3_id
      WHERE escola_id = esc.id AND curso_id IS NULL AND (modalidade IS NULL OR modalidade NOT IN ('PROEJA', 'SUBSEQUENTE'));
  END LOOP;
END $$;
