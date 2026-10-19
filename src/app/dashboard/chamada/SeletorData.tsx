"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

/** Troca a data da chamada pela URL (?data=YYYY-MM-DD), sem permitir dia futuro. */
export default function SeletorData({ data, hoje }: { data: string; hoje: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <input
      type="date"
      aria-label="Data da chamada"
      value={data}
      max={hoje}
      onChange={(e) => {
        if (!e.target.value) return
        const p = new URLSearchParams(params.toString())
        p.set("data", e.target.value)
        router.push(`${pathname}?${p.toString()}`)
      }}
      className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-fg shadow-card outline-none transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-ring/40"
    />
  )
}
