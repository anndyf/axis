"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { 
  Scissors, 
  FileText, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Settings2,
  Trash2,
  ChevronRight,
  Printer,
  Plus,
  Search,
  X,
  History as HistoryIcon,
  Calendar,
  User as UserIcon,
  Copy,
  Save,
  FileDown, 
  ClipboardCheck,
  Settings,
  Filter,
  PlusCircle,
  Layout,
  ArrowRight,
  Hash,
  GripVertical,
  Monitor,
  HeartPulse,
  Briefcase,
  Zap,
  Apple,
  Microscope,
  Building,
  GraduationCap
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { stripHtml } from "@/lib/text-utils"
import { decodeTurma } from "@/lib/turma-utils"
import ProvaPrintView from "./ProvaPrintView"

const loadPdfImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
  })
}

const getCourseIcon = (cursoNome: string) => {
  if (!cursoNome) return <GraduationCap size={10} />;
  const nome = cursoNome.toLowerCase();
  if (nome.includes('informática') || nome.includes('redes') || nome.includes('desenvolvimento') || nome.includes('sistema')) return <Monitor size={10} />;
  if (nome.includes('enfermagem') || nome.includes('saúde') || nome.includes('gerência de saúde')) return <HeartPulse size={10} />;
  if (nome.includes('administração') || nome.includes('logística') || nome.includes('contabilidade') || nome.includes('recursos humanos')) return <Briefcase size={10} />;
  if (nome.includes('eletro') || nome.includes('mecatrônica') || nome.includes('automação') || nome.includes('manutenção')) return <Zap size={10} />;
  if (nome.includes('nutrição') || nome.includes('alimento') || nome.includes('gastronomia') || nome.includes('agro')) return <Apple size={10} />;
  if (nome.includes('análises') || nome.includes('química') || nome.includes('farmácia')) return <Microscope size={10} />;
  if (nome.includes('edificações') || nome.includes('civil') || nome.includes('arquitetura') || nome.includes('segurança')) return <Building size={10} />;
  return <GraduationCap size={10} />;
}

const normalizeText = (text: string) => {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const MAP_AREAS_BNCC = {
  "CIÊNCIAS DA NATUREZA": ["biologia", "física", "química", "ciências"],
  "CIÊNCIAS HUMANAS": ["história", "geografia", "filosofia", "sociologia"],
  "LINGUAGENS": ["portuguesa", "arte", "educação física", "inglês", "espanhol", "redação", "literatura", "linguagem"],
  "MATEMÁTICA": ["matemática", "raciocínio"],
  "DISCIPLINAS ARTICULADORAS": [
    "projeto de vida", "iniciação científica", "educação digital", "midiática", 
    "história da bahia", "cultura indígena", "africana", "afro-brasileira",
    "hciaa", "hb hciaa", "tecnologias sociais", "tecnologia social", 
    "empreendedorismo", "economia solidária", "economia solidaria", 
    "intervenção social", "mundo do trabalho", "práticas integradas", 
    "oficina de texto", "atividade integradora", "articuladoras", "articuladora"
  ]
};

const isDisciplinaInArea = (discNome: string, areaSelecionada: string) => {
  if (!areaSelecionada) return false;
  const nameLow = normalizeText(discNome || "");

  if (areaSelecionada === 'DISCIPLINAS TÉCNICAS') {
    const isGeral = Object.values(MAP_AREAS_BNCC).flat().some(kw => {
      const kwNorm = normalizeText(kw);
      if (kwNorm === 'fisica' && nameLow.includes('educacao fisica')) return false;
      return nameLow.includes(kwNorm);
    });
    return !isGeral;
  }

  const areaKeywords = MAP_AREAS_BNCC[areaSelecionada as keyof typeof MAP_AREAS_BNCC] || [];
  
  return areaKeywords.some(kw => {
    const kwNorm = normalizeText(kw);
    // Evitar que "Física" (Ciências da Natureza) dê match em "Educação Física" (Linguagens)
    if (kwNorm === 'fisica' && nameLow.includes('educacao fisica')) return false;
    return nameLow.includes(kwNorm);
  });
};

const shuffleSystemForExams = (questionsArray: any[], seedStr: string) => {
  const getSeed = (str: string) => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i)
          hash |= 0
      }
      return Math.abs(hash)
  }

  const mulberry32 = (a: number) => {
      return function() {
        let t = a += 0x6D2B79F5
        t = Math.imul(t ^ t >>> 15, t | 1)
        t ^= t + Math.imul(t ^ t >>> 7, t | 61)
        return ((t ^ t >>> 14) >>> 0) / 4294967296
      }
  }

  const seedValue = getSeed(seedStr)
  const randomFunc = mulberry32(seedValue)

  const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(randomFunc() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
  }

  // Clonamos profundamente
  let finalQuestions = JSON.parse(JSON.stringify(questionsArray))

  // A. Agrupar por disciplina
  const questionsByDisc: Record<string, any[]> = {}
  const discOrder: string[] = []

  finalQuestions.forEach((q: any) => {
      const discName = q.disciplinas?.[0]?.nome || q.disciplina?.nome || 'Geral'
      if (!questionsByDisc[discName]) {
          questionsByDisc[discName] = []
          discOrder.push(discName)
      }
      questionsByDisc[discName].push(q)
  })

  let shuffledList: any[] = []
  discOrder.forEach(discName => {
      const qs = questionsByDisc[discName]
      shuffleArray(qs)
      shuffledList = [...shuffledList, ...qs]
  })
  
  finalQuestions = shuffledList

  // B. Embaralhar alternativas
  let lastCorrect1 = ''
  let lastCorrect2 = ''

  return finalQuestions.map((q: any) => {
      const alts = [
          { text: q.alternativaA },
          { text: q.alternativaB },
          { text: q.alternativaC },
          { text: q.alternativaD },
          { text: q.alternativaE }
      ]
      
      const originalCorrectLetter = q.correta || 'A'
      const correctContent = q[`alternativa${originalCorrectLetter}`]
      
      let shuffledAlts = [...alts]
      let newCorrectLetter = ''
      const letters = ['A', 'B', 'C', 'D', 'E']

      for (let attempt = 0; attempt < 50; attempt++) {
          shuffleArray(shuffledAlts)

          const fixedAltIndex = shuffledAlts.findIndex(a => {
             const t = (a.text || '').toLowerCase();
             return t.includes('nenhuma das') || t.includes('todas as') || t.includes('nenhum dos') || t.includes('todos os') || t.includes('n.d.a') || t === 'nda';
          });
          if (fixedAltIndex !== -1 && fixedAltIndex !== 4) {
             const temp = shuffledAlts[4];
             shuffledAlts[4] = shuffledAlts[fixedAltIndex];
             shuffledAlts[fixedAltIndex] = temp;
          }

          const newCorrectIdx = shuffledAlts.findIndex(a => a.text === correctContent)
          if (newCorrectIdx !== -1) {
            newCorrectLetter = letters[newCorrectIdx]
            
            // Garantir que a letra será diferente da original do banco
            // E evitar que a resposta seja igual às últimas duas questões, para não ter gabarito "A, A, A".
            if (newCorrectLetter !== originalCorrectLetter && 
                newCorrectLetter !== lastCorrect1 && 
                newCorrectLetter !== lastCorrect2) {
                break;
            }
          }
      }
      
      // Fallback em caso raríssimo de não conseguir matematicamente na combinação
      if (!newCorrectLetter) newCorrectLetter = letters.find(l => l !== originalCorrectLetter) || 'B'

      
      const newQ = { ...q }
      shuffledAlts.forEach((alt, idx) => {
          const letter = letters[idx]
          newQ[`alternativa${letter}`] = alt.text
      })
      newQ.correta = newCorrectLetter
      
      lastCorrect2 = lastCorrect1
      lastCorrect1 = newCorrectLetter
      
      return newQ
  })
}

