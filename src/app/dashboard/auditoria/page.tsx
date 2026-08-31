import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { ChevronLeft, Search, Filter, Download, User as UserIcon, Calendar, Activity, Database, Shield, History, Clock, ShieldAlert } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: 'Áxis - Auditoria'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuditoriaPage({ 
  searchParams 
}: { 
  searchParams: { q?: string, entity?: string, page?: string, user?: string } 
}) {
  const session = await auth()

  // Apenas Superuser pode acessar auditoria
  if (!session?.user?.escolaId || !session.user.isSuperuser) {
    redirect("/dashboard")
  }
  const escolaId = session.user.escolaId

  const query = searchParams.q || ""
  const entityFilter = searchParams.entity || ""
  const userFilter = searchParams.user || ""
  const page = parseInt(searchParams.page || "1", 10)
  const limit = 50
  const offset = (page - 1) * limit

  let logs: any[] = []
  let usersList: any[] = []
  try {
    usersList = await prisma.user.findMany({
      where: { escolaId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })

    // Construção condicional da query com Prisma.sql para evitar erros de cast no Postgres
    // audit_logs nao tem escola_id proprio - o escopo e feito via JOIN em users.escola_id,
    // ja que todo log tem um autor (user_id) e todo usuario pertence a uma unica escola.
    const whereConditions = [Prisma.sql`u.escola_id = ${escolaId}`]

    if (query) {
      whereConditions.push(Prisma.sql`(
        u.name ILIKE ${'%' + query + '%'} 
        OR CAST(al.details AS text) ILIKE ${'%' + query + '%'} 
        OR CAST(al.entity_type AS text) ILIKE ${'%' + query + '%'}
        OR CAST(al.action AS text) ILIKE ${'%' + query + '%'}
        OR CAST(al.entity_id AS text) ILIKE ${'%' + query + '%'}
      )`)
    }
    
    if (entityFilter) {
      whereConditions.push(Prisma.sql`al.entity_type = ${entityFilter}`)
    }
    
    if (userFilter) {
      whereConditions.push(Prisma.sql`al.user_id = ${userFilter}`)
    }

    const whereClause = whereConditions.length > 0 
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}` 
      : Prisma.empty

    const rawLogs = await prisma.$queryRaw`
      SELECT 
        al.id, al.action, al.entity_type as "entityType", al.entity_id as "entityId", 
        al.details, al.created_at as "createdAt", 
        u.name as "userName", u.email as "userEmail"
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[]
    
    logs = rawLogs.map(l => ({
      ...l,
      user: { name: l.userName, email: l.userEmail }
    }))
  } catch (error) {
    console.error("Error fetching audit logs:", error)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link href="/dashboard" className="text-xs font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 mb-2 transition-colors">
              <ChevronLeft size={14} /> Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-medium text-slate-800 tracking-tight flex items-center gap-3">
              <History className="w-8 h-8 text-slate-700" />
              Central de Auditoria
            </h1>
            <p className="text-sm text-slate-600 font-medium">Monitoramento em tempo real de todas as ações críticas do sistema.</p>
          </div>
          
          <div className="bg-white p-4 rounded-3xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Status de Segurança</p>
              <p className="text-sm font-medium text-slate-800">Monitoramento Ativo</p>
            </div>
          </div>
        </div>

        {/* Filters Placeholder */}
        <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <form className="flex-1 relative flex flex-col md:flex-row w-full items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="q"
                type="text" 
                defaultValue={query}
                placeholder="Buscar por detalhes ou entidade..." 
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-slate-500/20 transition-all outline-none"
              />
            </div>
            
            <div className="w-full md:w-auto relative flex">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select 
                name="user" 
                defaultValue={userFilter}
                className="w-full md:w-auto pl-10 pr-10 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-slate-500/20 transition-all outline-none appearance-none"
              >
                <option value="">Todos os Usuários</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || 'Sem nome'}</option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="w-full md:w-auto px-6 py-4 bg-slate-800 text-white rounded-2xl text-sm font-medium hover:bg-slate-700 transition-colors">
              Filtrar
            </button>
            {entityFilter && <input type="hidden" name="entity" value={entityFilter} />}
          </form>
          
          <div className="w-full h-px md:h-10 md:w-px bg-slate-200 hidden md:block"></div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Link 
              href={`/dashboard/auditoria?${userFilter ? `user=${userFilter}&` : ''}${query ? `q=${query}` : ''}`} 
              className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest border transition-all ${
                !entityFilter ? 'bg-slate-700 border-slate-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todos
            </Link>
            {['NOTA', 'QUESTAO', 'USUARIO', 'TURMA', 'DISCIPLINA', 'CONSELHO', 'PROVA', 'ESTUDANTE', 'OCORRENCIA'].map(filter => (
              <Link 
                key={filter} 
                href={`/dashboard/auditoria?entity=${filter}${query ? `&q=${query}` : ''}${userFilter ? `&user=${userFilter}` : ''}`}
                className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest border transition-all ${
                  entityFilter === filter ? 'bg-slate-700 border-slate-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter}
              </Link>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Autor</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Ação</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Alvo / Impacto</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Entidade</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length > 0 ? logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                        <Clock size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-medium text-[10px]">
                        {log.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{log.user?.name || 'Desconhecido'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{log.user?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-widest ${
                      log.action === 'INSERT' ? 'bg-emerald-50 text-emerald-600' :
                      log.action === 'UPDATE' ? 'bg-slate-100 text-slate-700' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {(() => {
                      try {
                        const d = log.details ? JSON.parse(log.details) : {}
                        return (
                          <div>
                            <p className="text-sm font-medium text-slate-800">{d.alvo || d.nome || '-'}</p>
                            {d.disciplina && <p className="text-[10px] text-slate-400 font-medium">{d.disciplina}</p>}
                          </div>
                        )
                      } catch (e) {
                        return <span className="text-slate-400">-</span>
                      }
                    })()}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <Database size={14} className="text-slate-300" />
                       <span className="text-xs font-medium text-slate-700 uppercase tracking-tight">{log.entityType}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="max-w-xs">
                      {(() => {
                        try {
                          if (!log.details) return <span className="text-slate-400 italic">Sem detalhes</span>
                          const d = JSON.parse(log.details)
                          
                          // Se tiver anterior e atual, fazemos o "vs"
                          if (d.anterior && d.atual) {
                            const keys = Object.keys(d.atual)
                            return (
                              <div className="flex flex-col gap-1.5">
                                {keys.map(k => {
                                  const oldVal = d.anterior[k]
                                  const newVal = d.atual[k]
                                  if (oldVal === newVal) return null
                                  
                                  return (
                                    <div key={k} className="flex items-center gap-2 text-[10px]">
                                      <span className="font-medium text-slate-400 uppercase w-6">{k}:</span>
                                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 line-through">
                                        {oldVal !== null ? String(oldVal) : 'Ø'}
                                      </span>
                                      <span className="text-slate-300">→</span>
                                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-medium">
                                        {newVal !== null ? String(newVal) : 'Ø'}
                                      </span>
                                    </div>
                                  )
                                })}
                                {d.context && <span className="text-[10px] text-slate-400 italic">Contexto: {d.context}</span>}
                              </div>
                            )
                          }

                          const entries = Object.entries(d).filter(([k]) => !['alvo', 'disciplina', 'nome', 'context', 'method'].includes(k))
                          if (entries.length === 0) return <span className="text-slate-400 italic">Ação concluída</span>

                          return (
                            <div className="flex flex-wrap gap-1">
                              {entries.map(([k, v]) => (
                                <span key={k} className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-medium text-slate-700 border border-slate-300">
                                  {k}: <span className="font-medium text-slate-800">{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          )
                        } catch (e) {
                          return <p className="text-[10px] text-slate-400 truncate italic">{log.details}</p>
                        }
                      })()}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                        <ShieldAlert size={32} />
                      </div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                        Nenhum registro de auditoria encontrado ou erro na conexão.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Paginação */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 flex items-center justify-between">
            <Link 
              href={page > 1 ? `/dashboard/auditoria?page=${page - 1}${entityFilter ? `&entity=${entityFilter}` : ''}${query ? `&q=${query}` : ''}${userFilter ? `&user=${userFilter}` : ''}` : '#'} 
              className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-all ${
                page > 1 ? 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100' : 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              Anterior
            </Link>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              Página {page}
            </span>
            <Link 
              href={logs.length === limit ? `/dashboard/auditoria?page=${page + 1}${entityFilter ? `&entity=${entityFilter}` : ''}${query ? `&q=${query}` : ''}${userFilter ? `&user=${userFilter}` : ''}` : '#'} 
              className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-all ${
                logs.length === limit ? 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100' : 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              Próxima
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
