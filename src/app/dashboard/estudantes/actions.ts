
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function updateMatricula(oldMatricula: string, newMatricula: string) {
  const session = await auth()
  if (!session?.user?.isSuperuser && !session?.user?.isDirecao) {
    return { error: "Sem permissão" }
  }

  try {
    // Como a matrícula é a PK, precisamos usar update na PK
    await prisma.estudante.update({
      where: { matricula: oldMatricula },
      data: { matricula: newMatricula }
    })
    revalidatePath("/dashboard/estudantes")
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2002') {
        return { error: "Número de matrícula já está em uso." }
    }
    return { error: "Erro ao atualizar matrícula" }
  }
}

export async function createPortalUser(matricula: string) {
  const session = await auth()
  if (!session?.user?.isSuperuser && !session?.user?.isDirecao) {
    return { error: "Sem permissão" }
  }

  try {
    const estudante = await prisma.estudante.findUnique({
      where: { matricula },
      include: { portalAccess: true }
    })

    if (!estudante) return { error: "Estudante não encontrado" }
    if (estudante.portalAccess.length > 0) return { error: "Este estudante já possui acesso ao portal" }

    // Criar usuário com a matrícula como username e senha
    const hashedPassword = await bcrypt.hash(estudante.matricula, 10)
    
    await prisma.user.create({
      data: {
        username: estudante.matricula,
        email: `${estudante.matricula}@axis.com`, // Email dummy
        password: hashedPassword,
        name: estudante.nome,
        isPortalUser: true,
        estudanteId: estudante.id,
        escolaId: estudante.escolaId,
        isApproved: true,
        isActive: true
      }
    })

    revalidatePath("/dashboard/estudantes")
    return { success: true }
  } catch (error: any) {
      console.error(error)
      return { error: "Erro ao criar usuário do portal" }
  }
}

export async function deactivateAllPortals() {
  const session = await auth()
  if (!session?.user?.isSuperuser && !session?.user?.isDirecao) {
    return { error: "Sem permissão" }
  }

  try {
    await prisma.user.deleteMany({
      where: {
        isPortalUser: true,
        estudanteId: { not: null }
      }
    })
    revalidatePath("/dashboard/estudantes")
    return { success: true }
  } catch (error: any) {
    console.error(error)
    return { error: "Erro ao desativar portais" }
  }
}

export async function activateAllPortals() {
    const session = await auth()
    if (!session?.user?.isSuperuser && !session?.user?.isDirecao) {
        return { error: "Sem permissão" }
    }

    try {
        const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
        const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

        // Buscar estudantes do ano atual que não possuem usuário de portal
        const estudantesSemAcesso = await prisma.estudante.findMany({
            where: {
                escolaId: session.user.escolaId,
                turma: {
                    anoLetivo: currentYear
                },
                portalAccess: {
                    none: {}
                }
            }
        })

        if (estudantesSemAcesso.length === 0) {
            return { error: "Todos os estudantes já possuem acesso ao portal" }
        }

        // Criar usuários em lote (em loop para processar o hash)
        // Nota: Para grandes volumes, isso poderia ser otimizado, 
        // mas para o volume atual de uma escola é seguro.
        let criados = 0
        for (const estudante of estudantesSemAcesso) {
            const hashedPassword = await bcrypt.hash(estudante.matricula, 10)
            
            await prisma.user.create({
                data: {
                    username: estudante.matricula,
                    email: `${estudante.matricula}@axis.com`,
                    password: hashedPassword,
                    name: estudante.nome,
                    isPortalUser: true,
                    estudanteId: estudante.id,
                    escolaId: estudante.escolaId,
                    isApproved: true,
                    isActive: true
                }
            })
            criados++
        }

        revalidatePath("/dashboard/estudantes")
        return { success: true, count: criados }
    } catch (error: any) {
        console.error(error)
        return { error: "Erro ao ativar portais em lote" }
    }
}
