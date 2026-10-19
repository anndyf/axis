"use client"

import { useState, type ReactNode } from "react"
import { Plus, Download, MoreHorizontal, Pencil, Trash2, Users, Search, Settings } from "lucide-react"
import {
  Button, Field, Input, Textarea, Select, Checkbox, Switch, Badge, Card, CardHeader, CardBody, CardFooter,
  PageHeader, TableContainer, Table, THead, TBody, TR, TH, TD, TableEmpty, EmptyState, Skeleton, SkeletonRows,
  Avatar, Stat, Alert, Tooltip,
} from "@/components/ui"
import { Dialog } from "@/components/ui/Dialog"
import { Tabs } from "@/components/ui/Tabs"
import { Menu } from "@/components/ui/Menu"
import { useToast } from "@/components/ui/Toast"

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={titulo} />
      <CardBody className="space-y-4">{children}</CardBody>
    </Card>
  )
}

const ALUNOS = [
  { nome: "Ana Beatriz Souza", matricula: "1TIM1-001", media: 8.4, freq: 96.2, status: "success" as const, rotulo: "Aprovado" },
  { nome: "Bruno Lima", matricula: "1TIM1-002", media: 5.1, freq: 81.0, status: "warning" as const, rotulo: "Atenção" },
  { nome: "Carla Mendes", matricula: "1TIM1-003", media: 3.9, freq: 62.5, status: "danger" as const, rotulo: "Rep. Falta" },
]

