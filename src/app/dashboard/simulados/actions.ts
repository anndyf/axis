"use server"
// @modulo NUC - Núcleo sempre ativo; sem checagem de módulo (ver src/lib/modulos/mapa-rotas.ts)

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"

export async function reportarEstudanteFaltante(turmaId: string, nomeEstudante: string, matricula?: string, observacao?: string) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user?.escolaId) return { error: "Não autorizado" }
    // Action pode ser chamada direto (sem passar pelo layout que barra o portal)
    if (!can(user, "simulado.ler")) return { error: "Acesso negado" }

    // Obter turma
    const turma = await prisma.turma.findUnique({ where: { id: turmaId, escolaId: user.escolaId } })
    if (!turma) return { error: "Turma não encontrada" }

    const subject = `[Cadastro Pendente] Estudante ${nomeEstudante}`
    const content = `
      <p>O professor solicitou o cadastro de um estudante que não está aparecendo na lista da turma.</p>
      <ul>
        <li><strong>Turma:</strong> ${turma.nome}</li>
        <li><strong>Estudante:</strong> ${nomeEstudante}</li>
        <li><strong>Matrícula:</strong> ${matricula || "Não informada"}</li>
      </ul>
      ${observacao ? `<p><strong>Observação do professor:</strong> ${observacao}</p>` : ''}
    `

    // Criar mensagem direto no banco para a categoria SUPORTE (para direcao/admin verem)
    const newMessage = await prisma.message.create({
      data: {
        subject,
        content,
        category: "SUPORTE" as any,
        senderId: user.id,
        isRead: false,
        escolaId: turma.escolaId
      }
    })

    // Auto-marcar como lido para o remetente
    await prisma.messageRead.create({
        data: {
            messageId: newMessage.id,
            userId: user.id
        }
    })

    return { success: true }
  } catch (err) {
    console.error("Erro ao reportar estudante", err)
    return { error: "Erro interno" }
  }
}
