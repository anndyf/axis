-- DropForeignKey
ALTER TABLE "sports_team_members" DROP CONSTRAINT "sports_team_members_student_id_fkey";

-- DataMigration: troca o valor armazenado de matricula-string para o id tecnico do estudante
UPDATE "sports_team_members" stm
SET "student_id" = e."id"
FROM "estudantes" e
WHERE stm."student_id" = e."matricula";

-- AddForeignKey
ALTER TABLE "sports_team_members" ADD CONSTRAINT "sports_team_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
