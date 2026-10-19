import { describe, it, expect, vi, afterEach } from 'vitest'
import { interpretarDsn, montarEnvelope, reportarErro } from './monitoramento'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('monitoramento de erros', () => {
  it('interpreta o DSN do Sentry', () => {
    expect(interpretarDsn('https://abc123@o9.ingest.sentry.io/4567')).toMatchObject({
      chavePublica: 'abc123',
      urlEnvelope: 'https://o9.ingest.sentry.io/api/4567/envelope/',
    })
    expect(interpretarDsn('https://k@sentry.escola.com/prefixo/12')?.urlEnvelope).toBe('https://sentry.escola.com/prefixo/api/12/envelope/')
    expect(interpretarDsn(undefined)).toBeNull()
    expect(interpretarDsn('')).toBeNull()
    expect(interpretarDsn('lixo')).toBeNull()
    expect(interpretarDsn('https://o9.ingest.sentry.io/4567')).toBeNull() // sem chave
  })

  it('envelope não leva query string', () => {
    const dsn = interpretarDsn('https://abc@o9.ingest.sentry.io/1')!
    const linhas = montarEnvelope(dsn, new TypeError('falhou'), { metodo: 'GET', caminho: '/api/x?matricula=123' }).split('\n')
    expect(linhas).toHaveLength(3)
    const evento = JSON.parse(linhas[2])
    expect(evento.exception.values[0]).toEqual({ type: 'TypeError', value: 'falhou' })
    expect(evento.request.url).toBe('/api/x')
    expect(linhas.join('')).not.toContain('matricula')
  })

  it('sem SENTRY_DSN não faz nenhuma chamada de rede', async () => {
    vi.stubEnv('SENTRY_DSN', '')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await reportarErro(new Error('x'))
    expect(f).not.toHaveBeenCalled()
  })

  it('com SENTRY_DSN envia, e falha de rede não lança', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://abc@o9.ingest.sentry.io/1')
    const f = vi.fn(async () => { throw new Error('offline') })
    vi.stubGlobal('fetch', f)
    await expect(reportarErro(new Error('x'))).resolves.toBeUndefined()
    expect(f).toHaveBeenCalledOnce()
    expect((f.mock.calls[0] as any[])[0]).toBe('https://o9.ingest.sentry.io/api/1/envelope/')
  })
})
