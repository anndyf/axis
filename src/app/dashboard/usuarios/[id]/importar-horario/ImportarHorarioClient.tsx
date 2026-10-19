"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Search, CheckCircle2, XCircle, AlertCircle,
  Loader2, ClipboardPaste, CheckCheck, BookOpen, RotateCcw
} from "lucide-react"

interface Encontrado {
  turmaCode: string
  turmaId: string
  discNome: string
  discId: string
  discNomeBanco: string
  jaVinculada: boolean
}

interface NaoEncontrado {
  turmaCode: string
  discNome: string
  motivo: string
  sugestoes: string[]
}

interface Resultado {
  totalPares: number
  encontrados: Encontrado[]
  naoEncontrados: NaoEncontrado[]
}

export default function ImportarHorarioClient({
  usuario
}: {
  usuario: { id: string; name: string | null }
}) {
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [verificando, setVerificando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set())
  const [sucesso, setSucesso] = useState(false)

  const handleVerificar = async () => {
    if (!texto.trim()) return
    setVerificando(true)
    setResultado(null)
    setErro(null)
    setSucesso(false)

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}/verificar-horario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto })
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.message); return }

      setResultado(data)
      // Seleciona todos os encontrados que ainda não estão vinculados
      setConfirmados(new Set(
        data.encontrados
          .filter((e: Encontrado) => !e.jaVinculada)
          .map((e: Encontrado) => e.discId)
      ))
    } catch {
      setErro("Erro de conexão com o servidor")
    } finally {
      setVerificando(false)
    }
  }

  const handleImportar = async () => {
    if (confirmados.size === 0) return
    setImportando(true)
    setErro(null)

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}/importar-horario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplinaIds: Array.from(confirmados) })
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.message); return }

      setSucesso(true)
      setTimeout(() => router.push(`/dashboard/usuarios/${usuario.id}/disciplinas`), 1500)
    } catch {
      setErro("Erro de conexão com o servidor")
    } finally {
      setImportando(false)
    }
  }

  const toggleConfirmado = (discId: string) => {
    setConfirmados(prev => {
      const s = new Set(prev)
      s.has(discId) ? s.delete(discId) : s.add(discId)
      return s
    })
  }

  const novasParaVincular = resultado?.encontrados.filter(e => !e.jaVinculada) ?? []
  const jaVinculadas = resultado?.encontrados.filter(e => e.jaVinculada) ?? []

  return (
    <div className="">
      {/* Header */}
      <header className="mb-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/usuarios/${usuario.id}/disciplinas`}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-fg-muted" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">Importar Horário</h1>
              <p className="text-sm text-fg-muted">
                Professor: {usuario.name}
              </p>
            </div>
          </div>

          {resultado && confirmados.size > 0 && !sucesso && (
            <button
              onClick={handleImportar}
              disabled={importando}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
            >
              {importando
                ? <Loader2 size={16} className="animate-spin" />
                : <CheckCheck size={16} />}
              Vincular {confirmados.size} disciplina{confirmados.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Sucesso */}
        {sucesso && (
          <div className="bg-success-subtle border border-success-line rounded-lg p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-success-subtle rounded-xl flex items-center justify-center">
              <CheckCheck className="w-6 h-6 text-success-fg" />
            </div>
            <div>
              <p className="font-bold text-success-fg">Disciplinas vinculadas com sucesso!</p>
              <p className="text-sm text-success-fg">Redirecionando para a lista de disciplinas...</p>
            </div>
          </div>
        )}

        {/* Área de cola */}
        {!sucesso && (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-subtle rounded-lg flex items-center justify-center">
                  <ClipboardPaste className="w-4 h-4 text-accent-fg" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-fg">Cole o horário do professor</h2>
                  <p className="text-xs text-fg-subtle">Formato: <code className="bg-zinc-100 px-1 rounded">TURMA(Disciplina)</code> — ex: <code className="bg-zinc-100 px-1 rounded">2TIM2(Inst Manu Computadores)</code></p>
                </div>
              </div>
              {texto && (
                <button
                  onClick={() => { setTexto(""); setResultado(null); setErro(null) }}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <RotateCcw size={14} className="text-fg-subtle" />
                </button>
              )}
            </div>

            <textarea
              value={texto}
              onChange={e => { setTexto(e.target.value); setResultado(null) }}
              placeholder={"2TIM2(Inst Manu Computadores)\n2TIM3(Inst Manu Computadores)\n2TNDV1(MATEMATICA)\n2TIN1E(INST MANUT COMPUTADORES)\n..."}
              rows={8}
              className="w-full px-6 py-4 font-mono text-sm text-fg-muted bg-zinc-50/50 focus:outline-none focus:bg-white resize-none transition-colors"
            />

            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
              <p className="text-xs text-fg-subtle">
                {texto.match(/\w+\([^)]+\)/g)?.length ?? 0} par(es) identificado(s) no texto
              </p>
              <button
                onClick={handleVerificar}
                disabled={!texto.trim() || verificando}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-on-accent px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 active:scale-95"
              >
                {verificando
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Search size={16} />}
                Verificar matching
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="bg-danger-subtle border border-danger-line rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger-fg shrink-0" />
            <p className="text-sm font-medium text-danger-fg">{erro}</p>
          </div>
        )}

        {/* Resultado da verificação */}
        {resultado && !sucesso && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg border border-zinc-200 p-4 text-center">
                <p className="text-2xl font-semibold text-fg">{resultado.totalPares}</p>
                <p className="text-xs font-bold text-fg-subtle mt-1">Pares lidos</p>
              </div>
              <div className="bg-success-subtle rounded-lg border border-success-line p-4 text-center">
                <p className="text-2xl font-semibold text-success-fg">{resultado.encontrados.length}</p>
                <p className="text-xs font-bold text-success-fg mt-1">Encontrados</p>
              </div>
              <div className={`rounded-lg border p-4 text-center ${resultado.naoEncontrados.length > 0 ? 'bg-danger-subtle border-danger-line' : 'bg-zinc-50 border-zinc-200'}`}>
                <p className={`text-2xl font-semibold ${resultado.naoEncontrados.length > 0 ? 'text-danger-fg' : 'text-fg-subtle'}`}>
                  {resultado.naoEncontrados.length}
                </p>
                <p className={`text-xs font-bold mt-1 ${resultado.naoEncontrados.length > 0 ? 'text-danger' : 'text-fg-subtle'}`}>Não encontrados</p>
              </div>
            </div>

            {/* Novas para vincular */}
            {novasParaVincular.length > 0 && (
              <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success-fg" />
                    <h3 className="text-sm font-bold text-fg">
                      Prontas para vincular ({novasParaVincular.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      if (confirmados.size === novasParaVincular.length) {
                        setConfirmados(new Set())
                      } else {
                        setConfirmados(new Set(novasParaVincular.map(e => e.discId)))
                      }
                    }}
                    className="text-xs font-semibold text-accent-fg hover:text-accent-fg transition-colors"
                  >
                    {confirmados.size === novasParaVincular.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>
                <div className="divide-y divide-zinc-100">
                  {novasParaVincular.map((e, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors ${
                        confirmados.has(e.discId) ? 'bg-success-subtle' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={confirmados.has(e.discId)}
                        onChange={() => toggleConfirmado(e.discId)}
                        className="w-4 h-4 rounded accent-[var(--success)] cursor-pointer"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-fg-subtle bg-zinc-100 px-2 py-1 rounded-lg font-mono">
                          {e.turmaCode}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-fg truncate">{e.discNomeBanco}</p>
                        {normalizar(e.discNome) !== normalizar(e.discNomeBanco) && (
                          <p className="text-xs text-fg-subtle truncate">
                            no horário: "{e.discNome}"
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${confirmados.has(e.discId) ? 'text-success-fg' : 'text-zinc-200'}`} />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Já vinculadas */}
            {jaVinculadas.length > 0 && (
              <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-bold text-fg">
                    Já vinculadas ({jaVinculadas.length})
                  </h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  {jaVinculadas.map((e, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3 opacity-60">
                      <span className="text-xs font-semibold text-fg-subtle bg-zinc-100 px-2 py-1 rounded-lg font-mono">
                        {e.turmaCode}
                      </span>
                      <p className="text-sm text-fg-muted flex-1">{e.discNomeBanco}</p>
                      <span className="text-xs font-bold text-accent-fg bg-accent-subtle px-2 py-0.5 rounded-full">
                        já vinculada
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Não encontrados */}
            {resultado.naoEncontrados.length > 0 && (
              <div className="bg-white rounded-lg border border-danger-line overflow-hidden">
                <div className="px-6 py-4 border-b border-danger-line flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-danger" />
                  <h3 className="text-sm font-bold text-fg">
                    Não encontrados ({resultado.naoEncontrados.length})
                  </h3>
                </div>
                <div className="divide-y divide-danger-line">
                  {resultado.naoEncontrados.map((n, i) => (
                    <div key={i} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-semibold text-danger bg-danger-subtle px-2 py-1 rounded-lg font-mono shrink-0">
                          {n.turmaCode}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-danger-fg">"{n.discNome}"</p>
                          <p className="text-xs text-fg-subtle mt-0.5">{n.motivo}</p>
                          {n.sugestoes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-bold text-fg-subtle mb-1">
                                Disciplinas desta turma:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {n.sugestoes.map((s, j) => (
                                  <span key={j} className="text-xs bg-zinc-100 text-fg-muted px-2 py-0.5 rounded-lg">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}
