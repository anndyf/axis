"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import { Badge, Button, CabecalhoPagina, EmptyState, Painel, RodapeTabela, SkeletonRows, Table, TableContainer, TBody, TD, TH, THead, TR, type BadgeTone } from "@/components/ui"
import { baixarCSV } from "@/lib/navegador/csv"
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  User, 
  Users, 
  Trash2, 
  Edit3, 
  Printer, 
  Download,
  ChevronRight,
  Info,
  Clock,
  ArrowLeft,
  FileWarning,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import OcorrenciaForm from "@/components/OcorrenciaForm"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Ocorrencia {
  id: string
  titulo: string
  descricao: string
  tipo: string
  data: string
  registradoPorId: string
  autor: { name: string | null }
  estudantes: {
    matricula: string
    nome: string
    turma: { nome: string }
  }[]
  createdAt: string
}

interface OcorrenciasClientProps {
  turmas: { id: string; nome: string }[]
  /** aba Ocorrências da ficha da turma: lista só desta turma, sem o cabeçalho da tela */
  turmaFixa?: string
}

export default function OcorrenciasClient({ turmas, turmaFixa }: OcorrenciasClientProps) {
  const { data: session } = useSession()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Ocorrencia | null>(null)
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    studentName: "",
    turmaId: turmaFixa ?? "",
    type: ""
  })

  const fetchOcorrencias = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`/api/ocorrencias?${query}`)
      const data = await res.json()
      setOcorrencias(res.ok && Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Erro ao carregar ocorrências:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOcorrencias()
  }, [filters])

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro de ocorrência? Esta ação não pode ser desfeita.")) return
    
    try {
      const res = await fetch(`/api/ocorrencias/${id}`, { method: 'DELETE' })
      if (res.ok) fetchOcorrencias()
    } catch (error) {
      console.error("Erro ao excluir:", error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return 'bg-danger-subtle text-danger-fg border-danger-line'
      case 'pedagógica': return 'bg-accent-subtle text-accent-fg border-accent/25'
      case 'médica': return 'bg-success-subtle text-success-fg border-success-line'
      case 'elogio': return 'bg-warning-subtle text-warning-fg border-warning-line'
      default: return 'bg-zinc-50 text-fg-muted border-zinc-100'
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return <AlertTriangle className="w-4 h-4" />
      case 'médica': return <Clock className="w-4 h-4" />
      case 'elogio': return <CheckCircle2 className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const [aberta, setAberta] = useState<string | null>(null)
  const ctrl = "h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-fg hover:border-line-strong focus:border-accent focus:outline-none md:h-8 md:text-13"
  const tomTipo = (tipo: string): BadgeTone => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return 'danger'
      case 'pedagógica': return 'accent'
      case 'médica': return 'success'
      case 'elogio': return 'warning'
      default: return 'neutral'
    }
  }
  const dataCurta = (d: string) => format(new Date(d), "dd/MM/yyyy", { locale: ptBR })
  const acoesTela = (
    <>
      <Button variant="secondary" onClick={handlePrint}><Printer size={16} strokeWidth={1.75} aria-hidden /> <span className="hidden sm:inline">Imprimir</span></Button>
      <Button onClick={() => { setShowForm(true); setSelectedOcorrencia(null) }}><Plus size={16} strokeWidth={1.75} aria-hidden /> Novo registro</Button>
    </>
  )

  return (
    <div className="space-y-4 pb-32 md:pb-0">
      {!turmaFixa && (
        <CabecalhoPagina
          titulo="Livro de ocorrências"
          descricao="Registro e acompanhamento das ocorrências escolares."
          acoes={acoesTela}
        />
      )}

      <Painel semRecuo>
        <div role="toolbar" aria-label="Filtros das ocorrências" className="grid gap-2 border-b border-line-subtle px-painel py-2.5 sm:grid-cols-2 md:flex md:flex-wrap md:items-end md:gap-3 print:hidden">
          <label className="block md:w-64">
            <span className="mb-1 block text-rotulo text-fg-muted">Estudante</span>
            <span className="relative block">
              <Search size={14} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input type="search" placeholder="Nome do estudante" value={filters.studentName} onChange={e => setFilters({ ...filters, studentName: e.target.value })} className={`${ctrl} pl-8`} />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-rotulo text-fg-muted">De</span>
            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className={ctrl} />
          </label>
          <label className="block">
            <span className="mb-1 block text-rotulo text-fg-muted">Até</span>
            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className={ctrl} />
          </label>
          {!turmaFixa && (
            <label className="block md:w-44">
              <span className="mb-1 block text-rotulo text-fg-muted">Turma</span>
              <select value={filters.turmaId} onChange={e => setFilters({ ...filters, turmaId: e.target.value })} className={ctrl}>
                <option value="">Todas as turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </label>
          )}
          <label className="block md:w-44">
            <span className="mb-1 block text-rotulo text-fg-muted">Tipo</span>
            <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className={ctrl}>
              <option value="">Todos os tipos</option>
              <option value="Comportamental">Comportamental</option>
              <option value="Pedagógica">Pedagógica</option>
              <option value="Médica">Médica</option>
              <option value="Elogio">Elogio</option>
            </select>
          </label>
          <div className="flex items-center gap-2 md:ml-auto">
            {turmaFixa && acoesTela}
            <Button variant="secondary" size="sm" className="max-md:hidden" onClick={() => baixarCSV("Ocorrencias", [
              { titulo: "Data", valor: (o: Ocorrencia) => dataCurta(o.data) },
              { titulo: "Tipo", valor: (o: Ocorrencia) => o.tipo },
              { titulo: "Título", valor: (o: Ocorrencia) => o.titulo },
              { titulo: "Estudantes", valor: (o: Ocorrencia) => o.estudantes.map((e) => `${e.nome} (${e.turma.nome})`).join(", ") },
              { titulo: "Registrado por", valor: (o: Ocorrencia) => o.autor.name || "Sistema" },
              { titulo: "Descrição", valor: (o: Ocorrencia) => o.descricao },
            ], ocorrencias)}>
              <Download size={14} strokeWidth={1.75} aria-hidden /> Exportar
            </Button>
          </div>
        </div>

        {loading ? (
          <SkeletonRows linhas={6} colunas={4} />
        ) : ocorrencias.length === 0 ? (
          <EmptyState icon={FileWarning} title="Nenhum registro encontrado" description="Ajuste os filtros ou confira se há registros no período." />
        ) : (
          <>
            {/* Desktop: tabela; a linha abre a descrição completa */}
            <TableContainer semBorda className="hidden md:block print:block">
              <Table>
                <THead>
                  <TR><TH className="w-28">Data</TH><TH className="w-36">Tipo</TH><TH>Registro</TH><TH>Estudantes</TH><TH>Registrado por</TH><TH className="print:hidden"><span className="sr-only">Ações</span></TH></TR>
                </THead>
                <TBody>
                  {ocorrencias.map((item) => (
                    <Fragment key={item.id}>
                      <TR onClick={() => setAberta(aberta === item.id ? null : item.id)} aria-expanded={aberta === item.id}>
                        <TD className="tabular-nums text-fg-muted">{dataCurta(item.data)}</TD>
                        <TD><Badge tone={tomTipo(item.tipo)}>{item.tipo}</Badge></TD>
                        <TD className="max-w-md">
                          <span className="font-medium text-fg">{item.titulo}</span>
                          {aberta !== item.id && <span className="block truncate text-xs text-fg-muted print:hidden">{item.descricao}</span>}
                        </TD>
                        <TD className="text-fg-muted">{item.estudantes.map((e) => `${e.nome} (${e.turma.nome})`).join(", ")}</TD>
                        <TD className="text-fg-muted">{item.autor.name || "Sistema"}</TD>
                        <TD className="w-0 print:hidden" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button type="button" onClick={() => { setSelectedOcorrencia(item); setShowForm(true) }} aria-label={`Editar ${item.titulo}`} title="Editar" className="flex size-8 items-center justify-center rounded-md text-fg-subtle hover:bg-subtle hover:text-fg"><Edit3 size={16} strokeWidth={1.75} /></button>
                            <button type="button" onClick={() => handleDelete(item.id)} aria-label={`Excluir ${item.titulo}`} title="Excluir" className="flex size-8 items-center justify-center rounded-md text-fg-subtle hover:bg-danger-subtle hover:text-danger-fg"><Trash2 size={16} strokeWidth={1.75} /></button>
                          </div>
                        </TD>
                      </TR>
                      {aberta === item.id && (
                        <tr className="bg-subtle/40">
                          <td colSpan={6} className="border-b border-line-subtle px-3 pb-3 pt-1">
                            <p className="max-w-leitura whitespace-pre-wrap text-sm leading-relaxed text-fg">{item.descricao}</p>
                            <p className="mt-2 text-xs text-fg-subtle">Registrado em {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por {item.autor.name || "Sistema"}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </TBody>
              </Table>
            </TableContainer>

            {/* Celular: cartões compactos */}
            <ul className="divide-y divide-line-subtle md:hidden print:hidden">
              {ocorrencias.map((item) => (
                <li key={item.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={tomTipo(item.tipo)}>{item.tipo}</Badge>
                        <span className="text-xs tabular-nums text-fg-subtle">{dataCurta(item.data)}</span>
                      </div>
                      <p className="mt-1 break-words text-sm font-medium text-fg">{item.titulo}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedOcorrencia(item); setShowForm(true) }} aria-label={`Editar ${item.titulo}`} className="flex size-11 items-center justify-center rounded-md text-fg-subtle hover:bg-subtle"><Edit3 size={18} strokeWidth={1.75} /></button>
                    <button type="button" onClick={() => handleDelete(item.id)} aria-label={`Excluir ${item.titulo}`} className="flex size-11 items-center justify-center rounded-md text-fg-subtle hover:bg-danger-subtle hover:text-danger-fg"><Trash2 size={18} strokeWidth={1.75} /></button>
                  </div>
                  <p className="whitespace-pre-wrap text-13 text-fg-muted">{item.descricao}</p>
                  <p className="text-xs text-fg-subtle">{item.estudantes.map((e) => `${e.nome} (${e.turma.nome})`).join(", ")} · por {item.autor.name || "Sistema"}</p>
                </li>
              ))}
            </ul>
            <RodapeTabela total={ocorrencias.length} singular="registro" plural="registros" className="print:hidden" />
          </>
        )}
      </Painel>

      {/* Modais */}
      {showForm && (
        <OcorrenciaForm
          ocorrencia={selectedOcorrencia} 
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchOcorrencias(); }}
        />
      )}

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          body { background: white !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          header { display: none !important; }
          .grid { display: none !important; }
          section { border: none !important; box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  )
}
