-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanoTipo" AS ENUM ('BASICO', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_RESPOSTA', 'RESOLVIDO', 'FECHADO');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "MessageCategory" AS ENUM ('COMUNICADO', 'SUPORTE', 'DIRECAO', 'GERAL', 'SISTEMA');

-- CreateEnum
CREATE TYPE "QuestaoStatus" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "Dificuldade" AS ENUM ('FACIL', 'MEDIO', 'DIFICIL');

-- CreateEnum
CREATE TYPE "status_nota" AS ENUM ('APROVADO', 'RECUPERACAO', 'DESISTENTE', 'APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO');

-- CreateTable
CREATE TABLE "escolas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plano" "PlanoTipo" NOT NULL DEFAULT 'BASICO',
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "logo_url" TEXT,
    "cor_primaria" TEXT,
    "cor_secundaria" TEXT,
    "email_dominio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "escola_id" TEXT,
    "is_superuser" BOOLEAN NOT NULL DEFAULT false,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "is_direcao" BOOLEAN NOT NULL DEFAULT false,
    "is_portal_user" BOOLEAN NOT NULL DEFAULT false,
    "estudante_id" TEXT,
    "is_aee" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configs" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "escola_id" TEXT,
    "is_banco_questoes_ativo" BOOLEAN NOT NULL DEFAULT true,
    "ano_letivo_atual" INTEGER NOT NULL DEFAULT 2026,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "ticket_number" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "escola_id" TEXT,
    "category" "MessageCategory" NOT NULL DEFAULT 'GERAL',
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIA',
    "assigned_to_id" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_id" TEXT,
    "internal_status" TEXT,
    "allow_replies" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reads" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_deletes" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_deletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questoes" (
    "id" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "imagem_url" TEXT,
    "muleta" TEXT,
    "alternativaA" TEXT NOT NULL,
    "alternativaB" TEXT NOT NULL,
    "alternativaC" TEXT NOT NULL,
    "alternativaD" TEXT NOT NULL,
    "alternativaE" TEXT NOT NULL,
    "correta" TEXT NOT NULL,
    "dificuldade" "Dificuldade" NOT NULL DEFAULT 'MEDIO',
    "status" "QuestaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "feedback_admin" TEXT,
    "professor_id" TEXT NOT NULL,
    "admin_feedback_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "unidade" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "questoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provas" (
    "id" TEXT NOT NULL,
    "codigo" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "turma_id" TEXT,
    "professor_criador_id" TEXT,
    "saved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "questoes_snapshot" JSONB,
    "unidade" INTEGER,
    "tipo" TEXT DEFAULT 'BIMESTRAL',
    "area_id" TEXT,

    CONSTRAINT "provas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escola_id" TEXT,
    "curso_id" TEXT,
    "curso" TEXT,
    "turno" TEXT,
    "modalidade" TEXT,
    "serie" TEXT,
    "numero" INTEGER,
    "ano_letivo" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_aula" (
    "id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "horario" INTEGER NOT NULL,
    "disciplina" TEXT NOT NULL,
    "professor" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horarios_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "turnos" TEXT[],
    "escola_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudantes" (
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'ATIVO',
    "turma_anterior_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "data_nascimento" TIMESTAMP(3),
    "sexo" TEXT,

    CONSTRAINT "estudantes_pkey" PRIMARY KEY ("matricula")
);

