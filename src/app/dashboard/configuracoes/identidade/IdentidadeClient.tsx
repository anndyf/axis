"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, RotateCcw, LayoutDashboard, Users, ClipboardCheck, FileText } from "lucide-react"
import { Button, Card, CardBody, CardHeader, CardFooter, Field, Input, Alert, Badge } from "@/components/ui"
import { useToast } from "@/components/ui/Toast"
import { avaliarCor, normalizarHex, textoSobre } from "@/lib/services/identidade"
import { salvarIdentidade } from "./actions"

const LADO_MAX = 256

/** Reduz a imagem no navegador (até 256px) e devolve PNG, ou JPEG se o PNG passar de 150 KB. */
async function reduzirImagem(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => falha(new Error("Não foi possível ler a imagem."))
      i.src = url
    })
    const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.width * escala))
    canvas.height = Math.max(1, Math.round(img.height * escala))
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const png = canvas.toDataURL("image/png")
    return png.length < 190_000 ? png : canvas.toDataURL("image/jpeg", 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function IdentidadeClient({ nomeEscola, corInicial, logoInicial, corPadrao }: { nomeEscola: string; corInicial: string; logoInicial: string; corPadrao: string }) {
  const router = useRouter()
  const toast = useToast()
  const [cor, setCor] = useState(corInicial)
  const [logo, setLogo] = useState(logoInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  const corEfetiva = normalizarHex(cor) ?? corPadrao
  const avaliacao = useMemo(() => avaliarCor(corEfetiva), [corEfetiva])
  const corInvalida = cor.trim() !== "" && !normalizarHex(cor)
  const logoEnviado = logo.startsWith("data:")
  const estiloPrevia = { "--accent": corEfetiva, "--on-accent": textoSobre(corEfetiva) } as React.CSSProperties

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    const r = await salvarIdentidade({ corPrimaria: cor.trim() || null, logoUrl: logo.trim() || null })
    setSalvando(false)
    if ("erro" in r) { setErro(r.erro); return }
    toast("Identidade visual salva.")
    router.refresh()
  }

  const escolherArquivo = async (f?: File) => {
    if (!f) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) { setErro("Envie uma imagem PNG, JPEG ou WebP."); return }
    try {
      setErro(null)
      setLogo(await reduzirImagem(f))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Configuração" />
        <CardBody className="space-y-6">
          <Field label="Cor de destaque" hint={`Formato #RRGGBB. Em branco, usa o padrão do Áxis (${corPadrao}).`} error={corInvalida ? "Cor inválida. Use o formato #RRGGBB." : undefined}>
            {(p) => (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Escolher cor"
                  value={corEfetiva}
                  onChange={(e) => setCor(e.target.value)}
                  className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
                />
                <Input {...p} value={cor} onChange={(e) => setCor(e.target.value)} placeholder={corPadrao} className="font-mono" maxLength={7} />
                {cor && (
                  <Button variant="ghost" size="sm" onClick={() => setCor("")} aria-label="Voltar à cor padrão" title="Voltar à cor padrão">
                    <RotateCcw size={16} strokeWidth={1.75} />
                  </Button>
                )}
              </div>
            )}
          </Field>

          {avaliacao && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone={avaliacao.contrasteTexto >= 4.5 ? "success" : "danger"}>Texto do botão: {avaliacao.contrasteTexto.toFixed(1).replace(".", ",")}:1</Badge>
                <Badge tone={avaliacao.contrasteFundo >= 3 ? "success" : "danger"}>Sobre o fundo branco: {avaliacao.contrasteFundo.toFixed(1).replace(".", ",")}:1</Badge>
                <Badge>Texto sobre a cor: {avaliacao.textoSobre === "#ffffff" ? "branco" : "escuro"} (automático)</Badge>
              </div>
              {avaliacao.avisos.map((a) => <Alert key={a} tone="warning">{a}</Alert>)}
            </div>
          )}

          <div className="space-y-3">
            <Field label="Logo" opcional hint="Envie uma imagem (reduzida para até 256px; aparece também nos PDFs) ou informe um endereço https (só nas telas).">
              {(p) => (
                <Input {...p} value={logoEnviado ? "" : logo} onChange={(e) => setLogo(e.target.value)} placeholder={logoEnviado ? "Imagem enviada" : "https://"} disabled={logoEnviado} />
              )}
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Enviar imagem do logo" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
              <Button variant="secondary" size="sm" onClick={() => arquivo.current?.click()}><Upload size={16} strokeWidth={1.75} /> Enviar imagem</Button>
              {logo && <Button variant="ghost" size="sm" onClick={() => setLogo("")}>Remover logo</Button>}
            </div>
          </div>

          {erro && <Alert tone="danger">{erro}</Alert>}
        </CardBody>
        <CardFooter>
          <Button onClick={salvar} loading={salvando} disabled={corInvalida}>Salvar identidade</Button>
        </CardFooter>
      </Card>

      {/* Pré-visualização ao vivo: os tokens de destaque recalculam dentro de [data-accent] */}
      <Card data-accent style={estiloPrevia} className="overflow-hidden">
        <CardHeader title="Pré-visualização" description="Como fica antes de salvar." />
        <CardBody className="space-y-5 bg-canvas">
          <div className="flex overflow-hidden rounded-lg border border-line bg-surface">
            <div className="w-44 shrink-0 space-y-1 border-r border-line bg-canvas p-2">
              <div className="flex items-center gap-2 px-1 py-1.5">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="size-6 rounded object-contain" />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded bg-accent text-xs font-semibold text-on-accent">{nomeEscola.charAt(0)}</span>
                )}
                <span className="truncate text-xs font-semibold text-fg">{nomeEscola}</span>
              </div>
              {[{ i: LayoutDashboard, t: "Dashboard" }, { i: ClipboardCheck, t: "Chamada", ativo: true }, { i: FileText, t: "Lançar notas" }, { i: Users, t: "Turmas" }].map(({ i: Icone, t, ativo }) => (
                <div key={t} className={`relative flex h-7 items-center gap-2 rounded-md px-2 text-xs ${ativo ? "bg-subtle font-medium text-fg" : "text-fg-muted"}`}>
                  {ativo && <span className="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
                  <Icone size={14} strokeWidth={1.75} className={ativo ? "text-accent" : "text-fg-subtle"} /> {t}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1 space-y-3 p-4">
              <p className="text-sm font-semibold text-fg">Chamada de hoje</p>
              <p className="text-xs text-fg-muted">Marque só quem faltou. <span className="text-accent-fg underline">Ver diário</span></p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Salvar chamada</Button>
                <Button size="sm" variant="secondary">Cancelar</Button>
              </div>
              <Badge tone="accent">Destaque</Badge>
            </div>
          </div>

          <div className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-2">
            <div className="space-y-2 p-4">
              <p className="text-sm font-semibold text-fg">Entrar</p>
              <div className="h-8 rounded-md border border-line bg-surface" />
              <div className="h-8 rounded-md border border-accent ring-3 ring-ring/40" />
              <div className="flex h-8 items-center justify-center rounded-md bg-accent text-xs font-medium text-on-accent">Entrar</div>
            </div>
            <div className="hidden flex-col justify-end bg-accent p-4 text-on-accent sm:flex">
              <p className="text-sm font-semibold">{nomeEscola}</p>
              <p className="text-xs opacity-80">Sistema de Gestão Escolar</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
