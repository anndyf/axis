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
      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm text-slate-700 focus:bg-white focus:border-blue-500"
    />
  )
}
