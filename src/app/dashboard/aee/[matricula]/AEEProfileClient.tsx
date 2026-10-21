"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Accessibility, ArrowLeft, Save, Loader2, Info, 
  CheckCircle2, Clock, Phone, AlertCircle, Trash2, 
  ChevronDown, Search, X, ClipboardCheck, GraduationCap, Users, Upload
} from "lucide-react"
import { CIDS_AEE } from "@/lib/constants-aee"
import { can } from "@/lib/rbac"

export default function AEEProfileClient({ 
  usuario, 
  estudante, 
  perfilExistente,
  jaAtestado 
}: { 
  usuario: any, 
  estudante: any, 
  perfilExistente: any,
  jaAtestado: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isDirecao = can(usuario, 'aee.ficha.editar')
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    cids: perfilExistente?.cids || [],
    condicao: perfilExistente?.condicao || "",
    recomendacoes: perfilExistente?.recomendacoes || "",
    notasDirecao: perfilExistente?.notasDirecao || "",
    contatoNome: perfilExistente?.contatoNome || "",
    contatoTelefone: perfilExistente?.contatoTelefone || "",
    precisaProvaAdaptada: perfilExistente?.precisaProvaAdaptada || false,
    precisaProvaSalaEspecial: perfilExistente?.precisaProvaSalaEspecial || false,
    fotoUrl: perfilExistente?.fotoUrl || ""
  })

  const [atestado, setAtestado] = useState(jaAtestado)
  const [cidSearch, setCidSearch] = useState("")

  const handleSave = async () => {
    if (!isDirecao) return
    setLoading(true)
    try {
      const res = await fetch(`/api/estudantes/${estudante.matricula}/aee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        router.refresh()
        alert('Ficha AEE salva com sucesso!')
      }
    } catch {
      alert('Erro ao salvar ficha')
    } finally {
      setLoading(false)
    }
  }

  const handleAtestar = async () => {
    if (isDirecao || atestado) return
    setLoading(true)
    try {
      const res = await fetch(`/api/estudantes/${estudante.matricula}/aee/atestar`, {
        method: 'POST'
      })
      if (res.ok) {
        setAtestado(true)
        router.refresh()
      }
    } catch {
      alert('Erro ao processar aceite')
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d)(\d{4})$/, "$1-$2")
    }
    return numbers.slice(0, 11)
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d)(\d{4})$/, "$1-$2")
  }

  const toggleCID = (code: string) => {
    setFormData(prev => ({
      ...prev,
      cids: prev.cids.includes(code)
        ? prev.cids.filter((c: string) => c !== code)
        : [...prev.cids, code]
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, fotoUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const filteredCIDs = CIDS_AEE.filter((c: any) => 
    c.code.toLowerCase().includes(cidSearch.toLowerCase()) || 
    c.label.toLowerCase().includes(cidSearch.toLowerCase())
  )

  return (
    <div className="pb-24">
      {/* Header Premium */}
      <div className="mb-6 border-b border-line pb-4">
        <div className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-subtle rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-fg-muted" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-subtle border border-line rounded-lg flex items-center justify-center text-fg shadow-card">
                <Accessibility className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-fg tracking-tight">Ficha de Atendimento Especial (AEE)</h1>
                <p className="text-xs font-bold text-fg-subtle">{estudante.nome} · Turma {estudante.turma.nome}</p>
              </div>
            </div>
          </div>
          {isDirecao && (
            <button
              onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 bg-accent text-on-accent px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-accent-hover shadow-card transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          )}
        </div>
      </div>

      <main className="mt-8 space-y-6">
        
        {/* Banner de Status para o Professor */}
        {!isDirecao && (
           <div className={`p-6 rounded-xl border-2 flex items-center gap-5 transition-all ${
             atestado ? 'bg-success-subtle border-success-line' : 'bg-warning-subtle border-warning-line animate-pulse'
           }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center shadow-sm ${
                atestado ? 'bg-success text-white' : 'bg-warning text-white'
              }`}>
                {atestado ? <CheckCircle2 className="w-8 h-8" /> : <Info className="w-8 h-8" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${atestado ? 'text-success-fg' : 'text-warning-fg'}`}>
                  {atestado ? 'Leitura Confirmada' : 'Ação Necessária: Confirmar Leitura'}
                </h3>
                <p className={`text-sm font-normal ${atestado ? 'text-success-fg' : 'text-warning-fg'}`}>
                  {atestado 
                    ? `Você atestou a leitura desta ficha em ${new Date(perfilExistente.acknowledgements.find((ack: any) => ack.user.id === usuario.id)?.readAt || new Date()).toLocaleDateString('pt-BR')}.` 
                    : 'Como professor deste estudante, você precisa ler as instruções abaixo e confirmar sua ciência no rodapé da página.'}
                </p>
              </div>
              {!atestado && (
                <button 
                  onClick={handleAtestar}
                  className="bg-warning text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-warning shadow-card transition-all"
                >
                  Confirmar Agora
                </button>
              )}
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Diagnóstico e Contatos */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card de Identificação Estilo Perfil */}
            <div className="bg-surface rounded-xl shadow-card border border-line relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-24 bg-subtle border-b border-line" />
               
               <div className="relative flex flex-col items-center mt-8 px-6 pb-8">
                  <div className="w-24 h-24 bg-surface p-1.5 rounded-xl shadow-card relative">
                    {formData.fotoUrl ? (
                      <div className="w-full h-full rounded-lg overflow-hidden">
                        <img src={formData.fotoUrl} alt={estudante.nome} className="w-full h-full object-cover" />
                        {isDirecao && (
                          <button 
                            onClick={() => setFormData({...formData, fotoUrl: ""})}
                            className="absolute -top-2 -right-2 p-1.5 bg-surface shadow-overlay text-danger-fg rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-lg bg-subtle flex items-center justify-center">
                        <Users className="w-10 h-10 text-fg-disabled" />
                      </div>
                    )}
                    
                    {isDirecao && !formData.fotoUrl && (
                      <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/5 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                         <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                         <Upload className="w-6 h-6 text-white" />
                      </label>
                    )}
                  </div>
                  
                  <h3 className="mt-4 text-xl font-medium text-fg text-center leading-tight">
                    {estudante.nome}
                  </h3>
                  <p className="text-xs font-semibold text-fg-subtle mt-1">
                    Matrícula {estudante.matricula}
                  </p>
                  
                  <div className="mt-4 inline-flex items-center px-4 py-1.5 rounded-full bg-canvas border border-line-subtle text-fg-muted text-xs font-semibold">
                    {estudante.turma.nome}
                  </div>

                  {isDirecao && formData.fotoUrl && (
                    <label className="mt-6 cursor-pointer text-xs font-semibold text-fg-subtle hover:text-fg transition-colors flex items-center gap-2">
                       <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                       <Upload className="w-3.5 h-3.5" /> Alterar Foto
                    </label>
                  )}
               </div>
            </div>

            {/* Necessidades Específicas (TAGS) */}
            <div className="bg-surface p-6 rounded-xl border border-line shadow-sm space-y-4">
                <h5 className="text-xs font-semibold text-fg-subtle">Necessidades de Prova</h5>
                {isDirecao ? (
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, precisaProvaAdaptada: !formData.precisaProvaAdaptada})}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        formData.precisaProvaAdaptada 
                        ? 'bg-accent-subtle border-accent text-accent-fg shadow-card' 
                        : 'bg-surface border-line-subtle text-fg-muted grayscale opacity-60'
                      }`}
                    >
                        <ClipboardCheck className={`w-5 h-5 ${formData.precisaProvaAdaptada ? 'text-white' : 'text-fg-disabled'}`} />
                        <span className="text-xs font-semibold">Prova Adaptada</span>
                    </button>

                    <button 
                      onClick={() => setFormData({...formData, precisaProvaSalaEspecial: !formData.precisaProvaSalaEspecial})}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        formData.precisaProvaSalaEspecial 
                        ? 'bg-accent-subtle border-accent text-accent-fg shadow-card' 
                        : 'bg-surface border-line-subtle text-fg-muted grayscale opacity-60'
                      }`}
                    >
                        <Users className={`w-5 h-5 ${formData.precisaProvaSalaEspecial ? 'text-white' : 'text-fg-disabled'}`} />
                        <span className="text-xs font-semibold">Sala Especial</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.precisaProvaAdaptada && (
                      <span className="bg-subtle text-fg-muted border border-line px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <ClipboardCheck className="w-3 h-3" /> Prova Adaptada
                      </span>
                    )}
                    {formData.precisaProvaSalaEspecial && (
                      <span className="bg-subtle text-fg-muted border border-line px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <Users className="w-3 h-3" /> Sala Especial
                      </span>
                    )}
                    {!formData.precisaProvaAdaptada && !formData.precisaProvaSalaEspecial && (
                      <p className="text-xs text-fg-subtle font-medium italic">Nenhuma necessidade especial de prova.</p>
                    )}
                  </div>
                )}
            </div>

            {/* CID Selection (Direção) ou Visualização (Professor) */}
            <div className="bg-surface p-6 rounded-xl border border-line shadow-sm">
              <h2 className="text-xs font-semibold text-fg-subtle mb-4 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Diagnóstico (CIDs)
              </h2>
              
              {isDirecao ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" placeholder="Filtrar CIDs..." value={cidSearch}
                      onChange={(e) => setCidSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-canvas border border-line rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-zinc-900/5 focus:bg-surface transition-all"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredCIDs.map(c => (
                      <button 
                        key={c.code} onClick={() => toggleCID(c.code)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          formData.cids.includes(c.code) 
                          ? 'bg-accent border-accent' 
                          : 'bg-surface border-line-subtle hover:border-line'
                        }`}
                      >
                         <div className={`w-10 h-10 shrink-0 bg-subtle rounded-lg flex items-center justify-center font-semibold text-xs text-fg-subtle ${formData.cids.includes(c.code) ? 'bg-surface/10 text-white' : ''}`}>
                            {c.code}
                         </div>
                         <div className="min-w-0">
                           <p className={`text-xs font-bold leading-tight ${formData.cids.includes(c.code) ? 'text-white' : 'text-fg-muted'}`}>{c.label}</p>
                         </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {formData.cids.length > 0 ? formData.cids.map((code: string) => {
                    const found = CIDS_AEE.find((c: any) => c.code === code)
                    return (
                      <div key={code} className="bg-canvas border border-line p-3 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-subtle border border-line text-fg rounded-lg flex items-center justify-center font-semibold text-xs">
                           {code}
                        </div>
                        <p className="text-xs font-bold text-fg-muted leading-tight">{found?.label || 'CID Específico'}</p>
                      </div>
                    )
                  }) : <p className="text-xs font-medium text-fg-subtle italic">Nenhum CID informado.</p>}
                </div>
              )}
            </div>

            {/* Contato de Emergência */}
            <div className="bg-surface border border-line text-fg p-5 rounded-2xl space-y-4">
              <h2 className="text-xs font-semibold text-fg-subtle flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Contato de Emergência
              </h2>
              {isDirecao ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-fg-muted">Nome do Contato</label>
                    <input 
                      type="text" value={formData.contatoNome}
                      onChange={(e) => setFormData({...formData, contatoNome: e.target.value})}
                      placeholder="Ex: Maria (Mãe)"
                      className="w-full h-9 bg-surface border border-line rounded-lg px-3 text-sm text-fg transition-colors duration-150 hover:border-line-strong focus:border-accent placeholder:text-fg-subtle"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-fg-muted">Telefone</label>
                    <input 
                      type="text" value={formData.contatoTelefone}
                      onChange={(e) => setFormData({...formData, contatoTelefone: formatPhone(e.target.value)})}
                      placeholder="(00) 0 0000-0000"
                      className="w-full h-9 bg-surface border border-line rounded-lg px-3 text-sm text-fg transition-colors duration-150 hover:border-line-strong focus:border-accent placeholder:text-fg-subtle font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium tracking-tight mb-1">{formData.contatoNome || 'Nome não informado'}</p>
                  <p className="text-lg font-semibold tracking-widest text-success">{formData.contatoTelefone || 'Telefone não informado'}</p>
                </div>
              )}
            </div>

            </div>
          {/* Lado Direito: Recomendações e Condição */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-surface p-10 rounded-xl border border-line shadow-sm space-y-10">
              
              {/* Condição do Estudante */}
              <section>
                <h3 className="text-xs font-semibold text-fg-subtle mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-warning-fg" />
                  Contexto / Condição do Estudante
                </h3>
                {isDirecao ? (
                  <textarea 
                    rows={5} value={formData.condicao}
                    onChange={(e) => setFormData({...formData, condicao: e.target.value})}
                    placeholder="Descreva a condição pedagógica e médica do estudante..."
                    className="w-full bg-canvas border border-line rounded-xl px-8 py-6 text-base font-medium focus:ring-4 focus:ring-zinc-900/5 outline-none transition-all shadow-card"
                  />
                ) : (
                  <div className="bg-canvas p-6 rounded-xl border border-line-subtle">
                    <p className="text-fg-muted font-medium leading-relaxed whitespace-pre-wrap">{formData.condicao || 'Sem descrição.'}</p>
                  </div>
                )}
              </section>

              {/* Recomendações Pedagógicas */}
              <section className="bg-success-subtle p-8 rounded-xl border border-success-line">
                <h3 className="text-xs font-semibold text-success-fg mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Instruções para o Professor
                </h3>
                {isDirecao ? (
                  <textarea 
                    rows={8} value={formData.recomendacoes}
                    onChange={(e) => setFormData({...formData, recomendacoes: e.target.value})}
                    placeholder="Instruções sobre avaliações, tempo adicional, fonte ampliada, apoio em sala..."
                    className="w-full bg-surface border border-success-line rounded-xl px-8 py-6 text-base font-medium focus:ring-4 focus:ring-success/30 outline-none transition-all shadow-sm"
                  />
                ) : (
                  <div className="p-2">
                    <p className="text-success-fg font-medium text-lg leading-relaxed whitespace-pre-wrap">{formData.recomendacoes || 'Sem recomendações cadastradas.'}</p>
                  </div>
                )}
              </section>

              {/* Notas da Direção/Coordenação */}
              <section>
                <h3 className="text-xs font-semibold text-fg-subtle mb-4 flex items-center gap-2">
                   <GraduationCap className="w-5 h-5 text-accent-fg" />
                   Observações Internas
                </h3>
                {isDirecao ? (
                  <textarea 
                    rows={3} value={formData.notasDirecao}
                    onChange={(e) => setFormData({...formData, notasDirecao: e.target.value})}
                    placeholder="Informações administrativas adicionais..."
                    className="w-full bg-canvas border border-line rounded-xl px-8 py-6 text-base font-medium focus:ring-4 focus:ring-zinc-900/5 outline-none transition-all"
                  />
                ) : (
                  <p className="text-fg-subtle text-base font-medium italic">{formData.notasDirecao || '--'}</p>
                )}
              </section>
            </div>

            {/* Histórico de Ates de Leitura (Só Direção Vê) */}
            {isDirecao && perfilExistente?.acknowledgements?.length > 0 && (
              <div className="bg-surface p-8 rounded-xl border border-line shadow-sm">
                <h3 className="text-xs font-semibold text-fg-subtle mb-6 flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-success-fg" /> Confirmaram Leitura
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {perfilExistente.acknowledgements.map((ack: any) => (
                    <div key={ack.id} className="flex items-center gap-4 p-4 bg-canvas rounded-lg border border-line-subtle">
                      <div className="w-10 h-10 rounded-full bg-success-subtle text-success-fg flex items-center justify-center font-bold text-sm">
                        {ack.user.name?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-fg truncate">{ack.user.name}</p>
                        <p className="text-xs text-fg-subtle font-semibold">Lido em {new Date(ack.readAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