-- CreateTable
CREATE TABLE "ocorrencias" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrado_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "area_id" TEXT,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_finais" (
    "id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,
    "disciplina_id" TEXT NOT NULL,
    "nota" DOUBLE PRECISION NOT NULL,
    "nota_recuperacao" DOUBLE PRECISION,
    "status" "status_nota" NOT NULL,
    "modified_by_id" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "nota_1" DOUBLE PRECISION,
    "nota_2" DOUBLE PRECISION,
    "nota_3" DOUBLE PRECISION,
    "is_desistente_unid1" BOOLEAN NOT NULL DEFAULT false,
    "is_desistente_unid2" BOOLEAN NOT NULL DEFAULT false,
    "is_desistente_unid3" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notas_finais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_finais_audit" (
    "id" TEXT NOT NULL,
    "nota_final_id" TEXT NOT NULL,
    "nota_anterior" DOUBLE PRECISION,
    "nota_atual" DOUBLE PRECISION NOT NULL,
    "status" "status_nota" NOT NULL,
    "modified_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_finais_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_ensino" (
    "id" TEXT NOT NULL,
    "disciplina_nome" TEXT NOT NULL,
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fim" TIMESTAMP(3) NOT NULL,
    "indicadores" TEXT NOT NULL,
    "conteudos" TEXT NOT NULL,
    "metodologias" TEXT NOT NULL,
    "recursos" TEXT NOT NULL,
    "avaliacao" TEXT NOT NULL,
    "observacoes" TEXT,
    "professor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_ensino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_conhecimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escola_id" TEXT,

    CONSTRAINT "areas_conhecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_simulados" (
    "id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,
    "area_id" TEXT,
    "prova_id" TEXT,
    "unidade" INTEGER NOT NULL,
    "nota" DOUBLE PRECISION,
    "ausente" BOOLEAN NOT NULL DEFAULT false,
    "nota_segunda_chamada" DOUBLE PRECISION,
    "ano_letivo" INTEGER NOT NULL DEFAULT 2026,
    "lancado_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_simulados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrizes_curriculares" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "curso_id" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "area_id" TEXT,
    "ano_letivo" INTEGER NOT NULL DEFAULT 2026,

    CONSTRAINT "matrizes_curriculares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsaveis_simulados" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "area_id" TEXT,
    "prova_id" TEXT,
    "unidade" INTEGER,
    "ano_letivo" INTEGER NOT NULL DEFAULT 2026,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responsaveis_simulados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratorios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escola_id" TEXT,
    "descricao" TEXT,

    CONSTRAINT "laboratorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_laboratorio" (
    "id" TEXT NOT NULL,
    "laboratorio_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "turno" TEXT NOT NULL,
    "horario" INTEGER NOT NULL,
    "disciplina" TEXT,
    "turma_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_laboratorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aee_profiles" (
    "id" TEXT NOT NULL,
    "estudante_id" TEXT NOT NULL,
    "cids" TEXT[],
    "condicao" TEXT NOT NULL,
    "recomendacoes" TEXT NOT NULL,
    "notasDirecao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "precisa_prova_adaptada" BOOLEAN NOT NULL DEFAULT false,
    "precisa_prova_sala_especial" BOOLEAN NOT NULL DEFAULT false,
    "foto_url" TEXT,
    "contato_nome" TEXT,
    "contato_telefone" TEXT,

    CONSTRAINT "aee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aee_acknowledgements" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aee_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_settings" (
    "id" TEXT NOT NULL DEFAULT 'global_config',
    "min_grade" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "min_attendance" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "max_infrequent_percent" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "terms_content" TEXT NOT NULL DEFAULT '',
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_modalities" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "min_players" INTEGER NOT NULL DEFAULT 5,
    "max_players" INTEGER NOT NULL DEFAULT 12,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_misto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sport_modalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_teams" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "modality_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "contact_phone" TEXT,

    CONSTRAINT "sports_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "id_back_url" TEXT,
    "id_front_url" TEXT,

    CONSTRAINT "sports_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_matches" (
    "id" TEXT NOT NULL,
    "team1_id" TEXT,
    "team2_id" TEXT,
    "modality_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "score1" INTEGER NOT NULL DEFAULT 0,
    "score2" INTEGER NOT NULL DEFAULT 0,
    "winner_id" TEXT,
    "match_date" TIMESTAMP(3),
    "match_day" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "group_id" TEXT,

    CONSTRAINT "game_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuestaoTurmas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QuestaoTurmas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProvaQuestoes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProvaQuestoes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TurmaUsuarios" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TurmaUsuarios_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OcorrenciaEstudantes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OcorrenciaEstudantes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DisciplinaUsuarios" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DisciplinaUsuarios_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_QuestaoDisciplinas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QuestaoDisciplinas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PlanoTurmas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlanoTurmas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "escolas_slug_key" ON "escolas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_escola_id_idx" ON "users"("escola_id");

-- CreateIndex
CREATE INDEX "configs_escola_id_idx" ON "configs"("escola_id");

-- CreateIndex
CREATE INDEX "messages_receiver_id_created_at_idx" ON "messages"("receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_parent_id_created_at_idx" ON "messages"("parent_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_category_created_at_idx" ON "messages"("category", "created_at");

-- CreateIndex
CREATE INDEX "messages_is_global_created_at_idx" ON "messages"("is_global", "created_at");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_updated_at_idx" ON "messages"("updated_at");

-- CreateIndex
CREATE INDEX "messages_escola_id_idx" ON "messages"("escola_id");

-- CreateIndex
CREATE INDEX "message_reads_user_id_idx" ON "message_reads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "message_reads"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "message_deletes_user_id_idx" ON "message_deletes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_deletes_message_id_user_id_key" ON "message_deletes"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "turmas_ano_letivo_idx" ON "turmas"("ano_letivo");

-- CreateIndex
CREATE INDEX "turmas_escola_id_idx" ON "turmas"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "horarios_aula_turma_id_dia_semana_horario_key" ON "horarios_aula"("turma_id", "dia_semana", "horario");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_sigla_key" ON "cursos"("sigla");

-- CreateIndex
CREATE INDEX "cursos_escola_id_idx" ON "cursos"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_nome_modalidade_key" ON "cursos"("nome", "modalidade");

-- CreateIndex
CREATE INDEX "estudantes_nome_idx" ON "estudantes"("nome");

-- CreateIndex
CREATE INDEX "estudantes_turma_id_idx" ON "estudantes"("turma_id");

-- CreateIndex
CREATE INDEX "ocorrencias_data_idx" ON "ocorrencias"("data");

-- CreateIndex
CREATE INDEX "disciplinas_turma_id_idx" ON "disciplinas"("turma_id");

-- CreateIndex
CREATE INDEX "notas_finais_status_idx" ON "notas_finais"("status");

-- CreateIndex
CREATE INDEX "notas_finais_disciplina_id_idx" ON "notas_finais"("disciplina_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_finais_estudante_id_disciplina_id_key" ON "notas_finais"("estudante_id", "disciplina_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_conhecimento_nome_key" ON "areas_conhecimento"("nome");

-- CreateIndex
CREATE INDEX "areas_conhecimento_escola_id_idx" ON "areas_conhecimento"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrizes_curriculares_nome_curso_id_serie_ano_letivo_key" ON "matrizes_curriculares"("nome", "curso_id", "serie", "ano_letivo");

-- CreateIndex
CREATE UNIQUE INDEX "laboratorios_nome_key" ON "laboratorios"("nome");

-- CreateIndex
CREATE INDEX "laboratorios_escola_id_idx" ON "laboratorios"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_laboratorio_laboratorio_id_data_turno_horario_key" ON "reservas_laboratorio"("laboratorio_id", "data", "turno", "horario");

-- CreateIndex
CREATE UNIQUE INDEX "aee_profiles_estudante_id_key" ON "aee_profiles"("estudante_id");

-- CreateIndex
CREATE UNIQUE INDEX "aee_acknowledgements_profile_id_user_id_key" ON "aee_acknowledgements"("profile_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sport_modalities_nome_key" ON "sport_modalities"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "sports_team_members_team_id_student_id_key" ON "sports_team_members"("team_id", "student_id");

-- CreateIndex
CREATE INDEX "_QuestaoTurmas_B_index" ON "_QuestaoTurmas"("B");

-- CreateIndex
CREATE INDEX "_ProvaQuestoes_B_index" ON "_ProvaQuestoes"("B");

-- CreateIndex
CREATE INDEX "_TurmaUsuarios_B_index" ON "_TurmaUsuarios"("B");

-- CreateIndex
CREATE INDEX "_OcorrenciaEstudantes_B_index" ON "_OcorrenciaEstudantes"("B");

-- CreateIndex
CREATE INDEX "_DisciplinaUsuarios_B_index" ON "_DisciplinaUsuarios"("B");

-- CreateIndex
CREATE INDEX "_QuestaoDisciplinas_B_index" ON "_QuestaoDisciplinas"("B");

-- CreateIndex
CREATE INDEX "_PlanoTurmas_B_index" ON "_PlanoTurmas"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("matricula") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configs" ADD CONSTRAINT "configs_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_deletes" ADD CONSTRAINT "message_deletes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_deletes" ADD CONSTRAINT "message_deletes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_admin_feedback_id_fkey" FOREIGN KEY ("admin_feedback_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas" ADD CONSTRAINT "provas_professor_criador_id_fkey" FOREIGN KEY ("professor_criador_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas" ADD CONSTRAINT "provas_saved_by_user_id_fkey" FOREIGN KEY ("saved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas" ADD CONSTRAINT "provas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas" ADD CONSTRAINT "provas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_conhecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_aula" ADD CONSTRAINT "horarios_aula_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_turma_anterior_id_fkey" FOREIGN KEY ("turma_anterior_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_conhecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_finais" ADD CONSTRAINT "notas_finais_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_finais" ADD CONSTRAINT "notas_finais_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("matricula") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_finais" ADD CONSTRAINT "notas_finais_modified_by_id_fkey" FOREIGN KEY ("modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_finais_audit" ADD CONSTRAINT "notas_finais_audit_modified_by_id_fkey" FOREIGN KEY ("modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_finais_audit" ADD CONSTRAINT "notas_finais_audit_nota_final_id_fkey" FOREIGN KEY ("nota_final_id") REFERENCES "notas_finais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_ensino" ADD CONSTRAINT "planos_ensino_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas_conhecimento" ADD CONSTRAINT "areas_conhecimento_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_simulados" ADD CONSTRAINT "notas_simulados_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_conhecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_simulados" ADD CONSTRAINT "notas_simulados_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "provas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_simulados" ADD CONSTRAINT "notas_simulados_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("matricula") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_simulados" ADD CONSTRAINT "notas_simulados_lancado_by_id_fkey" FOREIGN KEY ("lancado_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrizes_curriculares" ADD CONSTRAINT "matrizes_curriculares_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_conhecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsaveis_simulados" ADD CONSTRAINT "responsaveis_simulados_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsaveis_simulados" ADD CONSTRAINT "responsaveis_simulados_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsaveis_simulados" ADD CONSTRAINT "responsaveis_simulados_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsaveis_simulados" ADD CONSTRAINT "responsaveis_simulados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratorios" ADD CONSTRAINT "laboratorios_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_laboratorio" ADD CONSTRAINT "reservas_laboratorio_laboratorio_id_fkey" FOREIGN KEY ("laboratorio_id") REFERENCES "laboratorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_laboratorio" ADD CONSTRAINT "reservas_laboratorio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aee_profiles" ADD CONSTRAINT "aee_profiles_estudante_id_fkey" FOREIGN KEY ("estudante_id") REFERENCES "estudantes"("matricula") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aee_acknowledgements" ADD CONSTRAINT "aee_acknowledgements_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "aee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aee_acknowledgements" ADD CONSTRAINT "aee_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_teams" ADD CONSTRAINT "sports_teams_modality_id_fkey" FOREIGN KEY ("modality_id") REFERENCES "sport_modalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_team_members" ADD CONSTRAINT "sports_team_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "estudantes"("matricula") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_team_members" ADD CONSTRAINT "sports_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sports_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_modality_id_fkey" FOREIGN KEY ("modality_id") REFERENCES "sport_modalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "sports_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "sports_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "sports_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestaoTurmas" ADD CONSTRAINT "_QuestaoTurmas_A_fkey" FOREIGN KEY ("A") REFERENCES "questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestaoTurmas" ADD CONSTRAINT "_QuestaoTurmas_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProvaQuestoes" ADD CONSTRAINT "_ProvaQuestoes_A_fkey" FOREIGN KEY ("A") REFERENCES "provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProvaQuestoes" ADD CONSTRAINT "_ProvaQuestoes_B_fkey" FOREIGN KEY ("B") REFERENCES "questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TurmaUsuarios" ADD CONSTRAINT "_TurmaUsuarios_A_fkey" FOREIGN KEY ("A") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TurmaUsuarios" ADD CONSTRAINT "_TurmaUsuarios_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OcorrenciaEstudantes" ADD CONSTRAINT "_OcorrenciaEstudantes_A_fkey" FOREIGN KEY ("A") REFERENCES "estudantes"("matricula") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OcorrenciaEstudantes" ADD CONSTRAINT "_OcorrenciaEstudantes_B_fkey" FOREIGN KEY ("B") REFERENCES "ocorrencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisciplinaUsuarios" ADD CONSTRAINT "_DisciplinaUsuarios_A_fkey" FOREIGN KEY ("A") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisciplinaUsuarios" ADD CONSTRAINT "_DisciplinaUsuarios_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestaoDisciplinas" ADD CONSTRAINT "_QuestaoDisciplinas_A_fkey" FOREIGN KEY ("A") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestaoDisciplinas" ADD CONSTRAINT "_QuestaoDisciplinas_B_fkey" FOREIGN KEY ("B") REFERENCES "questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlanoTurmas" ADD CONSTRAINT "_PlanoTurmas_A_fkey" FOREIGN KEY ("A") REFERENCES "planos_ensino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlanoTurmas" ADD CONSTRAINT "_PlanoTurmas_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

