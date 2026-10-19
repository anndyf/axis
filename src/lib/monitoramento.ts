/**
 * Monitoramento de erros opcional (plano-roteiro-ferramentas.md, P0).
 *
 * Só liga se SENTRY_DSN existir no ambiente; sem ela, reportarErro não faz
 * nada (nem rede, nem log extra). Envia direto para a API de "envelope" do
 * Sentry via fetch - sem SDK, sem mexer no build. Não manda cabeçalhos,
 * cookies, corpo nem query string da requisição (dados de alunos/LGPD):
 * só tipo, mensagem e pilha do erro, método e caminho.
 */

export interface DsnSentry {
  chavePublica: string
  urlEnvelope: string
  dsn: string
}

/** "https://chave@o1.ingest.sentry.io/123" -> chave + URL de envelope; null se inválido. */
export function interpretarDsn(dsn: string | undefined | null): DsnSentry | null {
  if (!dsn) return null
  try {
    const url = new URL(dsn)
    const partes = url.pathname.split('/').filter(Boolean)
    const projeto = partes.pop()
    if (!url.username || !projeto) return null
    const prefixo = partes.length ? `/${partes.join('/')}` : ''
    return { chavePublica: url.username, urlEnvelope: `${url.protocol}//${url.host}${prefixo}/api/${projeto}/envelope/`, dsn }
  } catch {
    return null
  }
}

export interface ContextoErro {
  metodo?: string
  caminho?: string
  /** rótulos curtos, sem dados pessoais (ex.: rota, tipo de render) */
  tags?: Record<string, string>
}

function idEvento(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/** Monta o corpo (3 linhas JSON) do envelope do Sentry. */
export function montarEnvelope(dsn: DsnSentry, erro: unknown, ctx: ContextoErro = {}, agora = new Date()): string {
  const e = erro instanceof Error ? erro : new Error(String(erro))
  const eventId = idEvento()
  const evento = {
    event_id: eventId,
    timestamp: agora.getTime() / 1000,
    platform: 'node',
    level: 'error',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    exception: { values: [{ type: e.name, value: e.message }] },
    ...(ctx.caminho ? { request: { method: ctx.metodo, url: ctx.caminho.split('?')[0] } } : {}),
    tags: ctx.tags ?? {},
    extra: { stack: e.stack?.slice(0, 8000) },
  }
  return [
    JSON.stringify({ event_id: eventId, sent_at: agora.toISOString(), dsn: dsn.dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(evento),
  ].join('\n')
}

/** Reporta um erro ao Sentry se SENTRY_DSN estiver configurada. Nunca lança. */
export async function reportarErro(erro: unknown, ctx: ContextoErro = {}): Promise<void> {
  const dsn = interpretarDsn(process.env.SENTRY_DSN)
  if (!dsn) return
  try {
    await fetch(dsn.urlEnvelope, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.chavePublica}, sentry_client=axis/1.0`,
      },
      body: montarEnvelope(dsn, erro, ctx),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // monitoramento nunca pode derrubar a requisição
  }
}
