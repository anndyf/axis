"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Search, Users, Plus, Filter, Accessibility,
  Trash2, AlertCircle, Info, ClipboardCheck, Phone,
  Settings, Save, Pencil, Clock, CheckCircle2, Upload,
  X, GraduationCap, ChevronRight, FileDown, Lock, FileText, ShieldCheck,
  PlusCircle, Edit3, Loader2
} from "lucide-react"
import { CIDS_AEE } from "@/lib/constants-aee"

export default function AEEDashboardClient({
  usuario,
  aeeAlunos,
  todasTurmas,
  estudantesSemAee = []
}: {
  usuario: any,
  aeeAlunos: any[],
  todasTurmas: any[],
  estudantesSemAee?: any[]
}) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTurma, setFilterTurma] = useState("")
  const isDirecao = usuario.isDirecao || usuario.isSuperuser || (usuario as any).isAEE

  // States
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [cidSearch, setCidSearch] = useState("")

  const [formData, setFormData] = useState({
    cids: [] as string[],
    condicao: "",
    recomendacoes: "",
    notasDirecao: "",
    contatoNome: "",
    contatoTelefone: "",
    precisaProvaAdaptada: false,
    precisaProvaSalaEspecial: false,
    fotoUrl: ""
  })

  // Handlers
  const filteredAlunos = aeeAlunos.filter((a: any) => {
    const matchSearch = a.estudante.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.estudante.matricula.includes(searchTerm)
    const matchTurma = filterTurma ? a.estudante.turmaId === filterTurma : true
    return matchSearch && matchTurma
  })

  const openEdit = (profile: any) => {
    setSelectedProfile(profile)
    setIsEditing(false) // Começa apenas visualizando
    setFormData({
      cids: profile.cids || [],
      condicao: profile.condicao || "",
      recomendacoes: profile.recomendacoes || "",
      notasDirecao: profile.notasDirecao || "",
      contatoNome: profile.contatoNome || "",
      contatoTelefone: profile.contatoTelefone || "",
      precisaProvaAdaptada: profile.precisaProvaAdaptada || false,
      precisaProvaSalaEspecial: profile.precisaProvaSalaEspecial || false,
      fotoUrl: profile.fotoUrl || ""
    })
    setActivePanel('edit')
  }

  const openCreate = (student: any) => {
    setSelectedStudent(student)
    setIsEditing(true) // Criação é sempre edição
    setFormData({
      cids: [], condicao: "", recomendacoes: "", notasDirecao: "",
      contatoNome: "", contatoTelefone: "",
      precisaProvaAdaptada: false, precisaProvaSalaEspecial: false, fotoUrl: ""
    })
    setActivePanel('create')
  }

  const handleSave = async () => {
    const matricula = activePanel === 'create' ? selectedStudent?.matricula : selectedProfile?.estudante.matricula
    if (!matricula || saving) return

    setSaving(true)
    try {
      const res = await fetch(`/api/estudantes/${matricula}/aee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsEditing(false)
        setActivePanel(null)
        router.refresh()
      } else {
        alert('Erro ao salvar ficha')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (profile: any) => {
    if (!isDirecao || !confirm("Tem certeza que deseja EXCLUIR permanentemente esta ficha de AEE?")) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/estudantes/${profile.estudante.matricula}/aee`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setActivePanel(null)
        router.refresh()
      } else {
        alert('Erro ao excluir ficha')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleAtestar = async (profile: any) => {
    if (isDirecao) return
    setSaving(true)
    try {
      const res = await fetch(`/api/estudantes/${profile.estudante.matricula}/aee/atestar`, { method: 'POST' })
      if (res.ok) router.refresh()
    } catch {
      alert('Erro ao atestar leitura')
    } finally {
      setSaving(false)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11)
    if (numbers.length <= 10) return numbers.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2")
    return numbers.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2")
  }

  const toggleCID = (code: string) => {
    if (!isEditing) return
    setFormData(p => ({ ...p, cids: p.cids.includes(code) ? p.cids.filter(c => c !== code) : [...p.cids, code] }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB")
    const reader = new FileReader()
    reader.onload = () => setFormData(p => ({ ...p, fotoUrl: reader.result as string }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="pb-10 text-fg antialiased">
      {/* Header Dinâmico */}
      <header className="mb-6 border-b border-line pb-4">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
             <div className="flex items-center space-x-5">
               <button
                 onClick={() => activePanel ? setActivePanel(null) : router.push('/dashboard')}
                 className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
               >
                 <ArrowLeft size={20} />
               </button>
               <div>
                 <h1 className="text-lg font-semibold text-fg tracking-tight">
                   {activePanel === 'create' ? 'Nova Ficha de Atendimento' : activePanel === 'edit' ? 'Ficha Individual de AEE' : 'Atendimento Especializado (AEE)'}
                 </h1>
                 <p className="text-base text-fg-muted font-medium">
                   {activePanel ? 'Registro Oficial de Inclusão' : 'Controle de Inclusão e Acessibilidade'}
                 </p>
               </div>
             </div>

             <div className="flex items-center gap-3">
               {!activePanel && isDirecao && (
                 <button
                   onClick={() => { setActivePanel('create'); setSelectedStudent(null); setStudentSearch(""); }}
                   className="flex items-center justify-center space-y-0 space-x-2 bg-success text-white px-6 py-2.5 rounded-lg hover:bg-success transition-all shadow-sm text-sm font-medium active:scale-95"
                 >
                   <PlusCircle className="w-4 h-4" />
                   <span className="whitespace-nowrap">Nova Ficha</span>
                 </button>
               )}

               {activePanel === 'edit' && isDirecao && !isEditing && (
                 <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-white border border-zinc-300 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-all shadow-sm"
                 >
                    <Edit3 size={14} /> Editar Ficha
                 </button>
               )}

               {(activePanel === 'create' || (isDirecao && isEditing)) && (
                 <button 
                    onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-accent text-on-accent px-6 py-2 rounded-lg text-xs font-semibold hover:bg-accent-hover transition-all disabled:opacity-50 shadow-sm"
                 >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Gravando...' : 'Salvar Alterações'}
                 </button>
               )}

               {!isDirecao && activePanel === 'edit' && !selectedProfile?.acknowledgements?.some((ack: any) => ack.user.id === usuario.id) && (
                 <button 
                    onClick={() => handleAtestar(selectedProfile)} disabled={saving}
                    className="flex items-center gap-2 bg-success text-white px-6 py-2 rounded-lg text-xs font-semibold hover:bg-success transition-all shadow-sm"
                 >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                    Confirmar Ciência
                 </button>
               )}
                {activePanel === 'edit' && isDirecao && (
                  <button 
                     onClick={() => handleDelete(selectedProfile)} disabled={saving}
                     className="p-2.5 bg-danger-subtle text-danger-fg rounded-lg hover:bg-danger-subtle transition-all border border-danger-line shadow-sm"
                     title="Excluir Ficha"
                  >
                     <Trash2 size={16} />
                  </button>
                )}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        {!activePanel ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-4 shadow-card">
                  <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center border border-zinc-100 text-fg shadow-sm">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-fg leading-none">{aeeAlunos.length}</p>
                    <p className="text-xs text-fg-subtle font-bold mt-1">Mapeados</p>
                  </div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-4 shadow-card">
                  <div className="w-10 h-10 bg-success-subtle rounded-lg flex items-center justify-center border border-success-line text-success-fg shadow-sm">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-fg leading-none">{aeeAlunos.filter(a => a.acknowledgements.length > 0).length}</p>
                    <p className="text-xs text-fg-subtle font-bold mt-1">Lidos</p>
                  </div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-4 shadow-card">
                  <div className="w-10 h-10 bg-warning-subtle rounded-lg flex items-center justify-center border border-warning-line text-warning-fg shadow-sm">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-fg leading-none">{aeeAlunos.filter(a => a.acknowledgements.length === 0).length}</p>
                    <p className="text-xs text-fg-subtle font-bold mt-1">Pendentes</p>
                  </div>
               </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-xl border border-zinc-200 shadow-card">
               <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                  <input 
                    type="text" placeholder="Buscar aluno por nome ou matrícula..." 
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-4 focus:ring-zinc-100 outline-none transition-all placeholder:text-fg-subtle"
                  />
               </div>
               <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter className="w-4 h-4 text-fg-subtle ml-2" />
                  <select 
                    value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
                    className="flex-1 md:w-64 bg-zinc-50 border border-zinc-200 rounded-lg px-5 py-3 text-sm font-bold outline-none appearance-none focus:bg-white transition-all cursor-pointer shadow-sm hover:bg-zinc-100"
                  >
                     <option value="">Todas as Turmas</option>
                     {todasTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
               </div>
            </div>

            {/* LIST */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-card">
               {filteredAlunos.length === 0 ? (
                 <div className="p-24 text-center">
                   <div className="w-20 h-20 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-6 text-zinc-200 border border-zinc-100 shadow-card">
                      <Accessibility size={40} />
                   </div>
                   <p className="text-fg-subtle text-xs font-semibold">Nenhum registro encontrado</p>
                   <p className="text-fg font-medium mt-2">Tente outros critérios de busca ou filtros.</p>
                 </div>
               ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                           <th className="px-6 py-3.5 text-xs text-fg font-semibold">Estudante</th>
                           <th className="px-6 py-3.5 text-xs text-fg font-semibold">Turma</th>
                           <th className="px-6 py-3.5 text-xs text-fg font-semibold">Diagnóstico</th>
                           <th className="px-6 py-3.5 text-xs text-fg font-semibold">Acompanhamento</th>
                           <th className="px-6 py-3.5 text-right"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100">
                        {filteredAlunos.map(a => (
                          <tr key={a.id} onClick={() => openEdit(a)} className="hover:bg-zinc-50 cursor-pointer transition-colors group">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center text-fg font-medium text-sm border border-zinc-200 overflow-hidden">
                                      {a.fotoUrl ? <img src={a.fotoUrl} className="w-full h-full object-cover" /> : a.estudante.nome.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-sm font-medium text-fg uppercase leading-none mb-1">{a.estudante.nome}</p>
                                      <p className="text-xs text-fg">Mat: {a.estudante.matricula}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-xs text-fg font-medium uppercase">{a.estudante.turma.nome}</td>
                             <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                   {a.cids.slice(0, 2).map((c: string) => (
                                     <span key={c} className="text-xs bg-zinc-100 text-fg px-1.5 py-0.5 rounded border border-zinc-200 uppercase">{c}</span>
                                   ))}
                                   {a.cids.length > 2 && <span className="text-xs text-fg">+{a.cids.length - 2}</span>}
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                {(() => {
                                   const turma = a.estudante.turma
                                   const profsMap = new Map()
                                   turma.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name))
                                   turma.disciplinas.forEach((d: any) => d.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name)))
                                   const totalProfessores = profsMap.size
                                   const totalLidos = a.acknowledgements.length

                                   if (totalLidos === 0) {
                                      return (
                                         <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-warning-subtle text-warning-fg rounded-full border border-warning-line">
                                            <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                                            <span className="text-xs font-medium">Pendente</span>
                                         </div>
                                      )
                                   } else if (totalLidos < totalProfessores) {
                                      return (
                                         <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-accent-subtle text-accent-fg rounded-full border border-accent/25">
                                            <span className="text-xs font-bold font-mono">{totalLidos}/{totalProfessores} Lidos</span>
                                         </div>
                                      )
                                   } else {
                                      return (
                                         <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-success-subtle text-success-fg rounded-full border border-success-line">
                                            <CheckCircle2 size={10} />
                                            <span className="text-xs font-medium">Lido</span>
                                         </div>
                                      )
                                   }
                                })()}
                             </td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isDirecao && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                                      className="p-1.5 text-zinc-300 hover:text-danger-fg transition-colors opacity-0 group-hover:opacity-100"
                                      title="Excluir Ficha"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  <ChevronRight size={16} className="inline text-zinc-300 group-hover:text-black transition-colors" />
                                </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="animate-slide-up space-y-12">
             {activePanel === 'create' && !selectedStudent ? (
                <div className="max-w-2xl mx-auto space-y-8 py-10">
                   <div className="text-center space-y-2">
                      <h3 className="text-xl font-semibold">Vincular Estudante</h3>
                      <p className="text-sm text-fg">Pesquise abaixo para carregar os dados base do estudante.</p>
                   </div>
                   <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
                      <input 
                         type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                         placeholder="Nome ou Matrícula..."
                         className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      {estudantesSemAee.filter(s => s.nome.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 8).map(s => (
                         <button 
                            key={s.matricula} onClick={() => openCreate(s)}
                            className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl hover:border-black transition-all group"
                         >
                            <div className="flex items-center gap-4 text-left">
                               <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center font-medium text-fg-subtle">{s.nome.charAt(0)}</div>
                               <div>
                                  <p className="text-sm font-semibold uppercase text-fg">{s.nome}</p>
                                  <p className="text-xs text-fg">{s.turma.nome}</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-zinc-300 group-hover:text-black" />
                         </button>
                      ))}
                   </div>
                </div>
             ) : (
                <div className="space-y-12 animate-slide-up">
                   {/* DESKTOP BANNER: Identificação Horizontal */}
                   <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row items-center gap-6 shadow-card">
                      <div className="relative group shrink-0">
                          <div className="w-16 h-16 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-200 shadow-card flex items-center justify-center">
                            {formData.fotoUrl ? (
                               <img src={formData.fotoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <Users size={24} className="text-zinc-300" />
                            )}
                         </div>
                         {isEditing && (
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer">
                                <Upload size={14} className="text-white" />
                               <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                         )}
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                         <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                            <h3 className="text-lg font-bold text-fg tracking-tight">
                               {activePanel === 'create' ? selectedStudent?.nome : selectedProfile?.estudante.nome}
                            </h3>
                            {activePanel === 'edit' && !isEditing && (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent-subtle text-accent-fg rounded-full border border-accent/25 self-center md:self-auto">
                                  <Accessibility size={10} />
                                  <span className="text-xs font-semibold">Ficha Ativa</span>
                               </div>
                            )}
                         </div>
                         <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                            <div className="flex items-center gap-2">
                               <span className="text-xs text-fg-subtle font-semibold leading-none">Matrícula</span>
                               <span className="text-sm font-bold text-fg-muted">{activePanel === 'create' ? selectedStudent?.matricula : selectedProfile?.estudante.matricula}</span>
                            </div>
                            <div className="w-px h-4 bg-zinc-200 hidden md:block" />
                            <div className="flex items-center gap-2">
                               <span className="text-xs text-fg-subtle font-semibold leading-none">Turma</span>
                               <span className="text-sm font-bold text-fg-muted uppercase">{activePanel === 'create' ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}</span>
                            </div>
                         </div>
                      </div>
                      
                      {activePanel === 'edit' && !isEditing && (
                         <div className="shrink-0 flex items-center gap-4 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 shadow-card">
                            <div>
                               <p className="text-xs text-fg-subtle font-semibold mb-1">Status de Ciência</p>
                               {selectedProfile.acknowledgements.length === 0 ? (
                                  <div className="flex items-center gap-1.5 text-warning-fg">
                                     <Clock size={12} className="animate-pulse" />
                                     <span className="text-xs font-bold">Pendente</span>
                                  </div>
                               ) : (
                                  <div className="flex items-center gap-1.5 text-success-fg">
                                     <CheckCircle2 size={14} />
                                     <span className="text-xs font-bold">{selectedProfile.acknowledgements.length} Leituras</span>
                                  </div>
                               )}
                            </div>
                         </div>
                      )}
                   </div>

                   {/* Grid Superior: Dados Compactos */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Diagnóstico (CIDs) */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-card space-y-4">
                         <label className="text-xs text-fg-subtle font-semibold flex items-center gap-3">
                            <div className="p-2 bg-danger-subtle text-danger-fg rounded-xl border border-danger-line">
                               <AlertCircle size={16} />
                            </div>
                            Diagnóstico Clínico (CIDs)
                         </label>
                         
                         {isEditing ? (
                            <div className="space-y-4">
                               <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                                  <input 
                                    type="text" placeholder="Pesquisar por nome ou código CID..." value={cidSearch} onChange={e => setCidSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold focus:bg-white outline-none"
                                  />
                               </div>
                               <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto p-1 custom-scrollbar pr-2">
                                  {CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase()) || c.label.toUpperCase().includes(cidSearch.toUpperCase())).map(c => (
                                     <button 
                                        key={c.code} onClick={() => toggleCID(c.code)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left group ${
                                           formData.cids.includes(c.code) ? 'bg-black text-white border-black shadow-card scale-[1.02]' : 'bg-white text-fg-muted border-zinc-200 hover:bg-zinc-50'
                                        }`}
                                     >
                                        <div className="flex items-center gap-3">
                                           <span className={`px-2 py-0.5 rounded font-semibold border ${formData.cids.includes(c.code) ? 'bg-white/20 border-white/30' : 'bg-zinc-100 border-zinc-200 text-fg'}`}>{c.code}</span>
                                           <span className="opacity-90 line-clamp-1">{c.label}</span>
                                        </div>
                                        {formData.cids.includes(c.code) && <CheckCircle2 size={14} className="text-white" />}
                                     </button>
                                  ))}
                               </div>
                            </div>
                         ) : (
                            <div className="grid grid-cols-1 gap-3">
                               {formData.cids.length > 0 ? formData.cids.map(code => {
                                  const cid = CIDS_AEE.find(c => c.code === code)
                                  return (
                                     <div key={code} className="bg-zinc-50 border border-zinc-100 p-4 rounded-lg flex items-center gap-4 transition-all hover:bg-white hover:border-zinc-200 hover:shadow-card group">
                                        <div className="bg-zinc-900 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 shadow-sm">
                                           {code}
                                        </div>
                                        <div className="text-xs font-bold text-fg leading-tight">
                                           {cid?.label || "CID Desconhecido"}
                                        </div>
                                     </div>
                                  )
                               }) : (
                                  <div className="py-10 text-center border-2 border-dashed border-zinc-100 rounded-lg">
                                     <p className="text-xs text-fg-subtle italic font-medium">Nenhum diagnóstico registrado.</p>
                                  </div>
                               )}
                            </div>
                         )}
                      </div>

                      {/* Configurações de Prova */}
                      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-card space-y-4">
                         <label className="text-xs text-fg-subtle font-semibold flex items-center gap-3">
                            <div className="p-2 bg-accent-subtle text-accent-fg rounded-xl border border-accent/25">
                               <ClipboardCheck size={16} />
                            </div>
                            Necessidades Avaliativas
                         </label>
                         
                         <div className="grid grid-cols-1 gap-4">
                            {[
                               { id: 'precisaProvaAdaptada', label: 'Requere Prova Adaptada', icon: FileText, color: 'indigo' },
                               { id: 'precisaProvaSalaEspecial', label: 'Requere Sala Especial / Apoio AEE', icon: GraduationCap, color: 'emerald' }
                            ].map(item => {
                               const Icon = item.icon as any
                               const isSelected = (formData as any)[item.id]
                               return (
                                 <button 
                                    key={item.id} disabled={!isEditing}
                                    onClick={() => setFormData(f => ({ ...f, [item.id]: !isSelected }))}
                                    className={`flex items-center gap-6 p-4 rounded-xl border-2 transition-all text-left group ${
                                       isSelected 
                                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-card scale-[1.02]' 
                                          : 'bg-white border-zinc-100 text-fg-muted hover:border-zinc-300'
                                    } ${!isEditing && 'cursor-default opacity-100'}`}
                                 >
                                    <div className={`p-3 rounded-xl transition-colors ${isSelected ? 'bg-white/10 text-white' : 'bg-zinc-50 text-fg-subtle group-hover:text-fg-muted'}`}>
                                       <Icon size={20} />
                                    </div>
                                    <div>
                                       <span className="text-sm font-semibold block mb-0.5">{item.label}</span>
                                       <span className={`text-xs font-bold uppercase ${isSelected ? 'text-white/50' : 'text-fg-subtle'}`}>
                                          {isSelected ? 'Configuração Ativada' : 'Não Solicitado'}
                                       </span>
                                    </div>
                                 </button>
                               )
                            })}
                         </div>
                      </div>
                   </div>

                   {/* BLOCOS TEXTUAIS HORIZONTAIS */}
                   <div className="space-y-10">
                      {[
                         { id: 'condicao', label: 'Condição e Contexto Biopsicossocial do Estudante', icon: Info, rows: 6, placeholder: 'Descreva detalhadamente a condição médica, clínica e social, limitações e potencialidades...', color: 'slate' },
                         { id: 'recomendacoes', label: 'Diretrizes PDI e Recomendações Pedagógicas para Docentes', icon: ShieldCheck, rows: 8, placeholder: 'Instruções fundamentais sobre adaptação curricular, critérios de avaliação especial, tempo adicional e apoios necessários...', color: 'indigo' }
                      ].map(field => {
                         const Icon = field.icon as any
                         return (
                            <div key={field.id} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-card space-y-4">
                               <label className="text-xs text-fg-subtle font-semibold flex items-center gap-3">
                                  <div className={`p-2 bg-subtle text-fg-muted rounded-xl border border-line`}>
                                     <Icon size={18} />
                                  </div>
                                  {field.label}
                               </label>
                               <textarea 
                                  rows={field.rows} readOnly={!isEditing}
                                  value={(formData as any)[field.id]} onChange={e => setFormData(f => ({ ...f, [field.id]: e.target.value }))}
                                  placeholder={isEditing ? field.placeholder : 'Nenhuma informação cadastrada no prontuário.'}
                                  className={`w-full bg-zinc-50 border border-zinc-100 rounded-lg px-8 py-6 text-base font-medium text-fg leading-relaxed outline-none transition-all placeholder:text-zinc-300 ${isEditing ? 'focus:bg-white focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300' : 'cursor-default border-transparent'}`}
                               />
                            </div>
                         )
                      })}

                      {isDirecao && (
                         <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-card space-y-4">
                            <label className="text-xs text-fg-subtle font-semibold flex items-center gap-3">
                               <div className="p-2 bg-white/5 text-white/40 rounded-xl border border-white/10">
                                  <Lock size={18} />
                                </div>
                               Observações Administrativas Internas
                            </label>
                            <textarea 
                               rows={4} readOnly={!isEditing} value={formData.notasDirecao}
                               onChange={e => setFormData(f => ({ ...f, notasDirecao: e.target.value }))}
                               placeholder="Notas administrativas, controle de laudos, renovações e acompanhamento interno da gestão..."
                               className={`w-full bg-white/5 border border-white/10 rounded-lg px-8 py-6 text-base font-medium text-white leading-relaxed outline-none transition-all placeholder:text-white/20 ${isEditing ? 'focus:bg-white/10 focus:border-white/20' : 'cursor-default border-transparent'}`}
                            />
                            <p className="text-xs text-white/30 font-semibold text-right pr-4">Visível apenas para a direção e superusuários</p>
                         </div>
                      )}
                   </div>

                   {/* Rodapé: Contatos e Resumo de Leitura */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Contatos Emergência */}
                      <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-card space-y-4">
                         <div className="flex items-center gap-3 pb-4 border-b border-zinc-50">
                            <div className="p-2 bg-danger-subtle text-danger-fg rounded-xl">
                               <Phone size={16} />
                            </div>
                            <p className="text-xs font-semibold text-fg-subtle">Contatos de Emergência do Estudante</p>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-xs font-semibold text-fg-subtle px-1">Nome do Responsável</label>
                               <input 
                                  type="text" readOnly={!isEditing} value={formData.contatoNome}
                                  onChange={e => setFormData(f => ({ ...f, contatoNome: e.target.value }))}
                                  className={`w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-fg-muted outline-none transition-all ${isEditing ? 'focus:bg-white focus:border-zinc-200' : 'border-transparent bg-transparent pl-1 cursor-default'}`}
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-semibold text-fg-subtle px-1">Telefone / WhatsApp</label>
                               <input 
                                  type="text" readOnly={!isEditing} value={formData.contatoTelefone}
                                  onChange={e => setFormData(f => ({ ...f, contatoTelefone: formatPhone(e.target.value) }))}
                                  className={`w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-fg-muted outline-none font-mono transition-all ${isEditing ? 'focus:bg-white focus:border-zinc-200' : 'border-transparent bg-transparent pl-1 cursor-default'}`}
                               />
                            </div>
                         </div>
                      </div>

                      {/* Resumo de Ciência */}
                      {activePanel === 'edit' && isDirecao && (() => {
                         const turma = selectedProfile.estudante.turma
                         const profsMap = new Map()
                         turma.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name))
                         turma.disciplinas.forEach((d: any) => d.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name)))
                         const todosProfessores = Array.from(profsMap.entries()).map(([id, name]) => ({ id, name }))
                         const lidos = selectedProfile.acknowledgements.map((ack: any) => ack.user.id)
                         const lidosCont = lidos.length
                         const totalCont = todosProfessores.length

                         return (
                            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-card space-y-4 flex flex-col justify-center">
                               <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                     <div className="p-2 bg-success-subtle text-success-fg rounded-xl">
                                        <CheckCircle2 size={16} />
                                     </div>
                                     <label className="text-xs font-semibold text-fg-subtle">Controle Docente</label>
                                  </div>
                                  <div className="px-3 py-1 bg-zinc-900 text-white rounded-lg text-xs font-semibold shadow-sm">
                                     {lidosCont} / {totalCont}
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <div className="w-full h-3 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 shadow-card">
                                     <div className="h-full bg-success transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${(lidosCont/totalCont)*100}%` }} />
                                  </div>
                                  <button 
                                     onClick={() => document.getElementById('relatorio-leituras')?.scrollIntoView({ behavior: 'smooth' })}
                                     className="w-full py-3.5 text-xs text-fg font-semibold border-2 border-zinc-100 rounded-lg hover:bg-zinc-50 hover:border-zinc-200 transition-all active:scale-[0.98]"
                                  >
                                     Auditoria Nominal de Leituras
                                  </button>
                               </div>
                            </div>
                         )
                      })()}
                   </div>

                   {/* Relatório de Ciência Nominal */}
                   {activePanel === 'edit' && isDirecao && (
                      <div id="relatorio-leituras" className="pt-10 border-t border-zinc-200 space-y-8 animate-fade-in">
                         <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-fg flex items-center gap-3">
                               <div className="w-1.5 h-6 bg-accent rounded-full" />
                               Relatório Nominal de Ciência
                            </h3>
                            <div className="flex gap-6">
                               <div className="flex items-center gap-2 text-xs text-fg-subtle font-semibold"><div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Concluído</div>
                               <div className="flex items-center gap-2 text-xs text-fg-subtle font-semibold"><div className="w-2.5 h-2.5 rounded-full bg-zinc-200" /> Pendente</div>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {(() => {
                               const turma = selectedProfile.estudante.turma
                               const profsMap = new Map()
                               turma.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name))
                               turma.disciplinas.forEach((d: any) => d.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name)))
                               const lidosMap = new Map()
                               selectedProfile.acknowledgements.forEach((ack: any) => lidosMap.set(ack.user.id, new Date(ack.readAt).toLocaleString('pt-BR')))
                               
                               return Array.from(profsMap.entries()).map(([id, name]) => {
                                  const lidoAt = lidosMap.get(id)
                                  return (
                                     <div key={id} className={`p-5 rounded-xl border transition-all ${lidoAt ? 'bg-white border-success-line shadow-card ' : 'bg-zinc-50/50 border-zinc-100 opacity-60'}`}>
                                        <div className="flex items-center gap-4">
                                           <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-xs shadow-card ${lidoAt ? 'bg-success text-white' : 'bg-white text-zinc-300 border border-zinc-100'}`}>
                                              {name.charAt(0)}
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-xs font-bold text-fg truncate uppercase mt-0.5">{name}</p>
                                              <p className="text-xs text-fg-subtle font-bold mt-0.5">
                                                 {lidoAt ? `Lido: ${lidoAt}` : 'Não Visualizado'}
                                              </p>
                                           </div>
                                        </div>
                                     </div>
                                  )
                               })
                            })()}
                         </div>
                      </div>
                   )}
                </div>
             )}
          </div>
        )}
      </main>

      {/* Global CSS for Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  )
}

function Graduate(props: any) {
   return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v6l10 5 10-5v-6"/><path d="M12 3 2 10l10 7 10-7-10-7z"/><path d="M12 17v4"/></svg>
}
