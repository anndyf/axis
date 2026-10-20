/**
 * Backfill da fase 3a (roteiro de migração 5.2): papéis e permissões.
 *
 * O que faz (idempotente - rodar de novo não duplica nem muda nada):
 * 1. Cria os papéis de sistema (Administrador da escola, Direção, Secretaria,
 *    Coordenação, Professor, AEE, Estudante, Responsável) com as permissões
 *    de src/lib/permissoes.ts. Se já existem, só acerta o que estiver
 *    diferente da lista do código.
 * 2. Para cada usuário, cria os vínculos de papel a partir dos booleanos
 *    (tabela 2.5.3): isSuperuser → Administrador da escola, isDirecao →
 *    Direção, isStaff → Professor (escopo DOCENCIA), isAEE → AEE,
 *    isPortalUser → Estudante (escopo PROPRIO, ligado ao estudanteId).
 *    Vínculos de Secretaria/Coordenação dados pela tela não são tocados.
 * 3. Confere a equivalência: para cada usuário e cada ação antiga (gestao,
 *    staff, superuser, aee, staffPuro), can() lendo os papéis do banco dá o
 *    mesmo que a regra antiga com os booleanos; e, para quem só tem papéis
 *    com booleano, o conjunto de permissões é o mesmo. Diferença = código
 *    de saída 1.
 *
 * Não altera nem remove os booleanos de User (saem na fase 3c).
 *
 * Uso:  npx tsx prisma/backfill/fase-3a.ts            (banco local)
 *       FORCE_BACKFILL=true npx tsx prisma/backfill/fase-3a.ts   (outro host - cópia da produção)
 *       npx tsx prisma/backfill/fase-3a.ts --so-conferir
 */
import * as dotenv from 'dotenv'
import { prisma } from '@/lib/prisma'
import { garantirPapeisSistema, papeisParaSessao, sincronizarVinculosDosBooleanos, PAPEIS_COM_BOOLEANO } from '@/lib/papeis'
import { CODIGOS_PAPEL, PAPEIS_SISTEMA, papeisDosBooleanos, permissoesDosPapeis } from '@/lib/permissoes'
import { ACOES_ANTIGAS, can, canLegado } from '@/lib/rbac'

export async function backfillFase3a(opcoes: { escolaIds?: string[] } = {}) {
  const { mudancas } = await prisma.$transaction((tx) => garantirPapeisSistema(tx))
  const usuarios = await prisma.user.findMany({
    where: opcoes.escolaIds ? { escolaId: { in: opcoes.escolaIds } } : {},
    select: { id: true, username: true },
    orderBy: { createdAt: 'asc' },
  })
  let vinculosCriados = 0
  let vinculosRemovidos = 0
  const alterados: string[] = []
  for (const u of usuarios) {
    const r = await prisma.$transaction((tx) => sincronizarVinculosDosBooleanos(tx, u.id))
    vinculosCriados += r.entraram.length
    vinculosRemovidos += r.sairam.length
    if (r.entraram.length || r.sairam.length) alterados.push(u.username)
  }
  return { papeis: mudancas, usuarios: usuarios.length, vinculosCriados, vinculosRemovidos, alterados }
}

/** Papéis de sistema no banco × lista do código (só lê). */
export async function conferirPapeisSistema(): Promise<string[]> {
  const diferencas: string[] = []
  for (const codigo of CODIGOS_PAPEL) {
    const papel = await prisma.papel.findFirst({ where: { escolaId: null, codigo }, include: { permissoes: true } })
    if (!papel) { diferencas.push(`papel ${codigo} não existe`); continue }
    const noBanco = papel.permissoes.map((p) => p.permissao).sort()
    const noCodigo = [...PAPEIS_SISTEMA[codigo].permissoes].sort()
    if (noBanco.join() !== noCodigo.join()) diferencas.push(`papel ${codigo}: permissões no banco diferentes da lista do código`)
  }
  return diferencas
}

