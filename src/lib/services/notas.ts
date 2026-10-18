/**
 * Motor de cálculo de notas - único ponto de verdade para nota de etapa,
 * média final e status, substituindo as 6+ implementações duplicadas que
 * existiam espalhadas por rotas de API e componentes client (cada uma com
 * uma pequena divergência de regra).
 *
 * Funções puras (sem I/O, sem Prisma) - podem ser chamadas tanto no server
 * quanto em componentes client, e são o alvo principal de teste automatizado
 * desta frente do projeto.
 *
 * Formas de cálculo configuráveis (plano-avaliacao-frequencia.md, seção 3.1):
 * atividades -> nota da etapa (EsquemaUnidade.formaCalculo) e etapas -> média
 * final (EsquemaAvaliacao.formaCalculoFinal). Os defaults (SOMA na etapa,
 * MEDIA_ARITMETICA no final) reproduzem exatamente a conta do esquema legado.
 */

export type StatusNota =
  | 'APROVADO'
  | 'RECUPERACAO'
  | 'DESISTENTE'
  | 'APROVADO_RECUPERACAO'
  | 'APROVADO_CONSELHO'
  | 'DEPENDENCIA'
  | 'CONSERVADO'

export type FormaCalculo = 'SOMA' | 'MEDIA_ARITMETICA' | 'MEDIA_PONDERADA' | 'SOMA_COM_DIVISOR' | 'MAIOR_NOTA'
export type ModoRecuperacaoUnidade = 'SUBSTITUI_SE_MAIOR' | 'MEDIA_COM_UNIDADE'
export type ModoRecuperacaoFinal = 'SUBSTITUI_MENOR_UNIDADE' | 'NOTA_MINIMA_ISOLADA' | 'MEDIA_COM_FINAL'

export interface AtividadeInput {
  /**
   * Peso relativo na MEDIA_PONDERADA da etapa (default 1). Ignorado nas
   * outras formas - em SOMA, o quanto a atividade vale já está no próprio
   * valor lançado (limitado por EsquemaAtividade.notaMaxima no lançamento).
   */
  peso?: number
  valor: number | null
}

export interface UnidadeInput {
  esquemaUnidadeId: string
  atividades: AtividadeInput[]
  /** nota de recuperação DESTA unidade, só usada se esquema.recuperacaoUnidadeAtiva */
  notaRecuperacao?: number | null
  /** peso da etapa na média final ponderada (default 1) */
  peso?: number
  /** como as atividades viram a nota da etapa (default SOMA) */
  formaCalculo?: FormaCalculo
  /** usado em SOMA_COM_DIVISOR */
  divisor?: number | null
}

