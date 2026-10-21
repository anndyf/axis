-- Correção de dados: até aqui o logAudit (src/lib/audit.ts) gravava o horário
-- de Brasília "como se fosse UTC" (3h atrás do instante real). Passa a valer
-- UTC de verdade; os registros antigos são adiantados 3h (o Brasil não tem
-- horário de verão desde 2019).
-- PLATAFORMA_ESCOLA fica de fora: é gravado direto pelo Prisma
-- (src/lib/plataforma.ts), que sempre usou UTC de verdade.
UPDATE "audit_logs"
SET "created_at" = "created_at" + interval '3 hours'
WHERE "entity_type" <> 'PLATAFORMA_ESCOLA';
