"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Helper de envio de email
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

async function sendNotificationEmail(
  to: string,
  subject: string,
  content: string,
  senderName: string,
  tipo: 'mensagem' | 'comunicado' = 'mensagem',
  escolaId?: string
) {
    const escola = escolaId
      ? await prisma.escola.findUnique({ where: { id: escolaId }, select: { nome: true } })
      : null
    const nomeEscola = escola?.nome || 'Áxis'

    const isComunicado = tipo === 'comunicado'
    const emailSubject = isComunicado ? `📢 Comunicado: ${subject}` : `Nova Mensagem: ${subject}`
    const accentColor = isComunicado ? '#ea580c' : '#2563eb'
    const headerBg = isComunicado ? '#fff7ed' : '#eff6ff'
    const badgeLabel = isComunicado ? '📢 COMUNICADO OFICIAL' : '✉️ NOVA MENSAGEM'

    // Limpar HTML do content para exibição no e-mail
    const contentText = content.replace(/<[^>]+>/g, '').substring(0, 300)
    const contentPreview = contentText.length < content.replace(/<[^>]+>/g, '').length
      ? contentText + '…'
      : contentText

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: ${headerBg}; padding: 28px 32px; border-bottom: 1px solid #e2e8f0;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${accentColor};">${badgeLabel}</p>
          <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">${subject}</h2>
          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">
            ${isComunicado ? 'Comunicado publicado por' : 'Enviado por'}: <strong>${senderName}</strong>
          </p>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 28px 32px;">
          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Conteúdo</p>
          <div style="background: #f8fafc; border-left: 3px solid ${accentColor}; padding: 16px 20px; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${contentPreview}</div>
        </div>

        <!-- CTA -->
        <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/mensagens"
             style="display: inline-block; background-color: ${accentColor}; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.02em;">
            ${isComunicado ? 'Ver Comunicado na Plataforma →' : 'Ler Mensagem Completa →'}
          </a>
          <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 11px;">Sistema de Notas ${nomeEscola} — Esta é uma notificação automática.</p>
        </div>
      </div>
    `;

    try {
        if (transporter) {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Sistema de Notas" <no-reply@cetep.edu.br>',
                to,
                subject: emailSubject,
                html,
            });
        } else if (resend) {
            await resend.emails.send({
                from: process.env.RESEND_FROM || 'onboarding@resend.dev',
                to,
                subject: emailSubject,
                html,
            });
        }
    } catch (e) {
        console.error("Erro ao enviar email de notificação", e);
    }
}

export async function sendMessage(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Não autorizado" }
  }

  const subject = formData.get("subject") as string
  const content = formData.get("content") as string
  const category = formData.get("category") as string
  const receiverId = formData.get("receiverId") as string | null
  const parentId = formData.get("parentId") as string | null
  const allowReplies = formData.get("allowReplies") !== "false" 

  if (!subject || !content || !category) {
    return { error: "Campos obrigatórios faltando" }
  }

  // Validação de Permissão: Professores (Staff sem ser Admin/Direção)
  const user = session.user as any
  const isTeacherOnly = user.isStaff && !user.isSuperuser && !user.isDirecao
  
  if (isTeacherOnly) {
      if (category === "GERAL" && !parentId) {
          return { error: "Você não tem permissão para enviar mensagens diretas." }
      }
      
      if (category === "COMUNICADO") {
          if (!receiverId || !receiverId.startsWith("TURMA_")) {
              return { error: "Você só pode enviar comunicados para suas turmas específicas." }
          }
          
          const targetTurmaId = receiverId.replace("TURMA_", "")
          const hasPermission = await prisma.disciplina.findFirst({
              where: {
                  turmaId: targetTurmaId,
                  usuariosPermitidos: {
                      some: { id: user.id }
                  }
              }
          })
          
          if (!hasPermission) {
              return { error: "Você não tem permissão para enviar comunicados para esta turma." }
          }
      }
  }

  try {
    let finalParentId = parentId;
    let targetReceiverId = receiverId;

    if (category === "SUPORTE" || category === "DIRECAO") {
       targetReceiverId = null;
    }
    if (category === "COMUNICADO" && !receiverId) {
        targetReceiverId = null; 
    }

    const newMessage = await prisma.message.create({
      data: {
        subject: finalParentId ? `[Ticket] ${subject}` : subject,
        content,
        category: category as any,
        senderId: user.id,
        receiverId: targetReceiverId || undefined,
        isRead: false,
        parentId: finalParentId || undefined,
        allowReplies,
        escolaId: user.escolaId
      }
    })

    // Auto-marcar como lido para o remetente
    await prisma.messageRead.create({
        data: {
            messageId: newMessage.id,
            userId: user.id
        }
    })

    if (category === "GERAL" && targetReceiverId) {
        const receiver = await prisma.user.findUnique({ where: { id: targetReceiverId } });
        if (receiver && receiver.email) {
            sendNotificationEmail(receiver.email, subject, content, user.name || user.username, 'mensagem', user.escolaId);
        }
    }

    if (category === "SUPORTE" || category === "DIRECAO") {
        const admins = await prisma.user.findMany({
            where: {
                escolaId: user.escolaId,
                OR: [
                    { isSuperuser: true },
                    ...(category === "DIRECAO" ? [{ isDirecao: true }] : [])
                ],
                isActive: true
            },
            select: { email: true }
        });

        for (const admin of admins) {
            if (admin.email) sendNotificationEmail(admin.email, subject, content, user.name || user.username, 'mensagem', user.escolaId);
        }
    }

    // ── Comunicados: dispara e-mail para os destinatários ────────────────────
    if (category === "COMUNICADO") {
      let emailTargets: string[] = []

      if (!targetReceiverId) {
        // Comunicado Geral → todos os usuários ativos (exceto o remetente e bots)
        const todos = await prisma.user.findMany({
          where: {
            isActive: true,
            isApproved: true,
            id: { not: user.id },
            estudanteId: null,
            isPortalUser: false,
            NOT: { id: { startsWith: 'GROUP_' } }
          },
          select: { email: true }
        })
        emailTargets = todos.map(u => u.email).filter(Boolean) as string[]

      } else if (targetReceiverId === 'GROUP_TEACHERS') {
        // Comunicado Professores
        const profs = await prisma.user.findMany({
          where: { escolaId: user.escolaId, isStaff: true, isActive: true, isApproved: true, id: { not: user.id } },
          select: { email: true }
        })
        emailTargets = profs.map(u => u.email).filter(Boolean) as string[]

      } else if (targetReceiverId === 'GROUP_STUDENTS') {
        // Comunicado Estudantes
        const estudantes = await prisma.user.findMany({
          where: { escolaId: user.escolaId, estudanteId: { not: null }, isActive: true, id: { not: user.id } },
          select: { email: true }
        })
        emailTargets = estudantes.map(u => u.email).filter(Boolean) as string[]

      } else if (targetReceiverId.startsWith('TURMA_')) {
        // Comunicado de Turma → professores com disciplinas naquela turma
        const turmaId = targetReceiverId.replace('TURMA_', '')
        const profs = await prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: user.id },
            disciplinasPermitidas: { some: { turmaId } }
          },
          select: { email: true }
        })
        emailTargets = profs.map(u => u.email).filter(Boolean) as string[]
      }

      // Dispara em paralelo (sem await para não travar a resposta)
      if (emailTargets.length > 0) {
        const senderName = user.name || user.username || 'Sistema'
        console.log(`📧 Disparando e-mail de comunicado para ${emailTargets.length} destinatário(s)`)
        Promise.all(
          emailTargets.map(email => sendNotificationEmail(email, subject, content, senderName, 'comunicado', user.escolaId))
        ).catch(err => console.error('Erro no disparo de e-mails de comunicado:', err))
      }
    }

    if (finalParentId) {
        await (prisma.message as any).update({
            where: { id: finalParentId },
            data: { updatedAt: new Date() }
        })
    }

    revalidatePath("/dashboard/mensagens")
    return { success: true }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return { error: "Erro ao enviar mensagem" }
  }
}

export async function markAsRead(id: string) {
  const session = await auth()
  if (!session?.user?.id) return

  // Pegamos a mensagem para saber se é raiz ou resposta
  const msg = await prisma.message.findUnique({
      where: { id },
      select: { id: true, parentId: true }
  })
  if (!msg) return

  const rootId = msg.parentId || msg.id
  
  // Buscamos todas as mensagens dessa thread que o usuário ainda não leu
  const unreadInThread = await prisma.message.findMany({
      where: {
          AND: [
              { OR: [{ id: rootId }, { parentId: rootId }] },
              { readBy: { none: { userId: session.user.id } } }
          ]
      },
      select: { id: true }
  })

  // Criamos os registros de leitura em lote
  if (unreadInThread.length > 0) {
      await prisma.messageRead.createMany({
          data: unreadInThread.map(m => ({
              messageId: m.id,
              userId: session.user.id
          })),
          skipDuplicates: true
      })
  }
  
  revalidatePath("/dashboard/mensagens")
}

export async function markAllAsRead() {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  const user = session.user as any

  const allowedReceiverIds: (string | null)[] = [null];
  if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
  if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
  if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
  if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

  if (user.isStaff) {
      const teacher = await prisma.user.findUnique({
          where: { id: user.id },
          include: { disciplinasPermitidas: { select: { turmaId: true } } }
      });
      const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
      allowedReceiverIds.push(...teacherTurmas);
  }

  if (user.estudanteId) {
      const student = await prisma.user.findUnique({
         where: { id: user.id },
         include: { estudante: { select: { turmaId: true } } }
      });
      if (student?.estudante?.turmaId) {
          allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
      }
  }

  const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);
  
  const whereConditions: any[] = [
    { receiverId: user.id }
  ]

  if (!user.isSuperuser) {
      whereConditions.push({ 
        AND: [
          { category: "COMUNICADO" },
          { senderId: { not: user.id } },
          {
             OR: [
               { receiverId: null },
               { receiverId: { in: allowedReceiverStrings } }
             ]
          }
        ]
      })
      if (user.isDirecao) {
          whereConditions.push({ category: "DIRECAO" as any, senderId: { not: user.id } })
      }
  } else {
      whereConditions.push({ category: "SUPORTE" as any, senderId: { not: user.id } })
  }

  const unreadMessages = await prisma.message.findMany({
    where: {
        AND: [
            { OR: whereConditions },
            { readBy: { none: { userId: user.id } } },
            { deletedBy: { none: { userId: user.id } } },
            { NOT: { subject: { startsWith: '[Cadastro Pendente]' } } }
        ]
    },
    select: { id: true }
  })

  if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
          data: unreadMessages.map(m => ({
              messageId: m.id,
              userId: user.id
          })),
          skipDuplicates: true
      })
  }
  
  revalidatePath("/dashboard/mensagens")
  return { success: true }
}


export async function deleteMessage(messageId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Não autorizado" }

    try {
        await prisma.messageDelete.create({
            data: {
                messageId,
                userId: session.user.id
            }
        })
        revalidatePath("/dashboard/mensagens")
        return { success: true }
    } catch (e) {
        console.error("Erro ao deletar mensagem:", e)
        return { error: "Erro ao deletar mensagem" }
    }
}

export async function getMessages(options: { page?: number, limit?: number, type?: 'all' | 'received' | 'sent' } = {}) {
  const { page = 1, limit = 20, type = 'all' } = options;
  const skip = (page - 1) * limit;

  const session = await auth()
  if (!session?.user?.id) return { received: [], sent: [] } 

  const user = session.user as any
  let received: any[] = []
  let sent: any[] = []

  if (type === 'all' || type === 'received') {
      const allowedReceiverIds: (string | null)[] = [null];

      if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
      if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
      if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
      if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

      if (user.isStaff) {
          const teacher = await prisma.user.findUnique({
              where: { id: user.id },
              include: { disciplinasPermitidas: { select: { turmaId: true } } }
          });
          const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
          allowedReceiverIds.push(...teacherTurmas);
      }

      if (user.estudanteId) {
          const student = await prisma.user.findUnique({
             where: { id: user.id },
             include: { estudante: { select: { turmaId: true } } }
          });
          if (student?.estudante?.turmaId) {
              allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
          }
      }

      const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);

      // Thread-centric logic: 
      // We want root messages (parentId: null) that either:
      // a) Were received by me (and not sent by me)
      // b) Have any reply received by me (and not sent by me)
      
      const receivedRaw = await prisma.message.findMany({
        where: { 
            parentId: null,
            deletedBy: { none: { userId: user.id } },
            NOT: { subject: { startsWith: '[Cadastro Pendente]' } },
            OR: [
                // Directly received
                { receiverId: user.id, senderId: { not: user.id } },
                { replies: { some: { receiverId: user.id, senderId: { not: user.id } } } },
                // Categorized
                ...(user.isSuperuser ? [
                    { category: "SUPORTE" as any, senderId: { not: user.id } },
                    { replies: { some: { category: "SUPORTE" as any, senderId: { not: user.id } } } }
                ] : []),
                ...((user.isDirecao || user.isSuperuser) ? [
                    { category: "DIRECAO" as any, senderId: { not: user.id } },
                    { replies: { some: { category: "DIRECAO" as any, senderId: { not: user.id } } } }
                ] : []),
                // Comunicados direcionados (grupo específico)
                { 
                    AND: [
                        { category: "COMUNICADO" as any },
                        { senderId: { not: user.id } },
                        { receiverId: { in: allowedReceiverStrings } }
                    ]
                },
            ]
        },
        include: {
          sender: { select: { id: true, name: true, email: true, username: true } },
          assignedTo: { select: { id: true, name: true } },
          replies: {
              where: { deletedBy: { none: { userId: user.id } } },
              include: { readBy: { where: { userId: user.id }, select: { id: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1
          },
          readBy: { where: { userId: user.id }, select: { id: true } } 
        },
        orderBy: { updatedAt: 'desc' } as any,
        take: limit,
        skip: skip
      })

      // ── Comunicados GERAIS (receiverId: null) aparecem SEMPRE para qualquer usuário ──
      // Buscamos separadamente sem paginação para que novos usuários os vejam mesmo
      // que não estivessem cadastrados quando foram enviados.
      const comunicadosGerais = await prisma.message.findMany({
        where: {
            parentId: null,
            category: "COMUNICADO" as any,
            receiverId: null,
            senderId: { not: user.id },
            deletedBy: { none: { userId: user.id } },
            NOT: { subject: { startsWith: '[Cadastro Pendente]' } },
        },
        include: {
          sender: { select: { id: true, name: true, email: true, username: true } },
          assignedTo: { select: { id: true, name: true } },
          replies: {
              where: { deletedBy: { none: { userId: user.id } } },
              include: { readBy: { where: { userId: user.id }, select: { id: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1
          },
          readBy: { where: { userId: user.id }, select: { id: true } }
        },
        orderBy: { createdAt: 'desc' } as any,
        take: limit,
        skip: skip
      })

      // Mescla sem duplicatas (comunicado pode ter aparecido nas duas queries)
      const idsJaIncluidos = new Set(receivedRaw.map((m: any) => m.id))
      const comunicadosNovos = comunicadosGerais.filter((m: any) => !idsJaIncluidos.has(m.id))
      const todasRecebidas = [...receivedRaw, ...comunicadosNovos]
        .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())

      received = todasRecebidas.map((msg: any) => {
          const isRootUnread = msg.readBy.length === 0 && (msg.receiverId === user.id || msg.category !== 'GERAL');
          const lastReply = msg.replies[0];
          const isLastReplyUnread = lastReply ? lastReply.readBy.length === 0 : false;
          
          return {
              ...msg,
              isRead: !isRootUnread && !isLastReplyUnread
          }
      })
  }

  if (type === 'all' || type === 'sent') {
      const sentRaw = await prisma.message.findMany({
        where: { 
            parentId: null,
            deletedBy: { none: { userId: user.id } },
            NOT: { subject: { startsWith: '[Cadastro Pendente]' } },
            OR: [
                { senderId: user.id },
                { replies: { some: { senderId: user.id } } }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, email: true, username: true } },
            assignedTo: { select: { id: true, name: true } },
            replies: {
                where: {
                    deletedBy: { none: { userId: user.id } }
                },
                include: {
                    readBy: { where: { userId: user.id }, select: { id: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            readBy: { where: { userId: user.id }, select: { id: true } } 
        },
        orderBy: { updatedAt: 'desc' } as any,
        take: limit,
        skip: skip
      })

      // Buscar dados dos destinatários manualmente (já que removemos a FK para permitir grupos)
      const receiverIds = Array.from(new Set(sentRaw.map(m => m.receiverId).filter(id => id && !id.startsWith('TURMA_') && !id.startsWith('GROUP_')))) as string[];
      const receivers = await prisma.user.findMany({
          where: { id: { in: receiverIds } },
          select: { id: true, name: true, email: true }
      });
      const receiverMap = new Map(receivers.map(r => [r.id, r]));

      sent = sentRaw.map((msg: any) => {
          const isRootUnread = msg.readBy.length === 0 && (msg.receiverId === user.id || (msg.category !== 'GERAL' && msg.senderId !== user.id));
          const lastReply = msg.replies[0];
          // Uma mensagem no "Enviados" é não lida se a ÚLTIMA resposta não foi lida por mim
          const isLastReplyUnread = lastReply ? (lastReply.readBy.length === 0 && lastReply.senderId !== user.id) : false;
          
          return {
              ...msg,
              receiver: msg.receiverId ? (receiverMap.get(msg.receiverId) || null) : null,
              isRead: !isRootUnread && !isLastReplyUnread
          }
      })
  }

  return { received, sent }
}

export async function getUsersForSelect() {
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            username: true,
            isSuperuser: true,
            isDirecao: true,
            isStaff: true,
            estudanteId: true,
            isPortalUser: true
        },
        orderBy: { name: 'asc' }
    })
    return users
}

export async function getTurmasForSelect() {
    const session = await auth()
    if (!session?.user?.id) return []

    const user = session.user as any
    const isTeacherOnly = user.isStaff && !user.isSuperuser && !user.isDirecao
    const where: any = { anoLetivo: 2026 }

    if (isTeacherOnly) {
        where.disciplinas = {
            some: {
                usuariosPermitidos: {
                    some: { id: user.id }
                }
            }
        }
    }

    const turmas = await prisma.turma.findMany({
        where,
        select: {
            id: true,
            nome: true,
            curso: true,
            serie: true
        },
        orderBy: { nome: 'asc' }
    })
    return turmas
}

export async function getUnreadCount() {
    const session = await auth()
    if (!session?.user?.id) return 0
  
    const user = session.user as any
  
    const allowedReceiverIds: (string | null)[] = [null];

    if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
    if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
    if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
    if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

     if (user.isStaff) {
        const teacher = await prisma.user.findUnique({
            where: { id: user.id },
            include: { disciplinasPermitidas: { select: { turmaId: true } } }
        });
        const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
        allowedReceiverIds.push(...teacherTurmas);
    }

    if (user.estudanteId) {
        const student = await prisma.user.findUnique({
           where: { id: user.id },
           include: { estudante: { select: { turmaId: true } } }
        });
        if (student?.estudante?.turmaId) {
            allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
        }
    }

    const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);
    
    const whereConditions: any[] = [
      { receiverId: user.id }
    ]
  
    if (!user.isSuperuser) {
        whereConditions.push({ 
          AND: [
            { category: "COMUNICADO" },
            { senderId: { not: user.id } },
            {
               OR: [
                 { receiverId: null },
                 { receiverId: { in: allowedReceiverStrings } }
               ]
            }
          ]
        })
        if (user.isDirecao) {
            whereConditions.push({ category: "DIRECAO" as any, senderId: { not: user.id } })
        }
    } else {
        whereConditions.push({ category: "SUPORTE" as any, senderId: { not: user.id } })
    }
  
    const count = await prisma.message.count({
      where: {
          AND: [
              { OR: whereConditions },
              {
                  readBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              {
                  deletedBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              { NOT: { subject: { startsWith: '[Cadastro Pendente]' } } }
          ]
      }
    })
  
    return count
}

export async function getLatestUnreadMessage() {
    const session = await auth()
    if (!session?.user?.id) return null
  
    const user = session.user as any
    const allowedReceiverIds: (string | null)[] = [null];

    if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
    if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
    if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
    if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

     if (user.isStaff) {
        const teacher = await prisma.user.findUnique({
            where: { id: user.id },
            include: { disciplinasPermitidas: { select: { turmaId: true } } }
        });
        const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
        allowedReceiverIds.push(...teacherTurmas);
    }

    if (user.estudanteId) {
        const student = await prisma.user.findUnique({
           where: { id: user.id },
           include: { estudante: { select: { turmaId: true } } }
        });
        if (student?.estudante?.turmaId) {
            allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
        }
    }

    const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);

    const whereConditions: any[] = [
      { receiverId: user.id }
    ]
  
    if (!user.isSuperuser) {
        whereConditions.push({ 
          AND: [
            { category: "COMUNICADO" },
            { senderId: { not: user.id } },
            {
               OR: [
                 { receiverId: null },
                 { receiverId: { in: allowedReceiverStrings } }
               ]
            }
          ]
        })
        if (user.isDirecao) {
            whereConditions.push({ category: "DIRECAO" as any, senderId: { not: user.id } })
        }
    } else {
        whereConditions.push({ category: "SUPORTE" as any, senderId: { not: user.id } })
    }
  
    const latest = await prisma.message.findFirst({
      where: {
          AND: [
              { OR: whereConditions },
              {
                  readBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              {
                  deletedBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              { NOT: { subject: { startsWith: '[Cadastro Pendente]' } } }
          ]
      },
      include: {
        sender: { select: { name: true, username: true } },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  
    return latest
}

export async function getMessageThread(messageId: string) {
    const session = await auth()
    if (!session?.user?.id) return []
    const userId = session.user.id
    
    const target = await prisma.message.findUnique({ 
        where: { id: messageId },
        select: { id: true, parentId: true }
    })
    
    if (!target) return []

    const rootId = target.parentId || target.id

    const thread = await prisma.message.findMany({
        where: {
            AND: [
                {
                    OR: [
                        { id: rootId },
                        { parentId: rootId }
                    ]
                },
                {
                    deletedBy: {
                        none: {
                            userId: userId
                        }
                    }
                }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, email: true, username: true } },
            assignedTo: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
    })
    
    return thread
}

export async function assignTicket(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }
  
  try {
    await prisma.message.update({
      where: { id: ticketId },
      data: {
        assignedToId: session.user.id,
        status: "EM_ATENDIMENTO"
      }
    })
    revalidatePath("/dashboard/mensagens")
    return { success: true }
  } catch (e) {
    console.error("Erro ao assumir chamado:", e)
    return { error: "Erro ao assumir chamado" }
  }
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }

  try {
    const isResolved = status === 'RESOLVIDO' || status === 'FECHADO'
    await prisma.message.update({
      where: { id: ticketId },
      data: {
        status: status as any,
        isResolved
      }
    })
    revalidatePath("/dashboard/mensagens")
    return { success: true }
  } catch (e) {
    console.error("Erro ao atualizar status:", e)
    return { error: "Erro ao atualizar status" }
  }
}

export async function getTurmaDetails(turmaId: string) {
    const session = await auth()
    if (!session?.user?.id) return { disciplinas: [], estudantes: [] }

    const turma = await prisma.turma.findUnique({
        where: { id: turmaId },
        include: {
            disciplinas: {
                select: { id: true, nome: true },
                orderBy: { nome: 'asc' }
            },
            estudantes: {
                select: { matricula: true, nome: true },
                orderBy: { nome: 'asc' }
            }
        }
    })

    return {
        disciplinas: turma?.disciplinas || [],
        estudantes: turma?.estudantes || []
    }
}
