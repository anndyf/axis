import EstudanteForm from "@/components/EstudanteForm"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Estudantes'
}

export const runtime = 'nodejs'

export default async function NovoEstudantePage() {
  await paginaDoModulo('NUC')
  return <EstudanteForm />
}
