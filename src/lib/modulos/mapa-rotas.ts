import type { ModuloId } from './tipos'

/**
 * A que módulo pertence cada rota de API, arquivo de server actions e página
 * (caminhos relativos a src/app). Vence o prefixo mais longo. Arquivo sem
 * prefixo aqui faz o teste de cobertura falhar ("rota nova sem módulo").
 *
 * Mapa conservador (fase 1): o que é de uso misto fica no Núcleo, para
 * nenhuma escola perder acesso ao que usa hoje. PLT = painel da plataforma
 * (confere exigirAdminPlataforma, não é módulo vendido).
 */
export type DonoDoArquivo = ModuloId | 'PLT'

export const MAPA_MODULOS: Record<string, DonoDoArquivo> = {
  // --- API ---
  'api/admin/': 'NUC',
  'api/areas/': 'NUC',
  'api/auth/change-password/': 'NUC',
  'api/boletim/': 'NOT',
  'api/config/': 'NUC',
  'api/conselho-classe/': 'RES',
  'api/cursos/': 'NUC',
  'api/disciplinas/': 'NUC',
  'api/esquemas-avaliacao/': 'NUC', // uso misto: o esquema também define a frequência (DIA)
  'api/estudantes/': 'NUC', // cadastro básico do estudante é do Núcleo (doc. 4.3)
  'api/estudantes/[id]/aee/': 'AEE',
  'api/estudantes/sincronizar/': 'SEC',
  'api/financeiro/': 'FIN',
  'api/laboratorios/': 'REC',
  'api/matriz/': 'NUC', // a matriz básica gera os componentes da turma
  'api/notas/': 'NOT',
  'api/ocorrencias/': 'SEC',
  'api/planos/': 'PLA',
  'api/plataforma/': 'PLT',
  'api/provas/': 'PRV',
  'api/questoes/': 'QST',
  'api/relatorio/': 'RES',
  'api/relatorios/professores-pendentes/': 'IND',
  'api/simulados/': 'PRV',
  'api/turmas/': 'NUC',
  'api/turmas/[id]/promover/': 'SEC',
  'api/upload-csv/': 'SEC',
  'api/usuarios/': 'NUC', // inclui importar/verificar horário: vincula professor às disciplinas

  // --- server actions ---
  'dashboard/admin/pendencias/actions.ts': 'NUC',
  'dashboard/chamada/actions.ts': 'DIA',
  'dashboard/configuracoes/': 'NUC',
  'dashboard/estudantes/actions.ts': 'NUC',
  'dashboard/frequencia/actions.ts': 'DIA',
  'dashboard/mensagens/actions.ts': 'NUC', // mensagens internas de todos
  'dashboard/notas/avaliacoes/actions.ts': 'NOT',
  'dashboard/paleta/actions.ts': 'NUC',
  'dashboard/simulados/actions.ts': 'NUC', // "reportar estudante faltante" (chamado para a secretaria)
  'dashboard/turmas/schedule-actions.ts': 'DIA',
  'dashboard/usuarios/actions.ts': 'NUC',
  'portal/actions.ts': 'NUC', // portal do aluno: uso misto (notas, frequência, avisos)

  // --- páginas ---
  'dashboard/page.tsx': 'NUC',
  'dashboard/admin/': 'NUC',
  'dashboard/aee/': 'AEE',
  'dashboard/auditoria/': 'NUC',
  'dashboard/chamada/': 'DIA',
  'dashboard/conselho-classe/': 'RES',
  'dashboard/disciplinas/': 'NUC',
  'dashboard/estudantes/': 'NUC',
  'dashboard/estudantes/importar/': 'SEC',
  'dashboard/estudantes/[id]/boletim/': 'NOT',
  'dashboard/financeiro/': 'FIN',
  'dashboard/frequencia/': 'DIA',
  'dashboard/laboratorios/': 'REC',
  'dashboard/matriz/': 'NUC',
  'dashboard/mensagens/': 'NUC',
  'dashboard/modulo-indisponivel/': 'NUC',
  'dashboard/notas/': 'NOT',
  'dashboard/ocorrencias/': 'SEC',
  'dashboard/perfil/': 'NUC',
  'dashboard/planos/': 'PLA',
  'dashboard/plataforma/': 'PLT',
  'dashboard/provas/': 'PRV',
  'dashboard/questoes/': 'QST',
  'dashboard/reportar-estudante/': 'NUC',
  'dashboard/resultados/': 'RES',
  'dashboard/simulados/': 'PRV',
  'dashboard/turmas/': 'NUC',
  'dashboard/turmas/[id]/frequencia/': 'DIA',
  'dashboard/turmas/[id]/horario/': 'DIA',
  'dashboard/turmas/[id]/ocorrencias/': 'SEC',
  'dashboard/turmas/[id]/relatorio/': 'RES',
  'dashboard/turmas/[id]/status/': 'RES',
  'dashboard/ui/': 'NUC',
  'dashboard/usuarios/': 'NUC',
  'portal/page.tsx': 'NUC',
}

/** Fora da guarda de módulo, com o motivo. O teste confere que cada uma existe. */
export const EXCECOES_MODULO: Record<string, string> = {
  'api/auth/[...nextauth]/route.ts': 'login (NextAuth), antes de haver sessão',
  'manifest/route.ts': 'manifest PWA público por escola',
  'login/actions.ts': 'login, antes de haver sessão',
}

/** Dono do arquivo (caminho relativo a src/app, com barras "/"), ou null se não mapeado. */
export function moduloDoArquivo(caminho: string): DonoDoArquivo | null {
  let melhor: string | null = null
  for (const prefixo of Object.keys(MAPA_MODULOS)) {
    if (caminho.startsWith(prefixo) && (!melhor || prefixo.length > melhor.length)) melhor = prefixo
  }
  return melhor ? MAPA_MODULOS[melhor] : null
}
