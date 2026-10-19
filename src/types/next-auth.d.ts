import { DefaultSession } from "next-auth"
import type { Papel } from "@/lib/rbac"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      isSuperuser: boolean
      isDirecao: boolean
      isStaff: boolean
      isPortalUser: boolean
      isPlatformAdmin: boolean
      papeis?: Papel[]
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
    isPlatformAdmin: boolean
    papeis?: Papel[]
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
    isPlatformAdmin: boolean
    papeis?: Papel[]
    estudanteId: string | null
    escolaId: string
  }
}
