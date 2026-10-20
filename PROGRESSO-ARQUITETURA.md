# Progresso — Revisão de Arquitetura do Áxis

Branch: `planejamento/arquitetura` (a partir da `main` em `ac0b607`).
Sessão de **planejamento**: nada do sistema foi alterado; só `docs/arquitetura/` e este arquivo.

## Passos

| # | Documento | Situação |
|---|---|---|
| 0 | Leitura do código, schema, planos e histórico | ✅ |
| 1 | [`docs/arquitetura/inventario.md`](docs/arquitetura/inventario.md) — o que existe hoje | ✅ |
| 2 | [`docs/arquitetura/dominio-alvo.md`](docs/arquitetura/dominio-alvo.md) — o modelo de uma escola real | ✅ |
| 3 | [`docs/arquitetura/personalizacao.md`](docs/arquitetura/personalizacao.md) — como cada escola adapta o sistema | ✅ |
| 4 | [`docs/arquitetura/modulos-e-planos.md`](docs/arquitetura/modulos-e-planos.md) — venda por módulos | ✅ |
| 5 | [`docs/arquitetura/roteiro-de-migracao.md`](docs/arquitetura/roteiro-de-migracao.md) — fases sem quebrar a CETEP | ✅ |
| 6 | [`docs/arquitetura/decisoes.md`](docs/arquitetura/decisoes.md) — o que precisa da dona do produto | ✅ |
| 7 | [`docs/arquitetura/schema-alvo.prisma`](docs/arquitetura/schema-alvo.prisma) — schema de referência | ✅ (válido em `prisma validate` 6.19.2) |
| 8 | Resumo executivo (abaixo) + pull request para `main` ([anndyf/axis#12](https://github.com/anndyf/axis/pull/12)) | ✅ |

## Como retomar
Fazer checkout de `planejamento/arquitetura`, ler esta tabela e continuar do primeiro passo que não está ✅.

---

## Resumo executivo

**Onde estamos.** O Áxis tem um núcleo pedagógico forte e configurável — esquema de avaliação, calendário letivo, horário, chamada, diário e frequência —, isolamento entre escolas testado automaticamente e permissões começando a ser centralizadas. Mas a estrutura ainda é a do projeto da CETEP: o estudante tem só 4 dados e **uma** turma, não existem responsáveis, a vida escolar de anos anteriores se perde ao "promover" a turma, os papéis são caixas de seleção (`isDirecao`, `isStaff`...) e o módulo contratado **só esconde o menu**: quase nenhuma rota confere no servidor se a escola pagou por ele. Também há textos fixos da CETEP e da Bahia nos PDFs e três PDFs de relatório que conferem só o login, não o papel de quem pede.

**O que muda.**
1. **Pessoa, papel, vida escolar e conta viram coisas separadas.** Uma `Pessoa` (documentos, endereço, contatos) pode ser estudante, responsável ou profissional; o estudante ganha ficha completa (Censo, saúde, deficiência, transporte, autorizações); os responsáveis passam a existir com vínculos (filiação, responsável legal, financeiro, autorizado a buscar, mora com).
2. **Matrícula por ano letivo, com enturmações e movimentações** (remanejamento, transferência, abandono, conclusão). Nada é apagado; o histórico escolar e os documentos saem disso.
3. **Estrutura no padrão do Censo**: etapas e modalidades (infantil a EJA e técnico), séries, um catálogo de componentes curriculares (não mais "Matemática" repetida em cada turma) e uma matriz curricular de verdade. Rede/mantenedora fica como camada opcional.
4. **Papéis com permissões** (direção, secretaria, coordenação, professor, AEE, responsável, estudante, mantenedora) no lugar dos booleanos, com teste que garante que ninguém perde acesso na troca.
5. **Venda por módulos garantida no servidor**: Núcleo + 13 módulos com dependências claras, `exigirModulo()` em toda rota/ação/página e um teste que falha se alguma rota de um módulo ficar sem a checagem. Planos viram pacotes no banco, com add-ons, limites e teste grátis. Desligar um módulo deixa os dados **somente leitura**, nunca os apaga.
6. **Personalização com limites**: campos personalizados (JSONB), formulário de matrícula configurável, nomenclaturas (unidade/bimestre, série/ano) e modelos de documentos com QR — e uma lista do que **não** se personaliza (regras legais, situações do Censo, permissões, cálculo de frequência).

**Em que ordem** (cada fase é uma ou mais sessões de implementação independentes):
0 corrigir lacunas de segurança → 1 `exigirModulo()` → 2 assinaturas no banco → 3 papéis → 4 ano letivo e estrutura → 5 pessoas e responsáveis (e Portal da Família) → 6 matrícula por ano e enturmação → 7 fechamento do ano e rematrícula → 8 personalização → 9 documentos oficiais e histórico → 10 LGPD operacional → 11 planilhas e Censo. As fases 0–3 **não dependem de decisões** e podem começar já. Toda fase é aditiva, com backfill dos dados da CETEP e teste de equivalência (o sistema dá o mesmo resultado antes e depois).

**As 5 decisões mais urgentes** (detalhes, opções e recomendações em `decisoes.md`):
1. **D-03** — Vender primeiro para escolas públicas, privadas ou ambas? *(Recomendação: públicas, com foco em redes municipais e escolas técnicas.)*
2. **D-01** — O que é Núcleo e qual a lista de módulos? *(Recomendação: o catálogo de 13 módulos do documento 4, com Diário fora do Núcleo.)*
3. **D-14** — Quando a CETEP passa para a matrícula por ano? *(Recomendação: depois da 1ª unidade de 2027, validando antes numa cópia do banco durante o fechamento de 2026.)*
4. **D-06** — Quais etapas atender no lançamento? *(Recomendação: fundamental II, médio, técnico e EJA; infantil e anos iniciais logo depois, com conceito/parecer.)*
5. **D-04** — Vender para redes agora ou depois? *(Recomendação: preparar o banco para rede, vender só escolas avulsas por enquanto.)*

**Achados de segurança para a fase 0** (não corrigidos aqui, por ser sessão de planejamento): os PDFs `relatorio/resultados/[id]`, `relatorio/status/[id]` e `relatorio/turma/[id]/disciplina/[disciplinaId]` conferem só login + escola (um aluno do portal provavelmente consegue baixá-los pela URL); a action `reportarEstudanteFaltante` não confere papel; as rotas dos módulos pagos aceitam chamadas com o módulo desligado.

**Limites desta revisão.** Os sites do INEP, do i-Educar e da Secretaria da Educação da Bahia estavam inacessíveis a partir desta sessão; as referências vêm de buscas (títulos e trechos) e do conhecimento geral desses sistemas, com as fontes listadas no fim do `dominio-alvo.md`. Os campos do Censo devem ser conferidos no leiaute oficial do ano antes da fase 11.


STATUS: CONCLUÍDO
