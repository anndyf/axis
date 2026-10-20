import { MODULO_IDS, type Acesso, type EstadoModulo, type ModuloId } from '@/lib/modulos/tipos'
import { can, type RbacUser } from '@/lib/rbac'

/** Item do catálogo de menu (src/lib/modules.ts) visto pela regra de módulos. */
export type ItemCatalogo = { id: string; moduloId: ModuloId | 'PLT'; planoMinimo?: unknown }

/**
 * Estado de cada módulo a partir do modelo atual (plano + EscolaModulo, já
 * resolvidos em `ativos` por getModulosAtivos). Regra conservadora da fase 1:
 * hoje só os itens com planoMinimo podem ser desligados (o menu ignora
 * EscolaModulo nos demais), então um módulo só fica INATIVO quando todos os
 * seus itens são pagos e nenhum deles está ativo. Os outros ficam ATIVO.
 * Ex.: PRV = 'provas' ou 'simulados' ativo.
 */
export function estadosPeloCatalogo(catalogo: ItemCatalogo[], ativos: string[]): Record<ModuloId, EstadoModulo> {
  const estados = {} as Record<ModuloId, EstadoModulo>
  for (const modulo of MODULO_IDS) {
    const itens = catalogo.filter((i) => i.moduloId === modulo)
    const pagos = itens.filter((i) => i.planoMinimo)
    const desligavel = modulo !== 'NUC' && itens.length > 0 && pagos.length === itens.length
    estados[modulo] = !desligavel || pagos.some((i) => ativos.includes(i.id)) ? 'ATIVO' : 'INATIVO'
  }
  return estados
}

/** O estado permite esse tipo de acesso? Somente leitura deixa ler e barra escrita. */
export function estadoPermite(estado: EstadoModulo, acesso: Acesso): boolean {
  if (estado === 'ATIVO') return true
  if (estado === 'SOMENTE_LEITURA') return acesso === 'leitura'
  return false
}

/**
 * Estado que vale para esta pessoa. Exceção herdada (mantida para nenhuma
 * escola perder acesso): o liga/desliga do Banco de Questões sempre valeu só
 * para professores - direção e administrador continuam usando (página e POST
 * de questões já eram assim). Sai quando o toggle for para o painel da
 * plataforma (fase 2, depois da validação).
 */
export function estadoParaUsuario(modulo: ModuloId, estado: EstadoModulo, usuario?: RbacUser | null): EstadoModulo {
  if (modulo === 'QST' && estado !== 'ATIVO' && usuario && can(usuario, 'gestao')) return 'ATIVO'
  return estado
}

export function mensagemModuloIndisponivel(nome: string, estado: EstadoModulo): string {
  return estado === 'SOMENTE_LEITURA'
    ? `O módulo ${nome} está em modo somente leitura para a sua escola: é possível consultar, mas não criar nem alterar.`
    : `O módulo ${nome} não está disponível para a sua escola.`
}
