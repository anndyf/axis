-- Módulo "financeiro" (Fase 11 - esqueleto arquitetural) começa desligado
-- para toda escola já existente, até haver requisito de produto real.
INSERT INTO "escola_modulos" ("id", "escola_id", "modulo_id", "ativo", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", 'financeiro', false, NOW(), NOW()
FROM "escolas";
