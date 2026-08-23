-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_estudante_id_fkey";

-- DataMigration: troca o valor armazenado de matricula-string para o id tecnico do estudante
UPDATE "users" u
SET "estudante_id" = e."id"
FROM "estudantes" e
WHERE u."estudante_id" = e."matricula";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
