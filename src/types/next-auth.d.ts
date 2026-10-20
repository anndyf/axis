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
      isPlatformAdmin: boolean
      estudanteId: string | null
      escolaId: string
      /** Fase 3: códigos dos papéis e permissões (null = sessão sem papéis; can() usa os booleanos) */
      papeis?: string[] | null
      permissoes?: string[] | null
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
    estudanteId: string | null
    escolaId: string
    /** Fase 3: códigos dos papéis e permissões (null = sessão sem papéis; can() usa os booleanos) */
    papeis?: string[] | null
    permissoes?: string[] | null
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
    estudanteId: string | null
    escolaId: string
    /** Fase 3: códigos dos papéis e permissões (null = sessão sem papéis; can() usa os booleanos) */
    papeis?: string[] | null
    permissoes?: string[] | null
  }
}
