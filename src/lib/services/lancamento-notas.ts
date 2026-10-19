/**
 * Lançamento de notas por etapa - parte pura de api/notas/lancar.
 *
 * Monta, para um aluno, o que será gravado em cada etapa do esquema (valor
 * de cada atividade, recuperação, desistência), validando os limites. Não
 * grava nada: a rota valida o lote inteiro com esta função ANTES de abrir a
 * transação, para que um item inválido não deixe metade do lote salva.
 */
import {
  calcularMediaFinal,
  calcularNotaUnidade,
  calcularStatus,
  type EsquemaConfig,
  type FormaCalculo,
  type StatusNota,
} from '@/lib/services/notas'

export class ErroLancamento extends Error {}

export interface AtividadePayload {
  esquemaAtividadeId: string
  valor: number | string | null | undefined
}

export interface UnidadePayload {
  esquemaUnidadeId: string
  notaRecuperacao?: number | string | null
  isDesistente?: boolean
  atividades: AtividadePayload[]
}

export interface EsquemaParaLancamento {
  config: EsquemaConfig
  notaMaxima: number
  casasDecimais: number
  unidades: {
    id: string
    peso: number
    formaCalculo: FormaCalculo
    divisor: number | null
    atividades: { id: string; nome: string; notaMaxima: number; peso: number }[]
  }[]
}

export interface UnidadeExistente {
  esquemaUnidadeId: string
  /** nota da etapa já gravada - preservada se a etapa não tem atividades */
  notaCalculada?: number | null
  notaRecuperacao: number | null
  isDesistente: boolean
  atividades: { esquemaAtividadeId: string; valor: number | null }[]
}

export interface UnidadeParaSalvar {
  esquemaUnidadeId: string
  isDesistente: boolean
  notaRecuperacao: number | null
  notaCalculada: number | null
  atividades: { esquemaAtividadeId: string; valor: number | null }[]
}

export interface LancamentoAluno {
  /** false = nada foi tocado no payload deste aluno (não regrava) */
  tocado: boolean
  unidades: UnidadeParaSalvar[]
  media: number
  status: StatusNota
}

export function parseNota(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null
  const parsed = parseFloat(String(val).replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

/**
 * Valor vazio/ausente no payload preserva o que já estava salvo (mesmo
 * comportamento do lançamento legado). Lança ErroLancamento com mensagem
 * para o usuário se algum valor estiver fora dos limites.
 */
export function montarLancamentoAluno(
  esquema: EsquemaParaLancamento,
  payload: UnidadePayload[] | undefined,
  existentes: UnidadeExistente[],
  statusAtual: StatusNota | undefined,
  rotuloAluno: string
): LancamentoAluno {
  const existentePorUnidade = new Map(existentes.map((u) => [u.esquemaUnidadeId, u]))
  let tocado = false

  const unidades = esquema.unidades.map((eu) => {
    const pu = payload?.find((u) => u.esquemaUnidadeId === eu.id)
    const existente = existentePorUnidade.get(eu.id)
    const valoresSalvos = new Map((existente?.atividades ?? []).map((a) => [a.esquemaAtividadeId, a.valor]))

    if (pu) {
      const temValor = (pu.atividades ?? []).some((a) => a.valor !== null && a.valor !== undefined && a.valor !== '')
      if (temValor || pu.isDesistente || pu.notaRecuperacao !== undefined) tocado = true
    }

    const isDesistente = pu?.isDesistente ?? existente?.isDesistente ?? false
    const notaRecuperacao = pu
      ? (parseNota(pu.notaRecuperacao) ?? existente?.notaRecuperacao ?? null)
      : (existente?.notaRecuperacao ?? null)
    if (notaRecuperacao !== null && (notaRecuperacao < 0 || notaRecuperacao > esquema.notaMaxima)) {
      throw new ErroLancamento(`Nota inválida para estudante ${rotuloAluno}: recuperação deve estar entre 0 e ${esquema.notaMaxima}`)
    }

    const atividades = eu.atividades.map((ea) => {
      const recebida = pu?.atividades?.find((a) => a.esquemaAtividadeId === ea.id)
      const valor = parseNota(recebida?.valor) ?? valoresSalvos.get(ea.id) ?? null
      if (valor !== null && (valor < 0 || valor > ea.notaMaxima)) {
        throw new ErroLancamento(`Nota inválida para estudante ${rotuloAluno}: ${ea.nome} deve estar entre 0 e ${ea.notaMaxima}`)
      }
      return { esquemaAtividadeId: ea.id, peso: ea.peso, valor }
    })

    return {
      esquemaUnidadeId: eu.id,
      isDesistente,
      notaRecuperacao,
      // Etapa sem nenhuma atividade (ex.: professor ainda não criou as
      // avaliações) não tem de onde calcular: mantém a nota já gravada.
      notaCalculada: eu.atividades.length === 0
        ? (existente?.notaCalculada ?? null)
        : calcularNotaUnidade(atividades, eu.formaCalculo, eu.divisor, esquema.casasDecimais),
      atividades,
      peso: eu.peso,
      formaCalculo: eu.formaCalculo,
      divisor: eu.divisor,
    }
  })

  const resultado = calcularMediaFinal(
    unidades.map((u) => ({
      esquemaUnidadeId: u.esquemaUnidadeId,
      peso: u.peso,
      // sem atividades: entra a nota preservada da etapa, como valor único
      formaCalculo: u.atividades.length === 0 ? 'SOMA' : u.formaCalculo,
      divisor: u.atividades.length === 0 ? null : u.divisor,
      atividades: u.atividades.length === 0
        ? [{ valor: u.notaCalculada }]
        : u.atividades.map((a) => ({ peso: a.peso, valor: a.valor })),
      notaRecuperacao: u.notaRecuperacao,
    })),
    esquema.config
  )
  // Recuperação final não é papel desta rota (api/notas/recuperacao); a
  // proteção de status especiais do motor impede regressão.
  const status = calcularStatus(resultado, esquema.config, null, statusAtual)

  return {
    tocado,
    media: resultado.media ?? 0,
    status,
    unidades: unidades.map((u) => ({
      esquemaUnidadeId: u.esquemaUnidadeId,
      isDesistente: u.isDesistente,
      notaRecuperacao: u.notaRecuperacao,
      notaCalculada: u.notaCalculada,
      atividades: u.atividades.map((a) => ({ esquemaAtividadeId: a.esquemaAtividadeId, valor: a.valor })),
    })),
  }
}
