import type { Prisma } from '@prisma/client'

/**
 * Validação e gravação do corpo de POST/PUT de api/esquemas-avaliacao -
 * compartilhado pelas duas rotas para não divergirem (antes cada uma tinha
 * a própria cópia). Campos da regra configurável: plano-avaliacao-frequencia.md,
 * seção 3.1.
 */

const FORMAS = ['SOMA', 'MEDIA_ARITMETICA', 'MEDIA_PONDERADA', 'SOMA_COM_DIVISOR', 'MAIOR_NOTA'] as const
// MAIOR_NOTA entre etapas não é regra de aprovação usada por ninguém - só vale dentro da etapa
const FORMAS_FINAIS = ['SOMA', 'MEDIA_ARITMETICA', 'MEDIA_PONDERADA', 'SOMA_COM_DIVISOR'] as const
const MODOS_REC_UNIDADE = ['SUBSTITUI_SE_MAIOR', 'MEDIA_COM_UNIDADE'] as const
const MODOS_REC_FINAL = ['NOTA_MINIMA_ISOLADA', 'SUBSTITUI_MENOR_UNIDADE', 'MEDIA_COM_FINAL'] as const
const DEFINICOES = ['ESCOLA', 'PROFESSOR'] as const
const REGISTROS = ['POR_AULA', 'POR_DIA'] as const
const APURACOES = ['GERAL', 'POR_COMPONENTE'] as const

type Forma = (typeof FORMAS)[number]

export interface EsquemaBody {
  nome: string
  notaMinimaAprovacao?: number
  recuperacaoUnidadeAtiva?: boolean
  modoRecuperacaoUnidade?: string | null
  recuperacaoFinalAtiva?: boolean
  modoRecuperacaoFinal?: string | null
  notaMinimaExameFinal?: number | null
  notaMaxima?: number
  casasDecimais?: number
  formaCalculoFinal?: string
  divisorFinal?: number | null
  definicaoAtividades?: string
  registroFrequencia?: string
  apuracaoFrequencia?: string
  frequenciaMinima?: number
  unidades: {
    nome: string
    peso?: number
    formaCalculo?: string
    divisor?: number | null
    atividades: { nome: string; notaMaxima: number; peso?: number }[]
  }[]
}

function umDe<T extends readonly string[]>(valor: string | null | undefined, opcoes: T, padrao: T[number]): T[number] | null {
  if (valor === undefined || valor === null || valor === '') return padrao
  return (opcoes as readonly string[]).includes(valor) ? (valor as T[number]) : null
}

