/**
 * Cobertura do cadeado de unidade (teste estático, no estilo de
 * src/lib/modulos/cobertura-modulos.test.ts).
 *
 * Varre src/ e exige que todo arquivo que GRAVA nas tabelas trancadas pelo
 * cadeado - notas (NotaFinal, NotaUnidade, NotaAtividade, NotaAvaliacao),
 * avaliações do professor (AvaliacaoDisciplina) e diário (Aula, Falta,
 * ObservacaoChamada) - importe src/lib/cadeado-unidade.ts e chame uma das
 * checagens. Arquivo novo que grave nelas sem o cadeado faz o teste falhar.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const SRC = path.resolve(__dirname, '..')

/**
 * Exceções: operações administrativas que movem ou apagam notas sem ser
 * lançamento - o cadeado NÃO as bloqueia (decisão da dona do produto).
 */
const EXCECOES: Record<string, string> = {
  // Transferência de autoria entre contas (Usuários → transferir): troca
  // modifiedById das notas da conta antiga para a nova; não muda nota.
  'app/api/usuarios/transferir/route.ts': 'administrativa: transfere a autoria das notas entre contas',
  // Exclusão de conta: limpa modifiedById das notas que ela alterou.
  'app/api/usuarios/[id]/route.ts': 'administrativa: exclusão de conta (modifiedById → null)',
  // Exclusão de turma: apaga as notas da turma junto com estudantes e disciplinas.
  'app/api/turmas/[id]/route.ts': 'administrativa: exclusão da turma inteira',
  // Esquema padrão da escola: cria as ATIVIDADES DO TEMPLATE (EsquemaAtividade), não notas.
  'lib/services/esquemas-padrao.ts': 'falso positivo: atividades do esquema (template), não notas',
  'lib/services/esquemas-avaliacao.ts': 'falso positivo: atividades do esquema (template), não notas',
}

const GRAVACAO = new RegExp(
  [
    // prisma.x.create(...) / tx.x.update(...) etc.
    String.raw`\b(notaFinal|notaUnidade|notaAtividade|notaAvaliacao|avaliacaoDisciplina|aula|falta|observacaoChamada)\.(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\b`,
    // gravação aninhada: { unidades: { create: ... } }
    String.raw`\b(unidades|atividades|avaliacoes|faltas|aulas|notas|observacoes)\s*:\s*\{\s*(create|createMany|upsert|update|updateMany|delete|deleteMany|connectOrCreate|set)\b`,
    // SQL bruto nas tabelas
    String.raw`(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+"?(notas_finais|notas_unidades|notas_atividades|notas_avaliacoes|avaliacoes_disciplina|aulas|faltas|observacoes_chamada)\b`,
  ].join('|'),
  'i'
)
const CHECAGEM = /\b(podeGravarNotaUnidade|podeGravarAula|podeGravarRecuperacaoOuConselho|verificarNotaUnidade|verificarAula|verificarRecuperacaoOuConselho)\(/

function listar(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) listar(p, out)
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p)
  }
  return out
}

const arquivos = listar(SRC).map((abs) => ({ abs, rel: path.relative(SRC, abs).split(path.sep).join('/'), src: fs.readFileSync(abs, 'utf8') }))
const gravam = arquivos.filter((f) => GRAVACAO.test(f.src))

function problemaCadeado(rel: string, src: string): string | null {
  if (!src.includes("from '@/lib/cadeado-unidade'") && !src.includes('from "@/lib/cadeado-unidade"')) return `${rel} grava notas/diário mas não importa @/lib/cadeado-unidade`
  if (!CHECAGEM.test(src)) return `${rel} grava notas/diário mas não chama nenhuma checagem do cadeado`
  return null
}

describe('cadeado de unidade: cobertura dos pontos de gravação', () => {
  it('encontra os pontos de gravação esperados', () => {
    const rels = gravam.map((f) => f.rel)
    for (const esperado of [
      'app/api/notas/lancar/route.ts',
      'app/api/notas/recuperacao/route.ts',
      'app/api/conselho-classe/route.ts',
      'app/dashboard/chamada/actions.ts',
      'app/dashboard/notas/avaliacoes/actions.ts',
    ]) expect(rels).toContain(esperado)
  })

  it('todo arquivo que grava nas tabelas trancadas chama o cadeado (ou é exceção administrativa listada)', () => {
    const problemas = gravam.filter((f) => !EXCECOES[f.rel]).map((f) => problemaCadeado(f.rel, f.src)).filter(Boolean)
    expect(problemas).toEqual([])
  })

  it('toda exceção corresponde a um arquivo que existe e ainda grava nas tabelas', () => {
    const rels = new Set(gravam.map((f) => f.rel))
    expect(Object.keys(EXCECOES).filter((e) => !rels.has(e))).toEqual([])
  })

  it('o detector funciona (arquivos de exemplo)', () => {
    expect(GRAVACAO.test('await prisma.falta.createMany({ data })')).toBe(true)
    expect(GRAVACAO.test('await tx.notaUnidade.upsert({')).toBe(true)
    expect(GRAVACAO.test('UPDATE "notas_finais" SET')).toBe(true)
    expect(GRAVACAO.test('await prisma.aula.findMany({')).toBe(false)
    expect(problemaCadeado('x.ts', 'await prisma.aula.update({})')).toMatch(/não importa/)
    expect(problemaCadeado('x.ts', "import { podeGravarAula } from '@/lib/cadeado-unidade'\nawait prisma.aula.update({})")).toMatch(/não chama/)
    expect(problemaCadeado('x.ts', "import { podeGravarAula } from '@/lib/cadeado-unidade'\nawait podeGravarAula(a, b, c, d)")).toBeNull()
  })
})
