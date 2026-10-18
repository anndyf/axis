"use server"

import { prisma } from "@/lib/prisma"
import { enviarLinkRedefinicaoSenha } from "@/lib/mail"
import { excedeuLimite, registrarTentativa } from "@/lib/limitador"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { headers } from "next/headers"

const VALIDADE_TOKEN_MINUTOS = 60
const MAX_PEDIDOS_POR_HORA = 3

// Mesma resposta exista ou não o e-mail - não revela quem tem cadastro.
const RESPOSTA_PADRAO = {
  success: true,
  message: "Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também a caixa de spam."
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * "Esqueci minha senha": envia um link de uso único, válido por 1 hora.
 * A senha atual só muda quando a pessoa abre o link e escolhe a nova -
 * antes, este fluxo trocava a senha na hora, e qualquer um que soubesse o
 * e-mail de alguém conseguia bloquear o acesso dessa pessoa.
 */
export async function resetPassword(email: string) {
  try {
    // escolaId vem do header injetado pelo proxy (subdomínio), nunca do client
    const h = await headers()
    const escolaId = h.get('x-escola-id')
    if (!escolaId) {
      return { success: false, message: "Não foi possível identificar a escola." }
    }

    const emailNormalizado = email.trim().toLowerCase()
    const chaveLimite = `reset:${escolaId}:${emailNormalizado}`
    if (await excedeuLimite(chaveLimite, MAX_PEDIDOS_POR_HORA, 60)) {
      return RESPOSTA_PADRAO
    }
    await registrarTentativa(chaveLimite)

    const user = await prisma.user.findFirst({
      where: { escolaId, email: { equals: emailNormalizado, mode: 'insensitive' }, isActive: true },
      select: { id: true, name: true, username: true, email: true }
    })
    if (!user) return RESPOSTA_PADRAO

    const token = crypto.randomBytes(32).toString("base64url")
    await prisma.tokenRedefinicaoSenha.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MINUTOS * 60_000)
      }
    })

    // Link no mesmo host (subdomínio da escola) por onde o pedido chegou
    const host = h.get('x-forwarded-host') || h.get('host')
    const protocolo = h.get('x-forwarded-proto') || (host?.startsWith('localhost') || host?.includes('.localhost') ? 'http' : 'https')
    const link = `${protocolo}://${host}/redefinir-senha?token=${token}`

    await enviarLinkRedefinicaoSenha(user.email, user.name || user.username, link, VALIDADE_TOKEN_MINUTOS, escolaId)
    return RESPOSTA_PADRAO
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error)
    return { success: false, message: "Erro interno ao processar solicitação." }
  }
}

/** Troca a senha a partir do link recebido por e-mail. */
export async function redefinirSenha(token: string, novaSenha: string) {
  try {
    const escolaId = (await headers()).get('x-escola-id')
    if (!escolaId) {
      return { success: false, message: "Não foi possível identificar a escola." }
    }
    if (!novaSenha || novaSenha.length < 8) {
      return { success: false, message: "A nova senha precisa ter pelo menos 8 caracteres." }
    }

    const registro = await prisma.tokenRedefinicaoSenha.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, escolaId: true, username: true, email: true } } }
    })
    if (!registro || registro.usadoEm || registro.expiraEm < new Date() || registro.user.escolaId !== escolaId) {
      return { success: false, message: "Este link é inválido ou expirou. Peça um novo na tela de login." }
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: registro.user.id },
        data: { password: hashedPassword, deveTrocarSenha: false }
      }),
      // Usa este e invalida qualquer outro link pendente do mesmo usuário
      prisma.tokenRedefinicaoSenha.updateMany({
        where: { userId: registro.user.id, usadoEm: null },
        data: { usadoEm: new Date() }
      }),
      // Libera o login desta pessoa caso tenha sido bloqueada por tentativas
      // (pode entrar tanto pelo usuário quanto pelo e-mail)
      prisma.tentativaAcesso.deleteMany({
        where: {
          chave: {
            in: [
              `login:${escolaId}:${registro.user.username.toLowerCase()}`,
              `login:${escolaId}:${registro.user.email.toLowerCase()}`
            ]
          }
        }
      })
    ])

    return { success: true, message: "Senha alterada. Você já pode entrar com a nova senha." }
  } catch (error) {
    console.error("Erro ao redefinir senha:", error)
    return { success: false, message: "Erro interno ao redefinir a senha." }
  }
}
