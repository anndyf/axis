"use client"

import { useState, useMemo, useRef } from "react"
import { X, Save, AlertCircle, AlertTriangle, Info, Image as ImageIcon, Calculator, Plus, CheckCircle2, BookOpen, Users } from "lucide-react"
import dynamic from "next/dynamic"
import 'react-quill-new/dist/quill.snow.css'
import SimbolosPanel from "@/components/SimbolosPanel"

// Importação dinâmica do React Quill para evitar erros de SSR
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => <div className="h-40 w-full bg-canvas animate-pulse rounded-lg border border-line-subtle" />
}) as any

export default function QuestaoForm({ questao, onClose, onSuccess, turmas, disciplinas }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    enunciado: questao?.enunciado || '',
    alternativaA: questao?.alternativaA || '',
    alternativaB: questao?.alternativaB || '',
    alternativaC: questao?.alternativaC || '',
    alternativaD: questao?.alternativaD || '',
    alternativaE: questao?.alternativaE || '',
    correta: questao?.correta || 'A',
    dificuldade: questao?.dificuldade || 'MEDIO',
    muleta: questao?.muleta || '',
    unidade: questao?.unidade || '2',
    tipo: questao?.tipo || 'NORMAL',
    imagemUrl: questao?.imagemUrl || '',
    disciplinasIds: questao?.disciplinas?.map((d: any) => d.id) || [],
    turmasIds: questao?.turmas?.map((t: any) => t.id) || []
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const quillRef = useRef<any>(null)
  const [alternativaFocada, setAlternativaFocada] = useState<string | null>(null)
  const alternativaRefs = useRef<Record<string, any>>({})
  
  const [currentStep, setCurrentStep] = useState(1)
  
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Validação de campos obrigatórios
    if (!formData.enunciado || formData.enunciado === '<p><br></p>' || formData.enunciado.trim() === '') {
      setError('O enunciado da questão é obrigatório.')
      return
    }

    const plainEnunciado = formData.enunciado.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    if (/^\d+/.test(plainEnunciado)) {
      setError('O enunciado não pode começar com um número (ex: "1.", "5)"). Por favor, remova a numeração da questão, pois o sistema a numerará automaticamente na prova.');
      return;
    }

    if (!formData.alternativaA || !formData.alternativaB || !formData.alternativaC || !formData.alternativaD || !formData.alternativaE) {
      setError('Todas as alternativas (A, B, C, D e E) são obrigatórias.')
      return
    }

    if (!formData.unidade) {
      setError('A seleção da unidade é obrigatória.')
      return
    }

    if (formData.disciplinasIds.length === 0) {
      setError('Selecione pelo menos uma disciplina associada.')
      return
    }

    if (!showConfirm && !questao?.isCopy && questao) {
      setShowConfirm(true)
      return
    }

    // Validação de Duplicata (Apenas se não for edição)
    const isEditing = questao && !questao.isCopy;
    if (!isEditing && !duplicateConfirmed) {
      setLoading(true)
      try {
        const checkRes = await fetch('/api/questoes/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             enunciado: formData.enunciado,
             alternativas: [
               formData.alternativaA,
               formData.alternativaB,
               formData.alternativaC,
               formData.alternativaD,
               formData.alternativaE
             ]
          })
        })
        const checkData = await checkRes.json()
        if (checkData.isDuplicate) {
          setDuplicateWarning('Atenção: Identificamos que você já enviou uma questão idêntica a essa recentemente.')
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('Erro ao verificar duplicata', err)
      }
    }

    setLoading(true)
    setError('')
    setDuplicateWarning(null)
    setShowConfirm(false)

    try {
      const isCopy = questao?.isCopy
      const url = (questao && !isCopy) ? `/api/questoes/${questao.id}` : '/api/questoes'
      const method = (questao && !isCopy) ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        setError(data.message || 'Erro ao salvar questão')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string, field: 'disciplinasIds' | 'turmasIds') => {
    const current = [...formData[field]]
    const index = current.indexOf(id)
    
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(id)
    }

    const newData: any = { ...formData, [field]: current }

    // Inteligência: Ao selecionar um vínculo (disciplina), garante que a turma está vinculada
    if (field === 'disciplinasIds') {
      const selectedTurmasIds = disciplinas
        .filter((d: any) => newData.disciplinasIds.includes(d.id))
        .map((d: any) => d.turmaId)
      
      // We don't want to remove previously selected turmas, just ensure we don't drop them if they still have disciplines selected
      // Actually, since Turmas are selected first now, we don't necessarily need this reverse link as much, but we keep it safe.
    } else if (field === 'turmasIds') {
      // If a turma is unselected, we should probably unselect its disciplines
      if (!current.includes(id)) {
         newData.disciplinasIds = newData.disciplinasIds.filter((dId: string) => {
            const disc = disciplinas.find((d: any) => d.id === dId);
            return disc ? current.includes(disc.turmaId) : false;
         });
      }
    }

    setFormData(newData)
  }

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  }

  const quillFormats = [
    'bold', 'italic', 'underline', 'strike',
    'script', 'color', 'background',
    'list', 'bullet', 'align'
  ]

  const miniQuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      ['clean']
    ],
  }

  const miniQuillFormats = [
    'bold', 'italic', 'underline', 'script'
  ]

  const selectAllSameName = (nome: string, serie?: string) => {
    const sameNamed = disciplinas.filter((d: any) => 
      d.nome === nome && (!serie || d.serie === serie)
    )
    const newDiscIds = [...new Set([...formData.disciplinasIds, ...sameNamed.map((d: any) => d.id)])]
    const newTurmaIds = [...new Set([...formData.turmasIds, ...sameNamed.map((d: any) => d.turmaId)])]
    
    setFormData({
      ...formData,
      disciplinasIds: newDiscIds,
      turmasIds: newTurmaIds
    })
  }

  const distribuirAlternativas = (texto: string, startLetter: string = 'A') => {
    let parts: string[] = []
    
    // 1. Tentar dividir por padrões de letras (a) b) c) d) e) ou A. B. C. D. E.)
    const labelRegex = /(?:^|\s+)([a-eA-E][\).:-]\s+)/g
    const matches = Array.from(texto.matchAll(labelRegex))
    
    if (matches.length >= 2) {
      matches.forEach((match, i) => {
        const nextMatch = matches[i + 1]
        const start = match.index! + match[0].length
        const end = nextMatch ? nextMatch.index! : texto.length
        const content = texto.substring(start, end).trim()
        if (content) parts.push(content)
      })
    } else {
      // 2. Tentar dividir por números (1. 2. 3. 4. 5.)
      const numRegex = /(?:^|\s+)([1-5][\).:-]\s+)/g
      const numMatches = Array.from(texto.matchAll(numRegex))
      
      if (numMatches.length >= 2) {
        numMatches.forEach((match, i) => {
          const nextMatch = numMatches[i + 1]
          const start = match.index! + match[0].length
          const end = nextMatch ? nextMatch.index! : texto.length
          const content = texto.substring(start, end).trim()
          if (content) parts.push(content)
        })
      } else {
        // 3. Fallback: tentar dividir por quebra de linha
        const lines = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '')
        if (lines.length >= 2) {
          parts = lines
        } else {
          // Último caso: tenta quebrar por delimitadores de alternativas mesmo sem espaço perfeito
          const simpleSplit = texto.split(/\s+[a-eA-E][\).:-]\s*/).filter(p => p.trim() !== '')
          if (simpleSplit.length >= 2) {
            parts = simpleSplit
          } else {
            parts = [texto]
          }
        }
      }
    }

    if (parts.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E']
      const startIndex = letters.indexOf(startLetter)
      
      setFormData(prev => {
        const newData = { ...prev }
        parts.forEach((part, index) => {
          const targetIndex = startIndex + index
          if (targetIndex < letters.length) {
            const cleaned = part.replace(/^([a-eA-E0-9][\).:-]\s*|[a-eA-E0-9]\s+[\-\u2013\u2014]\s*|[\-\*\u2022]\s*)/, '').trim()
            const field = `alternativa${letters[targetIndex]}`
            // @ts-ignore
            newData[field] = cleaned
          }
        })
        return newData
      })
      setShowPasteModal(false)
      setPasteText('')
    }
  }

  const handlePasteAlternativas = (e: React.ClipboardEvent, startLetter: string) => {
    const pasteData = e.clipboardData.getData('text')
    
    const hasLabels = /(?:^|\s+)([b-eB-E1-5][\).:-]\s+)/.test(pasteData)
    const hasMultipleLines = pasteData.split(/\r?\n/).filter(l => l.trim().length > 0).length >= 2
    
    // Se tiver mais de 10 caracteres e parecer ter múltiplas partes, intercepta
    if (pasteData.length > 10 && (hasLabels || hasMultipleLines)) {
      e.preventDefault()
      e.stopPropagation()
      
      // Usa timeout para garantir que o Quill não sobrescreva o estado com seu próprio evento de paste/onChange
      setTimeout(() => {
        distribuirAlternativas(pasteData, startLetter)
      }, 50)
    }
  }

  const disciplinasPorTurmaSelecionada = useMemo(() => {
    return disciplinas.filter((d: any) => formData.turmasIds.includes(d.turmaId));
  }, [disciplinas, formData.turmasIds])
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida.')
      return
    }

    // Size validation (e.g. max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem original é muito grande. Máximo 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Max width/height 800px
        const MAX_SIZE = 800
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        // Compress to JPEG 60% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        
        setFormData({ ...formData, imagemUrl: dataUrl })
      }
      img.src = readerEvent.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-xl shadow-overlay flex flex-col overflow-hidden animate-pop-in">
        <div className="p-6 border-b border-line-subtle flex items-center justify-between bg-canvas/50">
          <div>
            <h2 className="text-xl font-bold text-fg">
              {questao?.isCopy ? 'Criar Variação' : (questao ? 'Editar Questão' : 'Nova Questão')}
            </h2>
            <p className="text-sm text-fg-subtle">
              {questao?.isCopy ? 'Altere o que desejar para criar uma nova versão desta questão.' : 'Preencha os dados da questão para curadoria da coordenação.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
            <X size={24} className="text-fg-subtle" />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-center sm:justify-start gap-2 px-6 sm:px-8 py-4 bg-canvas/80 border-b border-line-subtle overflow-x-auto no-scrollbar">
          {[1, 2, 3].map(step => (
            <div key={step} className={`flex items-center gap-2 ${currentStep === step ? 'text-accent-fg' : 'text-fg-subtle'}`}>
               <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === step ? 'bg-accent text-on-accent shadow-card' : (currentStep > step ? 'bg-success text-on-accent' : 'bg-subtle-hover text-fg-subtle')}`}>
                 {currentStep > step ? <CheckCircle2 size={14} /> : step}
               </div>
               <span className={`text-xs font-bold whitespace-nowrap transition-all ${currentStep === step ? 'text-accent-fg' : 'hidden sm:block'}`}>
                 {step === 1 ? 'Configurações' : step === 2 ? 'Enunciado' : 'Alternativas'}
               </span>
               {step < 3 && <div className={`w-4 sm:w-8 h-[2px] mx-1 sm:mx-2 rounded-full transition-all ${currentStep > step ? 'bg-success' : 'bg-subtle-hover'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          {error && (
            <div className="p-4 bg-danger-subtle border border-danger-line rounded-lg flex items-center gap-3 text-danger-fg text-sm font-medium">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-warning-subtle border border-warning-line text-warning-fg px-4 py-4 rounded-xl flex flex-col gap-3 animate-fade-in zoom-in duration-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning-fg" />
                <p className="text-sm font-medium">{duplicateWarning}</p>
              </div>
              <div className="flex items-center gap-3 ml-8">
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateConfirmed(true)
                    handleSubmit()
                  }}
                  className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-bold hover:bg-warning transition-colors"
                >
                  Estou ciente, enviar mesmo assim
                </button>
                <button
                  type="button"
                  onClick={() => {
                     setDuplicateWarning(null)
                     setDuplicateConfirmed(false)
                  }}
                  className="px-4 py-2 bg-surface text-warning-fg border border-warning-line rounded-lg text-sm font-bold hover:bg-warning-subtle transition-colors"
                >
                  Cancelar e Revisar
                </button>
              </div>
            </div>
          )}

          {/* Enunciado Rich Text */}
          {currentStep === 2 && (
          <div className="space-y-8 animate-slide-up">
          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-fg-muted">Enunciado da Questão</label>
              <span className="text-xs font-bold text-fg-subtle">Suporte a negrito, itálico e listas</span>
            </div>
            <div className="rich-text-editor">
              <ReactQuill 
                ref={quillRef}
                theme="snow"
                value={formData.enunciado}
                onChange={(content: string) => setFormData(prev => ({...prev, enunciado: content}))}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Descreva o problema ou contexto da questão..."
                className="bg-surface rounded-2xl overflow-hidden border border-line focus-within:ring-2 focus-within:ring-ring transition-all font-sans"
              />
            </div>
            <style jsx global>{`
              .rich-text-editor .ql-toolbar.ql-snow {
                border: none;
                border-bottom: 1px solid #f1f5f9;
                background: #f8fafc;
                padding: 12px;
              }
              .rich-text-editor .ql-container.ql-snow {
                border: none;
                min-height: 180px;
                font-family: inherit;
                font-size: 14px;
              }
              .rich-text-editor .ql-editor {
                min-height: 180px;
                line-height: 1.6;
              }
              .rich-text-editor .ql-editor.ql-blank::before {
                color: #cbd5e1;
                font-style: normal;
              }
            `}</style>

            {/* Painel de símbolos para o enunciado */}
            <SimbolosPanel
              onInsertQuill={(s) => {
                const editor = quillRef.current?.getEditor?.()
                if (editor) {
                  const range = editor.getSelection(true)
                  editor.insertText(range?.index ?? editor.getLength(), s)
                  editor.setSelection((range?.index ?? editor.getLength()) + s.length)
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Opções Extra */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-fg-muted flex items-center gap-2">
                  <Calculator size={16} className="text-fg-muted" />
                  Fórmula ou Texto Muleta (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.muleta}
                  onChange={(e) => setFormData({...formData, muleta: e.target.value})}
                  placeholder="Ex: x = (-b ± √∆) / 2a"
                  className="w-full bg-canvas border-line-subtle rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-fg-muted flex items-center gap-2">
                  <ImageIcon size={16} className="text-accent-fg" />
                  Imagem da Questão (Opcional)
                </label>
                
                {formData.imagemUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-line">
                    <img src={formData.imagemUrl} alt="Preview" className="w-full h-32 object-cover bg-canvas" />
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, imagemUrl: ''})}
                      className="absolute top-2 right-2 bg-danger text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-overlay"
                      title="Remover imagem"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                      Imagem otimizada
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-line rounded-xl cursor-pointer hover:border-accent hover:bg-accent-subtle transition-all group"
                    >
                      <div className="p-3 bg-canvas rounded-full group-hover:bg-surface text-fg-subtle group-hover:text-accent-fg transition-all mb-2 shadow-sm">
                        <ImageIcon size={20} />
                      </div>
                      <p className="text-xs font-bold text-fg-subtle group-hover:text-fg-muted text-center">
                        Clique para enviar imagem
                      </p>
                      <p className="text-xs text-fg-subtle mt-1">
                        Será otimizada automaticamente
                      </p>
                    </label>
                    <div className="text-center mt-2">
                      <span className="text-xs text-fg-subtle bg-canvas px-2 py-1 rounded border border-line-subtle">
                        Ou cole a URL abaixo
                      </span>
                    </div>
                    <input
                      type="url"
                      value={formData.imagemUrl}
                      onChange={(e) => setFormData({...formData, imagemUrl: e.target.value})}
                      placeholder="https://..."
                      className="mt-2 w-full bg-canvas border-line-subtle rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          )}

          {/* Unidade */}
          {currentStep === 1 && (
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-fg flex items-center gap-2">
                  <Info size={16} className="text-fg-muted" />
                  Alocação da Unidade
                </label>
                <select
                  required
                  value={formData.unidade || '2'}
                  onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                  className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring font-bold text-fg-muted"
                >
                  <option value="">Selecione a Unidade Alvo...</option>
                  <option value="1">1ª Unidade</option>
                  <option value="2">2ª Unidade</option>
                </select>
                <p className="text-xs text-fg-subtle mt-1 pl-1">Isso ajudará a gerar provas automaticamente filtrando pelas questões dessa unidade.</p>
              </div>

              {/* Tipo de Questão */}
              <div className="flex-1 min-w-[200px]">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-fg mb-2">
                  <Info size={16} className="text-fg-muted" />
                  Tipo de Questão
                </label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring font-bold text-fg-muted"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="RECUPERACAO">Segunda Chamada</option>
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Alternativas */}
          {currentStep === 3 && (
          <div className="space-y-8 animate-slide-up">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 ml-1">
              <h3 className="text-sm font-bold text-fg-muted">Alternativas de Resposta</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-accent-subtle text-accent-fg rounded-full border border-accent/25 hover:bg-accent-subtle transition-all font-bold text-xs hover:scale-105 active:scale-95"
                >
                  <Plus size={12} />
                  Colar Bloco
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-success-subtle text-success-fg rounded-full border border-success-line animate-slide-up shadow-sm">
                  <CheckCircle2 size={14} className="text-success-fg" />
                  <span className="text-xs font-semibold">Clique na letra da questão correta</span>
                </div>
              </div>
            </div>

            {/* Painel de símbolos para as alternativas */}
            <SimbolosPanel
              onInsert={(s) => {
                if (!alternativaFocada) return
                const editor = alternativaRefs.current[alternativaFocada]?.getEditor?.()
                if (editor) {
                  const range = editor.getSelection(true)
                  editor.insertText(range?.index ?? editor.getLength(), s)
                  editor.setSelection((range?.index ?? editor.getLength()) + s.length)
                }
              }}
            />

            <div className="grid gap-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="flex gap-4 items-start">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, correta: letter})}
                    className={`mt-2 shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold transition-all ${
                      formData.correta === letter
                      ? 'bg-success-subtle border-success-line text-success-fg'
                      : 'bg-canvas border-line-subtle text-fg-subtle hover:border-accent/25'
                    }`}
                  >
                    {letter}
                  </button>
                  <div 
                    className={`flex-1 rich-text-editor-mini rounded-xl overflow-hidden transition-all border-2 ${
                      alternativaFocada === letter ? 'border-accent/25 bg-accent-subtle ring-2 ring-ring' : 'border-line-subtle bg-canvas'
                    }`}
                    onPasteCapture={(e: any) => handlePasteAlternativas(e, letter)}
                  >
                    <ReactQuill 
                      ref={(el: any) => { alternativaRefs.current[letter] = el }}
                      theme="snow"
                      value={formData[`alternativa${letter}` as keyof typeof formData] as string}
                      onChange={(content: string) => setFormData(prev => ({...prev, [`alternativa${letter}`]: content}))}
                      onFocus={() => setAlternativaFocada(letter)}
                      modules={miniQuillModules}
                      formats={miniQuillFormats}
                      placeholder={letter === 'A' ? "Dica: você ainda pode colar uma lista de alternativas direto aqui..." : `Texto da alternativa ${letter}...`}
                      className="font-sans"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            .rich-text-editor-mini .ql-toolbar.ql-snow {
              border: none;
              border-bottom: 1px solid #f1f5f9;
              background: #f8fafc;
              padding: 6px;
            }
            .rich-text-editor-mini .ql-container.ql-snow {
              border: none;
              min-height: 40px;
              font-family: inherit;
              font-size: 14px;
            }
            .rich-text-editor-mini .ql-editor {
              min-height: 40px;
              line-height: 1.5;
              padding: 10px 12px;
            }
          `}} />
          </div>
          )}

          {/* Vínculo Inteligente Unificado */}
          {currentStep === 1 && (
          <div className="space-y-8 animate-slide-up border-t pt-8 border-line-subtle">
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-fg-muted">Onde aplicar esta questão?</label>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                 <span className="text-xs font-bold text-accent-fg">Vincular a Diários</span>
              </div>
            </div>
            
            <p className="text-xs text-fg-subtle font-medium ml-1">
              Primeiro selecione a(s) Turma(s) alvo, em seguida selecione a disciplina desejada.
            </p>

            <div className="space-y-6">
              {/* Passo 1: Seleção de Turmas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs font-semibold text-fg-subtle">Passo 1: Turmas</span>
                  <div className="h-px flex-1 bg-subtle" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {turmas.map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleSelection(t.id, 'turmasIds')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                        formData.turmasIds.includes(t.id)
                        ? 'bg-accent-subtle border-accent text-accent-fg'
                        : 'bg-surface border-line text-fg-muted hover:border-line-strong hover:bg-subtle'
                      }`}
                    >
                      <Users size={14} className={formData.turmasIds.includes(t.id) ? 'text-accent-fg' : 'text-fg-subtle'} />
                      {t.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passo 2: Seleção de Disciplinas (visível apenas se houver turmas selecionadas) */}
              {formData.turmasIds.length > 0 && (
                <div className="space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-semibold text-fg-subtle">Passo 2: Disciplinas nas Turmas Selecionadas</span>
                    <div className="h-px flex-1 bg-subtle" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {disciplinasPorTurmaSelecionada.map((d: any) => {
                      const turmaNome = turmas.find((t: any) => t.id === d.turmaId)?.nome || '';
                      return (
                        <div key={d.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => toggleSelection(d.id, 'disciplinasIds')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                              formData.disciplinasIds.includes(d.id)
                              ? 'bg-accent border-accent text-on-accent translate-y-[-2px] '
                              : 'bg-surface border-line text-fg-muted hover:border-accent hover:bg-canvas'
                            }`}
                          >
                            <BookOpen size={14} className={formData.disciplinasIds.includes(d.id) ? 'text-on-accent/80' : 'text-fg-subtle'} />
                            <span className="flex flex-col items-start leading-tight">
                               <span>{d.nome}</span>
                               <span className={`text-xs font-medium ${formData.disciplinasIds.includes(d.id) ? 'text-on-accent/80' : 'text-fg-subtle'}`}>{turmaNome}</span>
                            </span>
                          </button>
                          
                          {!formData.disciplinasIds.includes(d.id) && (
                            <button
                              type="button"
                              onClick={() => selectAllSameName(d.nome)}
                              className="hidden group-hover:flex absolute -top-2 -right-2 bg-zinc-900 text-white rounded-full p-1.5 shadow-overlay animate-pop-in items-center justify-center z-10"
                              title={`Selecionar ${d.nome} em todas as turmas marcadas`}
                            >
                              <Plus size={10} strokeWidth={4} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
          )}
        </form>

        <div className="p-4 sm:p-6 border-t border-line-subtle bg-surface/80 backdrop-blur-md flex items-center justify-between sticky bottom-[var(--barra-inferior)] z-30">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
            className="px-6 py-3 rounded-lg font-bold text-fg-subtle hover:bg-subtle transition-all text-sm"
          >
            {currentStep > 1 ? '← Voltar' : 'Cancelar'}
          </button>
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="bg-accent hover:bg-accent-hover text-on-accent px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-card active:scale-95 text-sm"
            >
              Próximo Passo →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-card active:scale-95 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {questao ? 'Salvar Alterações' : 'Salvar Questão'}
            </button>
          )}
        </div>
      </div>

      {/* Modal de Assistente de Colagem */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-surface w-full max-w-lg rounded-xl p-8 shadow-overlay animate-pop-in overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent-subtle text-accent-fg rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-fg leading-none">Colar Bloco de Respostas</h3>
                    <p className="text-xs text-fg-subtle font-bold mt-1">Preenchimento Automático</p>
                  </div>
                </div>
                <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-subtle rounded-full transition-colors">
                  <X size={20} className="text-fg-subtle" />
                </button>
              </div>

              <p className="text-sm text-fg-muted font-medium mb-4 leading-relaxed">
                Cole abaixo o texto contendo as alternativas. O sistema irá identificar cada uma (por linhas ou letras) e preencher os campos A-E.
              </p>

              <textarea
                autoFocus
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Ex: a) Opção 1 b) Opção 2 c) Opção 3..."
                className="w-full h-48 bg-canvas border-2 border-line-subtle rounded-xl p-6 text-sm focus:ring-4 focus:ring-ring focus:border-accent outline-none transition-all font-medium resize-none mb-6"
              />

              <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => setShowPasteModal(false)} 
                  className="py-4 rounded-lg font-bold text-fg-subtle hover:bg-canvas transition-all text-sm"
                 >
                  Cancelar
                 </button>
                 <button 
                  onClick={() => distribuirAlternativas(pasteText)} 
                  disabled={!pasteText.trim()}
                  className="py-4 rounded-lg font-semibold bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-50 transition-all shadow-card text-sm flex items-center justify-center gap-2"
                 >
                  <Save size={18} />
                  Distribuir nos Campos
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Confirmação para Edição */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-surface w-full max-w-sm rounded-xl p-8 shadow-overlay animate-pop-in">
              <div className="w-14 h-14 bg-warning-subtle text-warning-fg rounded-lg flex items-center justify-center mb-6">
                 <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-fg mb-2">Salvar Edição?</h3>
              <p className="text-sm text-fg-subtle font-medium mb-8">
                As alterações realizadas nesta questão serão aplicadas permanentemente. 
                {questao?.status === 'APROVADA' && (
                  <span className="block mt-2 text-danger-fg font-bold">
                     Atenção: Esta questão já estava aprovada. Ao salvar a edição, ela voltará para o status PENDENTE para nova revisão da coordenação.
                  </span>
                )}
                Deseja confirmar?
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowConfirm(false)} className="py-3 rounded-xl font-bold text-fg-subtle hover:bg-canvas transition-all text-sm">Cancelar</button>
                 <button onClick={() => handleSubmit()} className="py-3 rounded-xl font-semibold bg-accent text-on-accent hover:bg-zinc-800 transition-all shadow-card text-sm">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
