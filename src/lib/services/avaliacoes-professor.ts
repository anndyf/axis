/**
 * Atividades criadas pelo professor (plano-avaliacao-frequencia.md, passo 5,
 * definicaoAtividades = PROFESSOR) - funções puras.
 *
 * A escola define as etapas e a forma de cálculo; o professor cria as
 * avaliações de cada etapa no diário dele. As atividades do template da
 * escola continuam valendo como teto: a nota máxima que a etapa alcança
 * com as avaliações do professor não pode passar da que alcançaria com o
 * template (ex.: SOMA com template "Total 10" -> soma das avaliações ≤ 10).
 */
import { calcularNotaUnidade, type FormaCalculo } from '@/lib/services/notas'

export interface ItemAvaliado {
  notaMaxima: number
  peso?: number
}

const EPS = 1e-9

/** Nota máxima que a etapa alcança com todos os itens no valor máximo. */
export function notaMaximaDaEtapa(itens: ItemAvaliado[], forma: FormaCalculo, divisor?: number | null): number {
  if (itens.length === 0) return 0
  return calcularNotaUnidade(itens.map((i) => ({ valor: i.notaMaxima, peso: i.peso ?? 1 })), forma, divisor, 6) ?? 0
}

/**
 * As avaliações do professor cabem no teto da etapa? Retorna a mensagem de
 * erro para o usuário, ou null se estiver tudo certo.
 */
export function validarAvaliacoesDaEtapa(
  avaliacoes: ItemAvaliado[],
  template: ItemAvaliado[],
  forma: FormaCalculo,
  divisor?: number | null
): string | null {
  const teto = notaMaximaDaEtapa(template, forma, divisor)
  const alcancada = notaMaximaDaEtapa(avaliacoes, forma, divisor)
  if (alcancada > teto + EPS) {
    const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
    return forma === 'SOMA' || forma === 'SOMA_COM_DIVISOR'
      ? `As avaliações desta etapa somam ${fmt(alcancada)}, mais que o máximo da etapa (${fmt(teto)}).`
      : `Nenhuma avaliação pode valer mais que o máximo da etapa (${fmt(teto)}).`
  }
  return null
}

export interface DadosAvaliacao {
  nome: string
  data: string | null
  notaMaxima: number
  peso: number
}

/** Valida e normaliza o que vem do formulário. */
export function validarDadosAvaliacao(entrada: unknown): DadosAvaliacao | { erro: string } {
  const e = (entrada ?? {}) as Record<string, unknown>
  const nome = typeof e.nome === 'string' ? e.nome.trim().slice(0, 120) : ''
  if (!nome) return { erro: 'Dê um nome à avaliação.' }
  const notaMaxima = Number(String(e.notaMaxima ?? '').replace(',', '.'))
  if (!Number.isFinite(notaMaxima) || notaMaxima <= 0) return { erro: 'A nota máxima deve ser maior que zero.' }
  const peso = e.peso === undefined || e.peso === null || e.peso === '' ? 1 : Number(String(e.peso).replace(',', '.'))
  if (!Number.isFinite(peso) || peso <= 0) return { erro: 'O peso deve ser maior que zero.' }
  let data: string | null = null
  if (e.data) {
    if (typeof e.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.data) || isNaN(Date.parse(`${e.data}T00:00:00Z`))) return { erro: 'Data inválida.' }
    data = e.data
  }
  return { nome, data, notaMaxima, peso }
}
