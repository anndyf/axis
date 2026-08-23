-- CreateTable: modelo explicito substituindo a tabela de juncao implicita _OcorrenciaEstudantes
CREATE TABLE "ocorrencia_estudantes" (
    "id" TEXT NOT NULL,
    "ocorrencia_id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,

    CONSTRAINT "ocorrencia_estudantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ocorrencia_estudantes_ocorrencia_id_estudante_id_key" ON "ocorrencia_estudantes"("ocorrencia_id", "estudante_id");

-- AddForeignKey
ALTER TABLE "ocorrencia_estudantes" ADD CONSTRAINT "ocorrencia_estudantes_ocorrencia_id_fkey" FOREIGN KEY ("ocorrencia_id") REFERENCES "ocorrencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia_estudantes" ADD CONSTRAINT "ocorrencia_estudantes_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: copia os dados da tabela implicita, traduzindo matricula (A) para o id tecnico do estudante
INSERT INTO "ocorrencia_estudantes" ("id", "ocorrencia_id", "estudante_id")
SELECT gen_random_uuid()::text, oe."B", e."id"
FROM "_OcorrenciaEstudantes" oe
JOIN "estudantes" e ON e."matricula" = oe."A";

-- DropTable: remove a tabela de juncao implicita, substituida pelo modelo explicito acima
DROP TABLE "_OcorrenciaEstudantes";
