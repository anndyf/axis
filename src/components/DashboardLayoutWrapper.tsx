"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import DashboardSidebar, { type EscolaDoMenu } from "./DashboardSidebar"
import DashboardTopbar from "./DashboardTopbar"
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
      <div className={cn("flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-150 ease-out print:ml-0", isCollapsed ? "md:ml-16" : "md:ml-64")}>
        <DashboardTopbar escola={escola} nome={user?.name} onOpenMobile={() => setIsMobileOpen(true)} />
        <main className="flex min-w-0 flex-1 flex-col overflow-x-clip print:block">{children}</main>
      </div>
    </>
  )
}
