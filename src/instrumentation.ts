/**
 * Gancho do Next.js para erros não tratados em rotas, páginas e server
 * actions. Sem SENTRY_DSN no ambiente, reportarErro não faz nada.
 */
import type { Instrumentation } from 'next'

export async function register() {}

export const onRequestError: Instrumentation.onRequestError = async (erro, request, contexto) => {
  if (!process.env.SENTRY_DSN) return
  const { reportarErro } = await import('@/lib/monitoramento')
  await reportarErro(erro, {
    metodo: request.method,
    caminho: request.path,
    tags: { rota: contexto.routePath, tipo: contexto.routeType },
  })
}
