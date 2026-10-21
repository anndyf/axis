/**
 * Exportar (CSV) do que está na tela: gera o arquivo no navegador a partir
 * das linhas já carregadas, sem consulta nova ao servidor. Separador ";" e
 * BOM UTF-8 para o Excel em português abrir com acentos e colunas certas.
 */
export interface ColunaCSV<T> {
  titulo: string
  valor: (linha: T) => string | number | null | undefined
}

function celula(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const texto = typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v)
  // Evita que o Excel interprete texto como fórmula (=, +, -, @)
  const seguro = /^[=+\-@]/.test(texto) && typeof v !== 'number' ? `'${texto}` : texto
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

export function paraCSV<T>(colunas: ColunaCSV<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(';')
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'))
  return [cabecalho, ...corpo].join('\r\n')
}

/** Nome de arquivo seguro: "Turmas 2026" -> "turmas-2026.csv". */
export function nomeArquivoCSV(nome: string): string {
  const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base || 'exportacao'}.csv`
}

export function baixarCSV<T>(nome: string, colunas: ColunaCSV<T>[], linhas: T[]) {
  const blob = new Blob(['﻿' + paraCSV(colunas, linhas)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivoCSV(nome)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