export default function VitrineClient() {
  const [dialogo, setDialogo] = useState(false)
  const [ligado, setLigado] = useState(true)
  const toast = useToast()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Componentes"
        description="Design system do Áxis (src/components/ui): tokens, controles e estados para revisão."
        breadcrumb={[{ label: "Configurações", href: "/dashboard/configuracoes" }, { label: "Componentes" }]}
        actions={<><Button variant="secondary"><Download size={16} strokeWidth={1.75} /> Exportar</Button><Button><Plus size={16} strokeWidth={1.75} /> Novo</Button></>}
      />

      <Secao titulo="Botões">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">Excluir</Button>
          <Button loading>Salvando</Button>
          <Button disabled>Desabilitado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Pequeno</Button>
          <Button size="sm" variant="secondary">Pequeno</Button>
          <Button size="sm" variant="ghost" aria-label="Mais ações"><MoreHorizontal size={16} strokeWidth={1.75} /></Button>
        </div>
      </Secao>

      <Secao titulo="Formulário">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da turma" hint="Como aparece nos relatórios.">{(p) => <Input {...p} placeholder="Ex.: 1TIM1" />}</Field>
          <Field label="Matrícula" error="Matrícula já cadastrada nesta escola.">{(p) => <Input {...p} defaultValue="1TIM1-001" className="font-mono" />}</Field>
          <Field label="Turno">{(p) => <Select {...p} defaultValue="M"><option value="M">Matutino</option><option value="V">Vespertino</option></Select>}</Field>
          <Field label="Busca" opcional>{(p) => <Input {...p} type="search" placeholder="Buscar aluno…" />}</Field>
          <Field label="Observação" className="sm:col-span-2">{(p) => <Textarea {...p} placeholder="Conteúdo ministrado…" />}</Field>
          <Field label="Desabilitado">{(p) => <Input {...p} disabled value="Somente leitura" readOnly />}</Field>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Checkbox label="Enviar por e-mail" defaultChecked />
          <Switch checked={ligado} onChange={setLigado} label="Chamada por aula" />
        </div>
      </Secao>

      <Secao titulo="Badges e avisos">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutro</Badge>
          <Badge tone="accent">Destaque</Badge>
          <Badge tone="success" dot>Aprovado</Badge>
          <Badge tone="warning" dot>Recuperação</Badge>
          <Badge tone="danger" dot>Rep. Falta</Badge>
          <Badge tone="info">Info</Badge>
        </div>
        <div className="grid gap-2">
          <Alert tone="success" title="Chamada salva">Todos presentes.</Alert>
          <Alert tone="warning">O calendário letivo ainda não foi configurado.</Alert>
          <Alert tone="danger" title="Não foi possível salvar">Nota fora da escala do esquema.</Alert>
          <Alert tone="info">Valores entre 0 e 10.</Alert>
        </div>
      </Secao>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Alunos" value="90" hint="9 turmas" />
        <Stat label="Frequência média" value="88,4%" delta={1.2} />
        <Stat label="Alunos em risco" value="7" delta={2} inverter />
        <Stat label="Chamadas pendentes" value="12" href="/dashboard/chamada" />
      </div>

      <Secao titulo="Tabela">
        <TableContainer maxHeight="16rem">
          <Table>
            <THead>
              <TR><TH>Aluno</TH><TH>Matrícula</TH><TH numeric>Média</TH><TH numeric>Freq.</TH><TH>Situação</TH><TH><span className="sr-only">Ações</span></TH></TR>
            </THead>
            <TBody>
              {ALUNOS.map((a) => (
                <TR key={a.matricula}>
                  <TD><span className="flex items-center gap-2"><Avatar nome={a.nome} size="sm" />{a.nome}</span></TD>
                  <TD className="font-mono text-fg-muted">{a.matricula}</TD>
                  <TD numeric>{a.media.toFixed(1).replace(".", ",")}</TD>
                  <TD numeric>{a.freq.toFixed(1).replace(".", ",")}%</TD>
                  <TD><Badge tone={a.status} dot>{a.rotulo}</Badge></TD>
                  <TD className="w-0 text-right">
                    <Menu
                      trigger={(p) => <Button {...p} size="sm" variant="ghost" aria-label={`Ações de ${a.nome}`}><MoreHorizontal size={16} strokeWidth={1.75} /></Button>}
                      items={[{ label: "Editar", icon: Pencil }, { label: "Excluir", icon: Trash2, perigo: true, separadorAntes: true }]}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableContainer>
        <TableContainer>
          <Table><THead><TR><TH>Aluno</TH><TH numeric>Média</TH></TR></THead><TBody><TableEmpty colSpan={2}>Nenhum aluno nesta turma ainda.</TableEmpty></TBody></Table>
        </TableContainer>
      </Secao>

      <Secao titulo="Abas, menu, dica, diálogo e aviso">
        <Tabs abas={[
          { id: "a", label: "Notas", contador: 3, conteudo: <p className="text-sm text-fg-muted">Conteúdo da aba Notas.</p> },
          { id: "b", label: "Frequência", conteudo: <p className="text-sm text-fg-muted">Conteúdo da aba Frequência.</p> },
          { id: "c", label: "Ocorrências", conteudo: <p className="text-sm text-fg-muted">Conteúdo da aba Ocorrências.</p> },
        ]} />
        <div className="flex flex-wrap items-center gap-2">
          <Menu
            align="start"
            trigger={(p) => <Button {...p} variant="secondary">Menu</Button>}
            items={[{ label: "Configurações", icon: Settings, href: "/dashboard/configuracoes" }, { label: "Turmas", icon: Users, href: "/dashboard/turmas" }]}
          />
          <Tooltip content="Buscar em todas as turmas"><Button variant="secondary" aria-label="Buscar"><Search size={16} strokeWidth={1.75} /></Button></Tooltip>
          <Button variant="secondary" onClick={() => setDialogo(true)}>Abrir diálogo</Button>
          <Button variant="secondary" onClick={() => toast("Alterações salvas.")}>Mostrar aviso</Button>
          <Button variant="secondary" onClick={() => toast("Não foi possível salvar.", "error")}>Aviso de erro</Button>
        </div>
        <Dialog
          open={dialogo}
          onClose={() => setDialogo(false)}
          title="Excluir turma?"
          description="Os alunos, notas e chamadas desta turma serão apagados. Isso não pode ser desfeito."
          footer={<><Button variant="secondary" onClick={() => setDialogo(false)}>Cancelar</Button><Button variant="danger" onClick={() => setDialogo(false)}>Excluir turma</Button></>}
        >
          <Field label="Digite o nome da turma para confirmar">{(p) => <Input {...p} data-autofocus placeholder="1TIM1" />}</Field>
        </Dialog>
      </Secao>

      <Card>
        <CardHeader title="Estados" description="Carregando e vazio." />
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3"><Skeleton className="size-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/2" /></div></div>
          <SkeletonRows linhas={3} colunas={4} />
        </CardBody>
        <EmptyState icon={Users} title="Nenhuma turma neste ano letivo" description="Crie a primeira turma ou importe a matriz curricular para começar." action={<Button size="sm"><Plus size={16} strokeWidth={1.75} /> Nova turma</Button>} />
        <CardFooter><Button variant="secondary" size="sm">Cancelar</Button><Button size="sm">Salvar</Button></CardFooter>
      </Card>

      <Secao titulo="Tipografia">
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight">30 · Título de página grande</p>
          <p className="text-2xl font-semibold tracking-tight">24 · Título de página</p>
          <p className="text-xl font-semibold tracking-tight">20 · Seção</p>
          <p className="text-base font-medium">16 · Destaque</p>
          <p className="text-sm">14 · Texto padrão da interface</p>
          <p className="text-13 text-fg-muted">13 · Texto secundário e tabelas</p>
          <p className="text-xs text-fg-subtle">12 · Rótulos e legendas</p>
          <p className="font-mono text-13">Geist Mono · 1TIM1-001 · 2026</p>
        </div>
      </Secao>
    </div>
  )
}
