import type { Session } from 'next-auth'
import { getTurmasPermitidas } from '@/lib/data-fetching'

/**
 * A turma da ficha, se o usuário puder vê-la: a mesma regra da lista de
 * turmas (direção vê as da escola; professor, as das suas disciplinas),
 * sempre na escola da sessão e no ano letivo atual.
 */
export async function turmaPermitida(session: Session, id: string) {
  const turmas = await getTurmasPermitidas(session)
  return turmas.find((t) => t.id === id) ?? null
}
