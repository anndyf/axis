/**
 * Painel da plataforma (gestão de todas as escolas): só a conta marcada com
 * isPlatformAdmin entra, conferida no banco (não só no JWT); a conta de
 * plataforma não pode ser tomada por um superuser da escola onde ela vive;
 * criação de escola completa e auditada.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `plat-${Date.now()}`
const D: Record<string, string> = {}
const criadas: string[] = []

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: NextRequest, ctx: any) => Promise<Response>
async function chamar(handler: Handler, metodo: string, params: Record<string, string> = {}, body?: unknown) {
  const req = new NextRequest('http://localhost/x', {
    method: metodo,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
  const res = await handler(req, { params: Promise.resolve(params) })
  return { status: res.status, corpo: await res.json().catch(() => null) }
}

const comoPlataforma = () => ({ user: { id: D.plataforma, escolaId: D.escolaA, isSuperuser: true, isDirecao: true, isStaff: true, isPortalUser: false, isPlatformAdmin: true } })
const comoSuperuserA = () => ({ user: { id: D.superA, escolaId: D.escolaA, isSuperuser: true, isDirecao: true, isStaff: true, isPortalUser: false, isPlatformAdmin: false } })

const rotas = {
  escolas: () => import('@/app/api/plataforma/escolas/route'),
  escola: () => import('@/app/api/plataforma/escolas/[id]/route'),
  usuario: () => import('@/app/api/usuarios/[id]/route'),
  status: () => import('@/app/api/usuarios/[id]/toggle-status/route'),
  transferir: () => import('@/app/api/usuarios/transferir/route'),
  assinatura: () => import('@/app/api/plataforma/escolas/[id]/assinatura/route'),
  modulos: () => import('@/app/api/plataforma/escolas/[id]/assinatura/modulos/route'),
}

beforeAll(async () => {
  const a = await prisma.escola.create({ data: { nome: `Escola A ${SUFIXO}`, slug: `${SUFIXO}-a`, status: 'ATIVA' } })
  const b = await prisma.escola.create({ data: { nome: `Escola B ${SUFIXO}`, slug: `${SUFIXO}-b`, status: 'ATIVA' } })
  D.escolaA = a.id
  D.escolaB = b.id
  criadas.push(a.id, b.id)
  const base = { password: 'hash-original', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true, isActive: true }
  D.plataforma = (await prisma.user.create({ data: { ...base, escolaId: a.id, username: 'plataforma', email: `plataforma@${SUFIXO}.t`, isPlatformAdmin: true } })).id
  D.superA = (await prisma.user.create({ data: { ...base, escolaId: a.id, username: 'super-a', email: `super-a@${SUFIXO}.t` } })).id
}, 60_000)

afterAll(async () => {
  for (const escolaId of criadas) {
    await prisma.auditLog.deleteMany({ where: { OR: [{ user: { escolaId } }, { entityId: escolaId }] } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.assinatura.deleteMany({ where: { escolaId } })
    await prisma.escolaModulo.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('acesso ao painel da plataforma', () => {
  it('superuser comum de escola não entra em nenhuma rota', async () => {
    sessao.atual = comoSuperuserA()
    const { GET, POST } = await rotas.escolas()
    const { PATCH } = await rotas.escola()
    expect((await chamar(GET as Handler, 'GET')).status).toBe(403)
    expect((await chamar(POST as Handler, 'POST', {}, { nome: 'X', slug: `${SUFIXO}-x`, plano: 'BASICO' })).status).toBe(403)
    expect((await chamar(PATCH as Handler, 'PATCH', { id: D.escolaB }, { status: 'SUSPENSA' })).status).toBe(403)
    expect((await prisma.escola.findUniqueOrThrow({ where: { id: D.escolaB } })).status).toBe('ATIVA')
  })

  it('JWT antigo dizendo isPlatformAdmin não vale se o banco já retirou a marca', async () => {
    sessao.atual = { user: { ...comoSuperuserA().user, isPlatformAdmin: true } }
    const { GET } = await rotas.escolas()
    expect((await chamar(GET as Handler, 'GET')).status).toBe(403)
  })

  it('conta de plataforma desativada perde o acesso', async () => {
    await prisma.user.update({ where: { id: D.plataforma }, data: { isActive: false } })
    sessao.atual = comoPlataforma()
    const { GET } = await rotas.escolas()
    expect((await chamar(GET as Handler, 'GET')).status).toBe(403)
    await prisma.user.update({ where: { id: D.plataforma }, data: { isActive: true } })
  })

  it('admin da plataforma lista as escolas só com os campos do painel', async () => {
    sessao.atual = comoPlataforma()
    const { GET } = await rotas.escolas()
    const r = await chamar(GET as Handler, 'GET')
    expect(r.status).toBe(200)
    const b = r.corpo.find((e: any) => e.id === D.escolaB)
    expect(Object.keys(b).sort()).toEqual(['_count', 'createdAt', 'id', 'nome', 'plano', 'slug', 'status'])
  })
})

describe('criação de escola', () => {
  it('valida plano, e-mail e senha', async () => {
    sessao.atual = comoPlataforma()
    const { POST } = await rotas.escolas()
    const ok = { nome: 'Nova', slug: `${SUFIXO}-nova`, plano: 'BASICO', adminNome: 'Adm', adminUsername: 'adm', adminEmail: `adm@${SUFIXO}.t`, adminSenha: 'senhaforte1' }
    expect((await chamar(POST as Handler, 'POST', {}, { ...ok, plano: 'GRATIS' })).status).toBe(400)
    expect((await chamar(POST as Handler, 'POST', {}, { ...ok, adminEmail: 'sem-arroba' })).status).toBe(400)
    expect((await chamar(POST as Handler, 'POST', {}, { ...ok, adminSenha: '1234567' })).status).toBe(400)
    expect((await chamar(POST as Handler, 'POST', {}, { ...ok, slug: `${SUFIXO}-a` })).status).toBe(409)
    expect(await prisma.escola.count({ where: { slug: ok.slug } })).toBe(0)
  })

  it('cria escola com admin de troca obrigatória, esquemas padrão e auditoria', async () => {
    sessao.atual = comoPlataforma()
    const { POST } = await rotas.escolas()
    const r = await chamar(POST as Handler, 'POST', {}, { nome: 'Nova', slug: `${SUFIXO}-nova`, plano: 'PRO', adminNome: 'Adm', adminUsername: 'adm', adminEmail: `ADM@${SUFIXO}.t`, adminSenha: 'senhaforte1' })
    expect(r.status).toBe(201)
    criadas.push(r.corpo.id)
    const admin = await prisma.user.findFirstOrThrow({ where: { escolaId: r.corpo.id } })
    expect(admin.deveTrocarSenha).toBe(true)
    expect(admin.isPlatformAdmin).toBe(false)
    expect(admin.email).toBe(`adm@${SUFIXO}.t`)
    expect(await prisma.esquemaAvaliacao.count({ where: { escolaId: r.corpo.id } })).toBe(2)
    expect(await prisma.auditLog.count({ where: { entityId: r.corpo.id, action: 'CRIAR_ESCOLA', userId: D.plataforma } })).toBe(1)
    const assinatura = await prisma.assinatura.findFirstOrThrow({ where: { escolaId: r.corpo.id }, include: { plano: true } })
    expect(assinatura.plano.codigo).toBe('PRO')
    expect(assinatura.situacao).toBe('ATIVA')
  })
})

describe('status e plano das escolas', () => {
  it('não deixa suspender a escola da própria conta de plataforma', async () => {
    sessao.atual = comoPlataforma()
    const { PATCH } = await rotas.escola()
    expect((await chamar(PATCH as Handler, 'PATCH', { id: D.escolaA }, { status: 'SUSPENSA' })).status).toBe(409)
    expect((await chamar(PATCH as Handler, 'PATCH', { id: D.escolaA }, { status: 'CANCELADA' })).status).toBe(409)
    expect((await prisma.escola.findUniqueOrThrow({ where: { id: D.escolaA } })).status).toBe('ATIVA')
  })

  it('suspende outra escola e registra antes/depois', async () => {
    sessao.atual = comoPlataforma()
    const { PATCH } = await rotas.escola()
    const r = await chamar(PATCH as Handler, 'PATCH', { id: D.escolaB }, { status: 'SUSPENSA' })
    expect(r.status).toBe(200)
    expect(r.corpo.status).toBe('SUSPENSA')
    const log = await prisma.auditLog.findFirstOrThrow({ where: { entityId: D.escolaB, action: 'ATUALIZAR_ESCOLA' } })
    expect(JSON.parse(log.details!)).toMatchObject({ antes: { status: 'ATIVA' }, depois: { status: 'SUSPENSA' } })
    expect((await chamar(PATCH as Handler, 'PATCH', { id: D.escolaB }, { status: 'INVENTADO' })).status).toBe(400)
  })
})

describe('a conta de plataforma não pode ser tomada pela escola', () => {
  it('superuser da mesma escola não troca senha, não desativa, não exclui e não transfere', async () => {
    sessao.atual = comoSuperuserA()
    const usuario = await rotas.usuario()
    const status = await rotas.status()
    const transferir = await rotas.transferir()
    expect((await chamar(usuario.PUT as Handler, 'PUT', { id: D.plataforma }, { password: 'tomada123', isActive: true })).status).toBe(403)
    expect((await chamar(status.PUT as Handler, 'PUT', { id: D.plataforma }, { isActive: false })).status).toBe(403)
    expect((await chamar(usuario.DELETE as Handler, 'DELETE', { id: D.plataforma })).status).toBe(403)
    expect((await chamar(transferir.POST as Handler, 'POST', {}, { fromUserId: D.plataforma, toUserId: D.superA })).status).toBe(403)

    const conta = await prisma.user.findUniqueOrThrow({ where: { id: D.plataforma } })
    expect(conta.password).toBe('hash-original')
    expect(conta.isActive).toBe(true)
  })

  it('editor de papéis: superuser da mesma escola não tira nem dá papel à conta da plataforma', async () => {
    sessao.atual = comoSuperuserA()
    const usuario = await rotas.usuario()
    expect((await chamar(usuario.PUT as Handler, 'PUT', { id: D.plataforma }, { papeis: ['PROFESSOR'] })).status).toBe(403)
    expect((await chamar(usuario.PUT as Handler, 'PUT', { id: D.plataforma }, { isSuperuser: false })).status).toBe(403)
    const conta = await prisma.user.findUniqueOrThrow({ where: { id: D.plataforma }, include: { vinculosPapel: true } })
    expect([conta.isSuperuser, conta.isDirecao, conta.isStaff]).toEqual([true, true, true])
    expect(conta.vinculosPapel).toEqual([])
  })

  it('o próprio admin da plataforma continua editando a conta dele', async () => {
    sessao.atual = comoPlataforma()
    const usuario = await rotas.usuario()
    expect((await chamar(usuario.PUT as Handler, 'PUT', { id: D.plataforma }, { name: 'Plataforma' })).status).toBe(200)
  })
})

describe('assinatura e módulos da escola (fase 2)', () => {
  it('superuser comum de escola não lê nem altera assinatura (nem a da própria escola)', async () => {
    sessao.atual = comoSuperuserA()
    const a = await rotas.assinatura()
    const m = await rotas.modulos()
    for (const id of [D.escolaA, D.escolaB]) {
      expect((await chamar(a.GET as Handler, 'GET', { id })).status).toBe(403)
      expect((await chamar(a.PATCH as Handler, 'PATCH', { id }, { situacao: 'ATIVA', planoCodigo: 'ENTERPRISE' })).status).toBe(403)
      expect((await chamar(m.PUT as Handler, 'PUT', { id }, { moduloId: 'FIN', estado: 'ATIVO' })).status).toBe(403)
    }
    expect(await prisma.assinatura.count({ where: { escolaId: { in: [D.escolaA, D.escolaB] }, plano: { codigo: 'ENTERPRISE' } } })).toBe(0)
  })

  it('não deixa suspender a escola da própria conta pela assinatura', async () => {
    sessao.atual = comoPlataforma()
    const a = await rotas.assinatura()
    expect((await chamar(a.PATCH as Handler, 'PATCH', { id: D.escolaA }, { situacao: 'SUSPENSA' })).status).toBe(409)
  })

  it('inadimplência deixa os módulos em somente leitura, com histórico e sem bloquear a escola', async () => {
    sessao.atual = comoPlataforma()
    const a = await rotas.assinatura()
    const r = await chamar(a.PATCH as Handler, 'PATCH', { id: D.escolaA }, { situacao: 'INADIMPLENTE', planoCodigo: 'PRO' })
    expect(r.status).toBe(200)
    expect(r.corpo.assinatura).toMatchObject({ situacao: 'INADIMPLENTE', planoCodigo: 'PRO' })
    const estado = (id: string) => r.corpo.modulos.find((x: any) => x.moduloId === id).estadoEfetivo
    expect(estado('NUC')).toBe('ATIVO')
    expect(estado('DIA')).toBe('SOMENTE_LEITURA')
    expect(estado('PRV')).toBe('SOMENTE_LEITURA')
    const escola = await prisma.escola.findUniqueOrThrow({ where: { id: D.escolaA } })
    expect([escola.status, escola.plano]).toEqual(['ATIVA', 'PRO'])
    expect(r.corpo.historico[0].descricao).toBe('Assinatura alterada')
    // só campos da assinatura: nada de usuários da escola
    expect(JSON.stringify(r.corpo)).not.toContain('hash-original')
    expect((await chamar(a.PATCH as Handler, 'PATCH', { id: D.escolaA }, { situacao: 'ATIVA' })).corpo.modulos.find((x: any) => x.moduloId === 'DIA').estadoEfetivo).toBe('ATIVO')
    expect((await chamar(a.PATCH as Handler, 'PATCH', { id: D.escolaA }, { planoCodigo: 'NAO-EXISTE' })).status).toBe(400)
  })

  it('módulo desligado pelo painel some da escola e é espelhado no modelo antigo; "volta ao plano" desfaz', async () => {
    sessao.atual = comoPlataforma()
    const m = await rotas.modulos()
    const r = await chamar(m.PUT as Handler, 'PUT', { id: D.escolaA }, { moduloId: 'PRV', estado: 'INATIVO', origem: 'EXCECAO' })
    expect(r.status).toBe(200)
    expect(r.corpo.modulos.find((x: any) => x.moduloId === 'PRV')).toMatchObject({ doPlano: true, estadoEfetivo: 'INATIVO', excecao: { estado: 'INATIVO', origem: 'EXCECAO' } })
    const espelho = await prisma.escolaModulo.findMany({ where: { escolaId: D.escolaA }, orderBy: { moduloId: 'asc' } })
    expect(espelho.map((e) => [e.moduloId, e.ativo])).toEqual([['provas', false], ['simulados', false]])
    const { getModulosAtivos } = await import('@/lib/modules-server')
    expect(await getModulosAtivos(D.escolaA, 'PRO')).not.toContain('provas')

    const volta = await chamar(m.PUT as Handler, 'PUT', { id: D.escolaA }, { moduloId: 'PRV', estado: null })
    expect(volta.corpo.modulos.find((x: any) => x.moduloId === 'PRV')).toMatchObject({ excecao: null, estadoEfetivo: 'ATIVO' })
    expect(await prisma.escolaModulo.count({ where: { escolaId: D.escolaA } })).toBe(0)
    expect((await chamar(m.PUT as Handler, 'PUT', { id: D.escolaA }, { moduloId: 'NUC', estado: 'INATIVO' })).status).toBe(400)
  })
})
