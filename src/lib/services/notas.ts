/**
 * Motor de cálculo de notas - único ponto de verdade para média de unidade,
 * média final e status, substituindo as 6+ implementações duplicadas que
 * existiam espalhadas por rotas de API e componentes client (cada uma com
 * uma pequena divergência de regra).
 *
 * Funções puras (sem I/O, sem Prisma) - podem ser chamadas tanto no server
 * quanto em componentes client, e são o alvo principal de teste automatizado
 * desta frente do projeto.
 */

export type StatusNota =
  | 'APROVADO'
  | 'RECUPERACAO'
  | 'DESISTENTE'
  | 'APROVADO_RECUPERACAO'
  | 'APROVADO_CONSELHO'
  | 'DEPENDENCIA'
  | 'CONSERVADO'

export type ModoRecuperacaoUnidade = 'SUBSTITUI_SE_MAIOR'
export type ModoRecuperacaoFinal = 'SUBSTITUI_MENOR_UNIDADE' | 'NOTA_MINIMA_ISOLADA'

export interface AtividadeInput {
  /** peso já na escala final (ex: Prova=6, Trabalho=2, Participação=2 - soma direta = nota da unidade) */
  peso: number
  valor: number | null
}

export interface UnidadeInput {
  esquemaUnidadeId: string
  atividades: AtividadeInput[]
  /** nota de recuperação DESTA unidade, só usada se esquema.recuperacaoUnidadeAtiva */
  notaRecuperacao?: number | null
}

export interface EsquemaConfig {
  numUnidades: number
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade?: ModoRecuperacaoUnidade | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal?: ModoRecuperacaoFinal | null
}

export interface MediaFinalResultado {
  /** média das unidades já lançadas - parcial enquanto !completo, útil pra exibição em tempo real */
  media: number | null
  /** true só quando as numUnidades do esquema têm nota (já considerando recuperação por unidade) */
  completo: boolean
  /** nota efetiva de cada unidade, na mesma ordem de `unidades` recebida */
  notasUnidades: (number | null)[]
}

const STATUS_ESPECIAIS = new Set<StatusNota>([
  'APROVADO_RECUPERACAO',
  'APROVADO_CONSELHO',
  'DEPENDENCIA',
  'CONSERVADO',
])

function arredonda(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Soma as atividades lançadas de uma unidade (peso já na escala final,
 * soma direta). Atividades ainda não lançadas (valor null) são ignoradas -
 * retorna null só se NENHUMA atividade tiver valor ainda.
 */
export function calcularNotaUnidade(atividades: AtividadeInput[]): number | null {
  const lancadas = atividades.filter((a) => a.valor !== null && a.valor !== undefined)
  if (lancadas.length === 0) return null
  const soma = lancadas.reduce((acc, a) => acc + (a.valor as number), 0)
  return arredonda(soma)
}

/**
 * Média final a partir das unidades de uma disciplina/aluno. Aplica
 * recuperação por unidade (se ativa no esquema) antes de calcular a média.
 */
export function calcularMediaFinal(unidades: UnidadeInput[], esquema: EsquemaConfig): MediaFinalResultado {
  const notasUnidades = unidades.map((u) => {
    let nota = calcularNotaUnidade(u.atividades)

    if (
      esquema.recuperacaoUnidadeAtiva &&
      esquema.modoRecuperacaoUnidade === 'SUBSTITUI_SE_MAIOR' &&
      u.notaRecuperacao !== null &&
      u.notaRecuperacao !== undefined
    ) {
      if (nota === null || u.notaRecuperacao > nota) {
        nota = u.notaRecuperacao
      }
    }

    return nota
  })

  const lancadas = notasUnidades.filter((n): n is number => n !== null)
  const completo = notasUnidades.length === esquema.numUnidades && lancadas.length === esquema.numUnidades
  const media = lancadas.length > 0 ? arredonda(lancadas.reduce((a, b) => a + b, 0) / lancadas.length) : null

  return { media, completo, notasUnidades }
}

/**
 * Decide o status final (APROVADO/RECUPERACAO/APROVADO_RECUPERACAO), já
 * aplicando a recuperação final (se ativa no esquema) e preservando status
 * "especiais" (Conselho de Classe, Dependência, Conservado) que não devem
 * regredir para RECUPERACAO num recálculo.
 */
export function calcularStatus(
  resultado: MediaFinalResultado,
  esquema: EsquemaConfig,
  notaRecuperacaoFinal?: number | null,
  statusAtual?: StatusNota
): StatusNota {
  const { media, completo, notasUnidades } = resultado

  if (!completo) {
    return statusAtual && STATUS_ESPECIAIS.has(statusAtual) ? statusAtual : 'RECUPERACAO'
  }

  let status: StatusNota = media !== null && media >= esquema.notaMinimaAprovacao ? 'APROVADO' : 'RECUPERACAO'

  if (
    status === 'RECUPERACAO' &&
    esquema.recuperacaoFinalAtiva &&
    notaRecuperacaoFinal !== null &&
    notaRecuperacaoFinal !== undefined
  ) {
    if (esquema.modoRecuperacaoFinal === 'NOTA_MINIMA_ISOLADA') {
      if (notaRecuperacaoFinal >= esquema.notaMinimaAprovacao) {
        status = 'APROVADO_RECUPERACAO'
      }
    } else {
      // SUBSTITUI_MENOR_UNIDADE (default)
      const validas = notasUnidades.filter((n): n is number => n !== null)
      if (validas.length > 0) {
        const menor = Math.min(...validas)
        if (notaRecuperacaoFinal > menor) {
          const idxMenor = validas.indexOf(menor)
          const substituidas = [...validas]
          substituidas[idxMenor] = notaRecuperacaoFinal
          const novaMedia = substituidas.reduce((a, b) => a + b, 0) / substituidas.length
          if (novaMedia >= esquema.notaMinimaAprovacao) {
            status = 'APROVADO_RECUPERACAO'
          }
        }
      }
    }
  }

  // Proteção: não regride um status especial já definido (ex: decisão de
  // Conselho de Classe) pra RECUPERACAO num recálculo automático.
  if (status === 'RECUPERACAO' && statusAtual && STATUS_ESPECIAIS.has(statusAtual)) {
    return statusAtual
  }

  return status
}

/**
 * Resolve qual esquema de avaliação vale pra uma turma: override da turma,
 * senão o padrão do curso. Não faz fallback pro "legado da escola" aqui -
 * depois do seed da Fase 2, todo Curso já tem um esquema vinculado.
 */
export function resolverEsquemaAvaliacaoId(
  turma: { esquemaAvaliacaoId?: string | null },
  curso?: { esquemaAvaliacaoId?: string | null } | null
): string | null {
  return turma.esquemaAvaliacaoId ?? curso?.esquemaAvaliacaoId ?? null
}
