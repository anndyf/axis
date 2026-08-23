import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      isSuperuser: boolean
      isDirecao: boolean
      isStaff: boolean
      isPortalUser: boolean
      estudanteId: string | null
      escolaId: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    username: string
    isSuperuser: boolean
    isDirecao: boolean
    isStaff: boolean
    isPortalUser: boolean
    estudanteId: string | null
    escolaId: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    isSuperuser: boolean
    isDirecao: boolean
    isStaff: boolean
    isPortalUser: boolean
    estudanteId: string | null
    escolaId: string
  }
}
