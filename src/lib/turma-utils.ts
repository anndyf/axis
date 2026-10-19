import { 
  Users, Monitor, Network, Microscope, ShieldAlert, Stethoscope, 
  Construction, Sprout, Settings, FlaskConical, Truck, 
  ClipboardList, Apple, Video, HardHat, Scale, LucideIcon,
  Leaf, HeartPulse, Cpu, Wifi, DatabaseZap, Package,
  Building2, Beaker, ShieldCheck, Gavel, Clapperboard,
  ChefHat, Factory, TreePine, BriefcaseMedical, SquareActivity,
  Ambulance
} from "lucide-react"

// ── Mapa de Siglas → Nome Curto (para decodeTurma) ────────────────────────
export const MAP_CURSOS: Record<string, string> = {
  "I":    "Informática",
  "INF":  "Informática",
  "VS":   "Vigilância em Saúde",
  "PV": "Produção de Áudio e Vídeo",
  "EL":   "Eletromecânica",
  "ELE":  "Eletromecânica",
  "A":  "Agroecologia",
  "ND": "Nutrição e Dietética",
  "PC": "Planejamento e Controle de Produção",
  "Q":  "Química",
  "RC": "Redes de Computadores",
  "ED": "Edificações",
  "AC":   "Análises Clínicas",
  "ACM":  "Análises Clínicas",
  "ST": "Segurança do Trabalho",
  "SJ": "Serviços Jurídicos",
  "E":  "Enfermagem",
  "MA": "Meio Ambiente",
  "ADM": "Administração",
  "LOG": "Logística",
}

export const MAP_TURNOS: Record<string, string> = {
  "M": "Matutino",
  "V": "Vespertino",
  "N": "Noturno",
  "I": "Integral"
}

// ── Cores por Categoria ────────────────────────────────────────────────────
// 🔴 Vermelho/Rosa  → Tecnologia da Informação
// 🔵 Azul/Céu       → Saúde
// 🟢 Verde          → Meio Ambiente / Agronomia
// 🟡 Âmbar/Laranja  → Administração / Logística
// 🟣 Índigo/Roxo    → Produção / Jurídico / Criativo
// ⚫ Slate          → Segurança do Trabalho
// 🩵 Teal           → Química / Engenharia

type CorTurma = { bg: string; shadow: string }

const CORES: Record<string, CorTurma> = {
  // TI — Vermelho/ Rosa
  "Informática":                           { bg: "bg-danger",    shadow: "" },
  "Técnico em Informática":               { bg: "bg-danger",    shadow: "" },
  "Redes de Computadores":                { bg: "bg-danger",     shadow: ""  },
  "Técnico em Redes de Computadores":     { bg: "bg-danger",     shadow: ""  },

  // Saúde — Azul
  "Análises Clínicas":                    { bg: "bg-accent",    shadow: "" },
  "Técnico em Análises Clínicas":         { bg: "bg-accent",    shadow: "" },
  "Vigilância Sanitária":                 { bg: "bg-accent",    shadow: "" },
  "Vigilância em Saúde":                  { bg: "bg-accent",    shadow: "" },
  "Técnica em Vigilância em Saúde":       { bg: "bg-accent",    shadow: "" },
  "Técnico em Vigilância em Saúde":       { bg: "bg-accent",    shadow: "" },
  "Enfermagem":                           { bg: "bg-accent",     shadow: ""  },
  "Técnico em Enfermagem":                { bg: "bg-accent",     shadow: ""  },
  "Nutrição e Dietética":                 { bg: "bg-accent",    shadow: "" },
  "Técnico em Nutrição e Dietética":      { bg: "bg-accent",    shadow: "" },

  // Meio Ambiente / Agronomia — Verde
  "Agroecologia":                         { bg: "bg-success",   shadow: ""   },
  "Técnico em Agroecologia":              { bg: "bg-success",   shadow: ""   },
  "Meio Ambiente":                        { bg: "bg-success", shadow: "" },
  "Técnico em Meio Ambiente":             { bg: "bg-success", shadow: "" },

  // Administração / Logística — Âmbar / Laranja
  "Administração":                        { bg: "bg-warning",   shadow: ""  },
  "Técnico em Administração":             { bg: "bg-warning",   shadow: ""  },
  "Logística":                            { bg: "bg-warning",  shadow: "" },
  "Técnico em Logística":                 { bg: "bg-warning",  shadow: "" },
  "Planejamento e Controle de Produção":  { bg: "bg-warning",  shadow: "" },
  "Técnico em Planejamento e Controle de Produção": { bg: "bg-warning", shadow: "" },
  "Técnico em Planejamento e Controle de Produção ": { bg: "bg-warning", shadow: "" }, // trailing space

  // Engenharia / Construção — Teal / Ciano
  "Edificações":                          { bg: "bg-success",    shadow: ""    },
  "Técnico em Edificações":               { bg: "bg-success",    shadow: ""    },
  "Eletromecânica":                       { bg: "bg-success",    shadow: ""    },
  "Técnico em Eletromecânica":            { bg: "bg-success",    shadow: ""    },
  "Química":                              { bg: "bg-accent",  shadow: ""  },
  "Técnico em Química":                   { bg: "bg-accent",  shadow: ""  },

  // Criativo / Cultural — Índigo / Roxo
  "Produção de Áudio e Vídeo":            { bg: "bg-accent",  shadow: "" },
  "Técnico em Produção de Áudio e Vídeo": { bg: "bg-accent",  shadow: "" },

  // Jurídico — Índigo Escuro
  "Serviços Jurídicos":                   { bg: "bg-accent",  shadow: "" },
  "Técnico em Serviços Jurídicos":        { bg: "bg-accent",  shadow: "" },

  // Segurança — Slate Escuro
  "Segurança do Trabalho":                { bg: "bg-zinc-700",   shadow: "" },
  "Técnico em Segurança do Trabalho":     { bg: "bg-zinc-700",   shadow: "" },
}

