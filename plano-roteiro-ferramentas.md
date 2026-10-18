# Roteiro de Ferramentas — Sistema Áxis

**Objetivo:** listar o que falta para o Áxis ser um sistema escolar completo e robusto, em ordem de prioridade. Complementa `plano-multi-tenant-axis.md` (arquitetura, concluído) e `plano-avaliacao-frequencia.md` (notas, frequência, horário — em andamento).

Levantamento feito em 18/10/2026 a partir do código atual (35 modelos, ~25 módulos no catálogo).

---

## O que já existe

Notas configuráveis por esquema, recuperação, conselho de classe, boletim, portal do aluno, AEE, ocorrências, planos de ensino, banco de questões e gerador de provas, simulados, reserva de laboratórios, mensagens/chamados, matriz curricular, auditoria, multi-escola com planos (Básico/Pro/Enterprise).

---

## P0 — Segurança e confiabilidade (antes de qualquer escola nova)

| Ferramenta | Por quê | Situação |
|---|---|---|
| **Redefinição de senha por link com validade** | Hoje "esqueci minha senha" troca a senha na hora, sem confirmação: qualquer pessoa que saiba o e-mail de alguém bloqueia o acesso dessa pessoa. A resposta também revela quais e-mails existem | ✅ Feito: link de uso único (1h, só o hash no banco), resposta igual exista ou não o e-mail, limite de 3 pedidos/hora |
| **Limite de tentativas de login** | Sem limite, senhas fracas caem por força bruta — e a senha inicial do portal é a própria matrícula | ✅ Feito: 5 erros em 15 min bloqueiam; usuário inexistente e senha errada dão o mesmo erro; status da conta só aparece com a senha certa |
| **Troca obrigatória de senha no 1º acesso** | Senha = matrícula é previsível | ✅ Feito: portal e senhas provisórias por e-mail; contas de portal existentes marcadas pela migration |
| **Cabeçalhos de segurança HTTP** | HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` | ✅ Feito (CSP pendente) |
| **CI (GitHub Actions)** | `tsc` + testes a cada push; hoje nada impede um commit quebrado | ✅ `.github/workflows/ci.yml` (roda ao subir para o GitHub) |
| **Teste automático de isolamento entre escolas** | Os ~40 vazamentos corrigidos foram achados lendo código. Um teste que chama cada rota com usuário da escola B pedindo dado da escola A pega regressões | ✅ `src/lib/isolamento-escolas.test.ts`: 67 tentativas da escola B contra dados da A + 11 de aluno do portal; já achou 1 vazamento novo e 3 rotas sem checagem de papel |
| **Monitoramento de erros** (Sentry ou similar) | Erros em produção hoje só aparecem no log do servidor | Próximo |
| **Backup e exportação por escola** | Restauração testada + exportação completa dos dados de uma escola (portabilidade, encerramento de contrato) | Próximo |
| **Lançamento de notas em transação** | Lote com erro no meio deixa metade salva | Pendência registrada |

## P1 — Núcleo acadêmico que falta

| Ferramenta | Por quê |
|---|---|
| **Calendário letivo + horário real + chamada/frequência** | Ver `plano-avaliacao-frequencia.md` (passos 6–9). Reprovação por falta é exigência legal (LDB art. 24) |
| **Diário de classe** | Registro de aula com conteúdo ministrado, ligado ao plano de ensino e à chamada — é o documento oficial do professor |
| **Matrícula por ano letivo + histórico escolar** | Hoje o estudante tem uma única turma; a vida escolar de anos anteriores se perde ao promover. Modelo `Matricula (estudante, turma, ano, situação)` |
| **Documentos oficiais com validação** | Declaração de matrícula, boletim oficial, histórico escolar, ata de resultados finais — PDF com QR code verificável |
| **Atividades criadas pelo professor** | Decidido como configurável (passo 5 do plano de avaliação) |
| **Conceito / parecer descritivo** | Necessário para anos iniciais e educação infantil |

## P2 — Comunidade escolar

| Ferramenta | Por quê |
|---|---|
| **Cadastro de responsáveis + portal do responsável** | Pais/responsáveis não existem no sistema hoje |
| **Aviso de falta no mesmo dia** | Ferramenta mais pedida por famílias; depende da chamada |
| **Notificações multicanal** | E-mail, push (o app já é PWA) e WhatsApp/SMS, com preferências por usuário |
| **Agenda de eventos** | Reuniões, provas, feriados — alimentada pelo calendário letivo |
| **Autorizações e termos com aceite digital** | Passeios, uso de imagem, termos LGPD |

## P3 — Gestão e indicadores

| Ferramenta | Por quê |
|---|---|
| **Painel de indicadores** | Aprovação, frequência e evasão por turma/disciplina/ano, com comparação histórica |
| **Alerta precoce de evasão (busca ativa)** | Cruza faltas + notas + ocorrências; faltas reiteradas exigem comunicação ao Conselho Tutelar (ECA art. 56) |
| **Exportação para o Censo Escolar (Educacenso)** | Obrigação anual de toda escola |
| **Exportação de relatórios em Excel/CSV** | Hoje só PDF |
| **Gestão de pessoal** | Carga horária docente, substituições, faltas de professor |

## P4 — Plataforma SaaS

| Ferramenta | Por quê |
|---|---|
| **Painel da plataforma (super-admin)** | Ver todas as escolas, planos, uso, status — hoje só via banco |
| **Onboarding self-service** | Hoje uma escola nova é criada por script |
| **Importação inicial guiada** | Planilhas de alunos, turmas, professores, com validação e prévia |
| **Branding** | Logo e cores (campos já existem, falta a tela) |
| **Cobrança dos planos** | Assinatura, inadimplência → `Escola.status = SUSPENSA` |
| **API pública + webhooks** | Integrações (sistemas da secretaria, catracas, apps de terceiros) |

## LGPD (atravessa tudo)

O sistema guarda dados de menores e dados de saúde (CID no AEE) — categoria sensível na LGPD. Faltam: registro de quem acessou fichas AEE, termo de consentimento dos responsáveis, exportação/anonimização dos dados de um aluno a pedido, política de retenção (o que apagar e quando).
