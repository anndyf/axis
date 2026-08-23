-- DropForeignKey
ALTER TABLE "notas_simulados" DROP CONSTRAINT "notas_simulados_estudante_id_fkey";

-- DataMigration: troca o valor armazenado de matricula-string para o id tecnico do estudante
UPDATE "notas_simulados" ns
SET "estudante_id" = e."id"
FROM "estudantes" e
WHERE ns."estudante_id" = e."matricula";

-- AddForeignKey
ALTER TABLE "notas_simulados" ADD CONSTRAINT "notas_simulados_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
