"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Accessibility, CheckCircle2, Pencil, Save, Trash2, Upload, Users } from "lucide-react"
import { Alert, BarraSalvar, Button, CabecalhoPagina, IndicadorGravacao, RodapeRastreio, Checkbox, Field, Input, ListaDescritiva, Painel, Textarea, buttonClasses } from "@/components/ui"
import { useToast } from "@/components/ui/Toast"
import { mascaraTelefone, telefoneValido } from "@/lib/navegador/mascaras"
import { CIDS_AEE } from "@/lib/constants-aee"
import { can } from "@/lib/rbac"

export default function AEEProfileClient({ 
  usuario, 
  estudante, 
  perfilExistente,
  jaAtestado,
  comCabecalhoDaFicha = false,
}: { 
  usuario: any, 
  estudante: any, 
  perfilExistente: any,
  jaAtestado: boolean
  /** a página já mostra o cabeçalho da ficha do estudante (com as abas) */
  comCabecalhoDaFicha?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
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

  const handleSave = async (): Promise<boolean> => {
    if (!isDirecao) return false
    setLoading(true)
    try {
      const res = await fetch(`/api/estudantes/${estudante.matricula}/aee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        router.refresh()
        setGravado(JSON.stringify(formData))
        setSalvoEm(new Date())
        toast('Ficha AEE salva.')
        return true
      }
      toast('Não foi possível salvar a ficha. Tente novamente.', 'error')
      return false
    } catch {
      toast('Não foi possível salvar a ficha. Verifique a conexão e tente novamente.', 'error')
      return false
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

  const [editando, setEditando] = useState(isDirecao && !perfilExistente)
  const [gravado, setGravado] = useState(() => JSON.stringify(formData))
  const [salvoEm, setSalvoEm] = useState<Date | null>(null)
  const alteracoesPendentes = editando && JSON.stringify(formData) !== gravado
  const salvarESair = async () => {
    if (!telefoneValido(formData.contatoTelefone)) { toast('Confira o telefone do contato de emergência.', 'error'); return }
    if (await handleSave()) setEditando(false)
  }
  /** No modo de edição as seções ficam numeradas (formulário longo) */
  const secao = (n: number, nome: string) => (editando ? `${n}. ${nome}` : nome)
  const nomeCid = (code: string) => CIDS_AEE.find((c: any) => c.code === code)?.label || 'CID específico'
  const minhaLeitura = perfilExistente?.acknowledgements?.find((ack: any) => ack.user.id === usuario.id)?.readAt

  const textoLeitura = (texto: string, vazio: string) => (
    <p className={texto ? 'whitespace-pre-wrap text-sm leading-relaxed text-fg' : 'text-sm text-fg-disabled'}>{texto || vazio}</p>
  )

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      {!comCabecalhoDaFicha && (
        <CabecalhoPagina
          titulo="Ficha de atendimento educacional especializado"
          caminho={[{ label: 'Início', href: '/dashboard' }, { label: 'Atendimento AEE', href: '/dashboard/aee' }, { label: estudante.nome }]}
          dados={[{ rotulo: 'Estudante', valor: estudante.nome }, { rotulo: 'Matrícula', valor: <span className="font-mono">{estudante.matricula}</span> }, { rotulo: 'Turma', valor: estudante.turma.nome }]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Accessibility size={16} strokeWidth={1.75} aria-hidden className="text-fg-subtle" />
          {editando ? 'Editando a ficha AEE' : 'Ficha AEE em modo leitura'}
        </p>
        {isDirecao && (
          editando ? null : (
            <Button variant="secondary" onClick={() => setEditando(true)}><Pencil size={14} strokeWidth={1.75} aria-hidden /> Editar ficha</Button>
          )
        )}
      </div>

      {/* Professor da turma: ciência da leitura (mesma ação de antes) */}
      {!isDirecao && (
        <Alert
          tone={atestado ? 'success' : 'warning'}
          title={atestado ? 'Leitura confirmada' : 'Confirme a leitura desta ficha'}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {atestado
                ? `Você confirmou a leitura em ${new Date(minhaLeitura || new Date()).toLocaleDateString('pt-BR')}.`
                : 'Como professor deste estudante, leia as orientações abaixo e confirme sua ciência.'}
            </span>
            {!atestado && <Button size="sm" onClick={handleAtestar} loading={loading}>Confirmar leitura</Button>}
          </div>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Painel titulo={secao(1, "Identificação")}>
            <div className="flex items-center gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-painel border border-line bg-subtle">
                {formData.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formData.fotoUrl} alt={estudante.nome} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center"><Users size={24} strokeWidth={1.5} className="text-fg-disabled" aria-hidden /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-fg">{estudante.nome}</p>
                <p className="font-mono text-xs text-fg-muted">{estudante.matricula}</p>
                <p className="text-xs text-fg-muted">Turma {estudante.turma.nome}</p>
              </div>
            </div>
            {editando && (
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'cursor-pointer' })}>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                  <Upload size={14} strokeWidth={1.75} aria-hidden /> {formData.fotoUrl ? 'Trocar foto' : 'Enviar foto'}
                </label>
                {formData.fotoUrl && (
                  <Button size="sm" variant="ghost" onClick={() => setFormData({ ...formData, fotoUrl: '' })}><Trash2 size={14} strokeWidth={1.75} aria-hidden /> Remover foto</Button>
                )}
              </div>
            )}
          </Painel>

          <Painel titulo={secao(2, "Necessidades na avaliação")}>
            {editando ? (
              <div className="space-y-2.5">
                <Checkbox label="Prova adaptada" checked={formData.precisaProvaAdaptada} onChange={(e) => setFormData({ ...formData, precisaProvaAdaptada: e.target.checked })} />
                <Checkbox label="Prova em sala especial" checked={formData.precisaProvaSalaEspecial} onChange={(e) => setFormData({ ...formData, precisaProvaSalaEspecial: e.target.checked })} />
              </div>
            ) : (
              <ListaDescritiva colunas={1} itens={[
                { rotulo: 'Prova adaptada', valor: formData.precisaProvaAdaptada ? 'Sim' : 'Não' },
                { rotulo: 'Prova em sala especial', valor: formData.precisaProvaSalaEspecial ? 'Sim' : 'Não' },
              ]} />
            )}
          </Painel>

          <Painel titulo={secao(3, "Diagnóstico (CID)")} semRecuo={editando}>
            {editando ? (
              <div>
                <div className="border-b border-line-subtle px-painel py-2.5">
                  <Input placeholder="Filtrar CIDs" value={cidSearch} onChange={(e) => setCidSearch(e.target.value)} aria-label="Filtrar CIDs" />
                </div>
                <ul className="max-h-64 divide-y divide-line-subtle overflow-y-auto">
                  {filteredCIDs.map((c: any) => (
                    <li key={c.code}>
                      <label className="flex cursor-pointer items-start gap-2.5 px-painel py-2 text-13 hover:bg-subtle/60">
                        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={formData.cids.includes(c.code)} onChange={() => toggleCID(c.code)} />
                        <span className="w-12 shrink-0 font-mono text-fg-muted">{c.code}</span>
                        <span className="text-fg">{c.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : formData.cids.length > 0 ? (
              <ul className="space-y-1.5">
                {formData.cids.map((code: string) => (
                  <li key={code} className="flex items-start gap-2.5 text-sm">
                    <span className="w-12 shrink-0 font-mono text-13 text-fg-muted">{code}</span>
                    <span className="text-fg">{nomeCid(code)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-fg-disabled">Nenhum CID informado.</p>}
          </Painel>

          <Painel titulo={secao(4, "Contato de emergência")}>
            {editando ? (
              <div className="space-y-3">
                <Field label="Nome do contato">{(p) => <Input {...p} value={formData.contatoNome} onChange={(e) => setFormData({ ...formData, contatoNome: e.target.value })} placeholder="Ex.: Maria (mãe)" />}</Field>
                <Field label="Telefone" hint="Com DDD." error={telefoneValido(formData.contatoTelefone) ? undefined : "Informe o telefone com DDD: (00) 00000-0000."}>{(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" value={formData.contatoTelefone} onChange={(e) => setFormData({ ...formData, contatoTelefone: mascaraTelefone(e.target.value) })} placeholder="(00) 00000-0000" className="font-mono" />}</Field>
              </div>
            ) : (
              <ListaDescritiva colunas={1} itens={[
                { rotulo: 'Nome', valor: formData.contatoNome },
                { rotulo: 'Telefone', valor: formData.contatoTelefone ? <span className="font-mono">{formData.contatoTelefone}</span> : null },
              ]} />
            )}
          </Painel>
        </div>

        <div className="space-y-4 lg:col-span-8">
          <Painel titulo={secao(5, "Contexto e condição do estudante")}>
            {editando
              ? <Textarea rows={5} value={formData.condicao} onChange={(e) => setFormData({ ...formData, condicao: e.target.value })} placeholder="Descreva a condição pedagógica e médica do estudante" aria-label="Contexto e condição do estudante" />
              : textoLeitura(formData.condicao, 'Sem descrição.')}
          </Painel>

          <Painel titulo={secao(6, "Orientações para o professor")} className="border-success-line">
            {editando
              ? <Textarea rows={8} value={formData.recomendacoes} onChange={(e) => setFormData({ ...formData, recomendacoes: e.target.value })} placeholder="Avaliações, tempo adicional, fonte ampliada, apoio em sala" aria-label="Orientações para o professor" />
              : textoLeitura(formData.recomendacoes, 'Sem orientações cadastradas.')}
          </Painel>

          <Painel titulo={secao(7, "Observações internas")} rodape={perfilExistente ? <RodapeRastreio criadoEm={new Date(perfilExistente.createdAt)} alteradoEm={new Date(perfilExistente.updatedAt)} /> : undefined}>
            {editando
              ? <Textarea rows={3} value={formData.notasDirecao} onChange={(e) => setFormData({ ...formData, notasDirecao: e.target.value })} placeholder="Informações administrativas adicionais" aria-label="Observações internas" />
              : textoLeitura(formData.notasDirecao, 'Sem observações.')}
          </Painel>

          {/* Confirmações de leitura (só quem edita a ficha vê) */}
          {isDirecao && perfilExistente?.acknowledgements?.length > 0 && (
            <Painel titulo="Professores que confirmaram a leitura" semRecuo>
              <ul className="divide-y divide-line-subtle">
                {perfilExistente.acknowledgements.map((ack: any) => (
                  <li key={ack.id} className="flex h-linha items-center justify-between gap-3 px-painel text-13">
                    <span className="flex items-center gap-2 text-fg"><CheckCircle2 size={14} strokeWidth={1.75} aria-hidden className="text-success-fg" />{ack.user.name}</span>
                    <span className="tabular-nums text-fg-muted">{new Date(ack.readAt).toLocaleDateString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            </Painel>
          )}
        </div>
      </div>

      {editando && isDirecao && (
        <BarraSalvar estado={<IndicadorGravacao pendente={alteracoesPendentes} salvando={loading} salvoEm={salvoEm} />}>
          {perfilExistente && <Button variant="secondary" onClick={() => setEditando(false)} disabled={loading}>Cancelar</Button>}
          <Button onClick={salvarESair} loading={loading}>{!loading && <Save size={16} strokeWidth={1.75} aria-hidden />} Salvar ficha</Button>
        </BarraSalvar>
      )}
    </div>
  )
}