export interface EsquemaConfig {
  numUnidades: number
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade?: ModoRecuperacaoUnidade | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal?: ModoRecuperacaoFinal | null
  /** como as etapas viram a média final (default MEDIA_ARITMETICA) */
  formaCalculoFinal?: FormaCalculo | null
  /** usado quando formaCalculoFinal = SOMA_COM_DIVISOR */
  divisorFinal?: number | null
  /** MEDIA_COM_FINAL: mínimo de (média + exame) / 2; default notaMinimaAprovacao */
  notaMinimaExameFinal?: number | null
  /** arredondamento das notas calculadas (default 1 casa) */
  casasDecimais?: number | null
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

function arredonda(n: number, casas = 1): number {
  const f = 10 ** casas
  return Math.round(n * f) / f
}

/**
 * Combina valores lançados (null = ainda não lançado, ignorado) conforme a
 * forma de cálculo. Retorna null se nenhum valor foi lançado. Usado tanto
 * para atividades -> etapa quanto para etapas -> média final.
 */
function combinar(itens: { valor: number | null; peso?: number }[], forma: FormaCalculo, divisor?: number | null): number | null {
  const lancados = itens.filter((i): i is { valor: number; peso?: number } => i.valor !== null && i.valor !== undefined)
  if (lancados.length === 0) return null
  const soma = lancados.reduce((acc, i) => acc + i.valor, 0)

  switch (forma) {
    case 'MEDIA_ARITMETICA':
      return soma / lancados.length
    case 'MEDIA_PONDERADA': {
      const somaPesos = lancados.reduce((acc, i) => acc + (i.peso ?? 1), 0)
      if (somaPesos === 0) return null
      return lancados.reduce((acc, i) => acc + i.valor * (i.peso ?? 1), 0) / somaPesos
    }
    case 'SOMA_COM_DIVISOR':
      return divisor ? soma / divisor : soma
    case 'MAIOR_NOTA':
      return Math.max(...lancados.map((i) => i.valor))
    case 'SOMA':
    default:
      return soma
  }
}

/**
 * Nota de uma etapa a partir das atividades lançadas. Atividades ainda não
 * lançadas (valor null) são ignoradas - retorna null só se NENHUMA atividade
 * tiver valor ainda. Default SOMA (peso já na escala final, soma direta).
 */
export function calcularNotaUnidade(
  atividades: AtividadeInput[],
  formaCalculo: FormaCalculo = 'SOMA',
  divisor?: number | null,
  casasDecimais = 1
): number | null {
  const nota = combinar(atividades, formaCalculo, divisor)
  return nota === null ? null : arredonda(nota, casasDecimais)
}

/** Aplica a recuperação de UMA etapa sobre a nota dela, conforme o modo do esquema. */
function aplicarRecuperacaoUnidade(nota: number | null, recuperacao: number | null | undefined, esquema: EsquemaConfig): number | null {
  if (!esquema.recuperacaoUnidadeAtiva || recuperacao === null || recuperacao === undefined) return nota

  if (esquema.modoRecuperacaoUnidade === 'SUBSTITUI_SE_MAIOR') {
    return nota === null || recuperacao > nota ? recuperacao : nota
  }
  if (esquema.modoRecuperacaoUnidade === 'MEDIA_COM_UNIDADE') {
    // Prevalece a maior entre a nota original e a média com a recuperação -
    // a recuperação nunca pode baixar a nota do aluno.
    if (nota === null) return recuperacao
    return Math.max(nota, (nota + recuperacao) / 2)
  }
  return nota
}

/**
 * Média final a partir das unidades de uma disciplina/aluno. Aplica
 * recuperação por unidade (se ativa no esquema) antes de combinar as etapas
 * pela forma de cálculo final do esquema.
 */
export function calcularMediaFinal(unidades: UnidadeInput[], esquema: EsquemaConfig): MediaFinalResultado {
  const casas = esquema.casasDecimais ?? 1

  const notasUnidades = unidades.map((u) => {
    const nota = calcularNotaUnidade(u.atividades, u.formaCalculo ?? 'SOMA', u.divisor, casas)
    const comRecuperacao = aplicarRecuperacaoUnidade(nota, u.notaRecuperacao, esquema)
    return comRecuperacao === null ? null : arredonda(comRecuperacao, casas)
  })

  const lancadas = notasUnidades.filter((n): n is number => n !== null)
  const completo = notasUnidades.length === esquema.numUnidades && lancadas.length === esquema.numUnidades

  const media = combinar(
    notasUnidades.map((valor, i) => ({ valor, peso: unidades[i].peso })),
    esquema.formaCalculoFinal ?? 'MEDIA_ARITMETICA',
    esquema.divisorFinal
  )

  return { media: media === null ? null : arredonda(media, casas), completo, notasUnidades }
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
    } else if (esquema.modoRecuperacaoFinal === 'MEDIA_COM_FINAL') {
      const minimo = esquema.notaMinimaExameFinal ?? esquema.notaMinimaAprovacao
      if (media !== null && arredonda((media + notaRecuperacaoFinal) / 2, esquema.casasDecimais ?? 1) >= minimo) {
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
 * Monta o EsquemaConfig a partir da linha do banco (EsquemaAvaliacao) -
 * evita que cada rota/página copie campo a campo e esqueça os novos.
 */
export function paraEsquemaConfig(esquema: {
  numUnidades: number
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade?: ModoRecuperacaoUnidade | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal?: ModoRecuperacaoFinal | null
  formaCalculoFinal?: FormaCalculo | null
  divisorFinal?: number | null
  notaMinimaExameFinal?: number | null
  casasDecimais?: number | null
}): EsquemaConfig {
  return {
    numUnidades: esquema.numUnidades,
    notaMinimaAprovacao: esquema.notaMinimaAprovacao,
    recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
    modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade,
    recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
    modoRecuperacaoFinal: esquema.modoRecuperacaoFinal,
    formaCalculoFinal: esquema.formaCalculoFinal,
    divisorFinal: esquema.divisorFinal,
    notaMinimaExameFinal: esquema.notaMinimaExameFinal,
    casasDecimais: esquema.casasDecimais,
  }
}

/**
 * Monta a entrada do motor a partir das notas JÁ SALVAS por etapa
 * (NotaUnidade.notaCalculada), na ordem das etapas do esquema. Usado por
 * quem só lê notas (boletim, recuperação, conselho, relatórios) - a nota da
 * etapa já foi calculada pela forma configurada na hora do lançamento, então
 * entra como valor único (SOMA de 1 item = ela mesma), levando o peso da etapa.
 * NotaUnidade de outro esquema (turma que trocou de esquema) é ignorada.
 */
export function unidadesDeNotasSalvas(
  esquemaUnidades: { id: string; peso?: number | null }[],
  salvas: { esquemaUnidadeId: string; notaCalculada: number | null; notaRecuperacao?: number | null }[]
): UnidadeInput[] {
  const porUnidade = new Map(salvas.map((s) => [s.esquemaUnidadeId, s]))
  return esquemaUnidades.map((eu) => {
    const salva = porUnidade.get(eu.id)
    return {
      esquemaUnidadeId: eu.id,
      peso: eu.peso ?? 1,
      atividades: [{ valor: salva?.notaCalculada ?? null }],
      notaRecuperacao: salva?.notaRecuperacao ?? null,
    }
  })
}

export interface EtapaDaNota {
  /** nota da etapa como lançada (NotaUnidade.notaCalculada), sem recuperação */
  nota: number | null
  recuperacao: number | null
  desistente: boolean
}

/**
 * Notas de um aluno/disciplina alinhadas às etapas do esquema da turma (uma
 * posição por etapa, mesmo que vazia) - é o formato que telas e PDFs usam
 * para montar as colunas U1..UN, no lugar das colunas fixas nota1/2/3.
 */
export function etapasDaNota(
  etapas: { id: string }[],
  salvas: { esquemaUnidadeId: string; notaCalculada: number | null; notaRecuperacao?: number | null; isDesistente?: boolean }[]
): EtapaDaNota[] {
  const porUnidade = new Map(salvas.map((s) => [s.esquemaUnidadeId, s]))
  return etapas.map((e) => {
    const s = porUnidade.get(e.id)
    return { nota: s?.notaCalculada ?? null, recuperacao: s?.notaRecuperacao ?? null, desistente: !!s?.isDesistente }
  })
}

/** Aluno marcado como desistente em todas as etapas (o antigo "DS"). */
export function desistenteEmTodas(etapas: EtapaDaNota[]): boolean {
  return etapas.length > 0 && etapas.every((e) => e.desistente && e.nota === null)
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
