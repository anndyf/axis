"use client"
import { useState, useEffect } from "react"
import DashboardSidebar from "./DashboardSidebar"

export default function DashboardLayoutWrapper({
  children,
  user,
  modulosAtivos,
  anoLetivo
}: any) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => {
      const next = !prev
      localStorage.setItem('sidebarCollapsed', JSON.stringify(next))
      return next
    })
  }

  return (
    <>
      <DashboardSidebar
        user={user}
        modulosAtivos={modulosAtivos}
        anoLetivo={anoLetivo}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      
      <main className={`flex-1 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} min-h-screen transition-all duration-300 ease-in-out print:ml-0 print:p-0 print:min-h-0 print:block overflow-x-hidden flex flex-col`}>
        {children}
      </main>
    </>
  )
}
