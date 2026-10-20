/**
 * Catálogo de módulos vendáveis (docs/arquitetura/modulos-e-planos.md, 4.2).
 * Importável no cliente (sem banco). A regra de acesso fica em
 * src/lib/services/modulos.ts e a guarda do servidor em ./guarda.ts.
 */
export const MODULO_IDS = ['NUC', 'SEC', 'DIA', 'NOT', 'RES', 'AEE', 'QST', 'PRV', 'PLA', 'COM', 'REC', 'FIN', 'IND', 'DOC'] as const
export type ModuloId = (typeof MODULO_IDS)[number]

/** ATIVO inclui período de teste; SOMENTE_LEITURA chega com as assinaturas (fase 2). */
export type EstadoModulo = 'ATIVO' | 'SOMENTE_LEITURA' | 'INATIVO'
export type Acesso = 'leitura' | 'escrita'

export const NOMES_MODULOS: Record<ModuloId, string> = {
  NUC: 'Núcleo Áxis',
  SEC: 'Secretaria Escolar',
  DIA: 'Diário de Classe e Frequência',
  NOT: 'Avaliação e Notas',
  RES: 'Conselho de Classe e Resultados',
  AEE: 'Inclusão e AEE',
  QST: 'Banco de Questões',
  PRV: 'Gerador de Provas e Simulados',
  PLA: 'Planejamento',
  COM: 'Comunicação e Portal da Família',
  REC: 'Recursos e Espaços',
  FIN: 'Financeiro Escolar',
  IND: 'Indicadores',
  DOC: 'Documentos Oficiais',
}

export function ehModuloId(valor: unknown): valor is ModuloId {
  return typeof valor === 'string' && (MODULO_IDS as readonly string[]).includes(valor)
}
