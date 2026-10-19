"use client"

import { useState, useEffect } from "react"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Info, 
  Clock, 
  Monitor, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  Pencil
} from "lucide-react"
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Lab {
  id: string
  nome: string
  descricao: string | null
}

interface Reserva {
  id: string
  laboratorioId: string
  userId: string
  data: string
  turno: string
  horario: number
  disciplina: string | null
  turmaId: string | null
  user: {
    name: string | null
    username: string
  }
}

export default function LaboratoriosClient({ 
  initialLaboratorios, 
  currentUser,
  myTurmas = []
}: { 
  initialLaboratorios: Lab[], 
  currentUser: any,
  myTurmas?: any[]
}) {
  const [selectedLab, setSelectedLab] = useState<string>(initialLaboratorios[0]?.id || "")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [showLabModal, setShowLabModal] = useState(false)
  const [editingLabId, setEditingLabId] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<{ turno: string, horario: number } | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<{ data: string, turno: string, horario: number }[]>([])
  
  // Form State
  const [selectedTurmaId, setSelectedTurmaId] = useState("")
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("")
  const [formDisciplina, setFormDisciplina] = useState("")
  const [formLab, setFormLab] = useState({ nome: '', descricao: '' })

  const isAdmin = currentUser.isSuperuser || currentUser.isDirecao

  const handleSaveLab = async () => {
    if (!formLab.nome || submitting) return
    setSubmitting(true)
    try {
      const isEditing = !!editingLabId
      const url = '/api/laboratorios'
      const method = isEditing ? 'PATCH' : 'POST'
      const body = isEditing ? { id: editingLabId, ...formLab } : formLab

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.message || "Erro ao salvar laboratório" })
      }
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: "Erro de conexão" })
    } finally {
      setSubmitting(false)
    }
  }

  const turnos = [
    { id: 'MANHA', nome: 'Manhã', slots: 6 },
    { id: 'TARDE', nome: 'Tarde', slots: 6 },
    { id: 'NOITE', nome: 'Noite', slots: 5 }
  ]

  const fetchReservas = async () => {
    if (!selectedLab) return
    setLoading(true)
    try {
      const dateISO = new Date(format(selectedDate, 'yyyy-MM-dd')).toISOString()
      const res = await fetch(`/api/laboratorios/reservas?labId=${selectedLab}&date=${dateISO}&view=week`)
      if (res.ok) {
        const data = await res.json()
        setReservas(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservas()
  }, [selectedLab, selectedDate])

  const handleReserve = async () => {
    if ((!activeSlot && selectedSlots.length === 0) || submitting) return
    
    if (!isAdmin && (!selectedTurmaId || !selectedDisciplinaId)) {
      setMessage({ type: 'error', text: "Selecione a turma e a disciplina." })
      return
    }

    setSubmitting(true)
    setMessage(null)

    const turma = myTurmas.find(t => t.id === selectedTurmaId)
    const disciplinaObj = turma?.disciplinas.find((d: any) => d.id === selectedDisciplinaId)
    const finalDisciplina = isAdmin && formDisciplina ? formDisciplina : (disciplinaObj?.nome || "")

    try {
      // If multi-selection is active (admin), use selectedSlots
      const reservationData = isAdmin && selectedSlots.length > 0 
        ? { laboratorioId: selectedLab, slots: selectedSlots, disciplina: finalDisciplina, turmaId: selectedTurmaId }
        : {
            laboratorioId: selectedLab,
            data: new Date(format(selectedDate, 'yyyy-MM-dd')).toISOString(),
            turno: activeSlot?.turno,
            horario: activeSlot?.horario,
            disciplina: finalDisciplina,
            turmaId: selectedTurmaId
          }

      const res = await fetch('/api/laboratorios/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: "Reserva realizada!" })
        setShowModal(false)
        setFormDisciplina("")
        setSelectedTurmaId("")
        setSelectedDisciplinaId("")
        setSelectedSlots([])
        setActiveSlot(null)
        fetchReservas()
      } else {
        setMessage({ type: 'error', text: data.message || "Erro ao reservar" })
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erro de conexão" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReserva = async (id: string) => {
    if (!confirm("Deseja realmente cancelar esta reserva?")) return
    
    try {
      const res = await fetch(`/api/laboratorios/reservas/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: "Reserva cancelada." })
        fetchReservas()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.message || "Erro ao cancelar" })
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erro ao cancelar" })
    }
  }

  const getReservaForSlot = (turno: string, horario: number, date?: Date) => {
    const targetDate = date || selectedDate
    const targetDateStr = format(targetDate, 'yyyy-MM-dd')
    
    return reservas.find(r => {
      const reservaDateStr = typeof r.data === 'string' 
        ? r.data.split('T')[0] 
        : format(new Date(r.data), 'yyyy-MM-dd')
        
      return r.turno === turno && 
             r.horario === horario && 
             reservaDateStr === targetDateStr
    })
  }

  const weekDays = [1, 2, 3, 4, 5].map(day => addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), day - 1))
  const selectedTurma = myTurmas.find(t => t.id === selectedTurmaId)

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Centralizado */}
      <section className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-fg tracking-tight">Reserva de Laboratórios</h1>
            <p className="text-fg-subtle font-medium">Gerencie o uso compartilhado dos espaços tecnológicos.</p>
          </div>

          <div className="flex flex-wrap gap-3">
             <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-fg-muted shadow-sm">
                   <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-fg-subtle uppercase tracking-widest">Semana de</p>
                  <p className="text-sm font-semibold text-fg">
                     {`${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM")} a ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM")}`}
                  </p>
                </div>
             </div>

             <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200 shadow-card">
                <button 
                  onClick={() => setSelectedDate(subDays(selectedDate, 7))}
                  className="p-2.5 rounded-xl text-fg-subtle hover:text-fg-muted hover:bg-white transition-all"
                  title="Semana Anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-fg bg-white shadow-sm hover:bg-zinc-50 transition-all"
                >
                  HOJE
                </button>

                <button 
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  className="p-2.5 rounded-xl text-fg-subtle hover:text-fg-muted hover:bg-white transition-all"
                  title="Próxima Semana"
                >
                  <ChevronRight size={18} />
                </button>
             </div>

             {isAdmin && (
               <button 
                 onClick={() => {
                   if (selectedSlots.length > 0) {
                     setShowModal(true)
                   } else {
                     setMessage({ type: 'error', text: "Selecione pelo menos um horário na grade abaixo." })
                   }
                 }}
                 className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-card active:scale-95 ${
                   selectedSlots.length > 0 
                     ? 'bg-success text-white ' 
                     : 'bg-white border-2 border-zinc-200 text-fg-subtle'
                 }`}
               >
                 <Plus size={18} />
                 {selectedSlots.length > 0 ? `RESERVAR (${selectedSlots.length} HORÁRIOS)` : 'MULTI-RESERVA'}
               </button>
             )}
          </div>
        </div>
      </section>

      {/* Filtros e Seleção */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* Sidebar de Labs */}
         <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-widest">Laboratórios</h3>
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => {
                        const currentLab = initialLaboratorios.find(l => l.id === selectedLab)
                        if (currentLab) {
                          setFormLab({ nome: currentLab.nome, descricao: currentLab.descricao || "" })
                          setEditingLabId(currentLab.id)
                          setShowLabModal(true)
                        }
                      }}
                      className="p-1.5 bg-white border border-zinc-200 text-fg-subtle rounded-lg hover:border-zinc-900 hover:text-fg transition-all shadow-sm"
                      title="Editar Laboratório Atual"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        setFormLab({ nome: '', descricao: '' })
                        setEditingLabId(null)
                        setShowLabModal(true)
                      }}
                      className="p-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-all shadow-sm"
                      title="Novo Laboratório"
                    >
                      <Plus size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="relative group">
               <select
                 value={selectedLab}
                 onChange={(e) => setSelectedLab(e.target.value)}
                 className="w-full appearance-none bg-white border-2 border-zinc-200 rounded-lg pl-5 pr-12 py-4 text-sm font-bold text-fg focus:border-zinc-900 focus:ring-0 transition-all shadow-sm cursor-pointer"
               >
                 {initialLaboratorios.map(lab => (
                   <option key={lab.id} value={lab.id} className="font-medium text-fg-muted py-2">
                     {lab.nome}
                   </option>
                 ))}
               </select>
               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-fg-subtle group-hover:text-fg-muted transition-colors">
                  <ChevronDown className="w-4 h-4" />
               </div>
            </div>

            {initialLaboratorios.find(l => l.id === selectedLab)?.descricao && (
               <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-accent-fg" />
                    <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">Sobre este espaço</span>
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed font-medium">
                    {initialLaboratorios.find(l => l.id === selectedLab)?.descricao}
                  </p>
               </div>
            )}

         </div>

         {/* Grade de Horários */}
         <div className="lg:col-span-3 space-y-6">
            {message && (
              <div className={`p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
                message.type === 'success' ? 'bg-success-subtle border border-success-line text-success-fg' : 'bg-danger-subtle border border-danger-line text-danger-fg'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            <div className="space-y-10">
              {turnos.map(turno => (
                <div key={turno.id} className="space-y-4">
                   <div className="flex items-center gap-3 ml-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-900 shadow-[0_0_8px_rgba(15,23,42,0.3)]"></div>
                      <h4 className="text-sm font-bold text-fg uppercase tracking-[0.1em]">{turno.nome}</h4>
                   </div>

                   <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm bg-white">
                     <table className="w-full border-collapse table-fixed">
                       <thead>
                         <tr className="bg-zinc-50/50 text-fg-subtle">
                           <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-100 w-24">Horário</th>
                           {weekDays.map(day => {
                             const isToday = isSameDay(day, new Date())
                             return (
                               <th key={day.toISOString()} className={`p-4 text-center border-b border-zinc-100 min-w-[140px] ${isToday ? 'bg-accent-subtle' : ''}`}>
                                 <div className="flex flex-col items-center gap-0.5">
                                   <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-accent-fg' : 'text-fg-subtle'}`}>
                                     {format(day, "EEEE", { locale: ptBR })}
                                   </span>
                                   <span className={`text-[9px] font-medium ${isToday ? 'text-accent-fg' : 'text-fg-subtle'}`}>
                                     {format(day, "dd/MM")}
                                   </span>
                                 </div>
                               </th>
                             )
                           })}
                         </tr>
                       </thead>
                       <tbody>
                         {Array.from({ length: turno.slots }).map((_, idx) => {
                           const horario = idx + 1
                           return (
                             <tr key={horario} className="hover:bg-zinc-50/50 transition-colors">
                               <td className="p-4 border-b border-zinc-100 font-bold text-fg-muted text-xs">{horario}º Horário</td>
                               {weekDays.map(day => {
                                 const reserva = getReservaForSlot(turno.id, horario, day)
                                 const isMyReserva = reserva?.userId === currentUser.id
                                 return (
                                   <td key={day.toISOString()} className={`p-2 border-b border-zinc-100 border-l border-zinc-50 ${isSameDay(day, new Date()) ? 'bg-accent-subtle' : ''}`}>
                                     {reserva ? (
                                       <div className={`p-3 rounded-xl border relative group ${isMyReserva ? 'bg-success border-success text-white shadow-card ' : 'bg-white border-zinc-200 text-fg-muted shadow-sm'}`}>
                                         <p className="text-[10px] font-bold line-clamp-1 uppercase tracking-tight">{reserva.user?.name || reserva.user?.username}</p>
                                         <p className={`text-[9px] font-medium line-clamp-1 ${isMyReserva ? 'text-white/85' : 'text-fg-subtle'}`}>{reserva.disciplina || "Uso Técnico"}</p>
                                         
                                         {(isMyReserva || isAdmin) && (
                                           <button 
                                             onClick={() => handleDeleteReserva(reserva.id)}
                                             className="absolute -top-1 -right-1 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-overlay"
                                           >
                                             <X size={10} />
                                           </button>
                                         )}
                                       </div>
                                     ) : (
                                       <button 
                                         onClick={() => {
                                           setMessage(null)
                                           const dateStr = format(day, 'yyyy-MM-dd')
                                           
                                           if (isAdmin) {
                                             const alreadySelected = selectedSlots.find(s => s.data === dateStr && s.turno === turno.id && s.horario === horario)
                                             if (alreadySelected) {
                                               setSelectedSlots(prev => prev.filter(s => !(s.data === dateStr && s.turno === turno.id && s.horario === horario)))
                                             } else {
                                               setSelectedSlots(prev => [...prev, { data: dateStr, turno: turno.id, horario }])
                                             }
                                           } else {
                                             setSelectedDate(day)
                                             setActiveSlot({ turno: turno.id, horario })
                                             setShowModal(true)
                                           }
                                         }}
                                         className={`w-full h-10 rounded-xl border transition-all flex items-center justify-center group ${
                                           selectedSlots.find(s => s.data === format(day, 'yyyy-MM-dd') && s.turno === turno.id && s.horario === horario)
                                             ? 'bg-zinc-900 border-zinc-900 text-white ring-4 ring-zinc-900/10'
                                             : 'border-dashed border-zinc-200 hover:border-zinc-900 hover:bg-white'
                                         }`}
                                       >
                                         <Plus size={14} className={selectedSlots.find(s => s.data === format(day, 'yyyy-MM-dd') && s.turno === turno.id && s.horario === horario) ? "text-white" : "text-zinc-300 group-hover:text-fg"} />
                                       </button>
                                     )}
                                   </td>
                                 )
                               })}
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                 <Loader2 className="w-8 h-8 text-fg-subtle animate-spin" />
              </div>
            )}
         </div>
      </section>

      {/* Modal de Reserva de Horário */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-xl shadow-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 text-fg rounded-xl flex items-center justify-center"><Clock size={20}/></div>
                    <div>
                        <h3 className="text-lg font-bold text-fg tracking-tight">Nova Reserva</h3>
                        <p className="text-xs font-medium text-fg-subtle uppercase tracking-widest">
                          {selectedSlots.length > 0 
                            ? `${selectedSlots.length} Horário(s) Selecionado(s)` 
                            : `${activeSlot?.horario}º Horário / ${turnos.find(t => t.id === activeSlot?.turno)?.nome}`
                          }
                        </p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-fg-subtle"><X size={20}/></button>
              </div>

              <div className="p-8 space-y-6">
                 {message && (
                   <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in duration-300 ${
                     message.type === 'success' ? 'bg-success-subtle border border-success-line text-success-fg' : 'bg-danger-subtle border border-danger-line text-danger-fg'
                   }`}>
                     {message.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                     <span className="text-xs font-medium leading-tight">{message.text}</span>
                   </div>
                 )}

                 <div className="space-y-4">
                    {/* Seletor de Turma */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em] ml-1">Turma</label>
                       <select 
                         value={selectedTurmaId}
                         onChange={(e) => {
                           setSelectedTurmaId(e.target.value)
                           setSelectedDisciplinaId("")
                         }}
                         className="w-full bg-zinc-50 border-none rounded-lg px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all outline-none shadow-sm"
                       >
                         <option value="">Selecione a Turma</option>
                         {myTurmas.map(t => (
                           <option key={t.id} value={t.id}>{t.nome}</option>
                         ))}
                       </select>
                    </div>

                    {/* Seletor de Disciplina */}
                    {selectedTurmaId && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em] ml-1">Disciplina</label>
                        <select 
                          value={selectedDisciplinaId}
                          onChange={(e) => setSelectedDisciplinaId(e.target.value)}
                          className="w-full bg-zinc-50 border-none rounded-lg px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all outline-none shadow-sm"
                        >
                          <option value="">Selecione a Disciplina</option>
                          {selectedTurma?.disciplinas.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Campo de Texto (Motivo) - APENAS ADMIN */}
                    {isAdmin && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em] ml-1">Motivo / Atividade (Manual)</label>
                        <input 
                          type="text" 
                          value={formDisciplina}
                          onChange={(e) => setFormDisciplina(e.target.value)}
                          placeholder="Opcional: Descreva a atividade"
                          className="w-full bg-zinc-50 border-none rounded-lg px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all outline-none shadow-sm"
                        />
                      </div>
                    )}
                    
                    {!isAdmin && (
                      <div className="bg-accent-subtle rounded-lg p-4 flex items-start gap-4 border border-accent/25">
                        <Info size={18} className="text-accent-fg mt-1 shrink-0" />
                        <p className="text-xs text-accent-fg leading-relaxed font-medium">
                          Lembre-se: Você pode fazer até <strong className="text-accent-fg">3 reservas em dias diferentes por semana</strong>.
                        </p>
                      </div>
                    )}
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => {
                        setMessage(null)
                        setShowModal(false)
                        setSelectedTurmaId("")
                        setSelectedDisciplinaId("")
                        setFormDisciplina("")
                      }} 
                      className="flex-1 py-4 text-sm font-bold text-fg-subtle hover:bg-zinc-50 rounded-lg transition-all"
                    >
                      CANCELAR
                    </button>
                    <button 
                      onClick={handleReserve}
                      disabled={submitting || (!isAdmin && (!selectedTurmaId || !selectedDisciplinaId))}
                      className="flex-1 py-4 bg-zinc-900 text-white text-sm font-bold rounded-lg shadow-card hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={18} />}
                       CONFIRMAR
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Cadastro de Laboratório (Admin) */}
      {showLabModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-xl shadow-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-card"><Monitor size={20}/></div>
                    <div>
                        <h3 className="text-lg font-bold text-fg tracking-tight">{editingLabId ? 'Editar Laboratório' : 'Novo Laboratório'}</h3>
                        <p className="text-[10px] font-medium text-fg-subtle uppercase tracking-widest">Acesso Administrativo</p>
                    </div>
                 </div>
                 <button onClick={() => { setShowLabModal(false); setEditingLabId(null); }} className="p-2 hover:bg-zinc-200 rounded-xl transition-all text-fg-subtle"><X size={20}/></button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em] ml-1">Nome do Espaço</label>
                       <input 
                         type="text" 
                         value={formLab.nome}
                         onChange={(e) => setFormLab(prev => ({ ...prev, nome: e.target.value }))}
                         placeholder="Ex: Laboratório de Redes"
                         className="w-full bg-zinc-50 border-none rounded-lg px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all outline-none shadow-sm"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em] ml-1">Descrição (Opcional)</label>
                       <textarea 
                         value={formLab.descricao}
                         onChange={(e) => setFormLab(prev => ({ ...prev, descricao: e.target.value }))}
                         placeholder="Informações sobre equipamentos, capacidade, etc."
                         className="w-full bg-zinc-50 border-none rounded-lg px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all outline-none shadow-sm min-h-[100px]"
                       />
                    </div>
                 </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => { setShowLabModal(false); setEditingLabId(null); }} 
                      className="flex-1 py-4 text-sm font-bold text-fg-subtle hover:bg-zinc-50 rounded-lg transition-all"
                    >
                      CANCELAR
                    </button>
                    <button 
                      onClick={handleSaveLab}
                      disabled={submitting || !formLab.nome}
                      className="flex-1 py-4 bg-zinc-900 text-white text-sm font-bold rounded-lg shadow-card hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={18} />}
                       {editingLabId ? 'ATUALIZAR' : 'CADASTRAR'}
                    </button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
