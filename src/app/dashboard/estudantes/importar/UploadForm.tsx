"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, FileType, Search, X } from "lucide-react"
import { useEffect, useRef } from "react"

interface PreviewData {
  nome: string
  turma: string
  matricula?: string
}

interface UploadFormProps {
  turmas: { id: string; nome: string; modalidade?: string | null; turno?: string | null }[]
}

export default function UploadForm({ turmas }: UploadFormProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [manualTurma, setManualTurma] = useState("")
  const [turmaSearch, setTurmaSearch] = useState("")
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter turmas based on search
  const filteredTurmas = turmas.filter(t => 
    t.nome.toLowerCase().includes(turmaSearch.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTurmaDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Dynamic import to prevent "DOMMatrix is not defined" during SSR
    const pdfjsLib = await import('pdfjs-dist')
    
    // Configure worker
    // Use unpkg with specific mjs build for the worker to match ES module environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const strings = textContent.items.map((item: any) => item.str)
        fullText += strings.join(' ') + '\n'
    }
    return fullText
  }

  const parsePDFContent = (text: string, defaultTurma: string): PreviewData[] => {
    const students: PreviewData[] = []
    
    let detectedTurma = defaultTurma
    if (!detectedTurma) {
        const turmaMatch = text.match(/(TÉCNICO.*SÉRIE)/i) || text.match(/(.*ENSINO MÉDIO.*)/i)
        if (turmaMatch) {
            detectedTurma = turmaMatch[0].trim()
        }
    }

    // Identifica matricula e nome
    const studentRegex = /(\d{7,})\s+([A-ZÀ-Ú\s]+?)\s+(MATRICULADO|TRANSFERIDO|DESISTENTE|CONCLUÍDO)/g
    let match
    
    while ((match = studentRegex.exec(text)) !== null) {
      if (match[2] && match[2].length > 3) {
        students.push({
          matricula: match[1],
          nome: match[2].trim(),
          turma: detectedTurma || "Turma Desconhecida"
        })
      }
    }
    
    if (students.length === 0) {
        const simpleRegex = /(\d{7,})\s+([A-ZÀ-Ú\s]{5,})/g
        while ((match = simpleRegex.exec(text)) !== null) {
             const nomePotencial = match[2].trim()
             if (!nomePotencial.includes("ESCOLA") && !nomePotencial.includes("DIRETOR") && !nomePotencial.includes("TURMA")) {
                 students.push({
                    matricula: match[1],
                    nome: nomePotencial,
                    turma: detectedTurma || "Turma Desconhecida"
                 })
             }
        }
    }

    return students
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setMessage(null)
    setPreview([])

    if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text()
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length <= 1) {
            setMessage({ type: 'error', text: 'O arquivo CSV está vazio.' })
            return
        }
        const data: PreviewData[] = []
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',').map(s => s.trim())
            
            // Suporta [matricula, nome, turma] ou [nome, turma]
            if (parts.length >= 3) {
                data.push({ matricula: parts[0], nome: parts[1], turma: parts[2] || manualTurma || "Sem Turma" })
            } else if (parts.length === 2) {
                data.push({ nome: parts[0], turma: parts[1] || manualTurma || "Sem Turma" })
            }
        }
        setPreview(data)
        setMessage({ type: 'info', text: `${data.length} estudantes encontrados no CSV.` })

    } else if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        try {
            const text = await extractTextFromPDF(selectedFile)
            const data = parsePDFContent(text, manualTurma)
            
            if (data.length === 0) {
                setMessage({ type: 'error', text: 'Nenhum estudante identificado no PDF. Verifique o formato.' })
            } else {
                setPreview(data)
                setMessage({ type: 'info', text: `${data.length} estudantes encontrados no PDF.` })
            }
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Erro ao ler o arquivo PDF.' })
        }
    } else {
        setMessage({ type: 'error', text: 'Formato não suportado. Use CSV ou PDF.' })
    }
  }

  const [skippedList, setSkippedList] = useState<string[]>([])

  const [syncMode, setSyncMode] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || preview.length === 0) return

    if (syncMode && !manualTurma) {
      setMessage({ type: 'error', text: 'Para sincronizar, selecione antes a turma de destino.' })
      return
    }

    setLoading(true)
    setMessage(null)
    setSkippedList([])
    setIsFinished(false)

    try {
      const csvContent = "Matricula,Nome,Turma\n" + preview.map(p => `${p.matricula || ''},${p.nome},${manualTurma || p.turma}`).join("\n")
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const finalFile = new File([blob], "importacao_processada.csv", { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', finalFile)
      if (syncMode && manualTurma) {
        formData.append('manualTurma', manualTurma)
      }

      const endpoint = syncMode ? '/api/estudantes/sincronizar' : '/api/upload-csv'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        if (syncMode) {
          setMessage({ 
            type: 'success', 
            text: `Sincronização concluída: ${result.created} cadastrados, ${result.updated} resgatados/movidos, ${result.removed} removidos da turma!` 
          })
          setFile(null)
          setPreview([])
          setIsFinished(true)
        } else {
          if (result.created > 0) {
              setMessage({ 
                type: 'success', 
                text: `${result.created} estudantes cadastrados com sucesso!` 
              })
              if (result.skipped && result.skipped.length > 0) {
                  setSkippedList(result.skipped)
              }
              setFile(null)
              setPreview([])
              setIsFinished(true)
          } else {
              setMessage({ 
                  type: 'info', 
                  text: result.message || "Nenhum estudante novo cadastrado." 
              })
              if (result.skipped && result.skipped.length > 0) {
                  setSkippedList(result.skipped)
              }
          }
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Erro ao processar importação.' 
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Não foi possível conectar ao servidor. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="">
      <header className="mb-6">
        <div className="py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard/estudantes" aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
              <ArrowLeft className="w-5 h-5 text-fg-muted" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">Importar estudantes</h1>
              <p className="text-sm text-fg-muted">Importe via CSV ou PDF (Relação de Alunos)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="py-4">
        <div className="bg-subtle border border-line-strong rounded-xl p-4 mb-4">
          <div className="flex items-start space-x-4">
            <div className="bg-subtle-hover rounded-lg p-3">
              <FileType className="w-6 h-6 text-fg" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-fg mb-2">Instruções de importação</h3>
              <div className="space-y-4 text-accent-fg text-sm">
                <p>
                  Para importar vários alunos de uma vez, utilize o arquivo PDF <strong>"Relação de Estudantes na Turma"</strong> baixado diretamente do <strong>SIGEDUC</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                   <li>O sistema extrairá os <strong>nomes</strong> e <strong>números de matrícula</strong> automaticamente.</li>
                   <li>A matrícula será usada para identificar o aluno e o acesso ao portal virá desativado por padrão.</li>
                   <li>É necessário selecionar a <strong>Turma de destino</strong> abaixo para vincular os alunos.</li>
                </ul>
                
                <div className="mt-4">
                    <p className="font-medium mb-2 text-accent-fg">Exemplo de arquivo aceito:</p>
                    <div className="border-2 border-line-strong rounded-lg overflow-hidden max-w-2xl">
                        <img 
                            src="/assets/exemplo-pdf.png" 
                            alt="Exemplo de Relação de Estudantes do SIGEDUC" 
                            className="w-full h-auto"
                        />
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-line-strong p-4">
          {isFinished ? (
            <div className="py-2.5 text-center animate-pop-in">
               {message?.type === 'success' ? (
                 <div className="w-12 h-12 bg-success-subtle text-success-fg rounded-full flex items-center justify-center mx-auto mb-6">
                   <CheckCircle className="w-10 h-10" />
                 </div>
               ) : (
                 <div className="w-12 h-12 bg-subtle text-fg-subtle rounded-full flex items-center justify-center mx-auto mb-6">
                   <FileType className="w-10 h-10" />
                 </div>
               )}
               
               <h3 className="text-2xl font-bold text-fg mb-2">{message?.text}</h3>
               <p className="text-fg-muted mb-4 font-medium">O processo de importação foi finalizado com base nos dados fornecidos.</p>

               {skippedList.length > 0 && (
                <div className="max-w-md mx-auto mb-5 p-4 bg-canvas rounded-lg border border-line text-left">
                    <div className="flex items-center gap-2 mb-4 text-warning-fg">
                       <AlertCircle className="w-5 h-5" />
                       <span className="font-bold text-sm">Registros ignorados ({skippedList.length})</span>
                    </div>
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {skippedList.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-fg-subtle bg-surface p-2 rounded-lg border border-line-subtle flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></div>
                               {item}
                            </li>
                        ))}
                    </ul>
                </div>
               )}

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                        setIsFinished(false)
                        setMessage(null)
                        setSkippedList([])
                        setTurmaSearch("")
                        setManualTurma("")
                    }}
                    className="w-full sm:w-auto px-4 py-4 bg-accent text-on-accent rounded-lg font-bold hover:bg-accent-hover transition-all"
                  >
                    Nova importação
                  </button>
                  <Link
                    href="/dashboard/estudantes"
                    className="w-full sm:w-auto px-4 py-4 bg-surface text-fg-muted border border-line-strong rounded-lg font-bold hover:bg-canvas transition-all"
                  >
                    Voltar para estudantes
                  </Link>
               </div>
            </div>
          ) : (
            <>
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-success-subtle border border-success-line text-success-fg' : 
              message.type === 'error' ? 'bg-danger-subtle border border-danger-line text-danger-fg' : 
              'bg-subtle border border-line-strong text-accent-fg'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {message.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                <span className="font-medium">{message.text}</span>
              </div>
              
              {skippedList.length > 0 && (
                <div className="mt-3 ml-7">
                    <p className="text-sm font-medium mb-1">Registros ignorados (Já existem):</p>
                    <ul className="list-disc list-inside text-xs space-y-1 opacity-80">
                        {skippedList.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
                <label className="block text-sm font-medium text-fg mb-2">Arquivo (PDF da Relação de Alunos)</label>
                <input 
                  type="file" accept=".pdf, application/pdf" 
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-accent/25 rounded-lg focus:ring-2 focus:ring-zinc-500"
                />
            </div>
            <div ref={dropdownRef}>
                <label className="block text-sm font-medium text-fg mb-2">Turma de destino <span className="text-danger-fg">*</span></label>
                <div className="relative">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${showTurmaDropdown ? 'text-fg' : 'text-fg-subtle'}`} />
                        <input 
                            type="text"
                            placeholder="Digite o nome da turma para buscar..."
                            value={turmaSearch}
                            onChange={(e) => {
                                setTurmaSearch(e.target.value)
                                setShowTurmaDropdown(true)
                                if (manualTurma) setManualTurma("")
                            }}
                            onFocus={() => setShowTurmaDropdown(true)}
                            className={`w-full pl-11 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-zinc-500 transition-all bg-surface font-medium text-fg-muted outline-none ${!manualTurma && preview.length > 0 ? 'border-danger-line ring-2 ring-danger/30' : 'border-accent/25 hover:border-accent'}`}
                        />
                        {(turmaSearch || manualTurma) && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setTurmaSearch("")
                                    setManualTurma("")
                                    setShowTurmaDropdown(false)
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-fg-subtle hover:text-fg-muted rounded-full hover:bg-subtle transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {showTurmaDropdown && (
                        <div className="absolute z-50 mt-2 w-full bg-surface border border-line rounded-xl shadow-overlay max-h-72 overflow-y-auto animate-slide-up py-2">
                             {filteredTurmas.length === 0 ? (
                                <div className="px-4 py-3 text-center text-sm text-fg-subtle font-medium">
                                    Nenhuma turma encontrada para "{turmaSearch}"
                                </div>
                             ) : (
                                filteredTurmas.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                            setManualTurma(t.nome)
                                            setTurmaSearch(t.nome)
                                            setShowTurmaDropdown(false)
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between border-b border-line-subtle last:border-none ${
                                            manualTurma === t.nome 
                                            ? 'bg-accent z-10' 
                                            : 'text-fg-muted hover:bg-canvas'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-semibold ${manualTurma === t.nome ? 'text-white' : 'text-fg font-bold'}`}>
                                                {t.nome}
                                            </span>
                                            {(t.modalidade || t.turno) && (
                                                <span className={`text-xs font-bold mt-0.5 ${manualTurma === t.nome ? 'text-fg-disabled' : 'text-fg-subtle'}`}>
                                                    {t.modalidade} {t.turno && `· ${t.turno}`}
                                                </span>
                                            )}
                                        </div>
                                        {manualTurma === t.nome && <CheckCircle className="w-4 h-4 text-white" />}
                                    </button>
                                ))
                             )}
                        </div>
                    )}
                </div>
                <p className="text-xs text-fg-muted mt-2">Pesquise e selecione a turma para onde estes alunos serão importados.</p>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-fg mb-4">Preview ({preview.length} alunos)</h3>
              <div className="border border-line-strong rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-subtle border-b border-line-strong sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">Matrícula</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">Turma de destino</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-line-strong">
                    {preview.map((item, index) => (
                      <tr key={index} className="hover:bg-subtle">
                        <td className="px-4 py-3 text-sm text-fg-muted">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-fg-muted font-mono">{item.matricula || '-'}</td>
                        <td className="px-4 py-3 text-sm text-accent-fg font-medium">{item.nome}</td>
                        <td className="px-4 py-3 text-sm text-fg-muted">
                            {manualTurma || <span className="text-danger-fg italic">Selecione a turma acima</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-canvas p-4 rounded-lg mt-4 border border-line">
            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={syncMode}
                onChange={(e) => setSyncMode(e.target.checked)}
                className="w-5 h-5 text-accent-fg rounded focus:ring-ring cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-fg">Sincronização Completa (Varredura)</span>
                <span className="text-xs text-fg-subtle">Se ativo, alunos não listados serão movidos para Evasão/Transferidos.</span>
              </div>
            </label>
            <div className="flex space-x-4">
              <Link href="/dashboard/estudantes" className="px-4 py-3 text-fg hover:bg-subtle-hover rounded-lg transition-colors">Cancelar</Link>
              <button 
                type="submit" disabled={loading || preview.length === 0 || !manualTurma.trim()}
                className={`flex items-center space-x-2 text-fg px-4 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${syncMode ? ' bg-danger hover:bg-danger ' : ' bg-surface border border-line hover:bg-subtle'}`}
              >
                <Upload className="w-5 h-5" />
                <span>{loading ? 'Importando...' : (syncMode ? 'Sincronizar Turma' : 'Importar Turma')}</span>
              </button>
            </div>
          </div>
          </>
          )}
        </form>
      </main>
    </div>
  )
}
