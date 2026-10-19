"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Check, AlertCircle, Save, ClipboardList, ChevronRight, CalendarDays, Palette, type LucideIcon } from "lucide-react"
import { Button, Card, CardBody, CardFooter, CardHeader, PageHeader, Select, Skeleton, Switch } from "@/components/ui"
import ConfirmModal from "@/components/ConfirmModal"

const ATALHOS: { href: string; icon: LucideIcon; titulo: string; descricao: string }[] = [
  { href: "/dashboard/configuracoes/avaliacao", icon: ClipboardList, titulo: "Esquemas de avaliação", descricao: "Unidades, atividades e regras de recuperação da escola." },
  { href: "/dashboard/configuracoes/calendario", icon: CalendarDays, titulo: "Calendário letivo", descricao: "Início e fim do ano, datas das unidades, feriados, sábados letivos e tempos de aula." },
  { href: "/dashboard/configuracoes/identidade", icon: Palette, titulo: "Identidade visual", descricao: "Logo e cor de destaque da escola no sistema, no login e nos PDFs." },
]

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isBancoAtivo, setIsBancoAtivo] = useState(true)
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setIsBancoAtivo(data.bancoQuestoesAtivo)
        setAnoLetivo(data.anoLetivoAtual || new Date().getFullYear())
        setAvailableYears(data.availableYears || [new Date().getFullYear()])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setSaving(true)
    setShowConfirm(false)
    setMessage(null)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isBancoQuestoesAtivo: isBancoAtivo,
          anoLetivoAtual: Number(anoLetivo)
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' })
        // Força atualização da página para refletir no sidebar se necessário
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configurações.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Configurações" description="Funcionalidades globais da escola e acesso dos professores." />

      <Card>
        <ul className="divide-y divide-line-subtle">
          {ATALHOS.map(({ href, icon: Icon, titulo, descricao }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-subtle/60 sm:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-subtle text-fg-muted" aria-hidden>
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{titulo}</span>
                  <span className="block text-13 text-fg-muted">{descricao}</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-disabled transition-colors duration-150 group-hover:text-fg-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Módulos pedagógicos" description="Valem para todos os usuários da escola." />
        {loading ? (
          <CardBody className="space-y-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </CardBody>
        ) : (
          <ul className="divide-y divide-line-subtle">
            <li className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <label htmlFor="cfg-banco" className="block text-sm font-medium text-fg">Banco de questões</label>
                <p className="text-13 text-fg-muted">Permitir que professores enviem e consultem o banco de questões.</p>
              </div>
              <Switch id="cfg-banco" checked={isBancoAtivo} onChange={setIsBancoAtivo} />
            </li>
            <li className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <label htmlFor="cfg-ano" className="block text-sm font-medium text-fg">Ano letivo ativo</label>
                <p className="text-13 text-fg-muted">Ano exibido e gerenciado no sistema.</p>
              </div>
              <Select id="cfg-ano" value={anoLetivo} onChange={(e) => setAnoLetivo(Number(e.target.value))} className="w-28 tabular-nums">
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </li>
          </ul>
        )}
        <CardFooter className="justify-between">
          <div role="status">
            {message && (
              <p className={`flex items-center gap-1.5 text-13 font-medium ${message.type === 'success' ? 'text-success-fg' : 'text-danger-fg'}`}>
                {message.type === 'success' ? <Check size={16} strokeWidth={1.75} /> : <AlertCircle size={16} strokeWidth={1.75} />}
                {message.text}
              </p>
            )}
          </div>
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            {!saving && <Save size={16} strokeWidth={1.75} />} Salvar alterações
          </Button>
        </CardFooter>
      </Card>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSave}
        title="Salvar configurações?"
        message="Estas alterações afetam o comportamento do sistema para todos os usuários da escola."
        confirmText="Salvar"
        variant="info"
      />
    </div>
  )
}
