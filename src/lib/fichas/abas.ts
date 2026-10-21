import type { AbaLink } from '@/components/ui/Abas'

/**
 * Abas das fichas de entidade. Cada aba aponta para uma tela que já existe
 * (ou rota filha que reaproveita a mesma tela); a aba só aparece se o
 * usuário puder abrir a tela de destino, para nenhuma aba levar a um
 * "sem acesso". As flags vêm de permissoesFicha*() (servidor).
 */

export interface PermissoesFichaTurma {
  horario: boolean
  notas: boolean
  resultados: boolean
  frequencia: boolean
  ocorrencias: boolean
  historico: boolean
}

export function abasDaTurma(id: string, p: PermissoesFichaTurma): AbaLink[] {
  const base = `/dashboard/turmas/${id}`
  return [
    { href: base, rotulo: 'Visão geral', exato: true },
    { href: `${base}/estudantes`, rotulo: 'Estudantes' },
    { href: `${base}/disciplinas`, rotulo: 'Disciplinas' },
    ...(p.horario ? [{ href: `${base}/horario`, rotulo: 'Horário' }] : []),
    ...(p.notas ? [{ href: `${base}/relatorio`, rotulo: 'Notas' }] : []),
    ...(p.resultados ? [{ href: `${base}/status`, rotulo: 'Resultados' }] : []),
    ...(p.frequencia ? [{ href: `${base}/frequencia`, rotulo: 'Frequência' }] : []),
    ...(p.ocorrencias ? [{ href: `${base}/ocorrencias`, rotulo: 'Ocorrências' }] : []),
    ...(p.historico ? [{ href: `${base}/historico`, rotulo: 'Histórico' }] : []),
  ]
}

export interface PermissoesFichaEstudante {
  editar: boolean
  boletim: boolean
  frequencia: boolean
  ocorrencias: boolean
  aee: boolean
  historico: boolean
}

export function abasDoEstudante(matricula: string, p: PermissoesFichaEstudante): AbaLink[] {
  const base = `/dashboard/estudantes/${encodeURIComponent(matricula)}`
  return [
    { href: base, rotulo: 'Dados', exato: true },
    ...(p.boletim ? [{ href: `${base}/boletim`, rotulo: 'Notas e boletim' }] : []),
    ...(p.frequencia ? [{ href: `${base}/frequencia`, rotulo: 'Frequência' }] : []),
    ...(p.ocorrencias ? [{ href: `${base}/ocorrencias`, rotulo: 'Ocorrências' }] : []),
    ...(p.aee ? [{ href: `/dashboard/aee/${encodeURIComponent(matricula)}`, rotulo: 'AEE' }] : []),
    ...(p.historico ? [{ href: `${base}/historico`, rotulo: 'Histórico' }] : []),
  ]
}

export interface PermissoesFichaUsuario {
  papeis: boolean
  disciplinas: boolean
  historico: boolean
}

export function abasDoUsuario(id: string, p: PermissoesFichaUsuario): AbaLink[] {
  const base = `/dashboard/usuarios/${id}`
  return [
    { href: `${base}/editar`, rotulo: 'Dados' },
    ...(p.papeis ? [{ href: `${base}/papeis`, rotulo: 'Papéis' }] : []),
    ...(p.disciplinas ? [{ href: `${base}/disciplinas`, rotulo: 'Disciplinas e turmas' }] : []),
    ...(p.historico ? [{ href: `${base}/historico`, rotulo: 'Histórico' }] : []),
  ]
}
