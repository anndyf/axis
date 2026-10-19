import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { CredentialsSignin } from "next-auth"
import { excedeuLimite, registrarTentativa, limparTentativas } from "@/lib/limitador"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import type { Papel } from "./rbac"

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs'

const MAX_TENTATIVAS_LOGIN = 5
const JANELA_LOGIN_MINUTOS = 15
const HASH_FICTICIO = bcrypt.hashSync('usuario-inexistente', 10)

/**
 * No NextAuth v5 só o `code` de um CredentialsSignin chega ao client
 * (signIn() devolve result.code); um `throw new Error(...)` vira um
 * "Configuration" genérico. Códigos: credenciais | inativo | pendente |
 * bloqueado | escola - tratados em app/login/LoginForm.tsx.
 */
class ErroLogin extends CredentialsSignin {
  constructor(code: string) {
    super()
    this.code = code
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        // escolaId vem do header injetado pelo middleware (resolvido pelo subdominio,
        // nunca de input do client) - sem ele, não sabemos em qual escola autenticar.
        const escolaId = (await headers()).get('x-escola-id')
        if (!escolaId) {
          throw new ErroLogin('escola')
        }

        const loginUsername = (credentials.username as string).trim()
        const user = await prisma.user.findFirst({
          where: {
            escolaId,
            OR: [
              { username: { equals: loginUsername, mode: 'insensitive' } },
              { email: { equals: loginUsername, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            email: true,
            username: true,
            password: true,
            name: true,
            isSuperuser: true,
            isStaff: true,
            isActive: true,
            isApproved: true,
            isDirecao: true,
            isAEE: true,
            isPortalUser: true,
            isPlatformAdmin: true,
            papeis: true,
            estudanteId: true,
            escolaId: true
          }
        })

        // Limite de tentativas erradas por usuário digitado (existente ou não)
        const chaveLimite = `login:${escolaId}:${loginUsername.toLowerCase()}`
        if (await excedeuLimite(chaveLimite, MAX_TENTATIVAS_LOGIN, JANELA_LOGIN_MINUTOS)) {
          throw new ErroLogin('bloqueado')
        }

        // Usuário inexistente e senha errada dão o MESMO erro (não revela quais
        // usuários/e-mails existem), e o status da conta (inativa/pendente) só
        // é revelado depois que a senha confere.
        const passwordToTry = (credentials.password as string).trim()
        // Compara contra um hash fictício quando o usuário não existe, pra
        // resposta levar o mesmo tempo nos dois casos.
        const passwordMatch = await bcrypt.compare(passwordToTry, user?.password ?? HASH_FICTICIO) && !!user

        if (!user || !passwordMatch) {
          await registrarTentativa(chaveLimite)
          throw new ErroLogin('credenciais')
        }

        if (!user.isActive) {
          throw new ErroLogin('inativo')
        }

        if (!user.isApproved) {
          throw new ErroLogin('pendente')
        }

        await limparTentativas(chaveLimite)

        // Atualizar data do último acesso via SQL para contornar cache de schema
        // Envolvido em try/catch para que falha no update não impeça o login
        try {
          await prisma.$executeRaw`
            UPDATE "users" SET last_login = NOW() WHERE id = ${user.id}
          `
        } catch (error) {
          console.error('Erro ao atualizar last_login:', error)
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.username,
          username: user.username,
          isSuperuser: user.isSuperuser,
          isDirecao: user.isDirecao,
          isStaff: user.isStaff,
          isPortalUser: user.isPortalUser,
          isAEE: (user as any).isAEE || false,
          isPlatformAdmin: user.isPlatformAdmin,
          papeis: user.papeis,
          estudanteId: user.estudanteId,
          escolaId: user.escolaId
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.isSuperuser = (user as any).isSuperuser
        token.isDirecao = (user as any).isDirecao
        token.isStaff = (user as any).isStaff
        token.isPortalUser = (user as any).isPortalUser
        token.isAEE = (user as any).isAEE
        token.isPlatformAdmin = (user as any).isPlatformAdmin
        token.papeis = user.papeis
        token.estudanteId = (user as any).estudanteId
        token.escolaId = (user as any).escolaId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.isSuperuser = token.isSuperuser as boolean
        session.user.isDirecao = token.isDirecao as boolean
        session.user.isStaff = token.isStaff as boolean
        session.user.isPortalUser = token.isPortalUser as boolean
        ;(session.user as any).isAEE = token.isAEE as boolean
        session.user.isPlatformAdmin = token.isPlatformAdmin as boolean
        // Ausente em sessões anteriores aos papéis: can() deriva dos campos is*
        session.user.papeis = token.papeis as Papel[] | undefined
        session.user.estudanteId = token.estudanteId as string
        session.user.escolaId = token.escolaId as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
