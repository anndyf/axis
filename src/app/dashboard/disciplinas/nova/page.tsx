import DisciplinaForm from "@/components/DisciplinaForm"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Disciplinas'
}

export const runtime = 'nodejs'

export default async function NovaDisciplinaPage() {
  await paginaDoModulo('NUC')
  return <DisciplinaForm />
}
