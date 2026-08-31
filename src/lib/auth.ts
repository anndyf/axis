import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs'

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
          throw new Error('ESCOLA_NAO_IDENTIFICADA')
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
            estudanteId: true,
            escolaId: true
          }
        })

        if (!user) {
          throw new Error('USER_NOT_FOUND')
        }

        if (!user.isActive) {
          throw new Error('USER_INACTIVE')
        }

        if (!user.isApproved) {
          throw new Error('USER_NOT_APPROVED')
        }

        const passwordToTry = (credentials.password as string).trim()
        const passwordMatch = await bcrypt.compare(
          passwordToTry,
          user.password
        )

        if (!passwordMatch) {
          throw new Error('INVALID_PASSWORD')
        }

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
