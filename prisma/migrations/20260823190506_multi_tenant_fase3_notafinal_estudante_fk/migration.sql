-- DropForeignKey
ALTER TABLE "notas_finais" DROP CONSTRAINT "notas_finais_estudante_id_fkey";

-- DataMigration: troca o valor armazenado de matricula-string para o id tecnico do estudante
UPDATE "notas_finais" nf
SET "estudante_id" = e."id"
FROM "estudantes" e
WHERE nf."estudante_id" = e."matricula";

-- AddForeignKey
ALTER TABLE "notas_finais" ADD CONSTRAINT "notas_finais_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
