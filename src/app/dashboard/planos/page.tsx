import { Metadata } from "next"
import PlanosClient from "./PlanosClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata: Metadata = {
  title: "Planos de Ensino | Áxis",
  description: "Gerenciamento de planos de ensino quinzenais.",
}

export default async function PlanosPage() {
  await paginaDoModulo('PLA')
  return (
    <PlanosClient />
  )
}
