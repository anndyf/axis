"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function resolvePendencia(messageId: string) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, subject: true }
    })

    if (!originalMessage) return { error: "Mensagem original não encontrada" }

    // Mark as resolved
    await prisma.message.update({
      where: { id: messageId },
      data: { 
        isResolved: true,
        status: "RESOLVIDO"
      }
    })
    
    // Send automatic reply
    const reply = await prisma.message.create({
      data: {
        subject: `[RESOLVIDO] ${originalMessage.subject}`,
        content: `
          <div style="font-family: sans-serif; color: #334155;">
            <p>Olá, informamos que sua solicitação de cadastro de estudante foi <strong>concluída e resolvida</strong> pela administração.</p>
            <p>O estudante já deve estar disponível para lançamento de notas e frequências em sua turma.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;"><em>Esta é uma mensagem automática de confirmação.</em></p>
          </div>
        `,
        category: "SUPORTE",
        senderId: user.id,
        receiverId: originalMessage.senderId,
        parentId: messageId,
        isRead: false,
        escolaId: user.escolaId
      }
    })

    await prisma.messageRead.create({
      data: {
        messageId: reply.id,
        userId: user.id
      }
    })
    
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    console.error("Erro ao resolver pendência:", error)
    return { error: "Erro ao resolver solicitação" }
  }
}

export async function atribuirChamado(messageId: string, assignedToId: string | null) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { 
        assignedToId,
        status: assignedToId ? "EM_ATENDIMENTO" : "ABERTO"
      }
    })
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    return { error: "Erro ao atribuir chamado" }
  }
}

export async function mudarStatusChamado(messageId: string, status: any) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { 
        status,
        isResolved: status === "RESOLVIDO"
      }
    })
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    return { error: "Erro ao mudar status" }
  }
}

export async function mudarPrioridadeChamado(messageId: string, priority: any) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { priority }
    })
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    return { error: "Erro ao mudar prioridade" }
  }
}

export async function enviarComunicadoGeral(subject: string, content: string, priority: any = "MEDIA") {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    await prisma.message.create({
      data: {
        subject: `[COMUNICADO GERAL] ${subject}`,
        content,
        category: "COMUNICADO",
        senderId: user.id,
        isGlobal: true,
        priority,
        escolaId: user.escolaId
      }
    })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    return { error: "Erro ao enviar comunicado" }
  }
}


export async function responderPendencia(parentId: string, content: string) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    const originalMessage = await prisma.message.findUnique({
      where: { id: parentId },
      select: { senderId: true, subject: true }
    })

    if (!originalMessage) return { error: "Mensagem original não encontrada" }

    // Create reply
    const reply = await prisma.message.create({
      data: {
        subject: `Re: ${originalMessage.subject}`,
        content: `<p><strong>Resposta da Administração:</strong></p>${content}`,
        category: "SUPORTE",
        senderId: user.id,
        receiverId: originalMessage.senderId,
        parentId: parentId,
        isRead: false,
        escolaId: user.escolaId
      }
    })

    // Mark as read by sender (admin)
    await prisma.messageRead.create({
      data: {
        messageId: reply.id,
        userId: user.id
      }
    })

    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    console.error("Erro ao responder pendência:", error)
    return { error: "Erro ao enviar resposta" }
  }
}
export async function resolvePendenciasBulk(messageIds: string[]) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    const results = await Promise.all(messageIds.map(id => resolvePendencia(id)))
    
    const errors = results.filter(r => r.error)
    if (errors.length > 0 && errors.length === messageIds.length) {
      return { error: "Erro ao resolver as solicitações" }
    }
    
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true, count: messageIds.length - errors.length }
  } catch (error) {
    console.error("Erro ao resolver pendências em lote:", error)
    return { error: "Erro interno ao processar lote" }
  }
}

export async function atualizarStatusPendencia(messageId: string, status: string | null) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { internalStatus: status }
    })
    
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    console.error("Erro ao atualizar status da pendência:", error)
    return { error: "Erro ao atualizar status" }
  }
}