function numeroPositivo(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

export type EsquemaValidado = {
  dados: Omit<Prisma.EsquemaAvaliacaoUncheckedCreateInput, 'escolaId'>
  unidades: { nome: string; peso: number; formaCalculo: Forma; divisor: number | null; atividades: { nome: string; notaMaxima: number; peso: number }[] }[]
}

/** Retorna os dados prontos para gravar, ou uma mensagem de erro (400). */
export function validarEsquema(body: EsquemaBody): EsquemaValidado | { erro: string } {
  const { nome, unidades } = body
  if (!nome || !Array.isArray(unidades) || unidades.length === 0) {
    return { erro: 'Nome e ao menos 1 unidade são obrigatórios' }
  }

  const formaFinal = umDe(body.formaCalculoFinal, FORMAS_FINAIS, 'MEDIA_ARITMETICA')
  const modoRecUnidade = umDe(body.modoRecuperacaoUnidade, MODOS_REC_UNIDADE, 'SUBSTITUI_SE_MAIOR')
  const modoRecFinal = umDe(body.modoRecuperacaoFinal, MODOS_REC_FINAL, 'NOTA_MINIMA_ISOLADA')
  const definicao = umDe(body.definicaoAtividades, DEFINICOES, 'ESCOLA')
  const registro = umDe(body.registroFrequencia, REGISTROS, 'POR_AULA')
  const apuracao = umDe(body.apuracaoFrequencia, APURACOES, 'GERAL')
  if (!formaFinal || !modoRecUnidade || !modoRecFinal || !definicao || !registro || !apuracao) {
    return { erro: 'Opção de configuração inválida' }
  }
  if (formaFinal === 'SOMA_COM_DIVISOR' && !numeroPositivo(body.divisorFinal)) {
    return { erro: 'Informe o divisor da média final' }
  }

  const notaMaxima = body.notaMaxima ?? 10
  const frequenciaMinima = body.frequenciaMinima ?? 75
  const casasDecimais = body.casasDecimais ?? 1
  if (!numeroPositivo(notaMaxima)) return { erro: 'Nota máxima inválida' }
  if (!(frequenciaMinima >= 0 && frequenciaMinima <= 100)) return { erro: 'Frequência mínima deve estar entre 0 e 100' }
  if (!Number.isInteger(casasDecimais) || casasDecimais < 0 || casasDecimais > 2) return { erro: 'Casas decimais deve ser 0, 1 ou 2' }

  const unidadesValidadas: EsquemaValidado['unidades'] = []
  for (const u of unidades) {
    if (!u.nome || !Array.isArray(u.atividades) || u.atividades.length === 0) {
      return { erro: 'Cada unidade precisa de nome e ao menos 1 atividade' }
    }
    const forma = umDe(u.formaCalculo, FORMAS, 'SOMA')
    if (!forma) return { erro: `Forma de cálculo inválida na unidade "${u.nome}"` }
    if (forma === 'SOMA_COM_DIVISOR' && !numeroPositivo(u.divisor)) {
      return { erro: `Informe o divisor da unidade "${u.nome}"` }
    }
    const peso = u.peso ?? 1
    if (!numeroPositivo(peso)) return { erro: `Peso inválido na unidade "${u.nome}"` }

    const atividades = []
    for (const a of u.atividades) {
      if (!a.nome || !numeroPositivo(a.notaMaxima)) {
        return { erro: `Toda atividade da unidade "${u.nome}" precisa de nome e nota máxima` }
      }
      const pesoAtividade = a.peso ?? 1
      if (!numeroPositivo(pesoAtividade)) return { erro: `Peso inválido na atividade "${a.nome}"` }
      atividades.push({ nome: a.nome, notaMaxima: a.notaMaxima, peso: pesoAtividade })
    }
    unidadesValidadas.push({ nome: u.nome, peso, formaCalculo: forma, divisor: forma === 'SOMA_COM_DIVISOR' ? u.divisor ?? null : null, atividades })
  }

  const recuperacaoUnidadeAtiva = !!body.recuperacaoUnidadeAtiva
  const recuperacaoFinalAtiva = body.recuperacaoFinalAtiva ?? true

  return {
    dados: {
      nome,
      numUnidades: unidades.length,
      notaMinimaAprovacao: body.notaMinimaAprovacao ?? 5,
      recuperacaoUnidadeAtiva,
      modoRecuperacaoUnidade: recuperacaoUnidadeAtiva ? modoRecUnidade : null,
      recuperacaoFinalAtiva,
      modoRecuperacaoFinal: recuperacaoFinalAtiva ? modoRecFinal : null,
      notaMinimaExameFinal: recuperacaoFinalAtiva && modoRecFinal === 'MEDIA_COM_FINAL' ? body.notaMinimaExameFinal ?? null : null,
      notaMaxima,
      casasDecimais,
      formaCalculoFinal: formaFinal,
      divisorFinal: formaFinal === 'SOMA_COM_DIVISOR' ? body.divisorFinal ?? null : null,
      definicaoAtividades: definicao,
      registroFrequencia: registro,
      apuracaoFrequencia: apuracao,
      frequenciaMinima,
    },
    unidades: unidadesValidadas,
  }
}

/** Cria unidades e atividades de um esquema (dentro da transação da rota). */
export async function criarEstruturaEsquema(tx: Prisma.TransactionClient, esquemaId: string, unidades: EsquemaValidado['unidades']) {
  for (let i = 0; i < unidades.length; i++) {
    const u = unidades[i]
    await tx.esquemaUnidade.create({
      data: {
        esquemaId,
        ordem: i + 1,
        nome: u.nome,
        peso: u.peso,
        formaCalculo: u.formaCalculo,
        divisor: u.divisor,
        atividades: {
          create: u.atividades.map((a, j) => ({ ordem: j + 1, nome: a.nome, notaMaxima: a.notaMaxima, peso: a.peso })),
        },
      },
    })
  }
}