/** Equivalência can() novo (papéis do banco) × antigo (booleanos), por usuário. */
export async function conferirFase3a(opcoes: { escolaIds?: string[] } = {}) {
  const usuarios = await prisma.user.findMany({
    where: opcoes.escolaIds ? { escolaId: { in: opcoes.escolaIds } } : {},
    select: { id: true, username: true, escolaId: true, isSuperuser: true, isDirecao: true, isStaff: true, isAEE: true, isPortalUser: true, escola: { select: { nome: true } } },
    orderBy: [{ escolaId: 'asc' }, { username: 'asc' }],
  })
  const resultado: { usuario: string; escola: string; semVinculo: boolean; comparacoes: number; diferencas: string[] }[] = []
  for (const u of usuarios) {
    const sessao = await papeisParaSessao(u.id, u.escolaId)
    const diferencas: string[] = []
    let comparacoes = 0
    if (sessao) {
      for (const acao of ACOES_ANTIGAS) {
        comparacoes++
        const novo = can({ papeis: sessao.papeis, permissoes: sessao.permissoes }, acao)
        const antigo = canLegado(u, acao)
        if (novo !== antigo) diferencas.push(`${acao}: antigo ${antigo}, novo ${novo}`)
      }
      const esperados = papeisDosBooleanos(u)
      const comBooleano = sessao.papeis.filter((c) => PAPEIS_COM_BOOLEANO.includes(c))
      if (comBooleano.join() !== esperados.join()) diferencas.push(`papéis ${comBooleano.join('+') || '(nenhum)'} ≠ booleanos ${esperados.join('+') || '(nenhum)'}`)
      if (sessao.papeis.length === comBooleano.length) {
        comparacoes++
        const doCodigo = [...permissoesDosPapeis(esperados)].sort().join()
        if (sessao.permissoes.join() !== doCodigo) diferencas.push('permissões do banco ≠ permissões dos booleanos')
      }
    } else if (papeisDosBooleanos(u).length) {
      diferencas.push('sem vínculo de papel (backfill não rodou para esta conta)')
    }
    resultado.push({ usuario: u.username, escola: u.escola.nome, semVinculo: !sessao, comparacoes, diferencas })
  }
  return resultado
}

async function main() {
  dotenv.config()
  const url = process.env.DATABASE_URL ?? ''
  if (!/localhost|127\.0\.0\.1/.test(url) && process.env.FORCE_BACKFILL !== 'true') {
    console.error('❌ DATABASE_URL não aponta para host local. Para uma cópia da produção, use FORCE_BACKFILL=true (com backup verificado).')
    process.exit(1)
  }
  console.log(`🎯 Alvo: ${url.replace(/:[^:@]+@/, ':***@')}`)
  if (!process.argv.includes('--so-conferir')) {
    const r = await backfillFase3a()
    console.log(`🧩 Papéis de sistema: ${r.papeis.length ? r.papeis.join('; ') : 'já estavam iguais à lista do código'}`)
    console.log(`👤 Usuários: ${r.usuarios} · vínculos criados: ${r.vinculosCriados} · removidos: ${r.vinculosRemovidos}`)
    if (r.alterados.length) console.log(`   contas alteradas: ${r.alterados.join(', ')}`)
  }
  let falhou = false
  for (const d of await conferirPapeisSistema()) { falhou = true; console.log(`❌ ${d}`) }
  const conferencia = await conferirFase3a()
  let comparacoes = 0
  for (const c of conferencia) {
    comparacoes += c.comparacoes
    if (c.diferencas.length) { falhou = true; console.log(`❌ ${c.escola} / ${c.usuario}:\n   ${c.diferencas.join('\n   ')}`) }
  }
  const semVinculo = conferencia.filter((c) => c.semVinculo).length
  console.log(`${falhou ? '❌' : '✅'} Equivalência: ${conferencia.length} usuários, ${comparacoes} comparações, ${conferencia.filter((c) => c.diferencas.length).length} com diferença${semVinculo ? ` (${semVinculo} sem papel nenhum, como antes)` : ''}`)
  await prisma.$disconnect()
  process.exit(falhou ? 1 : 0)
}

if (process.argv[1]?.includes('fase-3a')) main()