// ── Ícones por Curso ───────────────────────────────────────────────────────
const ICONS: Record<string, LucideIcon> = {
  // TI
  "Informática":                           Monitor,
  "Técnico em Informática":               Monitor,
  "Redes de Computadores":                Wifi,
  "Técnico em Redes de Computadores":     Wifi,

  // Saúde
  "Análises Clínicas":                    Microscope,
  "Técnico em Análises Clínicas":         Microscope,
  "Vigilância Sanitária":                 ShieldAlert,
  "Vigilância em Saúde":                  ShieldAlert,
  "Técnica em Vigilância em Saúde":       ShieldAlert,
  "Técnico em Vigilância em Saúde":       ShieldAlert,
  "Enfermagem":                           Stethoscope,
  "Técnico em Enfermagem":                Stethoscope,
  "Nutrição e Dietética":                 Apple,
  "Técnico em Nutrição e Dietética":      Apple,

  // Meio Ambiente / Agronomia
  "Agroecologia":                         Sprout,
  "Técnico em Agroecologia":              Sprout,
  "Meio Ambiente":                        TreePine,
  "Técnico em Meio Ambiente":             TreePine,

  // Administração / Logística
  "Administração":                        ClipboardList,
  "Técnico em Administração":             ClipboardList,
  "Logística":                            Truck,
  "Técnico em Logística":                 Truck,
  "Planejamento e Controle de Produção":  Package,
  "Técnico em Planejamento e Controle de Produção": Package,
  "Técnico em Planejamento e Controle de Produção ": Package,

  // Engenharia / Construção
  "Edificações":                          Building2,
  "Técnico em Edificações":               Building2,
  "Eletromecânica":                       Settings,
  "Técnico em Eletromecânica":            Settings,
  "Química":                              FlaskConical,
  "Técnico em Química":                   FlaskConical,

  // Criativo
  "Produção de Áudio e Vídeo":            Clapperboard,
  "Técnico em Produção de Áudio e Vídeo": Clapperboard,

  // Jurídico
  "Serviços Jurídicos":                   Scale,
  "Técnico em Serviços Jurídicos":        Scale,

  // Segurança
  "Segurança do Trabalho":                HardHat,
  "Técnico em Segurança do Trabalho":     HardHat,
}

// ── Lookup com fallback inteligente ───────────────────────────────────────
function normalizarCurso(curso: string): string {
  // Remove trailing spaces e normaliza
  return curso.trim()
}

function buscarPorPalavraChave(nome: string): string | null {
  const n = nome.toLowerCase()
  if (n.includes("informática") || n.includes("informatica")) return "Informática"
  if (n.includes("redes")) return "Redes de Computadores"
  if (n.includes("análises clínicas") || n.includes("analises clinicas")) return "Análises Clínicas"
  if (n.includes("vigilância") || n.includes("vigilancia")) return "Vigilância em Saúde"
  if (n.includes("enfermagem")) return "Enfermagem"
  if (n.includes("nutrição") || n.includes("nutricao")) return "Nutrição e Dietética"
  if (n.includes("meio ambiente")) return "Meio Ambiente"
  if (n.includes("agroecologia")) return "Agroecologia"
  if (n.includes("administração") || n.includes("administracao")) return "Administração"
  if (n.includes("logística") || n.includes("logistica")) return "Logística"
  if (n.includes("planejamento")) return "Planejamento e Controle de Produção"
  if (n.includes("edificações") || n.includes("edificacoes")) return "Edificações"
  if (n.includes("eletromecânica") || n.includes("eletromecanica")) return "Eletromecânica"
  if (n.includes("química") || n.includes("quimica")) return "Química"
  if (n.includes("áudio") || n.includes("audio") || n.includes("vídeo") || n.includes("video")) return "Produção de Áudio e Vídeo"
  if (n.includes("jurídico") || n.includes("juridico")) return "Serviços Jurídicos"
  if (n.includes("segurança") || n.includes("seguranca")) return "Segurança do Trabalho"
  return null
}

export function getTurmaColor(curso: string | null): CorTurma {
  const fallback = { bg: "bg-accent", shadow: "" }
  if (!curso) return fallback

  const nome = normalizarCurso(curso)
  if (CORES[nome]) return CORES[nome]

  // Busca por palavra-chave
  const chave = buscarPorPalavraChave(nome)
  if (chave && CORES[chave]) return CORES[chave]

  return fallback
}

export function getTurmaIcon(curso: string | null): LucideIcon {
  if (!curso) return Users

  const nome = normalizarCurso(curso)
  if (ICONS[nome]) return ICONS[nome]

  // Busca por palavra-chave
  const chave = buscarPorPalavraChave(nome)
  if (chave && ICONS[chave]) return ICONS[chave]

  return Users
}

export function decodeTurma(nome: string) {
  // Padrão novo:  2TIN1E   (PROEJA)  — série + T + sigla + turno + numero + E
  //               2TIM1SUB (Subseq.) — série + T + sigla + turno + numero + SUB
  //               1TIM1    (EPTM)    — série + T + sigla + turno + numero
  const match = nome.match(/^(\d+)T([A-Z]+)([MVNI])(\d+)(E|SUB)?$/i)
  if (!match) return { curso: null, turno: null }

  const sigla = match[2]
  const turnoInic = match[3]

  return {
    curso: MAP_CURSOS[sigla] || null,
    turno: MAP_TURNOS[turnoInic] || null
  }
}

// Retrocompatibilidade
export const MAP_CORES = CORES
export const MAP_ICONS = ICONS
