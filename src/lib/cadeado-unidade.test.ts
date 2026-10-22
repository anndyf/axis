/** Cadeado de unidade - parte pura (datas, mensagens, reabertura, aula). */
import { describe, it, expect } from 'vitest'
import {
  encerramentoDaEtapa, podeDesfazerEncerramento, reaberturaVigente, mensagemBloqueio, avisoEncerrada, avisoReaberta,
  verificarAula, verificarNotaUnidade, verificarRecuperacaoOuConselho, situacoesParaTela, dataBR, type ContextoCadeado, type EtapaCadeado,
} from './cadeado-unidade'

const etapa = (o: Partial<EtapaCadeado> & { id: string; ordem: number }): EtapaCadeado => ({
  esquemaUnidadeId: `u${o.ordem}`, nome: `${o.ordem}ª Unidade`, inicio: '2026-02-09', fim: '2026-05-29', prazoLancamento: null, encerradaEm: null, ...o,
})

describe('encerramento da etapa', () => {
  it('pelo prazo: a partir do dia seguinte, no fuso da escola', () => {
    const e = { prazoLancamento: '2026-10-17', encerradaEm: null }
    expect(encerramentoDaEtapa(e, '2026-10-17')).toBeNull()
    expect(encerramentoDaEtapa(e, '2026-10-18')).toEqual({ data: '2026-10-18', origem: 'PRAZO' })
  })

  it('sem prazo não encerra sozinha', () => {
    expect(encerramentoDaEtapa({ prazoLancamento: null, encerradaEm: null }, '2030-01-01')).toBeNull()
  })

  it('manual: o dia em Brasília do clique (23h30 de Brasília ainda é o mesmo dia)', () => {
    const e = { prazoLancamento: '2026-10-30', encerradaEm: new Date('2026-10-22T02:30:00Z') } // 21/10 23h30 em Brasília
    expect(encerramentoDaEtapa(e, '2026-10-22')).toEqual({ data: '2026-10-21', origem: 'MANUAL' })
  })

  it('desfazer só o manual e só enquanto o prazo não passou', () => {
    const manual = { prazoLancamento: '2026-10-30', encerradaEm: new Date('2026-10-21T12:00:00Z') }
    expect(podeDesfazerEncerramento(manual, '2026-10-30')).toBe(true)
    expect(podeDesfazerEncerramento(manual, '2026-10-31')).toBe(false)
    expect(podeDesfazerEncerramento({ prazoLancamento: '2026-10-30', encerradaEm: null }, '2026-10-31')).toBe(false)
    expect(podeDesfazerEncerramento({ prazoLancamento: null, encerradaEm: new Date() }, '2030-01-01')).toBe(true)
  })
})

describe('mensagens', () => {
  it('formais, com a data da escola', () => {
    expect(mensagemBloqueio('1ª Unidade', '2026-10-18')).toBe('A 1ª Unidade foi encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação.')
    expect(mensagemBloqueio('2º Bimestre', '2026-10-18')).toBe('O 2º Bimestre foi encerrado em 18/10/2026. Para alterar, solicite a reabertura à coordenação.')
    expect(avisoEncerrada('1ª Unidade', '2026-10-18')).toBe('1ª Unidade encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação.')
    expect(avisoReaberta('2026-10-25')).toBe('Reaberta para você até 25/10/2026')
    expect(dataBR('2026-01-05')).toBe('05/01/2026')
  })
})

describe('checagens', () => {
  const ctx: ContextoCadeado = {
    turmaId: 't',
    ultimaOrdem: 3,
    etapas: [
      etapa({ id: 'e1', ordem: 1, inicio: '2026-02-09', fim: '2026-05-29', prazoLancamento: '2026-06-05' }),
      etapa({ id: 'e2', ordem: 2, inicio: '2026-06-01', fim: '2026-09-30', prazoLancamento: '2026-10-30' }),
      etapa({ id: 'e3', ordem: 3, inicio: '2026-10-01', fim: '2026-12-18', prazoLancamento: '2026-12-20' }),
    ],
    reaberturas: [{ id: 'r', etapaCalendarioId: 'e1', disciplinaId: 'mat', ate: '2026-10-25' }],
  }
  const HOJE = '2026-10-21'

  it('nota da unidade: reabertura vale só para a disciplina dela e até a data', () => {
    expect(verificarNotaUnidade(ctx, 'mat', 'u1', HOJE)).toEqual({ ok: true })
    expect(verificarNotaUnidade(ctx, 'por', 'u1', HOJE).ok).toBe(false)
    expect(verificarNotaUnidade(ctx, 'mat', 'u1', '2026-10-26').ok).toBe(false)
    expect(verificarNotaUnidade(ctx, 'por', 'u2', HOJE)).toEqual({ ok: true })
    expect(verificarNotaUnidade(ctx, 'por', 'sem-calendario', HOJE)).toEqual({ ok: true })
  })

  it('aula: pela data; fora de qualquer unidade não tranca; chamada diária só com reabertura sem disciplina', () => {
    expect(verificarAula(ctx, 'por', '2026-03-16', HOJE).ok).toBe(false)
    expect(verificarAula(ctx, 'por', '2026-02-02', HOJE)).toEqual({ ok: true })
    expect(verificarAula(ctx, 'mat', '2026-03-16', HOJE)).toEqual({ ok: true })
    expect(verificarAula(ctx, null, '2026-03-16', HOJE).ok).toBe(false)
    expect(verificarAula({ ...ctx, reaberturas: [{ id: 'd', etapaCalendarioId: 'e1', disciplinaId: null, ate: HOJE }] }, null, '2026-03-16', HOJE)).toEqual({ ok: true })
  })

  it('recuperação e conselho: a última etapa (maior ordem)', () => {
    expect(verificarRecuperacaoOuConselho(ctx, 'por', HOJE)).toEqual({ ok: true })
    expect(verificarRecuperacaoOuConselho(ctx, 'por', '2026-12-21').ok).toBe(false)
    // última unidade sem datas no calendário: não tranca
    expect(verificarRecuperacaoOuConselho({ ...ctx, ultimaOrdem: 4 }, 'por', '2027-01-10')).toEqual({ ok: true })
  })

  it('reabertura mais longa vence; vencida não vale', () => {
    const lista = [
      { id: 'a', etapaCalendarioId: 'e1', disciplinaId: 'mat', ate: '2026-10-20' },
      { id: 'b', etapaCalendarioId: 'e1', disciplinaId: 'mat', ate: '2026-10-24' },
    ]
    expect(reaberturaVigente(lista, 'e1', 'mat', HOJE)?.id).toBe('b')
    expect(reaberturaVigente(lista, 'e1', 'mat', '2026-10-25')).toBeNull()
  })

  it('situação para as telas', () => {
    expect(situacoesParaTela(ctx, 'mat', HOJE).map((s) => [s.esquemaUnidadeId, s.trancada, s.aviso])).toEqual([
      ['u1', false, 'Reaberta para você até 25/10/2026'],
      ['u2', false, null],
      ['u3', false, null],
    ])
    expect(situacoesParaTela(ctx, 'por', HOJE)[0]).toMatchObject({ trancada: true, aviso: '1ª Unidade encerrada em 06/06/2026. Para alterar, solicite a reabertura à coordenação.' })
  })
})