// O Modal de Pré-visualização foi movido para dentro do GeradorProvasClient para ter acesso às funções de geração de PDF.

const ManualSelectorModal = ({ isOpen, onClose, onSelect, questions, selectedIds, disciplinaNome, onFetchSerie }: any) => {
  const [search, setSearch] = useState("")
  const [loadingSerie, setLoadingSerie] = useState(false)
  
  if (!isOpen) return null

  const filtered = questions.filter((q: any) => 
    stripHtml(q.enunciado).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Selecionar Questões</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">{disciplinaNome}</p>
              <span className="text-gray-300">•</span>
              <button 
                onClick={async () => {
                  setLoadingSerie(true)
                  await onFetchSerie()
                  setLoadingSerie(false)
                }}
                disabled={loadingSerie}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-tight disabled:opacity-50"
              >
                {loadingSerie ? "Buscando..." : "Buscar em outras turmas do mesmo ano"}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Pesquisar por conteúdo da questão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma questão encontrada para os critérios.</p>
            </div>
          ) : (
            filtered.map((q: any) => (
              <div 
                key={q.id} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  selectedIds.includes(q.id) 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-gray-100 hover:border-blue-200 hover:shadow-md'
                }`}
                onClick={() => onSelect(q)}
              >
                <div className="flex justify-between gap-4 mb-2">
                  <div className="text-sm text-gray-800 font-medium line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
                  <div className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedIds.includes(q.id) 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-gray-200 bg-white'
                  }`}>
                    {selectedIds.includes(q.id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  {q._count?.provas > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-widest border border-purple-200">
                      Usada em {q._count.provas} prova{q._count.provas > 1 ? 's' : ''}
                    </span>
                  )}
                  <div 
                    className={`w-2 h-2 rounded-full shrink-0 ${q.tipo === 'RECUPERACAO' ? 'bg-orange-500' : 'bg-blue-400'}`} 
                    title={q.tipo === 'RECUPERACAO' ? 'Questão de Segunda Chamada' : 'Questão Normal'}
                  />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-gray-100 text-gray-400 uppercase tracking-widest">{q.dificuldade}</span>
                  {q.turmas && q.turmas.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-500 uppercase tracking-widest">
                      {q.turmas[0].nome}
                    </span>
                  )}
                  {selectedIds.includes(q.id) && <span className="text-[10px] font-bold text-blue-600 ml-auto">Selecionada</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            <span className="text-blue-600 font-bold">{selectedIds.length}</span> questões selecionadas
          </p>
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
          >
            Concluir Seleção
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GeradorProvasClient({ user, turmas, nomeEscola = 'Áxis' }: any) {
  const [selectedTurma, setSelectedTurma] = useState<any>(null)
  const [config, setConfig] = useState<any[]>([]) // { disciplinaId, qtd }
  const [loading, setLoading] = useState(false)
  const [draftQuestions, setDraftQuestions] = useState<any[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([])
  const [titulo, setTitulo] = useState("AVALIAÇÃO")
  const [unidade, setUnidade] = useState("") 
  const [tipoProva, setTipoProva] = useState("SIMULADO")
  const [areaConhecimento, setAreaConhecimento] = useState("")
  const [valorQuestao, setValorQuestao] = useState("") 
  
  const [manualSelector, setManualSelector] = useState<{ isOpen: boolean, discId: string, discNome: string }>({ 
    isOpen: false, discId: "", discNome: "" 
  })
  const [provasRecentes, setProvasRecentes] = useState<any[]>([])
  const [searchHistory, setSearchHistory] = useState("")
  const [historyFilterTurmaId, setHistoryFilterTurmaId] = useState("")
  const [historyFilterTipo, setHistoryFilterTipo] = useState("")
  const [historyFilterCriadorId, setHistoryFilterCriadorId] = useState("")
  const [historyFilterAreaId, setHistoryFilterAreaId] = useState("")
  
  const [globalCriadores, setGlobalCriadores] = useState<any[]>([])
  const [globalAreas, setGlobalAreas] = useState<any[]>([])
  
  useEffect(() => {
    fetch('/api/provas/filtros')
      .then(res => res.json())
      .then(data => {
        if (data.criadores) setGlobalCriadores(data.criadores)
        if (data.areas) setGlobalAreas(data.areas)
      })
      .catch(console.error)
  }, [])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProvas, setTotalProvas] = useState(0)

  const [viewingProva, setViewingProva] = useState<any>(null)
  const [layoutColunas, setLayoutColunas] = useState<1 | 2>(1)
  const [isAmpliada, setIsAmpliada] = useState(false)
  const [activeTab, setActiveTab] = useState<'gerador' | 'historico'>('gerador')
  const [lastSavedProva, setLastSavedProva] = useState<any>(null)
  
  // Estados para impressão HTML
  const [isPrinting, setIsPrinting] = useState(false)
  const [printingProva, setPrintingProva] = useState<any>(null)
  const [printingOptions, setPrintingOptions] = useState<any>({})

  
  // Estados para Filtro de Turmas
  const [filterCurso, setFilterCurso] = useState("")
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNomeTurma, setFilterNomeTurma] = useState("")
  const [filterQuestaoTipo, setFilterQuestaoTipo] = useState("TODAS")

  const filteredAvailableQuestions = useMemo(() => {
      return availableQuestions.filter(q => {
         if (filterQuestaoTipo === "TODAS") return true;
         if (filterQuestaoTipo === "NORMAL") return q.tipo === "NORMAL" || !q.tipo;
         return q.tipo === filterQuestaoTipo;
      })
  }, [availableQuestions, filterQuestaoTipo])

  const uniqueCursos = useMemo(() => Array.from(new Set(turmas.map((t: any) => t.curso).filter(Boolean))), [turmas]) as string[]
  const uniqueTurnos = useMemo(() => Array.from(new Set(turmas.map((t: any) => t.turno).filter(Boolean))), [turmas]) as string[]

  const filteredTurmas = useMemo(() => {
    return turmas.filter((t: any) => {
      const matchCurso = filterCurso ? t.curso === filterCurso : true
      const matchTurno = filterTurno ? t.turno === filterTurno : true
      const matchNome = filterNomeTurma ? t.nome.toLowerCase().includes(filterNomeTurma.toLowerCase()) : true
      return matchCurso && matchTurno && matchNome
    })
  }, [turmas, filterCurso, filterTurno, filterNomeTurma])

  const displayedProvas = provasRecentes || []

  const fetchProvas = async (searchTerm = "", page = 1, tipo = "", turmaId = "", criadorId = "", areaId = "") => {
    setLoadingHistory(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (tipo) params.append('tipo', tipo)
      if (turmaId) params.append('turmaId', turmaId)
      if (criadorId) params.append('criadorId', criadorId)
      if (areaId) params.append('areaId', areaId)
      params.append('page', page.toString())
      params.append('limit', '20')

      const url = `/api/provas?${params.toString()}`
      const res = await fetch(url)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Status ${res.status} ao buscar provas:`, errorText)
        setProvasRecentes([])
        return
      }

      const data = await res.json()
      if (Array.isArray(data)) {
        setProvasRecentes(data)
      } else if (data.data && Array.isArray(data.data)) {
        setProvasRecentes(data.data)
        setTotalPages(data.meta?.totalPages || 1)
        setTotalProvas(data.meta?.total || 0)
      } else {
        console.error("API de provas retornou formato inesperado:", data)
        setProvasRecentes([])
      }
    } catch (error) {
      console.error("Falha na requisição de provas:", error)
      setProvasRecentes([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Reseta a página se a busca mudar
  useEffect(() => {
    setCurrentPage(1)
  }, [searchHistory, historyFilterTipo, historyFilterTurmaId, historyFilterCriadorId, historyFilterAreaId])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProvas(searchHistory, currentPage, historyFilterTipo, historyFilterTurmaId, historyFilterCriadorId, historyFilterAreaId)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchHistory, currentPage, historyFilterTipo, historyFilterTurmaId, historyFilterCriadorId, historyFilterAreaId])
  useEffect(() => {
    if (selectedTurma) {
      const discMap = selectedTurma.disciplinas?.map((d: any) => ({ disciplinaId: d.id, nome: d.nome, qtd: 0 })) || []
      setConfig(discMap)
      
      const parts = []
      if (tipoProva && tipoProva !== 'OUTRO') parts.push(tipoProva.toUpperCase())
      if (areaConhecimento) parts.push(areaConhecimento.toUpperCase())
      parts.push(selectedTurma.nome.toUpperCase())
      
      setTitulo(parts.join(' - '))
    }
  }, [selectedTurma, tipoProva, areaConhecimento])
  
  // Sincroniza o Filtro de Banco com o Tipo da Prova automaticamente
  useEffect(() => {
    if (tipoProva === 'RECUPERACAO') {
      setFilterQuestaoTipo('RECUPERACAO')
    } else if (tipoProva === 'BIMESTRAL') {
      setFilterQuestaoTipo('NORMAL')
    }
  }, [tipoProva])
  
  // PRÉ-CARREGAMENTO DE QUESTÕES PARA CONTADORES E SELEÇÃO
  useEffect(() => {
    if (selectedTurma) {
      const fetchAvailable = async () => {
        setLoading(true)
        try {
          const query = new URLSearchParams({
            status: 'APROVADA',
            turmaId: selectedTurma.id,
            limit: '500'
          })
          if (unidade) query.append('unidade', unidade)

          const res = await fetch(`/api/questoes?${query.toString()}`)
          const data = await res.json()
          if (Array.isArray(data)) {
            // Agora mantemos todas as questões da série/ano para que o contador mostre o total disponível
            setAvailableQuestions(data)
          }
        } catch (error) {
          console.error("Erro ao pré-carregar questões:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchAvailable()
    }
  }, [selectedTurma, unidade])

  // Reset do lastSavedProva quando o conteúdo da prova muda
  useEffect(() => {
    setLastSavedProva(null)
  }, [draftQuestions, titulo, selectedTurma?.id])

  const handleGenerateDraft = async () => {
    if (!selectedTurma || !availableQuestions.length) return
    setLoading(true)
    
    try {
      const selected: any[] = []
      const usedIds = new Set<string>()
      const duplicadasInfo: string[] = []
      
      // Para cada disciplina configurada, filtra por NOME no que já temos carregado
      config.forEach(c => {
        if (c.qtd > 0) {
          const discQuestions = filteredAvailableQuestions.filter((q: any) => 
            q.disciplinas.some((d: any) => normalizeText(d.nome || "") === normalizeText(c.nome || ""))
          )
          
          const uniqueQuestions = discQuestions.filter((q: any) => !usedIds.has(q.id))
          const alreadyUsedQuestions = discQuestions.filter((q: any) => usedIds.has(q.id))

          if (uniqueQuestions.length < c.qtd && alreadyUsedQuestions.length > 0) {
             const falta = c.qtd - uniqueQuestions.length
             alreadyUsedQuestions.slice(0, falta).forEach((q: any) => {
                 const outrasDisciplinas = q.disciplinas
                     .map((d: any) => d.nome)
                     .filter((n: string) => normalizeText(n) !== normalizeText(c.nome))
                     .join(', ')
                 const trecho = stripHtml(q.enunciado).substring(0, 40) + '...'
                 duplicadasInfo.push(`\n- "${trecho}"\n  Pertence a: ${c.nome} E ${outrasDisciplinas}`)
             })
          }
          
          // Embaralha e seleciona a quantidade pedida
          const shuffled = [...uniqueQuestions].sort(() => 0.5 - Math.random())
          const selectedForDisc = shuffled.slice(0, c.qtd)
          selectedForDisc.forEach(q => usedIds.add(q.id))
          selected.push(...selectedForDisc)
        }
      })

      const requestedTotal = config.reduce((acc, c) => acc + c.qtd, 0);
      if (selected.length < requestedTotal) {
         let msg = `Atenção: Você solicitou ${requestedTotal} questões, mas apenas ${selected.length} puderam ser selecionadas unicamente.\n`
         if (duplicadasInfo.length > 0) {
             msg += `\nIsso ocorreu pois as seguintes questões são interdisciplinares e já haviam sido selecionadas por outra disciplina:\n${duplicadasInfo.join('\n')}`
         }
         alert(msg);
      }

      // EMBARALHAMENTO DAS QUESTÕES E ALTERNATIVAS (Criação do Snapshot)
      const finalSelected: any[] = []
      const discGroups: Record<string, any[]> = {}
      selected.forEach(q => {
        const dName = q.disciplinas[0]?.nome || 'Geral'
        if (!discGroups[dName]) discGroups[dName] = []
        discGroups[dName].push(q)
      })

      Object.values(discGroups).forEach((group: any) => {
        // Embaralha ordem das questões dentro da disciplina
        group.sort(() => 0.5 - Math.random())
        
        // Embaralha alternativas de cada questão
        const shuffledGroup = group.map((q: any) => {
          const letters = ['A', 'B', 'C', 'D', 'E']
          const alts = letters.map(l => ({ text: q[`alternativa${l}`], originalId: l }))
          const shuffledAlts = [...alts].sort(() => 0.5 - Math.random())

          const fixedAltIndex = shuffledAlts.findIndex(a => {
             const t = (a.text || '').toLowerCase();
             return t.includes('nenhuma das') || t.includes('todas as') || t.includes('nenhum dos') || t.includes('todos os') || t.includes('n.d.a') || t === 'nda';
          });
          if (fixedAltIndex !== -1 && fixedAltIndex !== 4) {
             const temp = shuffledAlts[4];
             shuffledAlts[4] = shuffledAlts[fixedAltIndex];
             shuffledAlts[fixedAltIndex] = temp;
          }
          
          const newQ = { ...JSON.parse(JSON.stringify(q)) } // Deep clone
          shuffledAlts.forEach((alt, idx) => {
            newQ[`alternativa${letters[idx]}`] = alt.text
          })
          
          const correctContent = q[`alternativa${q.correta}`]
          const newCorrectIdx = shuffledAlts.findIndex(a => a.text === correctContent)
          newQ.correta = letters[newCorrectIdx]
          
          return newQ
        })
        finalSelected.push(...shuffledGroup)
      })

      setDraftQuestions(finalSelected)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const editExistingProva = async (p: any) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/provas/${p.id}`)
      if (!res.ok) throw new Error("Não foi possível carregar os detalhes.")
      const fullProva = await res.json()
      
      setSelectedTurma(fullProva.turma)
      setTitulo(`${fullProva.titulo} (Cópia)`)
      
      // Se houver snapshot, usa a versão salva. Caso contrário usa as questões do banco.
      if (fullProva.questoesSnapshot) {
        if (Array.isArray(fullProva.questoesSnapshot)) {
          setDraftQuestions(fullProva.questoesSnapshot)
        } else {
          setDraftQuestions(fullProva.questoesSnapshot.questions || [])
          if (fullProva.questoesSnapshot.valorQuestao) {
            setValorQuestao(fullProva.questoesSnapshot.valorQuestao)
          }
        }
      } else {
        setDraftQuestions(fullProva.questoes)
      }
      
      // Busca questões disponíveis para swap
      const qRes = await fetch(`/api/questoes?turmaId=${fullProva.turma.id}&status=APROVADA`)
      const allApprovadas = await qRes.json()
      setAvailableQuestions(allApprovadas)

      // Atualiza config com quantidades
      const counts: any = {}
      fullProva.questoes.forEach((q: any) => {
        q.disciplinas.forEach((d: any) => {
          counts[d.nome] = (counts[d.nome] || 0) + 1
        })
      })

      const newConfig = fullProva.turma.disciplinas?.map((d: any) => ({
        disciplinaId: d.id,
        nome: d.nome,
        qtd: counts[d.nome] || 0
      })) || []
      setConfig(newConfig)
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar prova para edição.")
    } finally {
      setLoading(false)
    }
  }

  const swapQuestion = (index: number) => {
    const qAtal = draftQuestions[index]
    const discId = qAtal.disciplinas[0]?.id // Simplificação: pega a primeira disc
    
    // Candidatas do banco que nâo estão no draft
    const candidates = filteredAvailableQuestions.filter(q => 
      q.disciplinas.some((d: any) => d.id === discId) && 
      !draftQuestions.some(dq => dq.id === q.id)
    )

    if (candidates.length > 0) {
      const newDraft = [...draftQuestions]
      newDraft[index] = candidates[Math.floor(Math.random() * candidates.length)]
      setDraftQuestions(newDraft)
    } else {
      alert("Não há mais questões aprovadas desta disciplina no banco.")
    }


  }

  const saveProva = async () => {

    if (!selectedTurma || !draftQuestions.length) return null
    setLoading(true)
    try {
      // Embaralha determinísticamente para criar um unique snapshot fixo!
      const seedName = `prova_${Date.now()}`
      const shuffledSnapshot = shuffleSystemForExams(draftQuestions, seedName)

      const getAreaIdFromConhecimento = (area: string) => {
        switch (area) {
          case "LINGUAGENS": return "linguagens";
          case "MATEMÁTICA": return "matematica";
          case "CIÊNCIAS DA NATUREZA": return "ciencias-natureza";
          case "CIÊNCIAS HUMANAS": return "ciencias-aplicadas";
          case "DISCIPLINAS TÉCNICAS": return "formacao-tecnica";
          case "DISCIPLINAS ARTICULADORAS": return "articuladoras";
          default: return null;
        }
      }

      const response = await fetch('/api/provas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo,
          turmaId: selectedTurma.id,
          unidade: unidade,
          tipo: tipoProva,
          areaId: getAreaIdFromConhecimento(areaConhecimento),
          questoesIds: draftQuestions.map((q: any) => q.id),
          questoesSnapshot: {
            questions: shuffledSnapshot,
            valorQuestao: valorQuestao
          }
        })
      })
      
      if (!response.ok) {
        let errorMsg = "Erro ao salvar no banco"
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            console.error("Erro detalhado ao salvar prova (JSON):", errorData)
            errorMsg = errorData.message || errorMsg
          } else {
            const text = await response.text()
            console.error("Erro detalhado ao salvar prova (Texto):", text)
          }
        } catch (e) {
          console.error("Erro ao ler resposta de erro:", e)
        }
        throw new Error(errorMsg)
      }
      
      const newProva = await response.json()
      setLastSavedProva(newProva) // Armazena o registro salvo para evitar duplicidade
      fetchProvas()
      return newProva
    } catch (error: any) {
      console.error("Erro ao salvar registro da prova:", error)
      alert(error.message || "Houve um erro ao salvar o registro no histórico.")
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteProva = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta prova do histórico? Esta ação é irreversível.")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/provas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Erro ao excluir prova")
      }
      
      alert("Prova excluída com sucesso!")
      fetchProvas()
      if (viewingProva?.id === id) setViewingProva(null)
      if (lastSavedProva?.id === id) setLastSavedProva(null)
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Erro ao excluir prova.")
    } finally {
      setLoading(false)
    }
  }


  const generatePDF = async (prova: any, options: { layout?: 1 | 2; ampliada?: boolean; preenchido?: boolean; apenasGabarito?: boolean } = {}) => {
    // Se o argumento for um evento (clique do botão), ignoramos
    const isHistory = prova && prova.id && !prova.nativeEvent
    
    // Se já foi salva previamente (neste rascunho), usamos o registro salvo
    const effectiveRecord = isHistory ? prova : lastSavedProva
    const hasBeenSaved = !!effectiveRecord

    // --- PREPARAÇÃO DOS DADOS ---
    let currentTitulo = hasBeenSaved ? effectiveRecord.titulo : titulo
    let currentTurma = hasBeenSaved ? effectiveRecord.turma : selectedTurma
    let currentCodigo = hasBeenSaved ? effectiveRecord.codigo : undefined

    let questionsToUse: any[] = []
    let currentValorQuestao = valorQuestao

    // Se não for visualização de histórico nem tiver sido salva ainda, salva no banco antes de gerar
    if (!hasBeenSaved) {
      const saved = await saveProva()
      if (!saved) return // Se falhou ao salvar, nâo gera PDF
      questionsToUse = saved.questoesSnapshot.questions
      currentValorQuestao = saved.questoesSnapshot.valorQuestao
      // Atualiza variáveis após salvar
      currentTitulo = saved.titulo
      currentCodigo = saved.codigo
      currentTurma = turmas.find((t: any) => t.id === saved.turmaId) || selectedTurma
    } else {
      questionsToUse = effectiveRecord.questoesSnapshot.questions
      currentValorQuestao = effectiveRecord.questoesSnapshot.valorQuestao
    }

    const finalLayout = options?.layout || (layoutColunas as 1 | 2)
    const finalAmpliada = options?.ampliada !== undefined ? options.ampliada : isAmpliada

    // Prepara a prova a ser impressa
    const provaForPrint = {
      titulo: currentTitulo,
      turma: currentTurma,
      codigo: currentCodigo,
      questoes: questionsToUse
    }

    setPrintingProva(provaForPrint)
    setPrintingOptions({
       layout: finalLayout,
       ampliada: finalAmpliada,
       apenasGabarito: options?.apenasGabarito,
       comGabarito: options?.preenchido // ou podemos deixar true por default se preenchido
    })

    setIsPrinting(true)
    
    // Altera o título da página temporariamente para definir o nome padrão ao salvar como PDF
    const originalTitle = document.title;
    document.title = options?.apenasGabarito ? `GABARITO - ${provaForPrint.titulo}` : provaForPrint.titulo;
    
    // Aguarda o React renderizar o ProvaPrintView e as imagens carregarem antes de abrir a tela de print
    setTimeout(() => {
      window.print()
      document.title = originalTitle;
      setIsPrinting(false)
    }, 800)
  }

  return (
    <>
      {isPrinting && (
        <ProvaPrintView prova={printingProva} options={printingOptions} nomeEscola={nomeEscola} />
      )}
      <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Scissors className="text-indigo-600" />
            Gerador de Provas
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Crie ou gerencie suas avaliações profissionais.</p>
        </div>

        <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-2xl shadow-inner gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('gerador')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'gerador'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus size={18} />
            Gerador
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'historico'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <HistoryIcon size={18} />
            Histórico
          </button>

        </div>
      </div>

      {activeTab === 'gerador' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 items-start">
        {/* Lado Esquerdo: Configurações + Disciplinas */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Título da Prova</label>
              <input 
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ex: AVALIAÇÃO BIMESTRAL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Prova</label>
                <select 
                  value={tipoProva}
                  onChange={(e) => setTipoProva(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="SIMULADO">Simulado</option>
                  <option value="RECUPERAÇÃO">Recuperação</option>
                  <option value="DEPENDÊNCIA">Dependência</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Área (Preset)</label>
                <select 
                  value={areaConhecimento}
                  onChange={(e) => setAreaConhecimento(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Livre (Todas)</option>
                  <option value="CIÊNCIAS DA NATUREZA">Ciências da Natureza</option>
                  <option value="CIÊNCIAS HUMANAS">Ciências Humanas</option>
                  <option value="LINGUAGENS">Linguagens</option>
                  <option value="MATEMÁTICA">Matemática</option>
                  <option value="DISCIPLINAS TÉCNICAS">Disciplinas Técnicas</option>
                  <option value="DISCIPLINAS ARTICULADORAS">Disciplinas Articuladoras</option>
                </select>
              </div>
            </div>

            {/* Filtros de Turma */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Filtrar Turmas</label>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={filterCurso}
                  onChange={(e) => setFilterCurso(e.target.value)}
                  className="bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os Cursos</option>
                  {uniqueCursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterTurno}
                  onChange={(e) => setFilterTurno(e.target.value)}
                  className="bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os Turnos</option>
                  {uniqueTurnos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input 
                value={filterNomeTurma}
                onChange={(e) => setFilterNomeTurma(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500 placeholder:font-normal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Selecionar Turma {filteredTurmas.length < turmas.length && <span className="text-blue-500">({filteredTurmas.length} encontradas)</span>}
              </label>
              <select 
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                onChange={(e) => setSelectedTurma(turmas.find((t: any) => t.id === e.target.value))}
                value={selectedTurma?.id || ""}
              >
                <option value="">Selecione a turma...</option>
                {filteredTurmas.map((t: any) => (
                    <option key={t.id} value={t.id}>
                        {t.nome} ({t._count?.questoes || 0} questões)
                    </option>
                ))}
              </select>
              {selectedTurma && (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-blue-600 font-bold ml-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {selectedTurma._count?.questoes || 0} questões específicas
                    </p>
                    {tipoProva !== 'DEPENDÊNCIA' && tipoProva !== 'OUTRO' && (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Unidade:</span>
                        <select 
                          value={unidade}
                          onChange={(e) => setUnidade(e.target.value)}
                          className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">1ª e 2ª Unidades</option>
                          <option value="1">1ª Unidade</option>
                          <option value="2">2ª Unidade</option>
                        </select>
                      </div>
                    )}
                  </div>
              )}
            </div>

            <div className="space-y-2 mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Filtro de Questões (Banco)</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" title="Questão Normal">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  </div>
                  <div className="flex items-center gap-1.5" title="Questão de Segunda Chamada">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  </div>
                </div>
              </div>
              <select 
                value={filterQuestaoTipo}
                onChange={(e) => setFilterQuestaoTipo(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="TODAS">Todas as Questões (Misto)</option>
                <option value="NORMAL">Somente Prova Normal</option>
                <option value="RECUPERACAO">Somente Segunda Chamada</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Formato e Acessibilidade</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setLayoutColunas(1)}
                    disabled={isAmpliada}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      layoutColunas === 1 && !isAmpliada
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                    } disabled:opacity-30`}
                  >
                    1 Coluna
                  </button>
                  <button 
                    onClick={() => setLayoutColunas(2)}
                    disabled={isAmpliada}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      layoutColunas === 2 && !isAmpliada
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                    } disabled:opacity-30`}
                  >
                    2 Colunas
                  </button>
                </div>

                <button 
                  onClick={() => setIsAmpliada(!isAmpliada)}
                  className={`flex-1 flex items-center justify-between gap-3 px-4 py-2 rounded-xl border-2 transition-all group ${
                    isAmpliada 
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' 
                    : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <Eye size={16} className={isAmpliada ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-500'} />
                    <div>
                      <p className="text-[11px] font-bold leading-tight">Prova Ampliada</p>
                      <p className="text-[9px] font-medium opacity-70 leading-tight">Acessibilidade</p>
                    </div>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isAmpliada ? 'bg-amber-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isAmpliada ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor por Questão no PDF</label>
              <input 
                value={valorQuestao}
                onChange={(e) => setValorQuestao(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-1 focus:ring-blue-500 transition-all placeholder:font-normal"
                placeholder="Ex: 0,5 pts"
              />
            </div>

          </div>

          {/* Configuração de Disciplinas (Agora logo abaixo dos filtros na mesma coluna) */}
          {selectedTurma && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Questões por Disciplina</label>
                <button 
                  onClick={() => {
                    const qtd = prompt("Quantidade de questões para cada disciplina:")
                    if (qtd !== null) {
                      const n = parseInt(qtd) || 0
                      setConfig(config.map(c => {
                        const maxAvailable = filteredAvailableQuestions.filter((q: any) => 
                          q.disciplinas?.some((d: any) => normalizeText(d.nome || "") === normalizeText(c.nome || ""))
                        ).length;
                        return { ...c, qtd: Math.min(n, maxAvailable) }
                      }))
                    }
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                >
                  Definir p/ Todas
                </button>
              </div>
              
              <div className="space-y-3">
                {config.map((c, idx) => {
                  const isHighlighted = isDisciplinaInArea(c.nome, areaConhecimento);
                  return (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isHighlighted ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' : 'bg-gray-50/50 border-gray-100 hover:border-blue-100'
                  }`}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                         <span className={`text-sm font-medium truncate max-w-[200px] ${isHighlighted ? 'text-emerald-800' : 'text-gray-700'}`}>{c.nome}</span>
                         <span className={`text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border ${isHighlighted ? 'text-emerald-600 border-emerald-100' : 'text-gray-400 border-gray-200'}`} title="Questões disponíveis nesta turma">
                           {filteredAvailableQuestions.filter((q: any) => 
                             q.disciplinas?.some((d: any) => normalizeText(d.nome || "") === normalizeText(c.nome || ""))
                           ).length}
                         </span>
                      </div>
                      <button 
                        onClick={async () => {
                          setLoading(true)
                          try {
                            const res = await fetch(`/api/questoes?turmaId=${selectedTurma.id}&disciplinaId=${c.disciplinaId}&status=APROVADA`)
                            const data = await res.json()
                            setAvailableQuestions(prev => {
                              const map = new Map(prev.map(q => [q.id, q]))
                              data.forEach((q: any) => map.set(q.id, q))
                              return Array.from(map.values())
                            })
                            setManualSelector({ isOpen: true, discId: c.disciplinaId, discNome: c.nome })
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-tighter mt-1"
                      >
                        <Search size={10} /> Selecionar Manuais
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm shrink-0">
                      <button 
                        onClick={() => {
                          const newConfig = [...config]
                          newConfig[idx].qtd = Math.max(0, newConfig[idx].qtd - 1)
                          setConfig(newConfig)
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded transition-colors font-black"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-blue-600">{c.qtd}</span>
                      <button 
                        onClick={() => {
                          const maxAvailable = filteredAvailableQuestions.filter((q: any) => 
                             q.disciplinas?.some((d: any) => normalizeText(d.nome || "") === normalizeText(c.nome || ""))
                           ).length;
                          const newConfig = [...config]
                          if (newConfig[idx].qtd < maxAvailable) {
                            newConfig[idx].qtd += 1
                            setConfig(newConfig)
                          } else {
                            alert(`Você já atingiu o máximo de questões disponíveis (${maxAvailable}) para esta disciplina com o filtro atual.`)
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded transition-colors font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )})}
              </div>

              <div className="pt-4 border-t border-gray-50 mt-4">
                <p className="text-xs text-center text-gray-400 mb-4">Total de Questões: <span className="font-bold text-indigo-600">{config.reduce((acc, c) => acc + c.qtd, 0)}</span></p>
                <button
                  onClick={handleGenerateDraft}
                  disabled={loading || config.reduce((acc, c) => acc + c.qtd, 0) === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <FileText size={20} />}
                  {config.reduce((acc, c) => acc + c.qtd, 0) === 0 ? "Adicione questões acima" : "Gerar Rascunho"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Preview (Com Sticky Scroll para acompanhar a rolagem) */}
        <div className="xl:col-span-7 space-y-6 xl:sticky xl:top-6 self-start">
          {draftQuestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                    {draftQuestions.length}
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 leading-tight text-sm">Rascunho Gerado</h3>
                    <p className="text-blue-700 text-xs">Você pode trocar questões individuais ou baixar o PDF.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const saved = await saveProva()
                      if (saved) alert("Prova salva no histórico com sucesso!")
                    }}
                    disabled={loading || !!lastSavedProva}
                    className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                        lastSavedProva 
                        ? "bg-green-50 text-green-600 border border-green-200 cursor-not-allowed" 
                        : "bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200"
                    }`}
                  >
                    {lastSavedProva ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {lastSavedProva ? "Salva" : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                        if (!lastSavedProva) {
                            alert("É necessário salvar a prova antes de gerar o PDF.")
                            return
                        }
                        generatePDF(null)
                    }}
                    disabled={loading}
                    className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
                        !lastSavedProva ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Printer size={18} />
                    PDF
                  </button>

                </div>
              </div>

              <div className="space-y-4">
                {draftQuestions.map((q, idx) => (
                  <div key={`${q.id}-${idx}`} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm group hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Questão {idx + 1} • {q.disciplinas[0]?.nome}</span>
                        <div 
                          className={`w-2 h-2 rounded-full ${q.tipo === 'RECUPERACAO' ? 'bg-orange-500' : 'bg-blue-400'}`} 
                          title={q.tipo === 'RECUPERACAO' ? 'Questão de Segunda Chamada' : 'Questão Normal'}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => swapQuestion(idx)}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                        >
                          <RefreshCw size={14} /> Trocar
                        </button>
                        <button 
                          onClick={() => {
                            const q = draftQuestions[idx]
                            setDraftQuestions(draftQuestions.filter((_, i) => i !== idx))
                            
                            // Atualiza qtd no config
                            const newConfig = [...config]
                            const discIdx = newConfig.findIndex(c => q.disciplinas.some((d: any) => d.nome === c.nome))
                            if (discIdx > -1) newConfig[discIdx].qtd = Math.max(0, newConfig[discIdx].qtd - 1)
                            setConfig(newConfig)
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-800 font-medium mb-4 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
                    {q.imagemUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center">
                        <img 
                          src={q.imagemUrl} 
                          alt="Imagem da questão" 
                          className="max-h-48 object-contain"
                        />
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                      {q._count?.provas > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600 uppercase tracking-widest border border-purple-100" title="Já utilizada em outras avaliações">
                          Usada em {q._count.provas} prova{q._count.provas > 1 ? 's' : ''}
                        </span>
                      )}
                      {q.unidade && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-widest border border-indigo-100">
                          {q.unidade}ª Unidade
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">
                        {q.disciplinas[0]?.nome}
                      </span>
                      {q.turmas?.[0] && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200">
                          {q.turmas[0].nome}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 rounded-3xl border border-indigo-100/50 p-12 lg:p-20 text-center flex flex-col items-center justify-center min-h-[500px] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
              
              <div className="relative z-10 w-24 h-24 bg-white shadow-xl shadow-indigo-200/40 rounded-3xl flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-300 border border-indigo-50">
                <Layout size={40} className="text-indigo-600" />
                <div className="absolute -bottom-3 -right-3 bg-amber-400 text-white p-2.5 rounded-xl shadow-lg rotate-12 border-2 border-white">
                  <FileText size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight relative z-10">Sua prova está vazia</h3>
              <p className="text-gray-500 mt-3 max-w-md leading-relaxed relative z-10 text-sm">
                Siga os passos na barra lateral: escolha uma turma, defina a quantidade de questões por disciplina e clique em <b className="text-gray-700">Gerar Rascunho</b> para visualizar e editar sua avaliação.
              </p>
            </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                <HistoryIcon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">Avaliações Recentes</h2>
                  {!loadingHistory && Array.isArray(displayedProvas) && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest hidden sm:block border border-amber-200">
                      {displayedProvas.length} {displayedProvas.length === 1 ? 'Prova' : 'Provas'}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">Registro das últimas provas geradas no sistema.</p>
              </div>
            </div>

            <div className="flex w-full flex-col md:flex-row gap-3">
              <select
                value={historyFilterTurmaId}
                onChange={(e) => setHistoryFilterTurmaId(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 rounded-2xl px-4 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500 w-full md:w-auto flex-1 appearance-none"
              >
                <option value="">Todas as Turmas</option>
                {turmas?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              
              <select
                value={historyFilterTipo}
                onChange={(e) => setHistoryFilterTipo(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 rounded-2xl px-4 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500 w-full md:w-auto flex-1 appearance-none"
              >
                <option value="">Todos os Tipos</option>
                <option value="SIMULADO">Simulado</option>
                <option value="RECUPERAÇÃO">Recuperação</option>
                <option value="DEPENDÊNCIA">Dependência</option>
                <option value="OUTRO">Outro</option>
              </select>

              <select
                value={historyFilterAreaId}
                onChange={(e) => setHistoryFilterAreaId(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 rounded-2xl px-4 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500 w-full md:w-auto flex-1 appearance-none"
              >
                <option value="">Todas as Áreas</option>
                {globalAreas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>

              <select
                value={historyFilterCriadorId}
                onChange={(e) => setHistoryFilterCriadorId(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 rounded-2xl px-4 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500 w-full md:w-auto flex-1 appearance-none"
              >
                <option value="">Todos os Criadores</option>
                {globalCriadores.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar por título ou turma..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {loadingHistory ? (
            <div className="bg-gray-50 rounded-3xl p-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
              <RefreshCw size={40} className="text-gray-300 animate-spin mb-4" />
              <p className="text-gray-400 font-medium">Carregando avaliações...</p>
            </div>
          ) : (!Array.isArray(displayedProvas) || displayedProvas.length === 0) ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">Nenhuma avaliação encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {displayedProvas.map((p: any) => (
                <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-emerald-100">
                        {p.turma?.nome}
                      </span>
                      {p.turma?.curso && (
                        <span title={p.turma.curso} className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-blue-100 flex items-center justify-center">
                          {getCourseIcon(p.turma.curso)}
                        </span>
                      )}
                      {p.area?.nome && (
                        <span className="bg-purple-50 text-purple-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-purple-100">
                          {p.area.nome}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{p.titulo}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileText size={14} className="text-gray-400" />
                      <span>{p.questoes.length} Questões</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <UserIcon size={14} className="text-gray-400" />
                      <span>Criado por: {p.professorCriador?.name || 'Sistema'}</span>
                    </div>
                    {p.savedByUser && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md mt-1 font-medium border border-blue-100">
                          <Save size={12} />
                          <span>Salvo por <b className="font-bold">{p.savedByUser.name}</b> às {new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        editExistingProva(p)
                        setActiveTab('gerador')
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-bold transition-all border border-blue-100"
                      title="Criar cópia para editar"
                    >
                      <Copy size={16} />
                      Editar
                    </button>
                    <button 
                      onClick={async () => {
                        setLoading(true)
                        try {
                          const res = await fetch(`/api/provas/${p.id}`)
                          if (!res.ok) throw new Error("Não foi possível carregar os detalhes.")
                          const fullProva = await res.json()
                          setViewingProva(fullProva)
                        } catch (error) {
                          console.error(error)
                          alert("Erro ao carregar detalhes da prova.")
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-all border border-indigo-100"
                    >
                      <Eye size={16} />
                      Ver
                    </button>

                    <button 
                      onClick={() => deleteProva(p.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100"
                      title="Excluir prova"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pb-8">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loadingHistory}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <div className="text-sm font-medium text-gray-500">
                Página <span className="font-bold text-gray-900">{currentPage}</span> de <span className="font-bold text-gray-900">{totalPages}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loadingHistory}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}


      
      <ManualSelectorModal 
        isOpen={manualSelector.isOpen}
        onClose={() => setManualSelector({ ...manualSelector, isOpen: false })}
        disciplinaNome={manualSelector.discNome}
        questions={filteredAvailableQuestions.filter(q => q.disciplinas?.some((d: any) => normalizeText(d.nome || "") === normalizeText(manualSelector.discNome || "")))}
        selectedIds={draftQuestions.filter(dq => dq.disciplinas?.some((d: any) => d.nome?.trim().toLowerCase() === manualSelector.discNome?.trim().toLowerCase())).map(q => q.id)}
        onFetchSerie={async () => {
          if (!selectedTurma?.serie) {
            alert("Esta turma não possui informação de série cadastrada.")
            return
          }
          try {
            const res = await fetch(`/api/questoes?serie=${selectedTurma.serie}&disciplinaNome=${manualSelector.discNome}&status=APROVADA`)
            const data = await res.json()
            
            if (data.length === 0) {
              alert(`Nenhuma questão adicional de ${manualSelector.discNome} foi encontrada em outras turmas do ${selectedTurma.serie}º ano.`)
              return
            }

            setAvailableQuestions(prev => {
              const map = new Map(prev.map(q => [q.id, q]))
              data.forEach((q: any) => map.set(q.id, q))
              return Array.from(map.values())
            })
            
            alert(`${data.length} questões de outras turmas foram adicionadas à lista!`)
          } catch (error) {
            console.error(error)
            alert("Erro ao buscar questões de outras turmas.")
          }
        }}
        onSelect={(q: any) => {
          const isSelected = draftQuestions.some(dq => dq.id === q.id)
          if (isSelected) {
            setDraftQuestions(draftQuestions.filter(dq => dq.id !== q.id))
            // Atualiza qtd no config também
            const newConfig = [...config]
            const idx = newConfig.findIndex(c => c.disciplinaId === manualSelector.discId)
            if (idx > -1) newConfig[idx].qtd = Math.max(0, newConfig[idx].qtd - 1)
            setConfig(newConfig)
          } else {
            setDraftQuestions([...draftQuestions, q])
            const newConfig = [...config]
            const idx = newConfig.findIndex(c => c.disciplinaId === manualSelector.discId)
            if (idx > -1) newConfig[idx].qtd += 1
            setConfig(newConfig)
          }
        }}
      />



      <PreviewProvaModalWithConfig 
        isOpen={!!viewingProva}
        onClose={() => setViewingProva(null)}
        prova={viewingProva}
        onDownload={(opts: any) => generatePDF(viewingProva, opts)}
        onDelete={() => viewingProva?.id && deleteProva(viewingProva.id)}
      />
    </div>
    </>
  )
}

const PreviewProvaModalWithConfig = ({ isOpen, onClose, prova, onDownload, onDelete }: any) => {

  const [localLayout, setLocalLayout] = useState<1 | 2>(1)
  const [localAmpliada, setLocalAmpliada] = useState(false)

  if (!isOpen || !prova) return null

  const questoes = prova.questoes || []

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900">
          <div>
            <h2 className="text-xl font-bold">{prova.titulo}</h2>
            <p className="text-sm text-gray-500">{prova.turma?.nome} • {questoes.length} Questões</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30">
          {questoes.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p>Carregando detalhes das questões...</p>
            </div>
          ) : (
            questoes.map((q: any, idx: number) => (
              <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Questão {idx + 1}</span>
                <div className="text-gray-800 font-medium mb-4 leading-relaxed overflow-hidden break-words w-full" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
                {q.imagemUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center">
                    <img 
                      src={q.imagemUrl} 
                      alt="Imagem da questão" 
                      className="max-h-64 object-contain"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {['A', 'B', 'C', 'D', 'E'].map(letter => (
                    <div key={letter} className={`p-3 rounded-xl border flex gap-3 ${
                      q.correta === letter 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-bold' 
                      : 'bg-gray-50 border-gray-50 text-gray-500'
                    }`}>
                      <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] ${
                        q.correta === letter ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {letter}
                      </span>
                      {q[`alternativa${letter}`] && (
                        <div className="flex-1 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: q[`alternativa${letter}`] }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Formato</label>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setLocalLayout(1)}
                  disabled={localAmpliada}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    localLayout === 1 && !localAmpliada
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                  } disabled:opacity-30`}
                >
                  1 Coluna
                </button>
                <button 
                  onClick={() => setLocalLayout(2)}
                  disabled={localAmpliada}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    localLayout === 2 && !localAmpliada
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                  } disabled:opacity-30`}
                >
                  2 Colunas
                </button>
              </div>
            </div>

            <button 
              onClick={() => setLocalAmpliada(!localAmpliada)}
              className={`flex items-center gap-3 px-4 py-1.5 rounded-xl border-2 transition-all group ${
                localAmpliada 
                ? 'bg-amber-50 border-amber-500 text-amber-700' 
                : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 text-left">
                <Eye size={16} className={localAmpliada ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-500'} />
                <div>
                  <p className="text-[11px] font-bold leading-tight">Prova Ampliada</p>
                  <p className="text-[9px] font-medium opacity-70 leading-tight">Acessibilidade</p>
                </div>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${localAmpliada ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${localAmpliada ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            <button 
              onClick={onDelete}
              className="px-3 py-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              Excluir
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors mr-2"
            >
              Fechar
            </button>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => onDownload({ layout: localLayout, ampliada: localAmpliada })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileDown size={16} />
                Gerar PDF
              </button>
              
              <button 
                onClick={() => onDownload({ layout: localLayout, ampliada: localAmpliada, apenasGabarito: true })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                title="Gerar apenas o Gabarito do Professor"
              >
                <ClipboardCheck size={16} />
                Gerar Gabarito
              </button>
              
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
