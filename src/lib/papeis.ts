import type { Prisma, PrismaClient, EscopoPapel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  CODIGOS_PAPEL,
  PAPEIS_SISTEMA,
  booleanosDosPapeis,
  ehPermissao,
  normalizarPapeis,
  papeisDosBooleanos,
  type Booleanos,
  type CodigoPapel,
} from '@/lib/permissoes'

/**
 * Papéis no banco (fase 3). Regras puras em src/lib/permissoes.ts; aqui só
 * a leitura e a gravação.
 */

type Tx = Prisma.TransactionClient | PrismaClient

/** Papéis que têm booleano correspondente em User (ver tabela 2.5.3). */
export const PAPEIS_COM_BOOLEANO: CodigoPapel[] = ['ADMINISTRADOR', 'DIRECAO', 'PROFESSOR', 'AEE', 'ESTUDANTE']

/**
 * Cria/atualiza os papéis de sistema (escolaId nulo) com as permissões de
 * PAPEIS_SISTEMA: acrescenta as que faltam e tira as que sobram. Idempotente.
 * Devolve o que mudou (vazio quando já estava tudo igual).
 */
export async function garantirPapeisSistema(tx: Tx = prisma): Promise<{ ids: Record<CodigoPapel, string>; mudancas: string[] }> {
  const mudancas: string[] = []
  const ids = {} as Record<CodigoPapel, string>
  for (const codigo of CODIGOS_PAPEL) {
    const def = PAPEIS_SISTEMA[codigo]
    let papel = await tx.papel.findFirst({ where: { escolaId: null, codigo }, include: { permissoes: true } })
    if (!papel) {
      papel = await tx.papel.create({
        data: { codigo, nome: def.nome, descricao: def.descricao, sistema: true },
        include: { permissoes: true },
      })
      mudancas.push(`papel ${codigo} criado`)
    } else if (papel.nome !== def.nome || papel.descricao !== def.descricao || !papel.sistema) {
      await tx.papel.update({ where: { id: papel.id }, data: { nome: def.nome, descricao: def.descricao, sistema: true } })
      mudancas.push(`papel ${codigo}: nome/descrição atualizados`)
    }
    ids[codigo] = papel.id
    const atuais = new Set(papel.permissoes.map((p) => p.permissao))
    const desejadas = new Set<string>(def.permissoes)
    const faltam = [...desejadas].filter((p) => !atuais.has(p))
    const sobram = [...atuais].filter((p) => !desejadas.has(p))
    if (faltam.length) {
      await tx.papelPermissao.createMany({ data: faltam.map((permissao) => ({ papelId: papel.id, permissao })), skipDuplicates: true })
      mudancas.push(`papel ${codigo}: +${faltam.join(', +')}`)
    }
    if (sobram.length) {
      await tx.papelPermissao.deleteMany({ where: { papelId: papel.id, permissao: { in: sobram } } })
      mudancas.push(`papel ${codigo}: -${sobram.join(', -')}`)
    }
  }
  return { ids, mudancas }
}

async function idsDosPapeisSistema(tx: Tx): Promise<Record<CodigoPapel, string>> {
  const papeis = await tx.papel.findMany({ where: { escolaId: null, sistema: true }, select: { id: true, codigo: true } })
  const ids = Object.fromEntries(papeis.map((p) => [p.codigo, p.id])) as Record<CodigoPapel, string>
  if (CODIGOS_PAPEL.some((c) => !ids[c])) return (await garantirPapeisSistema(tx)).ids
  return ids
}

function escopoDoPapel(codigo: CodigoPapel, estudanteId: string | null): { escopo: EscopoPapel; escopoId: string | null } {
  const escopo = PAPEIS_SISTEMA[codigo].escopo
  return { escopo, escopoId: escopo === 'PROPRIO' ? estudanteId : null }
}

/** Papéis de sistema que a conta tem hoje na escola (vínculos vigentes). */
export async function papeisDoUsuarioNoBanco(tx: Tx, usuarioId: string, escolaId: string): Promise<CodigoPapel[]> {
  const agora = new Date()
  const vinculos = await tx.vinculoPapel.findMany({
    where: { usuarioId, escolaId, inicio: { lte: agora }, OR: [{ fim: null }, { fim: { gt: agora } }], papel: { OR: [{ escolaId: null }, { escolaId }] } },
    select: { papel: { select: { codigo: true } } },
  })
  return normalizarPapeis(vinculos.map((v) => v.papel.codigo))
}

