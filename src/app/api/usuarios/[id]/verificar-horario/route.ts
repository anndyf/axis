import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/** Normaliza string para comparação: minúsculas, sem acentos, sem pontuação */
function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Verifica se dois nomes são compatíveis (um contém o outro) */
function nomesBatem(nomeBanco: string, nomeHorario: string): boolean {
  const b = normalizar(nomeBanco)
  const h = normalizar(nomeHorario)
  if (b === h) return true
  if (b.includes(h) || h.includes(b)) return true

  // Verificar palavras-chave: pelo menos 60% das palavras do horário estão no banco
  const palavrasH = h.split(' ').filter(p => p.length > 2)
  if (palavrasH.length === 0) return false
  const batem = palavrasH.filter(p => b.includes(p))
  return batem.length / palavrasH.length >= 0.6
}

/**
 * Normaliza o código da turma para bater com o que está no banco.
 *
 * Para turmas PROEJA (sufixo EJA no horário físico):
 *   1. Remove o sufixo EJA
 *   2. Remove o E extra que aparece antes da letra de turno em siglas de 2+ letras
 *      ex: ELEN → ELN  (EL=sigla, E=extra, N=turno)
 *   3. Sempre adiciona E ao final (sufixo PROEJA padrão do banco)
 *
 * Exemplos:
 *   1TELEN1eja → 1TELEN1 → 1TELN1 → 1TELN1E ✅
 *   2TIN1eja   → 2TIN1   → 2TIN1  → 2TIN1E  ✅
 *   3TIN1eja   → 3TIN1   → 3TIN1  → 3TIN1E  ✅
 */
function normalizarCodTurma(codigo: string): string {
  const c = codigo.toUpperCase()

  if (/EJA$/i.test(c)) {
    // 1. Remove sufixo EJA
    const semEja = c.replace(/EJA$/i, '')

    // 2. Remove E extra antes da letra de turno (padrão: sigla 2+ letras + E + turno + dígitos)
    //    "TELEN1" → captura EL + E + N + 1 → "TELN1"
    const semEExtra = semEja.replace(/([A-Z]{2,})E([NMVI])(\d+)$/, '$1$2$3')

    // 3. Sempre adiciona E no final
    return semEExtra + 'E'
  }

  return c
}



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId

    const { texto } = await request.json() as { texto: string }
    if (!texto?.trim()) {
      return NextResponse.json({ message: 'Texto vazio' }, { status: 400 })
    }

    // ── 1. Extrair pares turma(disciplina) do texto ──────────────────────────
    // Suporta: 2TIM2(Inst Manu Computadores), 2TIN1E(MATEMATICA), etc.
    const regex = /([A-Z0-9]+(?:eja|EJA|SUB|sub)?)\s*\(([^)]+)\)/gi
    const pares: { turmaCode: string; turmaCodeOriginal: string; discNome: string }[] = []

    let match
    while ((match = regex.exec(texto)) !== null) {
      const turmaCodeOriginal = match[1].trim().toUpperCase()
      const turmaCode = normalizarCodTurma(turmaCodeOriginal) // EJA → E
      const discNome = match[2].trim()
      // Evitar duplicatas do mesmo par
      if (!pares.find(p => p.turmaCode === turmaCode && normalizar(p.discNome) === normalizar(discNome))) {
        pares.push({ turmaCode, turmaCodeOriginal, discNome })
      }
    }

    if (pares.length === 0) {
      return NextResponse.json({
        message: 'Nenhum par turma(disciplina) encontrado. Verifique o formato.',
        encontrados: [],
        naoEncontrados: []
      })
    }

    // ── 2. Buscar as turmas correspondentes no banco ─────────────────────────
    const codigosTurma = [...new Set(pares.map(p => p.turmaCode))]
    const turmasBanco = await prisma.turma.findMany({
      where: { nome: { in: codigosTurma }, escolaId },
      include: {
        disciplinas: { select: { id: true, nome: true } }
      }
    })

    const turmaMap = new Map(turmasBanco.map(t => [t.nome.toUpperCase(), t]))

    // ── 3. Buscar disciplinas já vinculadas ao professor ──────────────────────
    const usuarioAtual = await prisma.user.findUnique({
      where: { id, escolaId },
      select: { disciplinasPermitidas: { select: { id: true } } }
    })
    const jaVinculadasIds = new Set(usuarioAtual?.disciplinasPermitidas.map(d => d.id) ?? [])

    // ── 4. Fazer o matching ──────────────────────────────────────────────────
    const encontrados: {
      turmaCode: string
      turmaId: string
      discNome: string
      discId: string
      discNomeBanco: string
      jaVinculada: boolean
    }[] = []

    const naoEncontrados: {
      turmaCode: string
      discNome: string
      motivo: string
      sugestoes: string[]
    }[] = []

    for (const par of pares) {
      const turma = turmaMap.get(par.turmaCode)

      if (!turma) {
        naoEncontrados.push({
          turmaCode: par.turmaCode,
          discNome: par.discNome,
          motivo: 'Turma não encontrada no banco',
          sugestoes: []
        })
        continue
      }

      // Procura disciplina que bate
      const discMatch = turma.disciplinas.find(d => nomesBatem(d.nome, par.discNome))

      if (!discMatch) {
        naoEncontrados.push({
          turmaCode: par.turmaCode,
          discNome: par.discNome,
          motivo: `Turma encontrada (${turma.nome}), mas nenhuma disciplina com nome compatível`,
          sugestoes: turma.disciplinas.map(d => d.nome).slice(0, 5)
        })
        continue
      }

      encontrados.push({
        turmaCode: par.turmaCodeOriginal, // exibe o código original do horário (ex: 2TIN1EJA)
        turmaId: turma.id,
        discNome: par.discNome,
        discId: discMatch.id,
        discNomeBanco: discMatch.nome,
        jaVinculada: jaVinculadasIds.has(discMatch.id)
      })
    }

    return NextResponse.json({
      totalPares: pares.length,
      encontrados,
      naoEncontrados
    })

  } catch (error: any) {
    console.error('Erro verificar-horario:', error)
    return NextResponse.json({ message: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
