import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { RbacUser } from '@/lib/rbac'
import { estadoParaUsuario, estadoPermite, mensagemModuloIndisponivel } from '@/lib/services/modulos'
import { estadosDaEscola } from '@/lib/modulos/estados'
import { NOMES_MODULOS, type Acesso, type EstadoModulo, type ModuloId } from './tipos'

/**
 * Garantia de módulo no servidor (docs/arquitetura/modulos-e-planos.md, 4.4).
 * Módulo responde "a escola contratou?"; permissão (can) responde "esta
 * pessoa pode?". Ordem: sessão → escola → módulo → permissão → regra.
 * O teste src/lib/modulos/cobertura-modulos.test.ts exige uma destas
 * chamadas em toda rota, action e página, com o módulo do mapa-rotas.ts.
 */

export class ModuloIndisponivel extends Error {
  constructor(public modulo: ModuloId, public estado: Exclude<EstadoModulo, 'ATIVO'>) {
    super(mensagemModuloIndisponivel(NOMES_MODULOS[modulo], estado))
    this.name = 'ModuloIndisponivel'
  }
}

/** Para montar telas: não lança, devolve o estado que vale para o usuário. */
export async function estadoModulo(escolaId: string, modulo: ModuloId, usuario?: RbacUser | null): Promise<EstadoModulo> {
  if (modulo === 'NUC') return 'ATIVO'
  const estados = await estadosDaEscola(escolaId)
  return estadoParaUsuario(modulo, estados[modulo], usuario)
}

/** Lança ModuloIndisponivel se a escola não pode usar o módulo com esse acesso. */
export async function exigirModulo(escolaId: string, modulo: ModuloId, acesso: Acesso = 'escrita', usuario?: RbacUser | null): Promise<void> {
  const estado = await estadoModulo(escolaId, modulo, usuario)
  if (!estadoPermite(estado, acesso)) throw new ModuloIndisponivel(modulo, estado as Exclude<EstadoModulo, 'ATIVO'>)
}

/** null = liberado (ou sem sessão: a própria rota/ação responde o "não autorizado"). */
async function bloqueio(modulo: ModuloId, acesso: Acesso): Promise<ModuloIndisponivel | null> {
  if (modulo === 'NUC') return null
  const session = await auth()
  if (!session?.user?.escolaId) return null
  try {
    await exigirModulo(session.user.escolaId, modulo, acesso, session.user)
    return null
  } catch (e) {
    if (e instanceof ModuloIndisponivel) return e
    throw e
  }
}

export function respostaModuloIndisponivel(e: ModuloIndisponivel) {
  return NextResponse.json({ message: e.message, codigo: 'MODULO_INDISPONIVEL', modulo: e.modulo, estado: e.estado }, { status: 403 })
}

/**
 * Envolve um handler de rota: `export const GET = rotaDoModulo('NOT', 'leitura', async function GET(req) {...})`.
 * Leitura para consultas (GET e POSTs que só consultam), escrita para o resto.
 */
export function rotaDoModulo<H extends (...args: never[]) => Promise<Response>>(modulo: ModuloId, acesso: Acesso, handler: H): H {
  if (modulo === 'NUC') return handler
  return (async (...args: Parameters<H>) => {
    const e = await bloqueio(modulo, acesso)
    if (e) return respostaModuloIndisponivel(e)
    return handler(...args)
  }) as H
}

/**
 * Para server actions (arquivos "use server" só podem exportar funções async,
 * então a checagem fica na primeira linha de cada ação):
 *   const bloqueado = await bloqueioDoModulo('DIA', 'escrita')
 *   if (bloqueado) return { erro: bloqueado }
 */
export async function bloqueioDoModulo(modulo: ModuloId, acesso: Acesso): Promise<string | null> {
  const e = await bloqueio(modulo, acesso)
  return e ? e.message : null
}

/** Primeira linha de uma página do módulo: redireciona para a tela "módulo indisponível". */
export async function paginaDoModulo(modulo: ModuloId): Promise<void> {
  const e = await bloqueio(modulo, 'leitura')
  if (e) redirect(`/dashboard/modulo-indisponivel?m=${modulo}`)
}
