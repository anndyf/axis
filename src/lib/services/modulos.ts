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
  if (modulo === 'QST' && estado !== 'ATIVO' && usuario && can(usuario, 'questao.moderar')) return 'ATIVO'
  return estado
}

export function mensagemModuloIndisponivel(nome: string, estado: EstadoModulo): string {
  return estado === 'SOMENTE_LEITURA'
    ? `O módulo ${nome} está em modo somente leitura para a sua escola: é possível consultar, mas não criar nem alterar.`
    : `O módulo ${nome} não está disponível para a sua escola.`
}

// --- Fase 2: estado pelos planos e assinaturas --------------------------------

export type SituacaoAssinatura = 'TESTE' | 'ATIVA' | 'INADIMPLENTE' | 'SUSPENSA' | 'CANCELADA'

/** Datas como 'AAAA-MM-DD' (as colunas são @db.Date). */
export type DadosAssinatura = {
  situacao: SituacaoAssinatura
  fimTeste: string | null
  modulosDoPlano: ModuloId[]
  excecoes: { moduloId: ModuloId; estado: EstadoModulo; fim: string | null; leituraAte: string | null }[]
}

/**
 * Estado de cada módulo pela assinatura (doc. 4.4.1 e 4.5):
 * 1. módulo do plano = ATIVO, fora do plano = INATIVO (Núcleo sempre ATIVO);
 * 2. AssinaturaModulo (add-on, cortesia, teste, exceção) sobrescreve. Com o
 *    fim vencido, volta ao que o plano dá; se o plano não tem o módulo, fica
 *    SOMENTE_LEITURA até leituraAte (sem data: continua em leitura - os dados
 *    nunca somem por conta disso). SOMENTE_LEITURA com leituraAte vencido = INATIVO;
 * 3. inadimplência ou teste vencido rebaixam o que está ATIVO para
 *    SOMENTE_LEITURA. Suspensão e cancelamento continuam tratados no proxy
 *    (bloqueiam a escola inteira), por isso não mexem aqui.
 */
export function estadosDaAssinatura(a: DadosAssinatura, hoje: string): Record<ModuloId, EstadoModulo> {
  const estados = {} as Record<ModuloId, EstadoModulo>
  const venceu = (data: string | null) => !!data && data < hoje
  const rebaixar = a.situacao === 'INADIMPLENTE' || (a.situacao === 'TESTE' && venceu(a.fimTeste))
  for (const modulo of MODULO_IDS) {
    if (modulo === 'NUC') { estados[modulo] = 'ATIVO'; continue }
    const doPlano: EstadoModulo = a.modulosDoPlano.includes(modulo) ? 'ATIVO' : 'INATIVO'
    let estado: EstadoModulo = doPlano
    const excecao = a.excecoes.find((e) => e.moduloId === modulo)
    if (excecao) {
      if (!venceu(excecao.fim)) estado = excecao.estado
      else estado = doPlano === 'ATIVO' ? 'ATIVO' : 'SOMENTE_LEITURA'
      if (estado === 'SOMENTE_LEITURA' && venceu(excecao.leituraAte)) estado = 'INATIVO'
    }
    if (rebaixar && estado === 'ATIVO') estado = 'SOMENTE_LEITURA'
    estados[modulo] = estado
  }
  return estados
}

/** Itens do catálogo de menu liberados pelos estados (somente leitura também aparece). */
export function itensAtivosPelosEstados(catalogo: ItemCatalogo[], estados: Record<ModuloId, EstadoModulo>): string[] {
  return catalogo.filter((i) => i.moduloId === 'PLT' || estados[i.moduloId] !== 'INATIVO').map((i) => i.id)
}

/** Equivalência velho × novo (doc. 5.1, regra 3): itens de menu e estados por módulo. */
export function diferencasDeModulos(
  velho: { itens: string[]; estados: Record<ModuloId, EstadoModulo> },
  novo: { itens: string[]; estados: Record<ModuloId, EstadoModulo> },
): string[] {
  const dif: string[] = []
  for (const i of velho.itens) if (!novo.itens.includes(i)) dif.push(`item ${i}: some no modelo novo`)
  for (const i of novo.itens) if (!velho.itens.includes(i)) dif.push(`item ${i}: aparece só no modelo novo`)
  for (const m of MODULO_IDS) if (velho.estados[m] !== novo.estados[m]) dif.push(`módulo ${m}: ${velho.estados[m]} → ${novo.estados[m]}`)
  return dif
}

/**
 * Backfill: converte os overrides de EscolaModulo (por item de menu) em
 * exceções por módulo que reproduzem o resultado antigo. Só itens com plano
 * mínimo têm efeito hoje; override em item sem plano mínimo é ignorado (e
 * relatado). Módulo com itens divergentes (ex.: provas ligado, simulados
 * desligado) fica ATIVO - conservador - e é relatado.
 */
export function excecoesDosOverrides(
  catalogo: (ItemCatalogo & { planoMinimo?: unknown })[],
  overrides: { moduloId: string; ativo: boolean }[],
  itemNoPlano: (itemId: string) => boolean,
): { excecoes: { moduloId: ModuloId; estado: EstadoModulo }[]; avisos: string[] } {
  const excecoes: { moduloId: ModuloId; estado: EstadoModulo }[] = []
  const avisos: string[] = []
  const porModulo = new Map<ModuloId, true>()
  for (const o of overrides) {
    const item = catalogo.find((i) => i.id === o.moduloId)
    if (!item) { avisos.push(`override "${o.moduloId}" não corresponde a item do catálogo: ignorado`); continue }
    if (item.moduloId === 'PLT' || item.moduloId === 'NUC' || !item.planoMinimo) { avisos.push(`override "${o.moduloId}" (sem plano mínimo) não tinha efeito: ignorado`); continue }
    porModulo.set(item.moduloId, true)
  }
  for (const modulo of porModulo.keys()) {
    const pagos = catalogo.filter((i) => i.moduloId === modulo && i.planoMinimo)
    const ativos = pagos.map((i) => {
      const o = overrides.find((x) => x.moduloId === i.id)
      return o ? o.ativo : itemNoPlano(i.id)
    })
    if (ativos.every(Boolean)) excecoes.push({ moduloId: modulo, estado: 'ATIVO' })
    else if (!ativos.some(Boolean)) excecoes.push({ moduloId: modulo, estado: 'INATIVO' })
    else {
      excecoes.push({ moduloId: modulo, estado: 'ATIVO' })
      avisos.push(`módulo ${modulo}: itens divergentes (${pagos.map((p, k) => `${p.id}=${ativos[k]}`).join(', ')}) - ficou ATIVO`)
    }
  }
  return { excecoes, avisos }
}
