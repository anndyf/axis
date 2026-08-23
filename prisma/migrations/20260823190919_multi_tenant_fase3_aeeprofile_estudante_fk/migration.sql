-- DropForeignKey
ALTER TABLE "aee_profiles" DROP CONSTRAINT "aee_profiles_estudante_id_fkey";

-- DataMigration: troca o valor armazenado de matricula-string para o id tecnico do estudante
UPDATE "aee_profiles" ap
SET "estudante_id" = e."id"
FROM "estudantes" e
WHERE ap."estudante_id" = e."matricula";

-- AddForeignKey
ALTER TABLE "aee_profiles" ADD CONSTRAINT "aee_profiles_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
