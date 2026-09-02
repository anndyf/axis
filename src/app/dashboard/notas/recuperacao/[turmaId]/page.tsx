import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RecuperacaoClient from "./RecuperacaoClient"

export const metadata = {
  title: 'Áxis - Notas'
}

import { Session } from "next-auth"

export const runtime = 'nodejs'

async function getNotasRecuperacao(turmaId: string, session: Session) {
  // 1. Buscar disciplinas permitidas para o usuário nesta turma
  const whereDisciplinas: any = { turmaId }
  
  if (!session.user.isSuperuser && !session.user.isDirecao) {
    whereDisciplinas.usuariosPermitidos = {
      some: { id: session.user.id }
    }
  }

  const disciplinas = await prisma.disciplina.findMany({
    where: whereDisciplinas,
    orderBy: { nome: 'asc' }
  })

  const disciplinasIds = new Set(disciplinas.map((d: any) => d.id))

  // 2. Buscar dados da turma e notas (superset amplo, refinado abaixo em JS
  // com `unidades` - não usa mais "nota1/nota2/nota3 not null", que
  // hardcodeava 3 unidades e dava falso-negativo em turmas semestrais)
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId, escolaId: session.user.escolaId },
    include: {
      estudantes: {
        orderBy: { nome: 'asc' },
        include: {
          notas: {
            where: {
              OR: [
                { nota: { lt: 5 } },
                { status: 'DESISTENTE' },
                { status: 'RECUPERACAO' }
              ]
            },
            include: {
              disciplina: true,
              unidades: { select: { notaCalculada: true } }
            }
          }
        }
      }
    }
  })

  if (!turma) return null

  // 3. Flatten notas, filtrando apenas disciplinas permitidas e completas
  // (mesmo raciocínio do superset acima: nota < 5 sozinho pode só
  // significar "ainda não terminou de lançar").
  const notasRecuperacao = turma.estudantes.flatMap((estudante: any) =>
    estudante.notas
      .filter((nota: any) =>
        disciplinasIds.has(nota.disciplinaId) &&
        (nota.status === 'RECUPERACAO' || nota.status === 'DESISTENTE' ||
          (nota.unidades.length > 0 && nota.unidades.every((u: any) => u.notaCalculada !== null)))
      )
      .map((nota: any) => ({
        id: nota.id,
        nota: nota.nota,
        status: nota.status,
        estudanteId: estudante.matricula,
        estudanteNome: estudante.nome,
        disciplinaId: nota.disciplinaId,
        disciplinaNome: nota.disciplina.nome,
        notaRecuperacao: nota.notaRecuperacao
      }))
  )

  return {
    turma,
    notasRecuperacao,
    disciplinas
  }
}

export default async function RecuperacaoTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { turmaId } = await params
  const data = await getNotasRecuperacao(turmaId, session)

  if (!data) {
    redirect("/dashboard/notas/recuperacao")
  }

  return (
    <RecuperacaoClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      notasRecuperacao={data.notasRecuperacao}
      disciplinas={data.disciplinas}
    />
  )
}