/**
 * Deixa os vínculos da conta exatamente com `papeis` (cria os que faltam,
 * apaga os que sobram). Não mexe nos booleanos - ver gravarPapeis.
 */
async function definirVinculos(tx: Tx, u: { id: string; escolaId: string; estudanteId: string | null }, papeis: CodigoPapel[], manter: (c: CodigoPapel) => boolean = () => false) {
  const ids = await idsDosPapeisSistema(tx)
  const atuais = await tx.vinculoPapel.findMany({ where: { usuarioId: u.id, escolaId: u.escolaId }, select: { id: true, papel: { select: { codigo: true } } } })
  const atuaisCodigos = new Set(atuais.map((v) => v.papel.codigo))
  const sair = atuais.filter((v) => !papeis.includes(v.papel.codigo as CodigoPapel) && !manter(v.papel.codigo as CodigoPapel))
  const entrar = papeis.filter((c) => !atuaisCodigos.has(c))
  if (sair.length) await tx.vinculoPapel.deleteMany({ where: { id: { in: sair.map((v) => v.id) } } })
  for (const c of entrar) {
    await tx.vinculoPapel.create({ data: { usuarioId: u.id, escolaId: u.escolaId, papelId: ids[c], ...escopoDoPapel(c, u.estudanteId) } })
  }
  return { entraram: entrar, sairam: sair.map((v) => v.papel.codigo) }
}

/**
 * Escrita dupla (fase 3b): grava os papéis da conta E os booleanos
 * coerentes com eles. Use dentro de uma transação junto com o resto da
 * alteração do usuário.
 */
export async function gravarPapeis(tx: Tx, u: { id: string; escolaId: string; estudanteId?: string | null }, papeis: readonly string[]) {
  const normalizados = normalizarPapeis(papeis)
  const r = await definirVinculos(tx, { id: u.id, escolaId: u.escolaId, estudanteId: u.estudanteId ?? null }, normalizados)
  await tx.user.update({ where: { id: u.id }, data: booleanosDosPapeis(normalizados) })
  return r
}

/**
 * Para os caminhos que ainda gravam só os booleanos (cadastro do acesso do
 * estudante, primeira conta de uma escola nova, seeds): faz os vínculos dos
 * papéis que têm booleano seguirem os booleanos. Papéis sem booleano
 * (Secretaria, Coordenação) ficam como estão.
 */
export async function sincronizarVinculosDosBooleanos(tx: Tx, usuarioId: string) {
  const u = await tx.user.findUniqueOrThrow({
    where: { id: usuarioId },
    select: { id: true, escolaId: true, estudanteId: true, isSuperuser: true, isDirecao: true, isStaff: true, isAEE: true, isPortalUser: true },
  })
  const atuais = await papeisDoUsuarioNoBanco(tx, u.id, u.escolaId)
  const semBooleano = atuais.filter((c) => !PAPEIS_COM_BOOLEANO.includes(c))
  return definirVinculos(tx, u, normalizarPapeis([...papeisDosBooleanos(u), ...semBooleano]), (c) => !PAPEIS_COM_BOOLEANO.includes(c))
}

/**
 * Papéis e permissões para a sessão (login). null = a conta ainda não tem
 * vínculo nenhum (antes do backfill): a sessão fica sem papéis e can() usa
 * os booleanos, como antes.
 */
export async function papeisParaSessao(usuarioId: string, escolaId: string): Promise<{ papeis: CodigoPapel[]; permissoes: string[] } | null> {
  const agora = new Date()
  const vinculos = await prisma.vinculoPapel.findMany({
    where: { usuarioId, escolaId, inicio: { lte: agora }, OR: [{ fim: null }, { fim: { gt: agora } }], papel: { OR: [{ escolaId: null }, { escolaId }] } },
    select: { papel: { select: { codigo: true, permissoes: { select: { permissao: true } } } } },
  })
  if (!vinculos.length) return null
  const permissoes = new Set<string>()
  for (const v of vinculos) for (const p of v.papel.permissoes) if (ehPermissao(p.permissao)) permissoes.add(p.permissao)
  return { papeis: normalizarPapeis(vinculos.map((v) => v.papel.codigo)), permissoes: [...permissoes].sort() }
}

export type { Booleanos }

/**
 * Cria a conta e os vínculos de papel dos booleanos dela, na mesma
 * transação (caminhos que ainda criam pelos booleanos: acesso do estudante ao portal).
 */
export async function criarUsuarioComVinculos(args: { data: Prisma.UserUncheckedCreateInput }) {
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: args.data })
    await sincronizarVinculosDosBooleanos(tx, u.id)
    return u
  })
}
