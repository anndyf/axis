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

/**
 * Estudante: Dados · Notas e frequência (boletim, que já traz a frequência
 * por disciplina) · AEE · Histórico. Ocorrências do estudante ficam fora: a
 * tela de ocorrências só filtra por nome (não por estudante) e não há
 * documentos anexados no sistema hoje.
 */
export interface PermissoesFichaEstudante {
  editar: boolean
  boletim: boolean
  aee: boolean
  historico: boolean
}

export function abasDoEstudante(matricula: string, p: PermissoesFichaEstudante): AbaLink[] {
  const base = `/dashboard/estudantes/${encodeURIComponent(matricula)}`
  return [
    { href: base, rotulo: 'Dados', exato: true },
    ...(p.boletim ? [{ href: `${base}/boletim`, rotulo: 'Notas e frequência' }] : []),
    ...(p.aee ? [{ href: `/dashboard/aee/${encodeURIComponent(matricula)}`, rotulo: 'AEE' }] : []),
    ...(p.historico ? [{ href: `${base}/historico`, rotulo: 'Histórico' }] : []),
  ]
}

/**
 * Usuário: Dados (com os papéis, cujo editor da fase 3b faz parte do
 * formulário de usuário) · Disciplinas e turmas (professor) · Histórico.
 */
export interface PermissoesFichaUsuario {
  disciplinas: boolean
  historico: boolean
}

export function abasDoUsuario(id: string, p: PermissoesFichaUsuario): AbaLink[] {
  const base = `/dashboard/usuarios/${id}`
  return [
    { href: base, rotulo: 'Dados e papéis', exato: true, ativaEm: [`${base}/editar`] },
    ...(p.disciplinas ? [{ href: `${base}/disciplinas`, rotulo: 'Disciplinas e turmas', ativaEm: [`${base}/importar-horario`] }] : []),
    ...(p.historico ? [{ href: `${base}/historico`, rotulo: 'Histórico' }] : []),
  ]
}
