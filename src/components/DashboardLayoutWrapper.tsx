"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Blocks, KeyRound, Search, UserRound } from "lucide-react"
import DashboardSidebar, { papelDoUsuario, type EscolaDoMenu } from "./DashboardSidebar"
import DashboardTopbar from "./DashboardTopbar"
import BarraInferior from "./BarraInferior"
import MenuMais from "./MenuMais"
import { itemAtivo, navegacaoMobile } from "@/lib/services/navegacao-mobile"
import { cn } from "@/components/ui/cn"

export default function DashboardLayoutWrapper({
  children,
  user,
  escola,
  modulosAtivos,
  anoLetivo,
}: {
  children: ReactNode
  user: any
  escola: EscolaDoMenu
  modulosAtivos: string[]
  anoLetivo?: number
}) {
  // Padrão expandido; a preferência fica no navegador
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebarCollapsed")
      if (saved !== null) setIsCollapsed(JSON.parse(saved))
    } catch {}
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem("sidebarCollapsed", JSON.stringify(next)) } catch {}
      return next
    })
  }
  const closeMobile = useCallback(() => setIsMobileOpen(false), [])

  // Celular: barra inferior por perfil + painel "Mais" (o menu lateral fica para md+)
  const pathname = usePathname()
  const [maisAberto, setMaisAberto] = useState(false)
  const nav = navegacaoMobile(user, modulosAtivos)
  const ativo = itemAtivo(pathname, [...nav.barra, ...nav.mais])
  const abrirBusca = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))

  return (
    <>
      <DashboardSidebar
        user={user}
        escola={escola}
        modulosAtivos={modulosAtivos}
        anoLetivo={anoLetivo}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        isMobileOpen={isMobileOpen}
        closeMobile={closeMobile}
      />
      {/* --barra-inferior (globals.css): espaço da barra do celular */}
      <div className={cn(
        "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-150 ease-out print:ml-0",
        "pb-[var(--barra-inferior)] print:pb-0",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <DashboardTopbar escola={escola} nome={user?.name} raizes={[...nav.barra, ...nav.mais].map((i) => i.href)} />
        <main className="flex min-w-0 flex-1 flex-col print:block">{children}</main>
      </div>
      <BarraInferior itens={nav.barra} ativo={ativo} maisAberto={maisAberto} onMais={() => setMaisAberto(true)} />
      <MenuMais
        open={maisAberto}
        onClose={() => setMaisAberto(false)}
        itens={nav.mais}
        ativo={ativo}
        usuario={{ nome: user?.name, papel: papelDoUsuario(user) }}
        conta={[
          { rotulo: "Buscar", icone: Search, onClick: abrirBusca },
          { rotulo: "Meu perfil", icone: UserRound, href: "/dashboard/perfil" },
          { rotulo: "Trocar senha", icone: KeyRound, href: "/dashboard/perfil#senha" },
          ...(user?.isSuperuser ? [{ rotulo: "Componentes", icone: Blocks, href: "/dashboard/ui" }] : []),
        ]}
      />
    </>
  )
}
